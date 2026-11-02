package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.ListAlt
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Today
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.RedBrush
import com.triparro.app.ui.SectionTitle
import com.triparro.app.ui.SunBrush
import com.triparro.app.ui.appear
import com.triparro.app.ui.matte
import com.triparro.app.ui.money
import com.triparro.app.ui.pressable
import com.triparro.app.ui.pulse
import com.triparro.app.ui.shortDate
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

/* -------------------------------------------------------------------------------------------------
 * My hosting — the whole hosting dashboard in the app (hosts, resort owners, pet hosts):
 * Today · Bookings (requests to approve, check-in / check-out) · Calendar (close dates, prices) ·
 * Listings (price, live / paused) · Money · Messages with guests. TripArro Agents see their portal.
 * ----------------------------------------------------------------------------------------------- */

private data class HTab(val key: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@Composable
fun HostingScreen(nav: NavHostController) {
    val session by Api.session.collectAsState()
    val role = session?.user?.role ?: ""
    when (role) {
        "host", "resort", "pethost" -> HostDashboard(nav, role)
        "referral" -> AgentPortal(nav)
        else -> Column(Modifier.fillMaxSize().background(Brand.Page)) {
            com.triparro.app.ui.ColorHeader("My hosting", session?.user?.name, onBack = { nav.popBackStack() })
            Column(Modifier.padding(16.dp)) {
                Notice(if (role == "admin") "The admin dashboard runs on a computer. In the app you can book, chat and get every notification." else "My hosting is for hosts, resort owners and pet hosts. List your property to get started.", "info")
                if (role != "admin") { Gap(); PrimaryButton("List your property", { nav.navigate("become-host") }) }
            }
        }
    }
}

@Composable
private fun HostDashboard(nav: NavHostController, role: String) {
    val pets = role == "pethost"
    val tabs = buildList {
        add(HTab("today", "Today", Icons.Outlined.Today))
        add(HTab("bookings", "Bookings", Icons.Outlined.ListAlt))
        if (!pets) add(HTab("calendar", "Calendar", Icons.Outlined.CalendarMonth))
        add(HTab("listings", "Listings", Icons.Outlined.Home))
        add(HTab("money", "Money", Icons.Outlined.Payments))
        if (!pets) add(HTab("chats", "Messages", Icons.Outlined.ChatBubbleOutline))
    }
    var tab by rememberSaveable { mutableStateOf("today") }
    var tick by remember { mutableStateOf(0) }
    val home = rememberLoader("hosthome", tick) { Api.get("hostapp/home") }
    val h = home.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        // header with this month's figures
        Column(Modifier.fillMaxWidth().background(RedBrush).matte(Color.Transparent).padding(bottom = 14.dp)) {
            Row(Modifier.padding(start = 4.dp, end = 12.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
                Column(Modifier.weight(1f)) {
                    Text(if (pets) "Pet hosting" else if (role == "resort") "My resort" else "My hosting", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                    Text("Hi ${h?.text("name")?.substringBefore(' ') ?: ""} — everything for your guests, here in the app", style = MaterialTheme.typography.labelMedium, color = Color(0xFFFFE0DC), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Row(Modifier.padding(horizontal = 16.dp).padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                val m = h?.obj("month") ?: JSONObject()
                HStat("Earnings · ${m.text("label", "this month")}", money(m.num("earnings") ?: 0.0), Modifier.weight(1.4f).appear(0))
                HStat("Bookings", "${m.int("bookings")}", Modifier.weight(1f).appear(1))
                HStat(if (pets) "Pets now" else "Staying now", "${h?.int("staying") ?: 0}", Modifier.weight(1f).appear(2))
            }
        }
        // tabs
        Row(Modifier.fillMaxWidth().background(Color.White).horizontalScroll(rememberScrollState()).padding(horizontal = 10.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            tabs.forEach { t ->
                val on = tab == t.key
                val badge = when (t.key) { "bookings" -> h?.objs("requests")?.size ?: 0; "chats" -> h?.int("unread_chats") ?: 0; else -> 0 }
                Row(Modifier.clip(RoundedCornerShape(50)).background(if (on) SunBrush else androidx.compose.ui.graphics.SolidColor(Brand.Page))
                    .pressable({ tab = t.key }).padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(t.icon, null, tint = if (on) Brand.SunInk else Brand.InkSoft, modifier = Modifier.size(18.dp))
                    Text(" " + t.label, style = MaterialTheme.typography.labelLarge, color = if (on) Brand.SunInk else Brand.InkSoft)
                    if (badge > 0) Box(Modifier.padding(start = 6.dp).size(20.dp).pulse().clip(CircleShape).background(Brand.Blue), contentAlignment = Alignment.Center) {
                        Text("$badge", style = MaterialTheme.typography.labelSmall, color = Color.White)
                    }
                }
            }
        }
        HorizontalDivider(color = Brand.Line)
        AnimatedContent(tab, transitionSpec = { (slideInHorizontally { it / 6 } + fadeIn()) togetherWith (slideOutHorizontally { -it / 6 } + fadeOut()) }, label = "tab", modifier = Modifier.weight(1f)) { t ->
            Box(Modifier.fillMaxSize()) {
                when (t) {
                    "today" -> TodayTab(nav, home, pets) { tick++ }
                    "bookings" -> BookingsTab(pets) { tick++ }
                    "calendar" -> CalendarTab()
                    "listings" -> ListingsTab(pets) { tick++ }
                    "money" -> MoneyTab()
                    "chats" -> ChatsTab(nav)
                }
            }
        }
    }
}

@Composable
private fun HStat(label: String, value: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(18.dp)).background(Color.White.copy(alpha = 0.14f)).border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(18.dp)).padding(12.dp)) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1)
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color(0xFFFFE0DC), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/* ---------- Today ---------- */
@Composable
private fun TodayTab(nav: NavHostController, home: Loader<JSONObject>, pets: Boolean, changed: () -> Unit) {
    val h = home.data.value
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        when {
            h == null && home.loading.value -> Loading()
            h == null -> ErrorBox(home.error.value ?: "Could not load your dashboard.", { home.reload() })
            else -> {
                val req = h.objs("requests")
                if (req.isNotEmpty()) {
                    SectionTitle("Waiting for your answer", sub = "Approve or decline before the time runs out")
                    req.forEachIndexed { i, b -> BookingCard(b, Modifier.appear(i)) { changed() }; Gap(10) }
                    Gap(6)
                }
                val today = h.objs("today")
                SectionTitle("Today", sub = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.ENGLISH)))
                if (today.isEmpty()) Notice(if (pets) "No pets arriving or leaving today." else "Nobody is arriving or leaving today.", "info")
                today.forEachIndexed { i, b -> BookingCard(b, Modifier.appear(i)) { changed() }; Gap(10) }
                Gap(10)
                val up = h.objs("upcoming")
                SectionTitle("Coming up")
                if (up.isEmpty()) Notice("No upcoming bookings yet.", "info")
                up.forEachIndexed { i, b -> BookingCard(b, Modifier.appear(i)) { changed() }; Gap(10) }
                if (!pets && h.int("unread_chats") > 0) {
                    Gap(6)
                    PrimaryButton("${h.int("unread_chats")} unread guest messages", { nav.navigate("hostchats") }, icon = Icons.Outlined.ChatBubbleOutline)
                }
                Gap(20)
            }
        }
    }
}

