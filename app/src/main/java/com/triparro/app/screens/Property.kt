@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.outlined.Bathtub
import androidx.compose.material.icons.outlined.Bed
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.text.style.TextOverflow
import com.triparro.app.ui.AmenityGrid
import com.triparro.app.ui.Avatar
import com.triparro.app.ui.DetailSection
import com.triparro.app.ui.ExpandRow
import com.triparro.app.ui.FactTiles
import com.triparro.app.ui.HeroGallery
import com.triparro.app.ui.PriceBar
import com.triparro.app.ui.RatingBadge
import com.triparro.app.ui.RefundTimeline
import com.triparro.app.ui.TimeTiles
import com.triparro.app.ui.TitleCard
import androidx.compose.foundation.layout.offset
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Share
import com.triparro.app.ui.RoundAction
import com.triparro.app.ui.shareLink
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.ReserveDraft
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.arr
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.intOrNull
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.priceLines
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.openLink
import com.triparro.app.openPdf
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
import com.triparro.app.ui.Stars
import com.triparro.app.ui.Stepper
import com.triparro.app.ui.money
import com.triparro.app.ui.plural
import kotlinx.coroutines.launch
import org.json.JSONObject

/** A stay or resort: photos, details, rules, reviews and the booking panel (dates, guests, extra guests, rooms, live price). */
@Composable
fun PropertyScreen(nav: NavHostController, kind: String, id: Int) {
    val ctx = LocalContext.current
    val l = rememberLoader(kind, id) { Api.get("properties/$id", mapOf("kind" to kind)) }
    var sheet by remember { mutableStateOf(false) }
    val p = l.data.value

    LaunchedEffect(kind, id) { try { Api.post("visit", mapOf("kind" to kind, "id" to id)) } catch (_: Exception) { } }

    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        if (p == null) BackBar("", { nav.popBackStack() })
        when {
            p == null && l.loading.value -> Loading()
            p == null -> ErrorBox(l.error.value ?: "Not found.", { l.reload() })
            else -> {
                val price = p.obj("price") ?: JSONObject()
                val photos = p.objs("photos").map { it.text("url") }.ifEmpty { listOfNotNull(p.str("image")) }
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                    HeroGallery(photos, onOpen = { u -> nav.navigate("photo?url=" + android.net.Uri.encode(u) + "&title=" + android.net.Uri.encode(p.text("title"))) }) {
                        RoundAction(Icons.AutoMirrored.Filled.ArrowBack, "Back") { nav.popBackStack() }
                        Spacer(Modifier.weight(1f))
                        RoundAction(Icons.Outlined.Share, "Share") { shareLink(ctx, p.text("title"), Api.url((if (kind == "resort") "resorts/" else "stays/") + id)) }
                    }
                    // title card over the photos
                    Box(Modifier.offset(y = (-30).dp)) {
                        TitleCard {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Place, null, tint = Brand.Teal, modifier = Modifier.size(16.dp))
                                Text(" " + listOfNotNull(p.str("area"), p.str("location")).joinToString(", "), color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 1)
                            }
                            Text(p.text("title"), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 4.dp, bottom = 10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                RatingBadge(p.num("rating"), p.int("reviews"))
                                val b = p.obj("badges") ?: JSONObject()
                                if (b.bool("verified")) Pill("✓ Verified", "ok")
                                if (b.bool("favourite")) Pill("Guest favourite", "info")
                            }
                            if (p.text("booking_mode") == "request") { Gap(8); Notice("The host approves each request — you pay only after they accept.", "warn") }
                            val facts = p.objs("facts").map { it.text("value") }
                            if (facts.isNotEmpty()) {
                                Gap(14)
                                FactTiles(facts.map { f -> (when { "bed" in f.lowercase() -> Icons.Outlined.Bed; "bath" in f.lowercase() -> Icons.Outlined.Bathtub; "guest" in f.lowercase() || "up to" in f.lowercase() -> Icons.Outlined.People; else -> Icons.Outlined.Home }) to f })
                            }
                        }
                    }
                    Column(Modifier.offset(y = (-24).dp)) {
                        // Guests: included, extra guests and their charge (also what TripArro AI explains)
                        val g = p.obj("guests")
                        val extraPolicy = p.objs("policies").firstOrNull { it.text("title").startsWith("Extra guests") }
                        if (g != null || extraPolicy != null) DetailSection("Guests", Icons.Outlined.People) {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                g?.intOrNull("included")?.let { GuestStat("$it", "included in the price", Modifier.weight(1f)) }
                                g?.intOrNull("max")?.let { GuestStat("$it", "guests at most", Modifier.weight(1f)) }
                            }
                            if (extraPolicy != null) { Gap(10); Text(extraPolicy.text("text"), color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium) }
                        }
                        p.str("description")?.let { d -> DetailSection("About this place", Icons.Outlined.Info) { ExpandText(d) } }
                        val amen = p.strings("amenities")
                        if (amen.isNotEmpty()) DetailSection("What this place offers", Icons.Outlined.Checklist) { AmenityGrid(amen) }
                        val rooms = p.objs("rooms")
                        if (rooms.isNotEmpty()) DetailSection("Rooms", Icons.Outlined.Bed, sub = "Choose your room and plan when you book") {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                items(rooms) { r ->
                                    Column(Modifier.width(250.dp).clip(RoundedCornerShape(18.dp)).background(Brand.Page)) {
                                        Photo(r.str("image"), Modifier.fillMaxWidth().aspectRatio(1.6f), corner = 0.dp)
                                        Column(Modifier.padding(12.dp)) {
                                            Text(r.text("name"), style = MaterialTheme.typography.titleMedium)
                                            Text(listOfNotNull(r.str("bed"), r.str("view"), "${r.int("max_guests")} guests").joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                                            if (r.int("max_extra") > 0) Text("+${r.int("max_extra")} extra · ${money(r.num("extra_fee"))} each / night", style = MaterialTheme.typography.bodySmall, color = Brand.TealDark)
                                            r.objs("plans").take(3).forEach { pl ->
                                                Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
                                                    Text(pl.text("name"), modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                                    Text(money(pl.num("offer_price") ?: pl.num("price")), style = MaterialTheme.typography.titleSmall, color = Brand.BlueDark)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        val times = p.obj("times")
                        if (times != null) DetailSection("Check-in and check-out", Icons.Outlined.Schedule) {
                            val ci = times.str("check_in") ?: times.str("checkin"); val co = times.str("check_out") ?: times.str("checkout")
                            if (ci != null && co != null) TimeTiles("Check-in from", ci, "Check-out by", co) else Text(times.text("label"), color = Brand.InkSoft)
                        }
                        val pol = p.objs("policies").filter { !it.text("title").startsWith("Extra guests") }
                        val rules = p.strings("house_rules")
                        if (pol.isNotEmpty() || rules.isNotEmpty()) DetailSection("Things to know", Icons.Outlined.Lightbulb) {
                            pol.forEach { ExpandRow(it.text("title"), it.text("text")) }
                            if (rules.isNotEmpty()) ExpandRow("House rules", rules.joinToString("\n") { "• $it" })
                        }
                        p.obj("cancellation_policy")?.let { c ->
                            DetailSection("Cancellation", Icons.Outlined.EventAvailable, sub = c.text("label")) {
                                RefundTimeline(c.objs("policy").map { it.text("when") to it.int("refund_percent") })
                            }
                        }
                        val rs = p.obj("reviews_summary")
                        if (rs != null && rs.int("count") > 0) DetailSection("Reviews", Icons.Outlined.StarOutline) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(String.format(java.util.Locale.ENGLISH, "%.1f", p.num("rating") ?: 0.0), style = MaterialTheme.typography.displaySmall, color = Brand.Ink)
                                Column(Modifier.padding(start = 12.dp)) { Stars(p.num("rating")); Text("${rs.int("count")} reviews from guests who stayed", style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
                            }
                            Gap(12)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                items(rs.objs("items").take(8)) { r ->
                                    Column(Modifier.width(260.dp).clip(RoundedCornerShape(18.dp)).background(Brand.Page).padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Avatar(r.text("name").take(1), 34.dp)
                                            Column(Modifier.padding(start = 8.dp).weight(1f)) { Text(r.text("name"), style = MaterialTheme.typography.titleSmall); Text(r.text("date"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted) }
                                            Stars(r.num("rating"))
                                        }
                                        Text(r.text("body"), color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium, maxLines = 5, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 8.dp))
                                        r.obj("reply")?.let { Text("Host: " + it.text("body"), style = MaterialTheme.typography.bodySmall, color = Brand.TealDark, maxLines = 3, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp)) }
                                    }
                                }
                            }
                        }
                        DetailSection("Your host", Icons.Outlined.Person) {
                            val h = p.obj("host")
                            if (h != null) Row(verticalAlignment = Alignment.CenterVertically) {
                                Avatar(h.text("name").split(" ").mapNotNull { it.firstOrNull()?.toString() }.take(2).joinToString(""), 48.dp)
                                Column(Modifier.padding(start = 12.dp)) {
                                    Text(h.text("name"), style = MaterialTheme.typography.titleMedium)
                                    if (h.int("since") > 0) Text("Hosting since ${h.int("since")}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                                }
                            }
                            Gap(12)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (p.bool("chat")) Button(onClick = { nav.navigate("chat/$kind/$id") }, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Outlined.ChatBubbleOutline, null, Modifier.size(18.dp)); Text("  Ask a question")
                                }
                                val c = p.arr("coords")
                                if (c != null && c.length() == 2) OutlinedButton(onClick = { openMaps(ctx, c.optDouble(0), c.optDouble(1), p.text("title")) }, shape = RoundedCornerShape(14.dp), modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Outlined.Directions, null, Modifier.size(18.dp)); Text("  Directions")
                                }
                            }
                        }
                        Gap(8)
                    }
                }
                // Bottom bar: price and the booking panel
                val offer = price.num("offer_nightly"); val nightly = price.num("nightly")
                PriceBar(money(offer ?: nightly), if (kind == "resort") "/ room night" else "/ night", was = if (offer != null && nightly != null && offer < nightly) money(nightly) else null,
                    note = p.str("cancellation") ?: (p.obj("cancellation_policy")?.str("label"))) {
                    if (p.bool("bookable") || !p.has("bookable")) Button(onClick = { sheet = true }, shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = Brand.CoralDark),
                        contentPadding = PaddingValues(horizontal = 22.dp, vertical = 14.dp)) { Text(if (p.text("booking_mode") == "request") "Request to book" else "Reserve", style = MaterialTheme.typography.labelLarge) }
                    else Text("Not taking bookings", color = Brand.Warn)
                }
                if (sheet) BookingSheet(nav, kind, id, p) { sheet = false }
            }
        }
    }
}

