@file:OptIn(ExperimentalMaterial3Api::class)

package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.PaymentForm
import com.triparro.app.core.Api
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.priceLines
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.openWeb
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.EmptyBox
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
import com.triparro.app.ui.dateTime
import com.triparro.app.ui.money
import com.triparro.app.ui.plural
import com.triparro.app.ui.prettyDate
import com.triparro.app.ui.shortDate
import com.triparro.app.ui.today
import kotlinx.coroutines.launch
import org.json.JSONObject

/** One trip in the list: a stay, a resort or a pet boarding booking. */
private data class Trip(val ref: String, val pet: Boolean, val title: String, val image: String?, val checkIn: String, val checkOut: String,
                        val status: String, val statusLabel: String, val tone: String, val sub: String)

/** My trips: stays, resorts and pet boarding together — Upcoming, Staying now, Completed, Cancelled. */
@Composable
fun TripsScreen(nav: NavHostController) {
    val session by Api.session.collectAsState()
    val tick by AppState.refreshTick
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val l = rememberLoader(session?.user?.id, tick) {
        if (session?.user == null) null else {
            val stays = Api.get("bookings")
            val pets = try { Api.get("pets/bookings") } catch (_: Exception) { JSONObject() }
            stays to pets
        }
    }
    Column(Modifier.fillMaxSize()) {
        Text("My trips", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.background(Color.White).fillMaxWidth().padding(16.dp))
        if (session?.user == null) {
            EmptyBox("Sign in to see your trips", "Your stays, resorts and pet boarding bookings appear here.", "Sign in") { nav.navigate("login") }
        } else TripsList(nav, tab, { tab = it }, l)
    }
}