/* ---------- One booking, with what the host can do now ---------- */
@Composable
fun BookingCard(b: JSONObject, modifier: Modifier = Modifier, changed: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf<String?>(null) }
    var msg by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    var ask by remember { mutableStateOf<String?>(null) }
    var balance by remember { mutableStateOf<Double?>(null) }
    fun run(action: String, extra: Map<String, Any?> = emptyMap()) {
        busy = action; msg = null
        scope.launch {
            try {
                val r = Api.post("hostapp/bookings/${b.text("kind")}/${b.int("id")}/$action", extra)
                msg = r.text("message", "Done.") to true
                changed()
            } catch (e: ApiException) {
                if (e.code == "balance_due") balance = 1.0 else msg = (e.message) to false
            } catch (e: Exception) { msg = errorText(e) to false }
            busy = null
        }
    }
    val state = b.text("state")
    val (pillTone, accent) = when (state) {
        "request" -> "warn" to Brand.Sun; "checked_in" -> "ok" to Brand.Teal; "cancelled" -> "bad" to Brand.Danger; else -> "info" to Brand.Blue
    }
    Column(modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(22.dp), spotColor = Color(0x33B81D2B)).clip(RoundedCornerShape(22.dp)).background(Color.White)) {
        Box(Modifier.fillMaxWidth().height(5.dp).background(accent))
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Photo(b.str("image"), Modifier.size(64.dp), corner = 16.dp)
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(b.text("guest"), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Pill(b.text("state_label"), pillTone)
                }
                Text(b.text("listing"), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val who = if (b.text("kind") == "pet") "${b.int("pets")} pet${if (b.int("pets") == 1) "" else "s"}" else "${b.int("guests")} guest${if (b.int("guests") == 1) "" else "s"}"
                Text("${shortDate(b.str("check_in"))} → ${shortDate(b.str("check_out"))} · ${b.int("nights")}n · $who", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(money(b.num("payout")), style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.ExtraBold), color = Brand.BlueDark)
                    Text("  your payout · ${b.text("payment")}", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                b.str("requests")?.let { Text("“$it”", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(top = 4.dp), maxLines = 3, overflow = TextOverflow.Ellipsis) }
                b.str("arrival_time")?.let { Text("Arriving around $it", style = MaterialTheme.typography.labelMedium, color = Brand.TealDark) }
            }
        }
        val acts = b.strings("actions")
        if (acts.isNotEmpty() || b.str("phone") != null) {
            Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 14.dp, bottom = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                b.str("phone")?.let { ph ->
                    Box(Modifier.size(46.dp).clip(CircleShape).background(Brand.TealSoft).pressable({ try { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$ph"))) } catch (_: Exception) { } }), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.Call, "Call ${b.text("guest")}", tint = Brand.TealDark)
                    }
                }
                acts.forEach { a ->
                    val label = mapOf("approve" to "Approve", "decline" to "Decline", "check_in" to "Check in", "check_out" to "Check out", "complete" to "Complete")[a] ?: a
                    if (a == "decline") OutlinedButton(onClick = { ask = a }, modifier = Modifier.weight(1f).height(46.dp), shape = RoundedCornerShape(14.dp)) { Text(label, color = Brand.Danger) }
                    else PrimaryButton(label, { if (a == "approve") { ask = a } else { run(a) } }, Modifier.weight(1f), loading = busy == a)
                }
            }
        }
        msg?.let { (t, ok) -> Notice(t, if (ok) "ok" else "bad", Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)) }
    }
    ask?.let { a ->
        var note by remember { mutableStateOf("") }
        AlertDialog(onDismissRequest = { ask = null },
            title = { Text(if (a == "approve") "Approve this request?" else "Decline this request?") },
            text = {
                Column {
                    Text(if (a == "approve") "${b.text("guest")} gets a message to pay. The booking is confirmed when the payment succeeds." else "${b.text("guest")} is told and the dates are free again.", style = MaterialTheme.typography.bodyMedium)
                    Gap(8)
                    OutlinedTextField(note, { note = it }, placeholder = { Text(if (a == "approve") "A note for the guest (optional)" else "Reason (optional)") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = { TextButton(onClick = { ask = null; run(a, mapOf("note" to note.ifBlank { null })) }) { Text(if (a == "approve") "Approve" else "Decline", color = if (a == "approve") Brand.TealDark else Brand.Danger) } },
            dismissButton = { TextButton(onClick = { ask = null }) { Text("Not now") } })
    }
    if (balance != null) AlertDialog(onDismissRequest = { balance = null },
        title = { Text("Balance received?") }, text = { Text("The guest still owes part of the price. Check out only after you received it.") },
        confirmButton = { TextButton(onClick = { balance = null; run("check_out", mapOf("collected" to true)) }) { Text("Yes, received — check out") } },
        dismissButton = { TextButton(onClick = { balance = null }) { Text("Cancel") } })
}

/* ---------- Bookings ---------- */
@Composable
private fun BookingsTab(pets: Boolean, changed: () -> Unit) {
    var which by rememberSaveable { mutableStateOf("upcoming") }
    var tick by remember { mutableStateOf(0) }
    val l = rememberLoader("hb", which, tick) { Api.get("hostapp/bookings", mapOf("which" to which)) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("upcoming" to "Upcoming", "requests" to "Requests", "today" to "Today", "in_house" to (if (pets) "Pets now" else "Staying now"), "past" to "Past").forEach { (k, lab) ->
                val on = which == k
                Text(lab, style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else Brand.InkSoft,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Matte else Color.White).border(1.dp, if (on) Brand.Matte else Brand.Line, RoundedCornerShape(50)).pressable({ which = k }).padding(horizontal = 14.dp, vertical = 8.dp))
            }
        }
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp)) {
            val d = l.data.value
            when {
                d == null && l.loading.value -> Loading()
                d == null -> ErrorBox(l.error.value ?: "Could not load bookings.", { l.reload() })
                d.objs("bookings").isEmpty() -> EmptyBox("Nothing here", when (which) { "requests" -> "No requests waiting for you."; "past" -> "No past bookings yet."; else -> "No bookings in this list." }, icon = Icons.Outlined.ListAlt)
                else -> d.objs("bookings").forEachIndexed { i, b -> BookingCard(b, Modifier.appear(i)) { tick++; changed() }; Gap(10) }
            }
            Gap(20)
        }
    }
}

