package `in`.edengardenshomestay.app

import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

/**
 * Two small native helpers for the Flutter app:
 *  - "app.links": website links that opened the app (App Links) → shown in the web view.
 *  - "app.files": saves a downloaded invoice / CSV to Downloads and opens it ("saveAndOpen"), and shares
 *    a stay's photos + details with WhatsApp or any app ("shareImages").
 */
class MainActivity : FlutterActivity() {
    private var linkChannel: MethodChannel? = null
    private var initialLink: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val messenger = flutterEngine.dartExecutor.binaryMessenger
        initialLink = linkFrom(intent)

        linkChannel = MethodChannel(messenger, "app.links").also { ch ->
            ch.setMethodCallHandler { call, result ->
                if (call.method == "getInitialLink") {
                    result.success(initialLink)
                    initialLink = null
                } else {
                    result.notImplemented()
                }
            }
        }

        MethodChannel(messenger, "app.files").setMethodCallHandler { call, result ->
            if (call.method == "shareImages") {
                try {
                    val text = call.argument<String>("text") ?: ""
                    val images = call.argument<List<ByteArray>>("images") ?: emptyList()
                    result.success(mapOf("shared" to shareImages(text, images)))
                } catch (e: Exception) {
                    result.error("share_failed", e.message, null)
                }
                return@setMethodCallHandler
            }
            if (call.method != "saveAndOpen") {
                result.notImplemented()
                return@setMethodCallHandler
            }
            try {
                val name = call.argument<String>("name") ?: "download"
                val mime = call.argument<String>("mime") ?: "application/octet-stream"
                val bytes = call.argument<ByteArray>("bytes") ?: ByteArray(0)
                val uri = save(name, mime, bytes)
                val opened = open(uri, mime)
                result.success(mapOf("saved" to true, "opened" to opened))
            } catch (e: Exception) {
                result.error("save_failed", e.message, null)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        linkFrom(intent)?.let { linkChannel?.invokeMethod("onLink", it) }
    }

    private fun linkFrom(intent: Intent?): String? =
        if (intent?.action == Intent.ACTION_VIEW) intent.dataString else null

    /** Android 10+: the public Downloads folder. Android 7–9: the app's own Downloads folder (no permission needed). */
    private fun save(name: String, mime: String, bytes: ByteArray): Uri {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, name)
                put(MediaStore.MediaColumns.MIME_TYPE, mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Could not create the file in Downloads")
            contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw IllegalStateException("Could not write the file")
            return uri
        }
        val dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: File(filesDir, "downloads")
        dir.mkdirs()
        val file = File(dir, name)
        file.writeBytes(bytes)
        return FileProvider.getUriForFile(this, "$packageName.files", file)
    }

    /** Share photos (+ text) — straight to WhatsApp when it's installed, otherwise the normal share sheet. */
    private fun shareImages(text: String, images: List<ByteArray>): Boolean {
        val dir = File(cacheDir, "share")
        dir.deleteRecursively()
        dir.mkdirs()
        val uris = ArrayList<Uri>()
        images.forEachIndexed { i, bytes ->
            val ext = when {
                bytes.size > 3 && bytes[0] == 0x89.toByte() && bytes[1] == 0x50.toByte() -> "png"
                bytes.size > 11 && bytes[8] == 'W'.code.toByte() && bytes[9] == 'E'.code.toByte() -> "webp"
                else -> "jpg"
            }
            val f = File(dir, "photo-${i + 1}.$ext")
            f.writeBytes(bytes)
            uris.add(FileProvider.getUriForFile(this, "$packageName.files", f))
        }
        val send = Intent().apply {
            when {
                uris.isEmpty() -> { action = Intent.ACTION_SEND; type = "text/plain" }
                uris.size == 1 -> { action = Intent.ACTION_SEND; type = "image/*"; putExtra(Intent.EXTRA_STREAM, uris[0]) }
                else -> { action = Intent.ACTION_SEND_MULTIPLE; type = "image/*"; putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris) }
            }
            putExtra(Intent.EXTRA_TEXT, text)
            if (uris.isNotEmpty()) {
                clipData = android.content.ClipData.newUri(contentResolver, "photos", uris[0]).also { clip ->
                    uris.drop(1).forEach { clip.addItem(android.content.ClipData.Item(it)) }
                }
            }
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        for (pkg in listOf("com.whatsapp", "com.whatsapp.w4b")) {
            try {
                startActivity(Intent(send).setPackage(pkg))
                return true
            } catch (e: Exception) { /* not installed — try the next one */ }
        }
        return try {
            startActivity(Intent.createChooser(send, "Share photos").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun open(uri: Uri, mime: String): Boolean {
        val view = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mime)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return try {
            startActivity(view)
            true
        } catch (e: Exception) {
            false
        }
    }
}
