import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_selector/file_selector.dart' as fs;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'config.dart';
import 'page_scripts.dart';
import 'tabs.dart';

/// The whole app: the website in a web view, with native bottom tabs, splash, offline screen,
/// pull-to-refresh, photo/file uploads, downloads and links that open other apps.
class WebShell extends StatefulWidget {
  const WebShell({super.key});

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  static const _links = MethodChannel('app.links');
  static const _files = MethodChannel('app.files');

  late final WebViewController _web;
  final ImagePicker _imagePicker = ImagePicker();

  int _tab = 0;
  int _progress = 0;
  bool _firstPageShown = false;
  bool _offline = false;
  String? _failedUrl;
  String _currentUrl = AppConfig.siteUrl;
  DateTime? _lastBackPress;
  Timer? _splashTimeout;

  @override
  void initState() {
    super.initState();
    _web = WebViewController();
    _setUp();
    // Never keep the splash for long, even on a very slow connection.
    _splashTimeout = Timer(const Duration(seconds: 10), () {
      if (mounted && !_firstPageShown) setState(() => _firstPageShown = true);
    });
  }

  @override
  void dispose() {
    _splashTimeout?.cancel();
    super.dispose();
  }

  Future<void> _setUp() async {
    await _web.setJavaScriptMode(JavaScriptMode.unrestricted);
    // Keep the website's login cookie (the app always ticks "Keep me logged in"), so the app opens logged in
    final platformCookies = WebViewCookieManager().platform;
    if (platformCookies is AndroidWebViewCookieManager) {
      try {
        await platformCookies.setAcceptThirdPartyCookies(_web.platform as AndroidWebViewController, true);
      } catch (_) {}
    }
    await _web.setBackgroundColor(Colors.white);
    await _web.addJavaScriptChannel('EdenApp', onMessageReceived: _onPageMessage);
    await _web.setNavigationDelegate(NavigationDelegate(
      onNavigationRequest: _onNavigationRequest,
      onPageStarted: (url) {
        _currentUrl = url;
        _syncTab(url);
        if (_offline && mounted) setState(() => _offline = false);
      },
      onProgress: (p) {
        if (mounted) setState(() => _progress = p);
      },
      onPageFinished: (url) {
        _currentUrl = url;
        _syncTab(url);
        _web.runJavaScript(pullToRefreshScript).catchError((_) {});
        if (mounted && !_firstPageShown && !_offline) setState(() => _firstPageShown = true);
      },
      onUrlChange: (change) {
        final url = change.url;
        if (url != null) {
          _currentUrl = url;
          _syncTab(url);
        }
      },
      onWebResourceError: _onWebError,
    ));

    try {
      final ua = await _web.getUserAgent();
      await _web.setUserAgent('${ua ?? ''} ${AppConfig.userAgentSuffix}'.trim());
    } catch (_) {}

    // Website pop-ups: confirm("Cancel this booking?") etc.
    await _web.setOnJavaScriptAlertDialog((request) => _alert(request.message));
    await _web.setOnJavaScriptConfirmDialog((request) => _confirm(request.message));
    await _web.setOnJavaScriptTextInputDialog((request) => _prompt(request.message, request.defaultText));

    final platform = _web.platform;
    if (platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(kDebugMode);
      await platform.setMediaPlaybackRequiresUserGesture(true);
      await platform.setOnShowFileSelector(_pickFiles);
    }

    _links.setMethodCallHandler((call) async {
      if (call.method == 'onLink' && call.arguments is String) _openAppLink(call.arguments as String);
    });
    String? initial;
    try {
      initial = await _links.invokeMethod<String>('getInitialLink');
    } catch (_) {}
    final start = (initial != null && _isOwnLink(initial)) ? initial : AppConfig.siteUrl;
    await _web.loadRequest(Uri.parse(start));
  }

  // ---------------------------------------------------------------- navigation

  FutureOr<NavigationDecision> _onNavigationRequest(NavigationRequest request) {
    final uri = Uri.tryParse(request.url);
    if (uri == null) return NavigationDecision.prevent;
    final scheme = uri.scheme.toLowerCase();

    if (scheme == 'about' || scheme == 'data' || scheme == 'blob' || scheme == 'javascript') {
      return NavigationDecision.navigate;
    }
    if (scheme != 'http' && scheme != 'https') {
      // tel:, mailto:, whatsapp:, upi:, intent:// (UPI apps during payment), market:, geo: …
      _openOutside(request.url);
      return NavigationDecision.prevent;
    }
    if (request.isMainFrame && AppConfig.isOwnHost(uri.host) && _isDownload(uri)) {
      _download(request.url);
      return NavigationDecision.prevent;
    }
    if (request.isMainFrame && _opensOutside(uri)) {
      _openOutside(request.url);
      return NavigationDecision.prevent;
    }
    return NavigationDecision.navigate;
  }