/* ---------- Calendar: close dates, open them again, set prices ---------- */
@Composable
private fun CalendarTab() {
    val scope = rememberCoroutineScope()
    var listing by rememberSaveable { mutableStateOf("") }
    var month by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }
    var tick by remember { mutableStateOf(0) }
    var first by remember { mutableStateOf<String?>(null) }
    var last by remember { mutableStateOf<String?>(null) }
    var msg by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    var priceAsk by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val l = rememberLoader("hcal", listing, month, tick) { Api.get("hostapp/calendar", mapOf("listing" to listing.ifEmpty { null }, "month" to month)) }
    val d = l.data.value
    LaunchedEffect(d) { if (listing.isEmpty()) d?.obj("listing")?.str("tag")?.let { listing = it } }
    fun act(path: String, body: Map<String, Any?>) {
        busy = true; msg = null
        scope.launch {
            try { msg = Api.post(path, body).text("message", "Saved.") to true; first = null; last = null; tick++ } catch (e: Exception) { msg = errorText(e) to false }
            busy = false
        }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        if (d == null) { if (l.loading.value) Loading() else ErrorBox(l.error.value ?: "Could not load the calendar.", { l.reload() }); return@Column }
        val ls = d.objs("listings")
        if (ls.size > 1) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ls.forEach { x ->
                val on = x.text("tag") == (d.obj("listing")?.text("tag") ?: listing)
                Text(x.text("title"), style = MaterialTheme.typography.labelLarge, color = if (on) Brand.SunInk else Brand.InkSoft, maxLines = 1,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) SunBrush else androidx.compose.ui.graphics.SolidColor(Color.White)).pressable({ listing = x.text("tag"); first = null; last = null }).padding(horizontal = 14.dp, vertical = 8.dp))
            }
        }
        Gap(12)
        Card(padding = 12.dp) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { month = YearMonth.parse(month).minusMonths(1).toString() }, enabled = YearMonth.parse(month) > YearMonth.now()) { Icon(Icons.Outlined.ChevronLeft, "Previous month") }
                Text(d.text("label"), style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                IconButton(onClick = { month = YearMonth.parse(month).plusMonths(1).toString() }) { Icon(Icons.Outlined.ChevronRight, "Next month") }
            }
            Row { listOf("Mo", "Tu", "We", "Th", "Fr", "Sa", "Su").forEach { Text(it, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, textAlign = TextAlign.Center, modifier = Modifier.weight(1f)) } }
            val days = d.objs("days")
            val lead = days.firstOrNull()?.let { LocalDate.parse(it.text("date")).dayOfWeek.value - 1 } ?: 0
            val cells: List<JSONObject?> = List(lead) { null } + days
            val today = LocalDate.now().toString()
            cells.chunked(7).forEach { week ->
                Row(Modifier.padding(vertical = 2.dp)) {
                    (0 until 7).forEach { i ->
                        val c = week.getOrNull(i)
                        Box(Modifier.weight(1f).aspectRatio(0.82f).padding(2.dp)) {
                            if (c != null) {
                                val date = c.text("date"); val st = c.text("state")
                                val sel = first != null && date >= first!! && date <= (last ?: first!!)
                                val past = date < today
                                val bg = when { sel -> Brand.Sun; st == "booked" -> Brand.Blue; st == "request" -> Color(0xFFFFB74D); st == "platform" -> Color(0xFF7E57C2); st == "closed" -> Color(0xFF9E9E9E); else -> Brand.TealSoft }
                                val fg = if (st in listOf("booked", "platform", "closed") && !sel) Color.White else Brand.Ink
                                Column(Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)).background(if (past) bg.copy(alpha = 0.35f) else bg)
                                    .pressable({
                                        if (past) return@pressable
                                        when {
                                            st == "closed" && c.int("block_id") > 0 -> { first = null; last = null; act("hostapp/calendar/open", mapOf("block_id" to c.int("block_id"))) }
                                            st != "free" -> { msg = (c.str("label") ?: "Booked") to true }
                                            first == null || last != null || date < first!! -> { first = date; last = null }
                                            else -> last = date
                                        }
                                    }, scaleTo = 0.9f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                    Text("${LocalDate.parse(date).dayOfMonth}", style = MaterialTheme.typography.labelLarge.copy(fontWeight = if (date == today) FontWeight.ExtraBold else FontWeight.SemiBold), color = fg)
                                    c.num("price")?.let { p -> Text("₹" + if (p >= 1000) String.format(Locale.ENGLISH, "%.1fk", p / 1000) else p.toInt().toString(), style = MaterialTheme.typography.labelSmall, color = fg.copy(alpha = 0.85f)) }
                                }
                            }
                        }
                    }
                }
            }
            Gap(8)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                listOf(Brand.TealSoft to "Free", Brand.Blue to "Booked", Color(0xFFFFB74D) to "Request", Color(0xFF7E57C2) to "Other platform", Color(0xFF9E9E9E) to "Closed (tap to open)").forEach { (c, t) ->
                    Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(12.dp).clip(CircleShape).background(c)); Text(" $t", style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft) }
                }
            }
        }
        Gap(12)
        val kind = d.obj("listing")?.text("kind")
        if (first != null && kind == "stay") {
            val a = first!!; val z = last ?: a
            Text("Selected: ${shortDate(a)}${if (z != a) " → ${shortDate(z)}" else ""}", style = MaterialTheme.typography.titleSmall)
            Gap(8)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PrimaryButton("Close these nights", { act("hostapp/calendar/close", mapOf("listing" to d.obj("listing")?.text("tag"), "first" to a, "last" to z, "reason" to "Closed in the app")) }, Modifier.weight(1f), loading = busy)
                OutlinedButton(onClick = { priceAsk = true }, modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(16.dp)) { Text("Set price") }
            }
            Gap(6)
        } else if (kind == "stay") Text("Tap a free night (then another to pick a range) to close it or change its price. Tap a grey night to open it again.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        else if (kind == "resort") Text("Each day shows how many rooms are still free.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        msg?.let { (t, ok) -> Gap(8); Notice(t, if (ok) "ok" else "bad") }
        Gap(20)
    }
    if (priceAsk) {
        var price by remember { mutableStateOf(d?.obj("listing")?.num("price")?.toInt()?.toString() ?: "") }
        AlertDialog(onDismissRequest = { priceAsk = false }, title = { Text("Price per night") },
            text = { OutlinedTextField(price, { price = it.filter { ch -> ch.isDigit() }.take(7) }, prefix = { Text("₹ ") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true) },
            confirmButton = { TextButton(onClick = { priceAsk = false; act("hostapp/calendar/price", mapOf("listing" to d?.obj("listing")?.text("tag"), "first" to first, "last" to (last ?: first), "price" to price.toIntOrNull())) }) { Text("Save") } },
            dismissButton = { TextButton(onClick = { priceAsk = false }) { Text("Cancel") } })
    }
}

