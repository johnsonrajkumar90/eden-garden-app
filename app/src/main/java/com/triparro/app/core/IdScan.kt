package com.triparro.app.core

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.net.Uri
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.coroutines.resume

/**
 * Reads a guest's ID card on the phone (nothing is sent anywhere to read it): the kind of ID, its number and the name.
 * For an Aadhaar card the photo itself is masked before it leaves the phone — the first 8 digits of the number
 * (and of a VID) are blacked out, and so are QR codes, which can carry the full number. Only XXXX XXXX 1234 stays readable.
 */
data class IdRead(val type: String?, val number: String?, val name: String?, val photo: Uri, val masked: Boolean, val read: Boolean)

object IdScan {
    private val aadhaarRx = Regex("""(?<!\d)(\d{4})\s?(\d{4})\s?(\d{4})(?!\d)""")
    private val vidRx = Regex("""(?<!\d)(\d{4})\s?(\d{4})\s?(\d{4})\s?(\d{4})(?!\d)""")
    private val panRx = Regex("""\b([A-Z]{5}\d{4}[A-Z])\b""")
    private val passportRx = Regex("""\b([A-Z]\d{7})\b""")
    private val voterRx = Regex("""\b([A-Z]{3}\d{7})\b""")
    private val dlRx = Regex("""\b([A-Z]{2}[ -]?\d{2}[ -]?\d{4}[ -]?\d{7}|[A-Z]{2}\d{13})\b""")

    suspend fun read(context: Context, picked: Uri): IdRead? {
        val small = shrinkPhoto(context, picked, "idscan", 2000) ?: return null
        val fileUri = Uri.fromFile(small.first)
        val lines = TextReader.lines(context, fileUri) ?: return IdRead(null, null, null, fileUri, false, false)
        val all = lines.joinToString("\n") { it.text }
        val up = all.uppercase()
        val type = when {
            Regex("AADHAAR|आधार|UNIQUE IDENTIFICATION|GOVERNMENT OF INDIA|VID\\s*:").containsMatchIn(up) && aadhaarRx.containsMatchIn(all) -> "aadhaar"
            up.contains("INCOME TAX") || up.contains("PERMANENT ACCOUNT") || panRx.containsMatchIn(up) && up.contains("INDIA") -> "pan"
            up.contains("PASSPORT") || up.contains("P<IND") || up.contains("REPUBLIC OF INDIA") -> "passport"
            up.contains("DRIVING LICEN") || up.contains("DRIVING LICENSE") -> "dl"
            up.contains("ELECTION COMMISSION") || up.contains("ELECTOR") || up.contains("EPIC") -> "voter"
            aadhaarRx.containsMatchIn(all) -> "aadhaar"
            else -> null
        }
        val number = when (type) {
            "aadhaar" -> lines.firstNotNullOfOrNull { l -> if (vidRx.containsMatchIn(l.text)) null else aadhaarRx.find(l.text) }?.let { "XXXX XXXX " + it.groupValues[3] }
            "pan" -> panRx.find(up)?.value
            "passport" -> passportRx.find(up)?.value
            "voter" -> voterRx.find(up)?.value
            "dl" -> dlRx.find(up)?.value?.replace(" ", "")?.replace("-", "")
            else -> null
        }
        val name = guessName(lines.map { it.text }, type)
        var masked = false
        var out = fileUri
        if (type == "aadhaar") {
            // black out the first 8 digits of every 12- / 16-digit number on the card, and the QR codes
            val boxes = mutableListOf<Rect>()
            lines.forEach { l ->
                val t = l.text
                (vidRx.findAll(t) + aadhaarRx.findAll(t)).forEach { m ->
                    val keep = m.groups[m.groups.size - 1]!!.range.first   // the last group stays readable
                    val from = m.range.first
                    val w = l.box.width().toFloat() / t.length.coerceAtLeast(1)
                    boxes.add(Rect((l.box.left + from * w).toInt() - 6, l.box.top - 6, (l.box.left + keep * w - w * 0.35f).toInt(), l.box.bottom + 6))
                }
            }
            boxes += qrBoxes(context, fileUri)
            if (boxes.isNotEmpty()) {
                masked = withContext(Dispatchers.Default) { blackOut(small.first, boxes) }
            }
        }
        return IdRead(type, number, name, out, masked, true)
    }

    /** The name on the card: the line after a "Name" label, or on an Aadhaar card the line above the date of birth. */
    private fun guessName(lines: List<String>, type: String?): String? {
        fun ok(s: String) = s.length in 3..60 && Regex("^[A-Za-z .']+$").matches(s) && !Regex("(?i)government|india|income|tax|department|male|female|dob|birth|address|father|signature|licen|union|republic|card").containsMatchIn(s)
        lines.forEachIndexed { i, l ->
            if (Regex("(?i)^\\s*(name|given name\\(?s?\\)?|holder'?s name)\\s*[:/]?\\s*$").matches(l)) lines.getOrNull(i + 1)?.trim()?.let { if (ok(it)) return it }
            Regex("(?i)^\\s*name\\s*[:/]\\s*(.+)$").find(l)?.groupValues?.get(1)?.trim()?.let { if (ok(it)) return it }
        }
        if (type == "aadhaar") {
            val dob = lines.indexOfFirst { Regex("(?i)DOB|Date of Birth|Year of Birth|जन्म").containsMatchIn(it) }
            if (dob > 0) for (j in dob - 1 downTo maxOf(0, dob - 3)) lines[j].trim().let { if (ok(it)) return it }
        }
        return null
    }

    private suspend fun qrBoxes(context: Context, uri: Uri): List<Rect> = try {
        val scanner = BarcodeScanning.getClient()
        val r = suspendCancellableCoroutine { c -> scanner.process(InputImage.fromFilePath(context, uri)).addOnSuccessListener { c.resume(it) }.addOnFailureListener { c.resume(null) } }
        scanner.close()
        r?.mapNotNull { it.boundingBox?.let { b -> Rect(b.left - 12, b.top - 12, b.right + 12, b.bottom + 12) } } ?: emptyList()
    } catch (_: Exception) { emptyList() } catch (_: LinkageError) { emptyList() }

    /** Paints solid black boxes over the photo (in place). */
    private fun blackOut(f: File, boxes: List<Rect>): Boolean = try {
        val bmp = BitmapFactory.decodeFile(f.path)?.copy(Bitmap.Config.ARGB_8888, true) ?: throw IllegalStateException()
        val c = Canvas(bmp); val p = Paint().apply { color = Color.BLACK; style = Paint.Style.FILL }
        boxes.forEach { c.drawRect(it, p) }
        f.outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 88, it) }
        true
    } catch (_: Exception) { false }
}