  bool _isDownload(Uri uri) {
    final path = uri.path.toLowerCase();
    return RegExp(r'^/invoices/\d+/pdf$').hasMatch(path) ||
        path == '/go/invoice-pdf' ||
        path.endsWith('.pdf') ||
        path.endsWith('.csv') ||
        uri.queryParameters['export'] == 'csv';
  }

  bool _opensOutside(Uri uri) {
    final host = uri.host.toLowerCase();
    if (AppConfig.isOwnHost(host)) return false;
    if ((host == 'google.com' || host == 'www.google.com') && uri.path.startsWith('/maps')) return true;
    return AppConfig.openOutsideHosts.any((h) => host == h || host.endsWith('.$h'));
  }

  bool _isOwnLink(String url) {
    final uri = Uri.tryParse(url);
    return uri != null && uri.scheme == 'https' && AppConfig.isOwnHost(uri.host);
  }

  void _openAppLink(String url) {
    if (_isOwnLink(url)) _web.loadRequest(Uri.parse(url));
  }

  Future<void> _openOutside(String url) async {
    try {
      if (url.startsWith('intent://')) {
        if (await _openIntentUrl(url)) return;
      } else if (await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
        return;
      }
    } catch (_) {}
    _toast(url.startsWith('upi:') || url.contains('scheme=upi')
        ? 'No UPI app found. Please choose another payment method.'
        : 'No app found to open this link.');
  }

  /// intent://pay?pa=…#Intent;scheme=upi;package=com.phonepe.app;S.browser_fallback_url=…;end
  Future<bool> _openIntentUrl(String url) async {
    final hash = url.indexOf('#Intent;');
    if (hash < 0) return false;
    String? scheme, package, fallback;
    for (final part in url.substring(hash + 8).split(';')) {
      if (part.startsWith('scheme=')) scheme = part.substring(7);
      if (part.startsWith('package=')) package = part.substring(8);
      if (part.startsWith('S.browser_fallback_url=')) fallback = Uri.decodeComponent(part.substring(23));
    }
    if (scheme != null) {
      final target = Uri.parse('$scheme://${url.substring('intent://'.length, hash)}');
      if (await launchUrl(target, mode: LaunchMode.externalApplication)) return true;
    }
    if (fallback != null && fallback.startsWith('http')) {
      await _web.loadRequest(Uri.parse(fallback));
      return true;
    }
    if (package != null) {
      return launchUrl(Uri.parse('market://details?id=$package'), mode: LaunchMode.externalApplication);
    }
    return false;
  }

  void _syncTab(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || !AppConfig.isOwnHost(uri.host)) return;
    final i = tabIndexForPath(uri.path);
    if (i != null && i != _tab && mounted) setState(() => _tab = i);
  }

  void _onTabSelected(int i) {
    setState(() => _tab = i);
    _web.loadRequest(AppConfig.siteUri.replace(path: appTabs[i].path));
  }

  Future<void> _onBack() async {
    if (_offline) {
      _retry();
      return;
    }
    if (await _web.canGoBack()) {
      await _web.goBack();
      return;
    }
    final uri = Uri.tryParse(_currentUrl);
    if (uri != null && uri.path != '/' && uri.path.isNotEmpty) {
      _onTabSelected(0);
      return;
    }
    final now = DateTime.now();
    if (_lastBackPress != null && now.difference(_lastBackPress!) < const Duration(seconds: 2)) {
      await SystemNavigator.pop();
    } else {
      _lastBackPress = now;
      _toast('Press back again to exit');
    }
  }

  // ---------------------------------------------------------------- errors / offline

  void _onWebError(WebResourceError error) {
    if (error.isForMainFrame == false) return;
    // Cancelled loads (e.g. a new page started before the old one finished) are not real errors.
    if (error.errorType == WebResourceErrorType.unsupportedScheme || error.description.contains('ERR_ABORTED')) return;
    // Going "back" to a page that was a form result: load it again instead of showing an error.
    if (error.description.contains('ERR_CACHE_MISS')) {
      _web.loadRequest(Uri.parse(error.url ?? _currentUrl));
      return;
    }
    if (!mounted) return;
    setState(() {
      _offline = true;
      _failedUrl = error.url ?? _currentUrl;
      _firstPageShown = true;
    });
  }