@Composable
private fun Gallery(urls: List<String>) {
    if (urls.isEmpty()) { Photo(null, Modifier.fillMaxWidth().aspectRatio(1.25f), corner = 0.dp); return }
    val state = rememberPagerState { urls.size }
    Box {
        HorizontalPager(state = state) { i -> Photo(urls[i], Modifier.fillMaxWidth().aspectRatio(1.25f), corner = 0.dp) }
        Text("${state.currentPage + 1} / ${urls.size}", color = Color.White, style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 14.dp, bottom = 34.dp).clip(RoundedCornerShape(50)).background(Color(0x99000000)).padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

/** Dates, guests (with children's ages), rooms and plans for resorts, food and coupon → the live price, then "Reserve". */
@Composable
private fun BookingSheet(nav: NavHostController, kind: String, id: Int, p: JSONObject, onClose: () -> Unit) {
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var checkIn by remember { mutableStateOf("") }
    var checkOut by remember { mutableStateOf("") }
    var adults by remember { mutableIntStateOf(2) }
    val ages = remember { mutableStateListOf<Int>() }
    var food by remember { mutableStateOf(false) }
    var coupon by remember { mutableStateOf(p.obj("price")?.obj("offer")?.str("code") ?: "") }
    val rooms = p.objs("rooms")
    var roomId by remember { mutableStateOf(rooms.firstOrNull()?.int("id")) }
    var planId by remember { mutableStateOf(0) }
    var roomCount by remember { mutableIntStateOf(1) }
    var quote by remember { mutableStateOf<JSONObject?>(null) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val g = p.obj("guests")

    fun check() {
        if (checkIn.isEmpty() || checkOut.isEmpty()) { err = "Choose your dates first."; return }
        busy = true; err = null; quote = null
        scope.launch {
            try {
                val q = Api.get("availability", mapOf("kind" to kind, "id" to id, "check_in" to checkIn, "check_out" to checkOut, "adults" to adults,
                    "ages" to ages.joinToString(","), "food" to food, "coupon" to coupon.trim().ifEmpty { null },
                    "room_id" to (if (kind == "resort") roomId else null), "plan_id" to (if (kind == "resort") planId else null), "rooms" to (if (kind == "resort") roomCount else null)))
                if (q.bool("available")) quote = q else err = q.text("message", "Not available for these dates.")
            } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }

    ModalBottomSheet(onDismissRequest = onClose, sheetState = state, containerColor = Color.White) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 24.dp).verticalScroll(rememberScrollState())) {
            Text("Your trip", style = MaterialTheme.typography.titleLarge)
            Gap()
            DateRangeField(checkIn, checkOut, { a, b -> checkIn = a; checkOut = b; quote = null })
            Gap(8)
            Stepper("Adults", adults, { adults = it; quote = null }, min = 1, max = 40,
                note = g?.intOrNull("included")?.let { inc -> "$inc included in the price" + (g.intOrNull("max")?.let { m -> " · up to $m" } ?: "") })
            Stepper("Children", ages.size, { n -> while (ages.size < n) ages.add(5); while (ages.size > n) ages.removeAt(ages.size - 1); quote = null }, min = 0, max = 10, note = "Ages help us price correctly")
            ages.forEachIndexed { i, a -> Stepper("Child ${i + 1} age", a, { ages[i] = it; quote = null }, min = 0, max = 17) }
            if (kind == "resort" && rooms.isNotEmpty()) {
                Gap(8); Text("Room", style = MaterialTheme.typography.titleSmall)
                rooms.forEach { r ->
                    val sel = r.int("id") == roomId
                    Box(Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(12.dp)).border(if (sel) 2.dp else 1.dp, if (sel) Brand.Blue else Brand.Line, RoundedCornerShape(12.dp))
                        .clickable { roomId = r.int("id"); planId = 0; quote = null }.padding(12.dp)) {
                        Column {
                            Text(r.text("name"), style = MaterialTheme.typography.titleSmall)
                            Text("${r.int("max_guests")} guests included" + (if (r.int("max_extra") > 0) " · up to ${r.int("max_extra")} extra (${money(r.num("extra_fee"))}/night each)" else ""), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                            if (sel) r.objs("plans").forEach { pl ->
                                CheckRow(pl.text("name") + " · " + money(pl.num("offer_price") ?: pl.num("price")), planId == pl.int("id") || (planId == 0 && pl == r.objs("plans").first()),
                                    { planId = pl.int("id"); quote = null }, note = pl.strings("inclusions").joinToString(", ").ifEmpty { null })
                            }
                        }
                    }
                }
                Stepper("Rooms", roomCount, { roomCount = it; quote = null }, min = 1, max = 10)
            }
            if (p.obj("food")?.bool("offered") == true) CheckRow("Add food (${money(p.obj("food")?.num("rate"))} per person per day)", food, { food = it; quote = null })
            Gap(6)
            Field("Coupon code (optional)", coupon, { coupon = it.uppercase(); quote = null })
            Gap(8)
            err?.let { Notice(it, "bad"); Gap(8) }
            val q = quote
            if (q != null) {
                Bordered {
                    Column {
                        PriceTable(q.priceLines(), q.num("total"))
                        q.obj("coupon")?.str("message")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = if (q.obj("coupon")?.bool("applied") == true) Brand.TealDark else Brand.Warn) }
                        q.obj("cancellation")?.str("label")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.TealDark, modifier = Modifier.padding(top = 4.dp)) }
                    }
                }
                Gap()
                PrimaryButton(if (q.text("booking_mode") == "request") "Request to book" else "Reserve", {
                    AppState.reserve.value = ReserveDraft(kind, id, p.text("title"), p.str("image"), checkIn, checkOut, adults, ages.toList(), food, coupon.trim(),
                        if (kind == "resort") roomId else null, if (kind == "resort") planId else null, if (kind == "resort") roomCount else 1, q)
                    onClose()
                    nav.navigate("reserve")
                }, coral = true)
            } else PrimaryButton("Check the price", { check() }, loading = busy)
            Gap(6)
            TextButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("Close") }
        }
    }
}