/* ---------- Listings ---------- */
@Composable
private fun ListingsTab(pets: Boolean, changed: () -> Unit) {
    val scope = rememberCoroutineScope()
    var tick by remember { mutableStateOf(0) }
    val l = rememberLoader("hl", tick) { Api.get("hostapp/home") }
    var msg by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    var edit by remember { mutableStateOf<JSONObject?>(null) }
    fun save(x: JSONObject, body: Map<String, Any?>) {
        msg = null
        scope.launch {
            try { msg = Api.post("hostapp/listings/${x.text("kind")}/${x.int("id")}", body).text("message", "Saved.") to true; tick++; changed() } catch (e: Exception) { msg = errorText(e) to false }
        }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        val d = l.data.value
        msg?.let { (t, ok) -> Notice(t, if (ok) "ok" else "bad"); Gap(10) }
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load your listings.", { l.reload() })
            d.objs("listings").isEmpty() -> EmptyBox("No listings yet", "Your listings show here once they are added.", icon = Icons.Outlined.Home)
            else -> d.objs("listings").forEachIndexed { i, x ->
                Column(Modifier.fillMaxWidth().appear(i).shadow(4.dp, RoundedCornerShape(22.dp), spotColor = Color(0x33B81D2B)).clip(RoundedCornerShape(22.dp)).background(Color.White)) {
                    Box {
                        Photo(x.str("image"), Modifier.fillMaxWidth().aspectRatio(2.2f), corner = 0.dp)
                        Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Pill(if (x.bool("active")) "Live" else when (x.text("approval")) { "pending" -> "Being checked"; "rejected" -> "Not approved"; "draft" -> "Draft"; else -> "Paused" }, if (x.bool("active")) "ok" else "warn")
                            if (x.bool("verified")) Pill("Verified", "info")
                        }
                    }
                    Column(Modifier.padding(14.dp)) {
                        Text(x.text("title"), style = MaterialTheme.typography.titleMedium)
                        Text(x.text("location"), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                        if (x.bool("hidden_for_dues")) Text("Hidden: a settlement is overdue (Money tab).", style = MaterialTheme.typography.labelMedium, color = Brand.Danger)
                        Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            x.num("price")?.let { p ->
                                Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Brand.SunSoft).pressable({ edit = x }).padding(horizontal = 12.dp, vertical = 8.dp)) {
                                    Text(money(p) + " / night", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.ExtraBold), color = Brand.SunInk)
                                    Text("Tap to change", style = MaterialTheme.typography.labelSmall, color = Brand.Warn)
                                }
                            } ?: Spacer(Modifier.weight(1f))
                            if (x.text("kind") != "pet") Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 12.dp)) {
                                Text(if (x.bool("active")) "Live " else "Paused ", style = MaterialTheme.typography.labelLarge, color = Brand.InkSoft)
                                Switch(checked = x.bool("active"), onCheckedChange = { on -> save(x, mapOf("active" to on)) },
                                    colors = SwitchDefaults.colors(checkedTrackColor = Brand.Teal, checkedThumbColor = Color.White))
                            }
                        }
                    }
                }
                Gap(12)
            }
        }
        Gap(20)
    }
    edit?.let { x ->
        var price by remember(x) { mutableStateOf(x.num("price")?.toInt()?.toString() ?: "") }
        AlertDialog(onDismissRequest = { edit = null }, title = { Text("Standard price per night") },
            text = { Column {
                Text(x.text("title"), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                Gap(8)
                OutlinedTextField(price, { price = it.filter { ch -> ch.isDigit() }.take(7) }, prefix = { Text("₹ ") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true)
                if (!pets) Text("Special prices for single nights: Calendar tab.", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
            } },
            confirmButton = { TextButton(onClick = { edit = null; save(x, mapOf("price" to price.toIntOrNull())) }) { Text("Save") } },
            dismissButton = { TextButton(onClick = { edit = null }) { Text("Cancel") } })
    }
}

/* ---------- Money ---------- */
@Composable
private fun MoneyTab() {
    val l = rememberLoader("hm") { Api.get("hostapp/money") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        val d = l.data.value
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load your money summary.", { l.reload() })
            else -> {
                d.objs("cards").forEachIndexed { i, c ->
                    val (bg, fg) = when (c.text("tone")) { "ok" -> Brand.TealSoft to Brand.TealDark; "bad" -> Brand.DangerSoft to Brand.Danger; "warn" -> Brand.SunSoft to Brand.SunInk; else -> Brand.Sky to Brand.BlueDark }
                    Column(Modifier.fillMaxWidth().appear(i).clip(RoundedCornerShape(20.dp)).background(bg).padding(16.dp)) {
                        Text(c.text("label"), style = MaterialTheme.typography.labelLarge, color = fg)
                        Text(money(c.num("amount")), style = MaterialTheme.typography.headlineMedium, color = fg)
                    }
                    Gap(10)
                }
                d.str("due_on")?.let { Text("Month-end settlement: ${shortDate(it)}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
                Gap(14)
                SectionTitle("Recent stays")
                Card(padding = 12.dp) {
                    val r = d.objs("recent")
                    if (r.isEmpty()) Text("No completed stays yet.", color = Brand.InkSoft)
                    r.forEachIndexed { i, x ->
                        if (i > 0) HorizontalDivider(color = Brand.Line)
                        Row(Modifier.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(x.text("ref"), style = MaterialTheme.typography.titleSmall)
                                Text(shortDate(x.str("date")), style = MaterialTheme.typography.labelMedium, color = Brand.Muted)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(money(x.num("amount")), style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = Brand.BlueDark)
                                Pill(if (x.bool("paid")) "Paid out" else "Pending", if (x.bool("paid")) "ok" else "warn")
                            }
                        }
                    }
                }
                Gap(10)
                d.str("note")?.let { Notice(it, "info") }
            }
        }
        Gap(20)
    }
}

/* ---------- Messages ---------- */
@Composable
private fun ChatsTab(nav: NavHostController) {
    val l = rememberLoader("hchats") { Api.get("hostapp/chats") }
    LaunchedEffect(Unit) { while (true) { kotlinx.coroutines.delay(15000); l.reload() } }
    Column(Modifier.fillMaxSize().background(Color.White).verticalScroll(rememberScrollState())) {
        val d = l.data.value
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load your chats.", { l.reload() })
            else -> ChatList(d.objs("chats"), host = true) { c -> nav.navigate("hostchat/${c.int("id")}") }
        }
    }
}

/** The host's guest chats on their own (from Today's "unread messages" button). */
@Composable
fun HostChatsScreen(nav: NavHostController) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        com.triparro.app.ui.ColorHeader("Guest messages", "Answer quickly — guests book more", onBack = { nav.popBackStack() })
        ChatsTab(nav)
    }
}

