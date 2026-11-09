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

/**
 * A photo made small enough to upload quickly and pass the website's upload limit: at most [maxPx] on the long side,
 * turned the right way up (camera EXIF), saved as JPEG. Falls back to the original file when it can't be read as an image.
 */
fun shrinkPhoto(context: Context, uri: Uri, prefix: String, maxPx: Int = 1600): Pair<File, String>? = try {
    val cr = context.contentResolver
    val bounds = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
    cr.openInputStream(uri)?.use { android.graphics.BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) copyToCache(context, uri, prefix)
    else {
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxPx) sample *= 2
        var bmp = cr.openInputStream(uri)?.use { android.graphics.BitmapFactory.decodeStream(it, null, android.graphics.BitmapFactory.Options().apply { inSampleSize = sample }) }
            ?: throw IllegalStateException("unreadable")
        val turn = try {
            cr.openInputStream(uri)?.use { s ->
                when (android.media.ExifInterface(s).getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL)) {
                    android.media.ExifInterface.ORIENTATION_ROTATE_90 -> 90f; android.media.ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    android.media.ExifInterface.ORIENTATION_ROTATE_270 -> 270f; else -> 0f
                }
            } ?: 0f
        } catch (_: Exception) { 0f }
        val scale = minOf(1f, maxPx.toFloat() / maxOf(bmp.width, bmp.height))
        if (turn != 0f || scale < 1f) {
            val m = android.graphics.Matrix().apply { postScale(scale, scale); postRotate(turn) }
            bmp = android.graphics.Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
        }
        val dir = File(context.cacheDir, "images").apply { mkdirs() }
        val f = File(dir, "$prefix-${System.currentTimeMillis()}.jpg")
        f.outputStream().use { bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, it) }
        if (f.length() > 0) f to "image/jpeg" else copyToCache(context, uri, prefix)
    }
} catch (_: Exception) { copyToCache(context, uri, prefix) }
