package com.triparro.app.core

import android.content.Context
import android.graphics.Rect
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** One line of text found on a photo, with where it is. */
data class TextLine(val text: String, val box: Rect)

/**
 * Reads the text on a photo on the phone (Google ML Kit, on the device). Returns the lines with their positions,
 * or null when the phone can't read text (no Google Play services, unreadable photo).
 */
object TextReader {
    suspend fun lines(context: Context, uri: Uri): List<TextLine>? = try {
        val img = InputImage.fromFilePath(context, uri)
        val rec = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        val result = suspendCancellableCoroutine { cont ->
            rec.process(img).addOnSuccessListener { cont.resume(it) }.addOnFailureListener { cont.resume(null) }
        }
        rec.close()
        result?.textBlocks?.flatMap { b -> b.lines.mapNotNull { l -> l.boundingBox?.let { TextLine(l.text, it) } } }
    } catch (_: Exception) { null } catch (_: LinkageError) { null }

    /**
     * The lines put back into rows as printed (a bill's item names and prices are read as separate columns):
     * lines whose middles are at the same height join up, left to right.
     */
    fun rows(lines: List<TextLine>): String {
        if (lines.isEmpty()) return ""
        val sorted = lines.sortedBy { it.box.centerY() }
        val rows = mutableListOf<MutableList<TextLine>>()
        for (l in sorted) {
            val row = rows.lastOrNull()
            val h = maxOf(8, l.box.height())
            if (row != null && kotlin.math.abs(row.map { it.box.centerY() }.average() - l.box.centerY()) < h * 0.55) row.add(l) else rows.add(mutableListOf(l))
        }
        return rows.joinToString("\n") { r -> r.sortedBy { it.box.left }.joinToString(" ") { it.text } }
    }
}