/* ---------- TripArro Agent portal ---------- */
@Composable
private fun AgentPortal(nav: NavHostController) {
    val l = rememberLoader("agent") { Api.get("partner/overview") }
    val d = l.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page).verticalScroll(rememberScrollState())) {
        Column(Modifier.fillMaxWidth().background(RedBrush).matte(Color.Transparent).padding(bottom = 16.dp)) {
            com.triparro.app.ui.ColorHeader("TripArro Agent", "Book for your guests and earn on every stay", onBack = { nav.popBackStack() })
            if (d != null) {
                val t = d.obj("totals") ?: JSONObject()
                Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    HStat("Commission earned", money(t.num("earned")), Modifier.weight(1f))
                    HStat("Bookings", t.int("bookings").toString(), Modifier.weight(1f))
                }
            }
        }
        Column(Modifier.padding(16.dp)) {
            when {
                d == null && l.loading.value -> Loading()
                d == null -> ErrorBox(l.error.value ?: "Could not load your summary.", { l.reload() })
                else -> {
                    SectionTitle("Recent bookings")
                    Card {
                        val bs = d.objs("bookings")
                        if (bs.isEmpty()) Text("No bookings yet.", color = Brand.InkSoft)
                        bs.forEachIndexed { i, b ->
                            if (i > 0) HorizontalDivider(color = Brand.Line)
                            Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(b.text("listing"), style = MaterialTheme.typography.titleSmall)
                                    Text("${b.text("guest")} · ${shortDate(b.text("check_in"))} → ${shortDate(b.text("check_out"))}", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                                }
                                Text(money(b.num("commission")), style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = Brand.BlueDark)
                            }
                        }
                    }
                    Gap()
                    PrimaryButton("Find a stay for a guest", { nav.navigate("explore") { launchSingleTop = true } })
                }
            }
            Gap(24)
        }
    }
}
