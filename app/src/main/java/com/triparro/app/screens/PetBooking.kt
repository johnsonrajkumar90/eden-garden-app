package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.PaymentForm
import com.triparro.app.core.Api
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.copyToCache
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.priceLines
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.openLink
import com.triparro.app.openPdf
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.KeyValue
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.PriceTable
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.SectionTitle
import com.triparro.app.ui.StarPicker
import com.triparro.app.ui.Stars
import com.triparro.app.ui.dateTime
import com.triparro.app.ui.money
import com.triparro.app.ui.plural
import com.triparro.app.ui.prettyDate
import kotlinx.coroutines.launch
import org.json.JSONObject

private val steps = listOf("awaiting_approval" to "Request sent", "awaiting_payment" to "Payment", "confirmed" to "Confirmed", "checked_in" to "Checked in", "checked_out" to "Checked out")

/** A pet boarding booking: progress, the private Pet Stay Diary, price, pay, cancel, review, receipt. */
@Composable
fun PetBookingScreen(nav: NavHostController, ref: String, notice: String?) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val tick by AppState.refreshTick
    val l = rememberLoader(ref, tick) { Api.get("pets/bookings/$ref") }
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf<String?>(null) }
    var cancelQuote by remember { mutableStateOf<JSONObject?>(null) }
    val stars = remember { mutableStateMapOf<String, Int>() }
    var reviewBody by remember { mutableStateOf("") }
    val reviewPhotos = remember { mutableStateListOf<Uri>() }
    val pickPhotos = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(4)) { reviewPhotos.clear(); reviewPhotos.addAll(it) }
    val b = l.data.value

    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar("Pet booking $ref", { nav.popBackStack() })
        when {
            b == null && l.loading.value -> Loading()
            b == null -> ErrorBox(l.error.value ?: "Booking not found.", { l.reload() })
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                when (notice) {
                    "paid" -> Notice("Payment received — your pet's stay is confirmed. We've emailed the details.", "ok")
                    "failed" -> Notice("The payment did not go through. Nothing was charged — you can try again below.", "bad")
                    "refund" -> Notice("The place was taken before your payment arrived. Your money will be refunded in full.", "warn")
                }
                if (notice != null) Gap()
                val li = b.obj("listing") ?: JSONObject()
                val status = b.text("status")
                val closed = status in listOf("cancelled", "refunded")
                Card {
                    Photo(li.str("image"), Modifier.fillMaxWidth().aspectRatio(2f))
                    Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) { Pill(b.text("status_label"), b.text("status_tone")); Pill(b.text("payment_label"), b.text("payment_tone")) }
                    Text(li.text("title"), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 6.dp).clickable { nav.navigate("petlisting/${li.int("id")}") })
                    Text(li.str("address") ?: li.text("location"), color = Brand.Muted, style = MaterialTheme.typography.bodySmall)
                    Gap(8)
                    val unit = if (b.text("booking_kind") == "daycare") "day" else "night"
                    KeyValue("Drop-off", prettyDate(b.str("check_in")) + (b.str("checkin_time")?.let { " from $it" } ?: ""))
                    KeyValue("Pick-up", prettyDate(b.str("check_out")) + (b.str("checkout_time")?.let { " by $it" } ?: ""))
                    KeyValue("Stay", plural(b.int("nights"), unit) + " · " + b.objs("pets").joinToString(", ") { (petEmoji[it.text("type")] ?: "🐾") + " " + it.text("name") })
                }
                if (!closed) {
                    Gap()
                    val order = steps.map { it.first }
                    val cur = when (status) { "in_progress" -> "checked_in"; "completed" -> "checked_out"; else -> status }
                    val idx = order.indexOf(cur).coerceAtLeast(0)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        steps.forEachIndexed { i, (k, label) ->
                            if (k == "awaiting_approval" && b.objs("events").none { it.text("status") == "awaiting_approval" }) return@forEachIndexed
                            val done = i < idx || (i == idx && (status == "confirmed" || status == "completed" || status == "checked_out"))
                            val now = i == idx && !done
                            Text(label, style = MaterialTheme.typography.bodySmall, color = if (now) Color.White else if (done) Brand.TealDark else Brand.Muted,
                                modifier = Modifier.weight(1f).clip(CircleShape).background(if (now) Brand.Blue else if (done) Brand.TealSoft else Brand.Sky).padding(vertical = 6.dp, horizontal = 4.dp),
                                maxLines = 1, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                    }
                } else {
                    Gap(); Notice("This booking is ${if (status == "refunded") "cancelled and refunded" else "cancelled"}" + (b.str("cancel_reason")?.let { ": $it" } ?: ".") +
                        (if ((b.num("refund") ?: 0.0) > 0 && status != "refunded") " A refund of ${money(b.num("refund"))} is on its way." else ""), "warn")
                }
                msg?.let { Gap(); Notice(it, "bad") }
                // Pay
                if ((b.num("pay_now") ?: 0.0) > 0 && b.str("pay_kind") != null) {
                    Gap()
                    Card {
                        Text(when (b.text("pay_kind")) { "deposit" -> "Deposit to confirm"; "balance" -> "Balance due"; else -> "To pay now" }, color = Brand.InkSoft)
                        Text(money(b.num("pay_now")), style = MaterialTheme.typography.headlineSmall, color = Brand.BlueDark)
                        b.str("hold_until")?.let { if (status == "awaiting_payment") Text("Pay by ${dateTime(it)} to keep the place.", color = Brand.Warn, style = MaterialTheme.typography.bodySmall) }
                        Gap(8)
                        PrimaryButton("Pay ${money(b.num("pay_now"))}", {
                            busy = true; msg = null
                            scope.launch {
                                try {
                                    val p = Api.post("pets/bookings/$ref/pay")
                                    AppState.payment.value = PaymentForm(p.text("action"), p.obj("fields") ?: JSONObject(), "Pay securely")
                                    nav.navigate("pay")
                                } catch (e: Exception) { msg = errorText(e) }
                                busy = false
                            }
                        }, loading = busy, coral = true)
                    }
                }
                // Review
                val rev = b.obj("review")
                if (rev != null) {
                    Gap(); Card {
                        SectionTitle("Your review"); Stars(rev.num("overall"))
                        rev.str("body")?.let { Text(it, color = Brand.InkSoft) }
                        rev.str("host_response")?.let { Text("Host's reply: $it", style = MaterialTheme.typography.bodySmall, color = Brand.TealDark, modifier = Modifier.padding(top = 4.dp)) }
                    }
                } else if (b.bool("can_review")) {
                    Gap(); Card {
                        SectionTitle("How was your pet's stay?")
                        val parts = b.obj("review_parts")?.let { o -> o.keys().asSequence().map { it to o.optString(it) }.toList() }
                            ?: listOf("overall" to "Overall", "cleanliness" to "Cleanliness", "safety" to "Pet safety", "communication" to "Host communication", "value" to "Value for money")
                        parts.forEach { (k, label) -> StarPicker(label, stars[k] ?: 0) { stars[k] = it } }
                        Field("Tell other pet parents about it", reviewBody, { reviewBody = it }, lines = 3)
                        Gap(6)
                        OutlinedButton(onClick = { pickPhotos.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) {
                            Text(if (reviewPhotos.isEmpty()) "Add photos (up to 4)" else "${reviewPhotos.size} photos chosen")
                        }
                        Gap(6)
                        PrimaryButton("Publish review", {
                            busy = true; msg = null
                            scope.launch {
                                try {
                                    val files = reviewPhotos.mapIndexedNotNull { i, u -> copyToCache(ctx, u, "review$i")?.let { Upload("photos[]", it.first, it.second) } }
                                    Api.postMultipart("pets/bookings/$ref/review", parts.map { (k, _) -> k to (stars[k] ?: 0).toString() } + ("body" to reviewBody), files)
                                    l.reload()
                                } catch (e: Exception) { msg = errorText(e) }
                                busy = false
                            }
                        }, enabled = parts.all { (stars[it.first] ?: 0) > 0 }, loading = busy)
                    }
                }
                // Pet Stay Diary
                val diary = b.objs("diary")
                if (!closed) {
                    Gap(); Card {
                        SectionTitle("Pet Stay Diary")
                        Text("Photos, videos, meals, walks and notes from your host. Only you, your host and TripArro can see them.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                        if (diary.isEmpty()) {
                            Gap(8)
                            Notice(when (status) { "checked_in", "in_progress" -> "No updates yet — your host adds them during the stay."; "checked_out", "completed" -> "No diary updates for this stay."; else -> "The diary starts when your pet checks in." })
                        }
                        diary.reversed().forEach { d ->
                            Row(Modifier.padding(top = 12.dp)) {
                                Box(Modifier.size(36.dp).clip(CircleShape).background(Brand.TealSoft), contentAlignment = Alignment.Center) { Text(d.text("icon", "🐾")) }
                                Column(Modifier.padding(start = 10.dp).weight(1f)) {
                                    Text(d.text("label"), style = MaterialTheme.typography.titleSmall)
                                    Text(dateTime(d.str("at")), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                                    d.str("note")?.let { Text(it, color = Brand.InkSoft) }
                                    d.str("media")?.let { m ->
                                        if (d.text("media_type") == "video") OutlinedButton(onClick = { nav.navigate("video?url=" + android.net.Uri.encode(m)) }, modifier = Modifier.padding(top = 6.dp)) { Icon(Icons.Outlined.PlayCircle, null); Text(" Play video") }
                                        else Photo(m, Modifier.padding(top = 6.dp).fillMaxWidth().aspectRatio(1.3f).clickable { nav.navigate("photo?url=" + android.net.Uri.encode(m) + "&title=" + android.net.Uri.encode(d.text("label"))) })
                                    }
                                }
                            }
                        }
                    }
                }
                // Price
                Gap(); Card {
                    SectionTitle("Price")
                    PriceTable(b.priceLines(), b.num("total"), extra = listOf("Paid" to money(b.num("paid"))) + (if ((b.num("balance") ?: 0.0) > 0 && !closed) listOf("Balance" to money(b.num("balance"))) else emptyList()))
                }
                Gap(); Card {
                    SectionTitle("Your host")
                    val h = b.obj("host") ?: JSONObject()
                    Text(h.text("name"), color = Brand.InkSoft)
                    h.str("phone")?.let { ph -> OutlinedButton(onClick = { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$ph"))) }, modifier = Modifier.padding(top = 6.dp)) { Icon(Icons.Outlined.Call, null); Text(" $ph") } }
                        ?: Text("Contact details appear once the booking is confirmed.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                }
                b.arr2("cancellation")?.let { c -> Gap(); Text("${c.first} cancellation. ${c.second}", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft) }
                Gap()
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if ((b.num("paid") ?: 0.0) > 0) b.str("receipt_url")?.let { _ -> OutlinedButton(onClick = { nav.navigate("petreceipt/$ref") }) { Icon(Icons.Outlined.ReceiptLong, null); Text(" Receipt / invoice") } }
                }
                if (b.bool("can_cancel")) {
                    Gap()
                    TextButton(onClick = {
                        scope.launch { try { cancelQuote = Api.post("pets/bookings/$ref/cancel", mapOf("confirm" to false)).obj("quote") ?: JSONObject() } catch (e: Exception) { msg = errorText(e) } }
                    }, modifier = Modifier.fillMaxWidth()) { Text("Cancel booking", color = Brand.Danger) }
                }
                Gap(30)
            }
        }
    }
    cancelQuote?.let { q ->
        AlertDialog(onDismissRequest = { cancelQuote = null },
            title = { Text("Cancel this booking?") },
            text = { Text(if ((q.num("paid") ?: 0.0) > 0) "You paid ${money(q.num("paid"))}. Under this host's policy you get back ${money(q.num("refund"))} (${q.int("percent")}%)." else "Nothing has been paid, so nothing is charged.") },
            confirmButton = { TextButton(onClick = {
                cancelQuote = null
                scope.launch { try { Api.post("pets/bookings/$ref/cancel", mapOf("confirm" to true)); AppState.refreshTick.value++ } catch (e: Exception) { msg = errorText(e) } }
            }) { Text("Cancel booking", color = Brand.Danger) } },
            dismissButton = { TextButton(onClick = { cancelQuote = null }) { Text("Keep it") } })
    }
}

/** "cancellation": ["Moderate", "Full refund until…"] */
private fun JSONObject.arr2(k: String): Pair<String, String>? {
    val a = if (has(k) && !isNull(k)) optJSONArray(k) else null
    return if (a != null && a.length() >= 2) a.optString(0) to a.optString(1) else null
}

