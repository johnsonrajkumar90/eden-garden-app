import 'package:flutter/material.dart';

/// Everything you might want to change in one place.
class AppConfig {
  /// The live website the app shows. Must be https.
  static const String siteUrl = 'https://edengardenshomestay.in';

  static const String appName = 'Eden Garden';

  /// Added to the web view's user agent, so the website can tell it is running inside the app.
  static const String userAgentSuffix = 'EdenGardenApp/1.0 (Android)';

  /// Shown on the offline screen.
  static const String supportPhone = '';

  // Brand colours (same as the website).
  static const Color brand = Color(0xFF0E7C66);
  static const Color brandDark = Color(0xFF0B5E4F);
  static const Color accent = Color(0xFFD9401F);
  static const Color cream = Color(0xFFFFFAF2);

  /// Links to these sites open in their own apps (WhatsApp, Maps, social media…) instead of inside the app.
  /// Everything else — including PayU and bank payment pages — stays inside the app.
  static const List<String> openOutsideHosts = [
    'wa.me',
    'api.whatsapp.com',
    'web.whatsapp.com',
    'whatsapp.com',
    'maps.google.com',
    'maps.app.goo.gl',
    'goo.gl',
    'facebook.com',
    'm.facebook.com',
    'instagram.com',
    'youtube.com',
    'youtu.be',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'play.google.com',
    'accounts.google.com', // Google sign-in / Google Drive connect don't work inside web views
    'calendar.google.com',
  ];

  static Uri get siteUri => Uri.parse(siteUrl);

  /// True for the website's own addresses (with or without www.).
  static bool isOwnHost(String host) {
    final own = siteUri.host.replaceFirst(RegExp(r'^www\.'), '');
    final h = host.toLowerCase().replaceFirst(RegExp(r'^www\.'), '');
    return h == own;
  }
}
