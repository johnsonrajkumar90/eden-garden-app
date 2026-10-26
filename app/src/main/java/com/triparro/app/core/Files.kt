package com.triparro.app.core

import android.content.Context
import android.net.Uri
import java.io.File

/** Copies a picked photo into the app's cache so it can be uploaded (image or video). Returns the file and its type. */
fun copyToCache(context: Context, uri: Uri, prefix: String): Pair<File, String>? = try {
    val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
    val ext = when {
        mime.contains("png") -> "png"; mime.contains("webp") -> "webp"; mime.contains("mp4") -> "mp4"
        mime.contains("quicktime") -> "mov"; mime.contains("webm") -> "webm"; else -> "jpg"
    }
    val dir = File(context.cacheDir, "images").apply { mkdirs() }
    val f = File(dir, "$prefix-${System.currentTimeMillis()}.$ext")
    context.contentResolver.openInputStream(uri)?.use { input -> f.outputStream().use { input.copyTo(it) } }
    if (f.length() > 0) f to mime else null
} catch (_: Exception) { null }