  void _retry() {
    setState(() => _offline = false);
    _web.loadRequest(Uri.parse(_failedUrl ?? _currentUrl));
  }

  // ---------------------------------------------------------------- messages from the page

  void _onPageMessage(JavaScriptMessage message) {
    Map<String, dynamic> m;
    try {
      m = jsonDecode(message.message) as Map<String, dynamic>;
    } catch (_) {
      return;
    }
    switch (m['t']) {
      case 'refresh':
        _web.reload();
      case 'dl':
        _saveDownload(m);
      case 'dlerr':
        _toast('Download failed. ${m['msg'] ?? ''}'.trim());
      case 'share':
        _sharePhotos(m);
    }
  }

  // ---------------------------------------------------------------- downloads (invoices, CSV)

  Future<void> _download(String url) async {
    _toast('Downloading…');
    try {
      await _web.runJavaScript(downloadScript(url));
    } catch (_) {
      await _openOutside(url);
    }
  }

  Future<void> _saveDownload(Map<String, dynamic> m) async {
    try {
      final bytes = base64Decode((m['data'] as String?) ?? '');
      var mime = ((m['mime'] as String?) ?? '').split(';').first.trim();
      var name = ((m['name'] as String?) ?? '').trim();
      if (name.isEmpty) {
        final path = Uri.tryParse((m['url'] as String?) ?? '')?.pathSegments ?? const <String>[];
        final ext = mime == 'text/csv' ? 'csv' : 'pdf';
        name = path.isNotEmpty && path.last.contains('.') ? path.last : 'eden-garden-${DateTime.now().millisecondsSinceEpoch}.$ext';
      }
      name = name.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      if (mime.isEmpty || mime == 'application/octet-stream') {
        mime = name.toLowerCase().endsWith('.csv') ? 'text/csv' : (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      }
      final result = await _files.invokeMapMethod<String, dynamic>('saveAndOpen', {'name': name, 'mime': mime, 'bytes': bytes});
      if (result?['opened'] != true) _toast('Saved to Downloads: $name');
    } catch (e) {
      _toast('Could not save the file.');
    }
  }

  // ---------------------------------------------------------------- share a stay's photos (WhatsApp…)

  /// From the stay picker's "Share → Send the photos": download the photos and open the share sheet with them.
  Future<void> _sharePhotos(Map<String, dynamic> m) async {
    final urls = ((m['photos'] as List?) ?? const []).whereType<String>().take(10).toList();
    final text = (m['text'] as String?) ?? '';
    if (urls.isEmpty) {
      await _files.invokeMethod('shareImages', {'text': text, 'images': <Uint8List>[]});
      return;
    }
    _toast('Preparing ${urls.length} photo${urls.length == 1 ? '' : 's'}…');
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
    client.userAgent = AppConfig.userAgentSuffix;
    final images = <Uint8List>[];
    try {
      await Future.wait(urls.map((u) async {
        try {
          final uri = Uri.parse(u);
          if (uri.scheme != 'https' && uri.scheme != 'http') return;
          final req = await client.getUrl(uri);
          final res = await req.close().timeout(const Duration(seconds: 30));
          if (res.statusCode != 200 || !(res.headers.contentType?.primaryType == 'image')) {
            await res.drain<void>();
            return;
          }
          final builder = BytesBuilder(copy: false);
          await for (final chunk in res) {
            builder.add(chunk);
            if (builder.length > 15 * 1024 * 1024) return; // skip huge files
          }
          images.add(builder.takeBytes());
        } catch (_) {}
      }));
    } finally {
      client.close(force: true);
    }
    if (images.isEmpty) _toast('Couldn\'t download the photos — sharing the link instead.');
    try {
      final r = await _files.invokeMapMethod<String, dynamic>('shareImages', {'text': text, 'images': images});
      if (r?['shared'] != true) _toast('No app found to share with.');
    } catch (_) {
      _toast('Could not open sharing.');
    }
  }

  // ---------------------------------------------------------------- uploads (<input type="file">)

  Future<List<String>> _pickFiles(FileSelectorParams params) async {
    final types = params.acceptTypes.map((t) => t.trim().toLowerCase()).where((t) => t.isNotEmpty).toList();
    const imageExt = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'];
    final imagesOnly = types.isNotEmpty && types.every((t) => t.startsWith('image/') || imageExt.contains(t));
    final multiple = params.mode == FileSelectorMode.openMultiple;

    try {
      if (imagesOnly) {
        final source = params.isCaptureEnabled ? ImageSource.camera : await _askImageSource();
        if (source == null) return [];
        if (source == ImageSource.camera) {
          final photo = await _imagePicker.pickImage(source: ImageSource.camera, maxWidth: 2400, imageQuality: 85);
          return photo == null ? [] : [Uri.file(photo.path).toString()];
        }
        if (multiple) {
          final photos = await _imagePicker.pickMultiImage(maxWidth: 2400, imageQuality: 85);
          return photos.map((p) => Uri.file(p.path).toString()).toList();
        }
        final photo = await _imagePicker.pickImage(source: ImageSource.gallery, maxWidth: 2400, imageQuality: 85);
        return photo == null ? [] : [Uri.file(photo.path).toString()];
      }

      final mimeTypes = types.where((t) => t.contains('/')).toList();
      final extensions = types.where((t) => t.startsWith('.')).map((t) => t.substring(1)).toList();
      final groups = (mimeTypes.isEmpty && extensions.isEmpty)
          ? const <fs.XTypeGroup>[]
          : [fs.XTypeGroup(label: 'Files', mimeTypes: mimeTypes.isEmpty ? null : mimeTypes, extensions: extensions.isEmpty ? null : extensions)];
      if (multiple) {
        final files = await fs.openFiles(acceptedTypeGroups: groups);
        return files.map((f) => Uri.file(f.path).toString()).toList();
      }
      final file = await fs.openFile(acceptedTypeGroups: groups);
      return file == null ? [] : [Uri.file(file.path).toString()];
    } catch (e) {
      _toast('Could not open the camera or files.');
      return [];
    }
  }

  Future<ImageSource?> _askImageSource() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- JavaScript dialogs

  Future<void> _alert(String message) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(message),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
      ),
    );
  }

  Future<bool> _confirm(String message) async {
    if (!mounted) return false;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('OK')),
        ],
      ),
    );
    return ok ?? false;
  }

  Future<String> _prompt(String message, String? defaultText) async {
    if (!mounted) return '';
    final controller = TextEditingController(text: defaultText ?? '');
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(message),
          TextField(controller: controller, autofocus: true),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('OK')),
        ],
      ),
    );
    controller.dispose();
    return value ?? '';
  }

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating, duration: const Duration(seconds: 3)));
  }

  // ---------------------------------------------------------------- UI

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _onBack();
        },
        child: Scaffold(
          backgroundColor: AppConfig.brandDark, // behind the status bar
          body: SafeArea(
            bottom: false,
            child: ColoredBox(
              color: Colors.white,
              child: Stack(
                children: [
                  WebViewWidget(controller: _web),
                  if (_firstPageShown && _progress < 100 && !_offline)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: LinearProgressIndicator(
                        value: _progress / 100,
                        minHeight: 3,
                        color: AppConfig.accent,
                        backgroundColor: Colors.transparent,
                      ),
                    ),
                  if (_offline) _OfflineView(onRetry: _retry),
                  if (!_firstPageShown) const _SplashView(),
                ],
              ),
            ),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: _onTabSelected,
            height: 66,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
              for (final t in appTabs)
                NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label),
            ],
          ),
        ),
      ),
    );
  }
}

class _SplashView extends StatelessWidget {
  const _SplashView();

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppConfig.cream,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/logo.png', width: 132, height: 132),
            const SizedBox(height: 18),
            const Text(
              AppConfig.appName,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppConfig.brandDark),
            ),
            const SizedBox(height: 4),
            const Text('Home Stay', style: TextStyle(fontSize: 15, color: Color(0xFF5D6874))),
            const SizedBox(height: 28),
            const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.6, color: AppConfig.brand)),
          ],
        ),
      ),
    );
  }
}

class _OfflineView extends StatelessWidget {
  const _OfflineView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppConfig.cream,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 64, color: AppConfig.brand),
              const SizedBox(height: 16),
              const Text("You're offline", style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text(
                'Check your mobile data or Wi-Fi and try again.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Color(0xFF5D6874)),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
              if (AppConfig.supportPhone.isNotEmpty) ...[
                const SizedBox(height: 10),
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse('tel:${AppConfig.supportPhone}')),
                  icon: const Icon(Icons.call_outlined),
                  label: const Text('Call us'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