@Composable
private fun TripsList(nav: NavHostController, tab: Int, setTab: (Int) -> Unit, l: Loader<Pair<JSONObject, JSONObject>?>) {
    Column(Modifier.fillMaxSize()) {
        val tabs = listOf("Upcoming", "Staying now", "Completed", "Cancelled")
        PrimaryScrollableTabRow(selectedTabIndex = tab, containerColor = Color.White, edgePadding = 8.dp) {
            tabs.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { setTab(i) }, text = { Text(t) }) }
        }
        val data = l.data.value
        when {
            data == null && l.loading.value -> Loading()
            data == null -> ErrorBox(l.error.value ?: "Could not load your trips.", { l.reload() })
            else -> {
                val (stays, pets) = data
                val now = today()
                val all = mutableListOf<Trip>()
                fun stayTrip(b: JSONObject) = Trip(b.text("ref"), false, b.obj("listing")?.text("title") ?: "", b.obj("listing")?.str("image"), b.text("check_in"), b.text("check_out"),
                    b.text("status"), b.text("status_label"), b.text("status_tone"), plural(b.int("nights"), "night") + " · " + plural(b.int("guests"), "guest"))
                fun petTrip(b: JSONObject) = Trip(b.text("ref"), true, b.obj("listing")?.text("title") ?: "", b.obj("listing")?.str("image"), b.text("check_in"), b.text("check_out"),
                    b.text("status"), b.text("status_label"), b.text("status_tone"), "Pet boarding · " + plural(b.int("pets_count"), "pet"))
                (stays.objs("upcoming") + stays.objs("past") + stays.objs("cancelled")).forEach { all.add(stayTrip(it)) }
                listOf("upcoming", "active", "completed", "cancelled").forEach { k -> pets.objs(k).forEach { all.add(petTrip(it)) } }
                val shown = all.filter { t ->
                    val cancelled = t.status in listOf("cancelled", "refunded")
                    val staying = !cancelled && (t.status in listOf("checked_in", "in_progress") || (!t.pet && t.status == "confirmed" && t.checkIn <= now && t.checkOut > now))
                    val done = !cancelled && !staying && (t.checkOut < now || t.status in listOf("checked_out", "completed"))
                    when (tab) { 0 -> !cancelled && !staying && !done; 1 -> staying; 2 -> done; else -> cancelled }
                }.let { if (tab == 0 || tab == 1) it.sortedBy { t -> t.checkIn } else it.sortedByDescending { t -> t.checkIn } }
                if (shown.isEmpty()) EmptyBox(listOf("No upcoming trips", "Nobody staying now", "No completed trips", "No cancelled trips")[tab],
                    "Find a stay or pet boarding and it will show here.", "Explore") { nav.navigate("explore") }
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(shown, key = { it.ref }) { t ->
                        Card(padding = 12.dp, onClick = { nav.navigate((if (t.pet) "petbooking/" else "booking/") + t.ref) }) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Photo(t.image, Modifier.width(88.dp).aspectRatio(1f))
                                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                                    Text(t.title, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                                    Text("${shortDate(t.checkIn)} → ${shortDate(t.checkOut)}", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                                    Text(t.sub, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                                    Row(Modifier.padding(top = 4.dp)) { Pill(t.statusLabel, t.tone) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** A stay or resort booking: status, price, pay the balance, invoice, directions, cancel, review, messages. */
@Composable
fun BookingScreen(nav: NavHostController, ref: String, notice: String?) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val tick by AppState.refreshTick
    val l = rememberLoader(ref, tick) { Api.get("bookings/$ref") }
    var cancelQuote by remember { mutableStateOf<JSONObject?>(null) }
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf<String?>(null) }
    var rating by remember { mutableIntStateOf(0) }
    var reviewText by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    val b = l.data.value

    fun pay(kind: String) {
        busy = true; msg = null
        scope.launch {
            try {
                val p = Api.post("payments", mapOf("ref" to ref, "kind" to kind))
                AppState.payment.value = PaymentForm(p.text("action"), p.obj("fields") ?: JSONObject(), "Pay securely")
                nav.navigate("pay")
            } catch (e: Exception) { msg = errorText(e) }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar("Booking $ref", { nav.popBackStack() })
        when {
            b == null && l.loading.value -> Loading()
            b == null -> ErrorBox(l.error.value ?: "Booking not found.", { l.reload() })
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                when (notice) {
                    "paid" -> Notice("Payment received — your booking is confirmed. We have emailed the details.", "ok")
                    "failed" -> Notice("The payment did not go through. Nothing was charged — you can try again below.", "bad")
                    "refund" -> Notice("The dates were taken before your payment arrived. Your money will be refunded in full.", "warn")
                }
                if (notice != null) Gap()
                val li = b.obj("listing") ?: JSONObject()
                Card {
                    Photo(li.str("image"), Modifier.fillMaxWidth().aspectRatio(2f))
                    Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) { Pill(b.text("status_label"), b.text("status_tone")); Pill(b.text("payment_label"), b.text("payment_tone")) }
                    Text(li.text("title"), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 6.dp))
                    li.str("room")?.let { Text(it, color = Brand.InkSoft) }
                    Text(li.text("location"), color = Brand.Muted, style = MaterialTheme.typography.bodySmall)
                    Gap(8)
                    KeyValue("Check-in", prettyDate(b.str("check_in")))
                    KeyValue("Check-out", prettyDate(b.str("check_out")))
                    KeyValue("Guests", plural(b.int("guests"), "guest") + " · " + plural(b.int("nights"), "night"))
                    KeyValue("Reference", ref)
                }
                b.str("approval")?.let { a ->
                    Gap()
                    Notice(when (a) {
                        "requested" -> "Waiting for the host to accept your request" + (b.str("deadline")?.let { " (by ${dateTime(it)})" } ?: "") + ". Nothing is charged yet."
                        "approved" -> "The host accepted your request. Pay" + (b.str("deadline")?.let { " by ${dateTime(it)}" } ?: "") + " to confirm."
                        "rejected" -> "The host declined this request" + (b.str("approval_note")?.let { ": $it" } ?: ".") + " Nothing was charged."
                        else -> "This request expired. Nothing was charged."
                    }, if (a == "approved" || a == "requested") "info" else "warn")
                }
                Gap()
                Card {
                    SectionTitle("Price")
                    val br = b.obj("breakup")
                    if (br != null) PriceTable(listOfNotNull(
                        com.triparro.app.core.PriceLine(br.text("base_label", "Stay"), br.num("base") ?: 0.0),
                        if ((br.num("property_discount") ?: 0.0) > 0) com.triparro.app.core.PriceLine("Discount", -(br.num("property_discount") ?: 0.0)) else null,
                    ) + br.objs("tax_lines").map { com.triparro.app.core.PriceLine(it.text("label"), it.num("amount") ?: 0.0) } +
                        listOfNotNull(if ((br.num("promotion") ?: 0.0) > 0) com.triparro.app.core.PriceLine("Promotion", -(br.num("promotion") ?: 0.0)) else null),
                        b.num("total"), extra = listOf("Paid" to money(b.num("paid")), "Balance" to money(b.num("balance"))))
                    else PriceTable(emptyList(), b.num("total"), extra = listOf("Paid" to money(b.num("paid")), "Balance" to money(b.num("balance"))))
                }
                msg?.let { Gap(); Notice(it, "bad") }
                Gap()
                if (b.bool("can_pay") && (b.num("balance") ?: 0.0) > 0) {
                    val confirmed = b.text("status") == "confirmed"
                    if (confirmed) PrimaryButton("Pay the balance · ${money(b.num("balance"))}", { pay("balance") }, loading = busy, coral = true)
                    else {
                        if (b.bool("pay_full")) PrimaryButton("Pay ${money(b.num("total"))}", { pay("full") }, loading = busy, coral = true)
                        if ((b.num("advance") ?: 0.0) > 0) { Gap(8); OutlinedButton(onClick = { pay("advance") }, modifier = Modifier.fillMaxWidth()) { Text("Pay the advance · ${money(b.num("advance"))}") } }
                    }
                    Gap(8)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    b.str("invoice_url")?.let { u -> OutlinedButton(onClick = { nav.openWeb(u, "Invoice") }) { Icon(Icons.Outlined.ReceiptLong, null); Text(" Invoice") } }
                    b.str("directions_url")?.let { u -> OutlinedButton(onClick = { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) }) { Icon(Icons.Outlined.Directions, null); Text(" Directions") } }
                    b.obj("host")?.str("phone")?.let { ph -> OutlinedButton(onClick = { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$ph"))) }) { Icon(Icons.Outlined.Call, null); Text(" Host") } }
                }
                b.obj("online_checkin")?.let { oc ->
                    if (!oc.bool("checked_in")) { Gap(8); OutlinedButton(onClick = { nav.openWeb(oc.text("url"), "Online check-in") }, modifier = Modifier.fillMaxWidth()) {
                        Text(if (oc.bool("done")) "Online check-in sent ✓ — view" else "Check in online before you arrive") } }
                }
                if (b.bool("can_message")) {
                    Gap(); Card {
                        SectionTitle("Messages")
                        b.objs("messages").forEach { m -> Text("${m.text("from").replaceFirstChar { it.uppercase() }} · ${dateTime(m.str("at"))}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted); Text(m.text("body"), modifier = Modifier.padding(bottom = 6.dp)) }
                        Field("Write to the host", message, { message = it }, lines = 2)
                        Gap(6)
                        PrimaryButton("Send", {
                            busy = true
                            scope.launch { try { Api.post("bookings/$ref/message", mapOf("message" to message)); message = ""; l.reload() } catch (e: Exception) { msg = errorText(e) }; busy = false }
                        }, enabled = message.isNotBlank(), loading = busy)
                    }
                }
                if (b.bool("can_review")) {
                    Gap(); Card {
                        SectionTitle("How was your stay?")
                        StarPicker("Your rating", rating) { rating = it }
                        Field("Tell other guests about it", reviewText, { reviewText = it }, lines = 3)
                        Gap(6)
                        PrimaryButton("Publish review", {
                            busy = true
                            scope.launch { try { Api.post("bookings/$ref/review", mapOf("rating" to rating, "body" to reviewText)); l.reload() } catch (e: Exception) { msg = errorText(e) }; busy = false }
                        }, enabled = rating > 0, loading = busy)
                    }
                }
                if (b.bool("can_cancel")) {
                    Gap()
                    TextButton(onClick = {
                        scope.launch { try { cancelQuote = Api.post("refunds", mapOf("ref" to ref, "confirm" to false)).obj("quote") ?: JSONObject() } catch (e: Exception) { msg = errorText(e) } }
                    }, modifier = Modifier.fillMaxWidth()) { Text("Cancel booking", color = Brand.Danger) }
                }
                Gap(30)
            }
        }
    }
    cancelQuote?.let { q ->
        AlertDialog(onDismissRequest = { cancelQuote = null },
            title = { Text("Cancel this booking?") },
            text = { Text(if ((q.num("paid") ?: 0.0) > 0) "You paid ${money(q.num("paid"))}. Under the policy you get back ${money(q.num("refund"))} (${q.int("percent")}%)." else "Nothing has been paid, so nothing is charged.") },
            confirmButton = { TextButton(onClick = {
                cancelQuote = null
                scope.launch { try { Api.post("refunds", mapOf("ref" to ref, "confirm" to true)); AppState.refreshTick.value++ } catch (e: Exception) { msg = errorText(e) } }
            }) { Text("Cancel booking", color = Brand.Danger) } },
            dismissButton = { TextButton(onClick = { cancelQuote = null }) { Text("Keep it") } })
    }
}

