package com.triparro.app

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.text.Html
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.triparro.app.core.Api
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand

/** Hosts whose links belong to their own apps (WhatsApp, Maps, social media, Google sign-in). */
private val outsideHosts = listOf("wa.me", "api.whatsapp.com", "whatsapp.com", "maps.google.com", "maps.app.goo.gl", "goo.gl", "google.com/maps",
    "facebook.com", "instagram.com", "youtube.com", "youtu.be", "twitter.com", "x.com", "linkedin.com", "play.google.com", "accounts.google.com", "calendar.google.com")

fun openExternal(context: Context, url: String) {
    try {
        val intent = if (url.startsWith("intent:")) Intent.parseUri(url, Intent.URI_INTENT_SCHEME) else Intent(Intent.ACTION_VIEW, Uri.parse(url))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
        Toast.makeText(context, "No app on this phone can open this link.", Toast.LENGTH_SHORT).show()
    } catch (_: Exception) {
        Toast.makeText(context, "This link could not be opened.", Toast.LENGTH_SHORT).show()
    }
}

/**
 * The website's address the gateway sends the guest back to after paying → the app's own booking screen.
 * /booking/{ref}, /pay/{ref}, /resort-booking/{ref}, /resort-pay/{ref} → "booking/{ref}"; /pet-booking/{ref} → "petbooking/{ref}".
 */
fun appRouteFor(url: String): String? {
    val u = try { Uri.parse(url) } catch (_: Exception) { return null }
    val own = Uri.parse(Api.baseUrl).host?.removePrefix("www.")
    if (u.host?.removePrefix("www.") != own) return null
    val seg = u.pathSegments ?: return null
    if (seg.size == 2 && seg[0] in listOf("booking", "pay", "resort-booking", "resort-pay")) return "booking/" + seg[1]
    if (seg.size == 2 && seg[0] == "pet-booking") return "petbooking/" + seg[1]
    return null
}

/** A page of the website inside the app (dashboards, sign-up, payments, invoices), with the app's own sign-in. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebScreen(
    url: String?,
    title: String,
    onBack: () -> Unit,
    payment: PaymentForm? = null,
    onAppRoute: (String) -> Unit = {},
) {
    val context = LocalContext.current
    var progress by remember { mutableIntStateOf(0) }
    var pageTitle by remember { mutableStateOf(title) }
    var web by remember { mutableStateOf<WebView?>(null) }
    var fileCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var routed by remember { mutableStateOf(false) }

    val chooser = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val cb = fileCallback
        fileCallback = null
        cb?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data) ?: if (r.resultCode == Activity.RESULT_OK && r.data?.data != null) arrayOf(r.data!!.data!!) else null)
    }

    BackHandler {
        val w = web
        if (w != null && w.canGoBack() && payment == null) w.goBack() else onBack()
    }

    DisposableEffect(Unit) {
        onDispose { Api.pullCookiesFromWebView(); web?.destroy() }
    }

    Column(Modifier.fillMaxSize()) {
        BackBar(pageTitle, onBack)
        if (progress in 1..99) LinearProgressIndicator(progress = { progress / 100f }, modifier = Modifier.fillMaxWidth(), color = Brand.Coral)
        Box(Modifier.fillMaxSize()) {
            AndroidView(modifier = Modifier.fillMaxSize(), factory = { ctx ->
                Api.pushCookiesToWebView()
                WebView(ctx).apply {
                    web = this
                    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.userAgentString = settings.userAgentString + " " + Api.userAgent
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                            val link = request.url.toString()
                            val scheme = request.url.scheme ?: ""
                            if (scheme != "http" && scheme != "https") { openExternal(context, link); return true }
                            appRouteFor(link)?.let { if (routed) return true; routed = true; Api.pullCookiesFromWebView(); onAppRoute(it + (request.url.encodedQuery?.let { q -> "?$q" } ?: "")); return true }
                            val host = request.url.host ?: ""
                            if (outsideHosts.any { host == it || host.endsWith(".$it") || link.contains(it) && it.contains("/") }) { openExternal(context, link); return true }
                            return false
                        }

                        // A gateway's reply can reach the booking page through a redirect after a form post, which
                        // shouldOverrideUrlLoading doesn't always see — catch it here too
                        override fun onPageStarted(view: WebView, started: String?, favicon: android.graphics.Bitmap?) {
                            val s = started ?: return
                            if (routed) return
                            appRouteFor(s)?.let { r ->
                                routed = true
                                view.stopLoading()
                                Api.pullCookiesFromWebView()
                                val q = Uri.parse(s).encodedQuery
                                onAppRoute(r + (q?.let { "?$it" } ?: ""))
                            }
                        }

                        override fun onPageFinished(view: WebView, finished: String?) {
                            Api.pullCookiesFromWebView()
                            view.title?.takeIf { it.isNotBlank() && !it.startsWith("http") }?.let { pageTitle = it.substringBefore(" · ").substringBefore(" | ") }
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) { progress = newProgress }
                        override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                            fileCallback?.onReceiveValue(null)
                            fileCallback = callback
                            return try {
                                val i = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).setType("*/*")
                                if (params?.mode == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                                chooser.launch(i); true
                            } catch (_: Exception) { fileCallback = null; false }
                        }
                    }
                    setDownloadListener { dl, ua, disposition, mime, _ ->
                        try {
                            val name = URLUtil.guessFileName(dl, disposition, mime)
                            val req = DownloadManager.Request(Uri.parse(dl))
                                .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(dl) ?: "")
                                .addRequestHeader("User-Agent", ua)
                                .setMimeType(mime).setTitle(name)
                                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
                            (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
                            Toast.makeText(context, "Downloading $name…", Toast.LENGTH_SHORT).show()
                        } catch (_: Exception) { openExternal(context, dl) }
                    }
                    if (payment != null) loadDataWithBaseURL(Api.baseUrl + "/", paymentHtml(payment), "text/html", "utf-8", null)
                    else loadUrl(Api.url(url ?: "/"))
                }
            })
        }
    }
}

/** A page that posts the payment fields to the gateway at once (PayU, or the site's Razorpay page). */
private fun paymentHtml(p: PaymentForm): String {
    val sb = StringBuilder()
    sb.append("<!doctype html><html><head><meta name=viewport content='width=device-width'></head><body style='font-family:sans-serif;padding:24px;color:#4a5663'>")
    sb.append("<p>Opening the secure payment page…</p><form id=f method=post action='").append(Html.escapeHtml(p.action)).append("'>")
    val keys = p.fields.keys()
    while (keys.hasNext()) {
        val k = keys.next()
        sb.append("<input type=hidden name='").append(Html.escapeHtml(k)).append("' value='").append(Html.escapeHtml(p.fields.optString(k))).append("'>")
    }
    sb.append("</form><script>document.getElementById('f').submit()</script></body></html>")
    return sb.toString()
}
