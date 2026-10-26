@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class, androidx.compose.foundation.ExperimentalFoundationApi::class)
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
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material.icons.outlined.Vaccines
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.ui.text.style.TextOverflow
import com.triparro.app.ui.AmenityGrid
import com.triparro.app.ui.Avatar
import com.triparro.app.ui.DetailSection
import com.triparro.app.ui.ExpandRow
import com.triparro.app.ui.FactTiles
import com.triparro.app.ui.HeroGallery
import com.triparro.app.ui.PriceBar
import com.triparro.app.ui.RatingBadge
import com.triparro.app.ui.TimeTiles
import com.triparro.app.ui.TitleCard
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Share
import com.triparro.app.ui.RoundAction
import com.triparro.app.ui.shareLink
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
    val ctx = LocalContext.current
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
    val scroll = rememberScrollState()
    val bookingView = remember { BringIntoViewRequester() }
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        if (p == null) BackBar("", { nav.popBackStack() })
        when {
            p == null && l.loading.value -> Loading()
            p == null -> ErrorBox(l.error.value ?: "This pet host is not available.", { l.reload() })
            else -> Column(Modifier.fillMaxSize()) { Column(Modifier.weight(1f).verticalScroll(scroll)) {
                val gallery = p.strings("gallery").ifEmpty { listOfNotNull(p.str("image")) }
                HeroGallery(gallery, onOpen = { u -> nav.navigate("photo?url=" + android.net.Uri.encode(u) + "&title=" + android.net.Uri.encode(p.text("title"))) }) {
                    RoundAction(Icons.AutoMirrored.Filled.ArrowBack, "Back") { nav.popBackStack() }
                    Spacer(Modifier.weight(1f))
                    RoundAction(Icons.Outlined.Share, "Share") { shareLink(ctx, p.text("title"), Api.url("pet-boarding/$id")) }
                    if (signedIn) {
                        val on = saved ?: p.bool("saved")
                        RoundAction(if (on) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, if (on) "Saved" else "Save", tint = if (on) Brand.Coral else Brand.Ink) {
                            val next = !(saved ?: p.bool("saved"))
                            saved = next
                            scope.launch { try { Api.post("pets/saved", mapOf("id" to id, "on" to next)) } catch (_: Exception) { saved = !next } }
                        }
                    }
                }
                Box(Modifier.offset(y = (-30).dp)) {
                    TitleCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Place, null, tint = Brand.Teal, modifier = Modifier.size(16.dp))
                            Text(" " + p.text("location"), color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 1)
                        }
                        Text(p.text("title"), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 4.dp, bottom = 10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            RatingBadge(p.num("rating"), p.int("reviews"))
                            if (p.bool("instant")) Pill("⚡ Instant booking", "info") else Pill("Host approves", "warn")
                        }
                        val host = p.obj("host")
                        Row(Modifier.padding(top = 14.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brand.Page).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Avatar((host?.text("person") ?: "").split(" ").mapNotNull { it.firstOrNull()?.toString() }.take(2).joinToString(""), 42.dp)
                            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                                Text("Hosted by ${host?.text("person") ?: ""}", style = MaterialTheme.typography.titleSmall)
                                if (host?.bool("verified") == true) Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.Verified, null, tint = Brand.Teal, modifier = Modifier.size(14.dp))
                                    Text(" Verified pet host — ID and home checked", color = Brand.TealDark, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                        Gap(14)
                        FactTiles(listOfNotNull(
                            Icons.Outlined.Pets to "Up to ${plural(p.int("capacity"), "pet")}",
                            if (p.bool("vaccination_required")) Icons.Outlined.Vaccines to "Vaccination required" else null,
                            p.num("multi_discount")?.takeIf { it > 0 }?.let { Icons.Outlined.LocalOffer to "${it.toInt()}% off 2nd pet" },
                            p.num("daycare_price")?.let { Icons.Outlined.WbSunny to "Daycare ${money(it)}/day" }))
                    }
                }
                Column(Modifier.offset(y = (-24).dp)) {
                    DetailSection("Pets welcome", Icons.Outlined.Pets) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            (p.strings("pet_types_label") + p.strings("sizes_label")).forEach { t ->
                                Text(t, style = MaterialTheme.typography.labelLarge, color = Brand.TealDark, modifier = Modifier.clip(RoundedCornerShape(50)).background(Brand.TealSoft).padding(horizontal = 12.dp, vertical = 7.dp))
                            }
                        }
                        p.str("breeds_note")?.let { Text(it, color = Brand.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
                    }
                    DetailSection("Prices", Icons.Outlined.Sell) {
                        PriceRow("Boarding", "${money(p.num("price"))} per pet / night")
                        p.num("weekend_price")?.let { PriceRow("Fri & Sat nights", "${money(it)} per pet") }
                        p.num("daycare_price")?.let { PriceRow("Daycare", "${money(it)} per pet / day") }
                        p.objs("extras").forEach { x -> PriceRow(x.text("name"), money(x.num("price")) + when (x.text("per")) { "night" -> " / night"; "pet" -> " / pet / night"; else -> "" }) }
                        if ((p.num("deposit_percent") ?: 0.0) > 0) Text("Pay a ${p.num("deposit_percent")?.toInt()}% deposit to confirm, the rest by check-in.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
                    }
                    p.str("description")?.let { d -> DetailSection("About", Icons.Outlined.Info) { ExpandText(d) } }
                    if (p.strings("facilities").isNotEmpty()) DetailSection("Facilities", Icons.Outlined.Checklist) { AmenityGrid(p.strings("facilities")) }
                    // Free places for the next weeks
                    val cal = p.objs("calendar").take(30)
                    if (cal.isNotEmpty()) DetailSection("Free places", Icons.Outlined.CalendarMonth, sub = "The next few weeks") {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(cal) { d ->
                                val free = d.int("free") > 0 && !d.bool("blocked")
                                Column(Modifier.width(62.dp).clip(RoundedCornerShape(14.dp)).background(if (free) Brand.TealSoft else Brand.Page).padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(shortDate(d.text("date")).substringBefore(" "), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                                    Text(shortDate(d.text("date")).substringAfter(" "), style = MaterialTheme.typography.titleSmall)
                                    Text(if (d.bool("blocked")) "off" else if (free) "${d.int("free")} free" else "full", style = MaterialTheme.typography.labelSmall, color = if (free) Brand.TealDark else Brand.Muted)
                                }
                            }
                        }
                    }
                    DetailSection("Drop-off and pick-up", Icons.Outlined.Schedule, sub = "${p.int("min_nights")}–${p.int("max_nights")} nights") {
                        TimeTiles("Drop-off from", p.text("checkin_time", "—"), "Pick-up by", p.text("checkout_time", "—"))
                    }
                    val bring = p.str("checkin_rules"); val houseRules = p.str("house_rules")
                    if (bring != null || houseRules != null) DetailSection("Things to know", Icons.Outlined.Lightbulb) {
                        bring?.let { ExpandRow("What to bring", it, startOpen = true) }
                        houseRules?.let { ExpandRow("House rules", it) }
                    }
                    p.obj("cancellation")?.let { c -> DetailSection("Cancellation", Icons.Outlined.EventAvailable, sub = c.text("name")) { Text(c.text("text"), color = Brand.InkSoft) } }

                    // Booking
                    Box(Modifier.bringIntoViewRequester(bookingView)) {
                    DetailSection("Book a stay", Icons.Outlined.EventAvailable, sub = if (p.bool("instant")) "Confirmed as soon as you pay" else "The host answers within a day") {
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
                    }
                    // Reviews
                    val reviews = p.objs("review_list")
                    DetailSection("Verified reviews", Icons.Outlined.StarOutline, sub = "Only pet parents who completed a stay can review") {
                        if (reviews.isEmpty()) Text("No reviews yet.", color = Brand.InkSoft)
                        else LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(reviews) { r ->
                                Column(Modifier.width(260.dp).clip(RoundedCornerShape(18.dp)).background(Brand.Page).padding(14.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Avatar(r.text("name").take(1), 34.dp)
                                        Column(Modifier.padding(start = 8.dp).weight(1f)) { Text(r.text("name"), style = MaterialTheme.typography.titleSmall); Text("Verified stay · ${r.text("date")}", style = MaterialTheme.typography.labelSmall, color = Brand.TealDark) }
                                        Stars(r.num("overall"))
                                    }
                                    r.str("body")?.let { Text(it, color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium, maxLines = 5, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 8.dp)) }
                                    r.str("host_response")?.let { Text("Host's reply: $it", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, maxLines = 3, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp)) }
                                }
                            }
                        }
                    }
                    Gap(8)
                }
            }
            PriceBar(money(p.num("price")), "/ pet / night", note = if (p.bool("instant")) "Instant booking" else "You pay after the host accepts") {
                Button(onClick = { scope.launch { bookingView.bringIntoView() } }, shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Brand.CoralDark),
                    contentPadding = PaddingValues(horizontal = 22.dp, vertical = 14.dp)) { Text("Book a stay", style = MaterialTheme.typography.labelLarge) }
            }
            }
        }
    }
}

@Composable
private fun PriceRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.titleSmall, color = Brand.Ink)
    }
}
