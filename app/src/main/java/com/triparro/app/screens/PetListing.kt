package com.triparro.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.PaymentForm
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.priceLines
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Bordered
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.CheckRow
import com.triparro.app.ui.Chips
import com.triparro.app.ui.DateRangeField
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.PriceTable
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.SectionTitle
import com.triparro.app.ui.Segmented
import com.triparro.app.ui.Stars
import com.triparro.app.ui.Stepper
import com.triparro.app.ui.money
import com.triparro.app.ui.plural
import com.triparro.app.ui.shortDate
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

/** A pet host's page: photos, what they offer, rules, verified reviews, free places, and booking with the live price. */
@Composable
fun PetListingScreen(nav: NavHostController, id: Int) {
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    val l = rememberLoader(id) { Api.get("pets/listings/$id") }
    val meta = rememberLoader(session?.user?.id) { Api.get("pets/meta") }
    var saved by remember { mutableStateOf<Boolean?>(null) }

    var kind by remember { mutableStateOf("boarding") }
    var checkIn by remember { mutableStateOf("") }
    var checkOut by remember { mutableStateOf("") }
    val petIds = remember { mutableStateListOf<Int>() }
    var count by remember { mutableIntStateOf(1) }
    val extras = remember { mutableStateListOf<String>() }
    var plan by remember { mutableStateOf("full") }
    var coupon by remember { mutableStateOf("") }
    var couponApplied by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var wa by remember { mutableStateOf(true) }
    var agree by remember { mutableStateOf(false) }
    var quote by remember { mutableStateOf<JSONObject?>(null) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }

    val myPets = meta.data.value?.objs("pets") ?: emptyList()
    val signedIn = session?.user != null
    val nPets = if (signedIn && myPets.isNotEmpty()) petIds.size else count

    LaunchedEffect(id, kind, checkIn, checkOut, petIds.toList(), count, extras.toList(), plan, couponApplied) {
        quote = null
        if (checkIn.isEmpty() || checkOut.isEmpty() || nPets < 1) return@LaunchedEffect
        delay(250)
        try {
            quote = Api.get("pets/quote", mapOf("id" to id, "check_in" to checkIn, "check_out" to checkOut, "kind" to kind, "pay_plan" to plan,
                "extras" to extras.joinToString(",").ifEmpty { null }, "coupon" to couponApplied.ifEmpty { null },
                "pet_ids" to (if (signedIn && petIds.isNotEmpty()) petIds.joinToString(",") else null), "pets" to (if (signedIn && petIds.isNotEmpty()) null else nPets)))
        } catch (e: Exception) { err = errorText(e) }
    }

    fun book() {
        val q = quote ?: return
        if (!signedIn) { nav.navigate("login"); return }
        if (petIds.isEmpty()) { err = "Choose which of your pets are coming (add them in My pets)."; return }
        if (!agree) { err = "Please accept the cancellation policy and house rules."; return }
        busy = true; err = null
        scope.launch {
            try {
                val r = Api.post("pets/bookings", mapOf("id" to id, "check_in" to checkIn, "check_out" to checkOut, "kind" to kind, "pet_ids" to petIds.toList(),
                    "extras" to extras.toList(), "pay_plan" to plan, "name" to session?.user?.name, "email" to session?.user?.email, "phone" to phone.trim(),
                    "notes" to notes.trim(), "wa_optin" to wa, "agree" to true, "expected_total" to q.num("total"), "coupon" to (q.str("coupon") ?: "")))
                val ref = r.text("ref")
                AppState.refreshTick.value++
                if (r.text("next") == "payment") {
                    val pay = Api.post("pets/bookings/$ref/pay")
                    AppState.payment.value = PaymentForm(pay.text("action"), pay.obj("fields") ?: JSONObject(), "Pay securely")
                    nav.navigate("petbooking/$ref")
                    nav.navigate("pay")
                } else nav.navigate("petbooking/$ref")
            } catch (e: ApiException) { if (e.status == 401) nav.navigate("login") else err = e.message } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }

    val p = l.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar(p?.text("title") ?: "", { nav.popBackStack() }) {
            if (p != null && signedIn) IconButton(onClick = {
                val on = !(saved ?: p.bool("saved"))
                saved = on
                scope.launch { try { Api.post("pets/saved", mapOf("id" to id, "on" to on)) } catch (_: Exception) { saved = !on } }
            }) { val on = saved ?: p.bool("saved"); Icon(if (on) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, if (on) "Saved" else "Save", tint = if (on) Brand.Coral else Brand.InkSoft) }
        }
        when {
            p == null && l.loading.value -> Loading()
            p == null -> ErrorBox(l.error.value ?: "This pet host is not available.", { l.reload() })
            else -> Column(Modifier.verticalScroll(rememberScrollState())) {
                val gallery = p.strings("gallery").ifEmpty { listOfNotNull(p.str("image")) }
                val pager = rememberPagerState { gallery.size.coerceAtLeast(1) }
                Box {
                    HorizontalPager(state = pager) { i -> Photo(gallery.getOrNull(i), Modifier.fillMaxWidth().aspectRatio(1.5f), corner = 0.dp) }
                    if (gallery.size > 1) Text("${pager.currentPage + 1} / ${gallery.size}", color = Color.White, style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp).clip(RoundedCornerShape(50)).background(Color(0x99000000)).padding(horizontal = 10.dp, vertical = 4.dp))
                }
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(p.text("location"), color = Brand.InkSoft, modifier = Modifier.weight(1f))
                        Stars(p.num("rating"), p.int("reviews"))
                    }
                    Text(p.text("title"), style = MaterialTheme.typography.headlineSmall)
                    val host = p.obj("host")
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                        Text("Hosted by ${host?.text("person") ?: ""}", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
                        if (host?.bool("verified") == true) { Icon(Icons.Outlined.Verified, null, tint = Brand.Teal, modifier = Modifier.padding(start = 6.dp).size(16.dp)); Text(" Verified host", color = Brand.Teal, style = MaterialTheme.typography.bodySmall) }
                    }
                    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (p.bool("instant")) Pill("Instant booking", "info") else Pill("Host approves requests", "warn")
                        if (p.num("multi_discount")?.let { it > 0 } == true) Pill("${p.num("multi_discount")?.toInt()}% off 2nd pet", "ok")
                    }
                    Gap()
                    Text("${money(p.num("price"))} per pet / night" + (p.num("weekend_price")?.let { " · ${money(it)} Fri & Sat" } ?: "") + (p.num("daycare_price")?.let { " · daycare ${money(it)} / day" } ?: ""),
                        style = MaterialTheme.typography.titleMedium, color = Brand.BlueDark)
                    Gap()
                    Card {
                        SectionTitle("Pets welcome")
                        Text((p.strings("pet_types_label") + p.strings("sizes_label")).joinToString(" · "), color = Brand.InkSoft)
                        Text("Up to ${plural(p.int("capacity"), "pet")} at a time" + (if (p.bool("vaccination_required")) " · vaccination required" else ""), color = Brand.InkSoft)
                        p.str("breeds_note")?.let { Text(it, color = Brand.Muted, style = MaterialTheme.typography.bodySmall) }
                    }
                    p.str("description")?.let { Gap(); SectionTitle("About"); Text(it, color = Brand.InkSoft) }
                    if (p.strings("facilities").isNotEmpty()) { Gap(); SectionTitle("Facilities"); Chips(p.strings("facilities")) }
                    // Free places for the next weeks
                    val cal = p.objs("calendar").take(30)
                    if (cal.isNotEmpty()) {
                        Gap(); SectionTitle("Free places")
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(cal) { d ->
                                val free = d.int("free") > 0 && !d.bool("blocked")
                                Column(Modifier.clip(RoundedCornerShape(10.dp)).background(if (free) Color.White else Brand.Sky).padding(horizontal = 10.dp, vertical = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(shortDate(d.text("date")), style = MaterialTheme.typography.bodySmall)
                                    Text(if (d.bool("blocked")) "off" else if (free) "${d.int("free")} free" else "full", style = MaterialTheme.typography.bodySmall, color = if (free) Brand.TealDark else Brand.Muted)
                                }
                            }
                        }
                    }
                    Gap(); SectionTitle("Rules")
                    Text("Drop-off from ${p.text("checkin_time", "—")} · pick-up by ${p.text("checkout_time", "—")} · ${p.int("min_nights")}–${p.int("max_nights")} nights", color = Brand.InkSoft)
                    p.str("checkin_rules")?.let { Text("Bring: $it", color = Brand.InkSoft) }
                    p.str("house_rules")?.let { Text(it, color = Brand.InkSoft) }
                    p.obj("cancellation")?.let { Text("${it.text("name")} cancellation: ${it.text("text")}", color = Brand.InkSoft, modifier = Modifier.padding(top = 4.dp)) }

                    // Booking
                    Gap(18)
                    Card {
                        SectionTitle("Book a stay")
                        if (p.num("daycare_price") != null) { Segmented(listOf("boarding" to "Boarding", "daycare" to "Daycare"), kind) { kind = it }; Gap(8) }
                        DateRangeField(checkIn, checkOut, { a, b -> checkIn = a; checkOut = b })
                        Gap(8)
                        if (signedIn && myPets.isNotEmpty()) {
                            Text("Which pets are coming?", style = MaterialTheme.typography.titleSmall)
                            myPets.forEach { pet ->
                                val pid = pet.int("id")
                                val ok = pet.text("type") in p.strings("pet_types")
                                CheckRow((petEmoji[pet.text("type")] ?: "🐾") + " " + pet.text("name"), pid in petIds, { if (it) petIds.add(pid) else petIds.remove(pid) },
                                    note = if (ok) pet.str("breed") else "This host does not take this kind of pet")
                            }
                            OutlinedButton(onClick = { nav.navigate("petform/0") }) { Text("Add a pet") }
                        } else {
                            Stepper("Pets", count, { count = it }, min = 1, max = p.int("capacity").coerceAtLeast(1))
                            Notice(if (signedIn) "Add your pets in My pets to book — their care notes go to the host." else "Sign in and add your pets to book.", "info")
                            Gap(6)
                            OutlinedButton(onClick = { nav.navigate(if (signedIn) "petform/0" else "login") }) { Text(if (signedIn) "Add a pet" else "Sign in") }
                        }
                        val ex = p.objs("extras")
                        if (ex.isNotEmpty()) {
                            Gap(8); Text("Extra services", style = MaterialTheme.typography.titleSmall)
                            ex.forEach { x ->
                                val k = x.text("key")
                                CheckRow("${x.text("name")} · ${money(x.num("price"))}" + when (x.text("per")) { "night" -> " per night"; "pet" -> " per pet per night"; else -> "" },
                                    k in extras, { if (it) extras.add(k) else extras.remove(k) })
                            }
                        }
                        if ((p.num("deposit_percent") ?: 0.0) > 0) {
                            Gap(8)
                            CheckRow("Pay in full now", plan == "full", { plan = "full" })
                            CheckRow("Pay a ${p.num("deposit_percent")?.toInt()}% deposit now", plan == "deposit", { plan = "deposit" }, note = "The rest is paid by check-in")
                        }
                        Gap(8)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Field("Coupon code", coupon, { coupon = it.uppercase() }, Modifier.weight(1f))
                            OutlinedButton(onClick = { couponApplied = coupon.trim() }, modifier = Modifier.padding(start = 8.dp)) { Text("Apply") }
                        }
                        val q = quote
                        if (q != null) {
                            Gap(8)
                            (q.strings("errors") + q.strings("suitability")).forEach { Notice(it, "bad"); Gap(4) }
                            q.str("coupon_error")?.let { Notice(it, "warn"); Gap(4) }
                            if (q.priceLines().isNotEmpty()) Bordered {
                                Column {
                                    q.num("free")?.let { Text(if (it > 0) "${plural(it.toInt(), "place")} free for these dates" else "No places free for these dates", color = if (it > 0) Brand.TealDark else Brand.Warn, style = MaterialTheme.typography.bodySmall) }
                                    PriceTable(q.priceLines(), q.num("total"), extra = if (plan == "deposit") listOf("Deposit now" to money(q.num("pay_now"))) else emptyList())
                                }
                            }
                        }
                        Gap(8)
                        Field("Mobile number", phone, { phone = it }, keyboard = KeyboardType.Phone)
                        Gap(6)
                        Field("Message to the host (optional)", notes, { notes = it }, lines = 2)
                        CheckRow("Send booking updates on WhatsApp", wa, { wa = it }, note = "Reply STOP any time to turn them off")
                        CheckRow("I accept the cancellation policy and house rules", agree, { agree = it })
                        err?.let { Gap(6); Notice(it, "bad") }
                        Gap(8)
                        PrimaryButton(if (p.bool("instant")) "Book and pay" else "Send request", { book() }, enabled = quote?.bool("ok") == true, loading = busy, coral = true)
                        if (!p.bool("instant")) Text("The host answers within a day. You pay only after they accept.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
                    }
                    // Reviews
                    val reviews = p.objs("review_list")
                    Gap(18); SectionTitle("Verified reviews")
                    if (reviews.isEmpty()) Text("No reviews yet. Only pet parents who completed a stay here can review it.", color = Brand.InkSoft)
                    reviews.forEach { r ->
                        Card(Modifier.padding(bottom = 8.dp)) {
                            Row { Text(r.text("name"), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f)); Stars(r.num("overall")) }
                            Text("Verified stay · ${r.text("date")}", style = MaterialTheme.typography.bodySmall, color = Brand.TealDark)
                            r.str("body")?.let { Text(it, color = Brand.InkSoft) }
                            r.str("host_response")?.let { Text("Host's reply: $it", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(top = 4.dp)) }
                        }
                    }
                    Gap(30)
                }
            }
        }
    }
}