@Composable
private fun GuestStat(value: String, label: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(Brand.Page).padding(14.dp)) {
        Text(value, style = MaterialTheme.typography.headlineSmall, color = Brand.BlueDark)
        Text(label, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
    }
}

/** Long text shortened to a few lines, with "Read more". */
@Composable
fun ExpandText(text: String, lines: Int = 5) {
    var open by remember { mutableStateOf(false) }
    Column(Modifier.animateContentSize()) {
        Text(text, style = MaterialTheme.typography.bodyLarge, color = Brand.InkSoft, maxLines = if (open) Int.MAX_VALUE else lines, overflow = TextOverflow.Ellipsis)
        if (text.length > 220) Text(if (open) "Show less" else "Read more", style = MaterialTheme.typography.titleSmall, color = Brand.Blue,
            modifier = Modifier.padding(top = 6.dp).clickable { open = !open })
    }
}

/** Directions in the phone's maps app (not a website). */
fun openMaps(ctx: android.content.Context, lat: Double, lng: Double, label: String) {
    val geo = Uri.parse("geo:$lat,$lng?q=$lat,$lng(" + Uri.encode(label) + ")")
    try { ctx.startActivity(Intent(Intent.ACTION_VIEW, geo)) }
    catch (_: Exception) { try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$lat,$lng"))) } catch (_: Exception) { } }
}
