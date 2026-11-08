package com.triparro.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.DirectionsBoat
import androidx.compose.material.icons.outlined.DirectionsBus
import androidx.compose.material.icons.outlined.Flight
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.LocalTaxi
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material.icons.outlined.Train
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.floaty
import com.triparro.app.ui.glass
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Tickets in My trips: found in Gmail (only when the guest allows it), or added by hand. */
@Composable
fun TicketsList(nav: NavHostController, message: String? = null) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val tick by AppState.refreshTick
    val l = rememberLoader(tick) { Api.get("tickets") }
    var data by remember { mutableStateOf<JSONObject?>(null) }
    LaunchedEffect(l.data.value) { l.data.value?.let { data = it } }
    var consent by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var sharing by remember { mutableStateOf(0) }
    var shared by remember { mutableStateOf<String?>(null) }
    fun act(path: String) { scope.launch { try { data = Api.post(path).let { r -> JSONObject(data.toString()).put("items", r.optJSONArray("items")) }; err = null } catch (e: Exception) { err = errorText(e) } } }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        message?.let { Notice(it, if (it.startsWith("Found")) "ok" else "info"); Gap() }
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(CircleShape).background(Brand.Sky), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.ConfirmationNumber, null, tint = Brand.Blue) }
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text("Your travel tickets", style = MaterialTheme.typography.titleMedium)
                    Text("Flights, trains and buses next to your stays — find them in Gmail or add them yourself.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                }
            }
            Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (data?.bool("gmail") != false) PrimaryButton("Find in Gmail", { consent = true }, Modifier.weight(1f), icon = Icons.Outlined.Mail, loading = busy)
                OutlinedButton(onClick = { adding = true }, modifier = Modifier.weight(1f).height(52.dp)) { Icon(Icons.Outlined.Add, null, Modifier.size(18.dp)); Text(" Add by hand") }
            }
        }
        err?.let { Gap(); Notice(it, "bad") }
        shared?.let { Gap(); Notice(it, "ok") }
        Gap()
        val d = data
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load your tickets.", { l.reload() })
            else -> {
                val items = d.objs("items")
                val found = items.filter { it.text("status") == "found" }
                val saved = items.filter { it.text("status") == "saved" }
                if (found.isNotEmpty()) {
                    Text("Found in Gmail — keep the ones you want", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
                    found.forEach { t -> TicketCard(t, onKeep = { act("tickets/${t.int("id")}/keep") }, onDelete = { act("tickets/${t.int("id")}/delete") }) }
                    Gap()
                }
                val upcoming = saved.filter { it.bool("upcoming") || it.str("depart_at") == null }
                val past = saved - upcoming.toSet()
                if (upcoming.isNotEmpty()) { Text("Upcoming", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp)); upcoming.forEach { t -> TicketCard(t, onShare = { sharing = t.int("id") }, onDelete = { act("tickets/${t.int("id")}/delete") }) } }
                if (past.isNotEmpty()) { Gap(); Text("Past", style = MaterialTheme.typography.titleMedium, color = Brand.Muted, modifier = Modifier.padding(bottom = 8.dp)); past.forEach { t -> TicketCard(t, onShare = { sharing = t.int("id") }, onDelete = { act("tickets/${t.int("id")}/delete") }) } }
                if (found.isEmpty() && saved.isEmpty()) Text("No tickets yet.", color = Brand.Muted, modifier = Modifier.padding(8.dp))
            }
        }
        Spacer(Modifier.height(24.dp))
    }
    if (consent) AlertDialog(onDismissRequest = { consent = false },
        icon = { Icon(Icons.Outlined.Mail, null, tint = Brand.Blue) },
        title = { Text("Find tickets in your Gmail?") },
        text = {
            Column {
                Text("Google will ask you to let TripArro read your email. If you allow it, TripArro will:", style = MaterialTheme.typography.bodyMedium)
                listOf("search once for ticket and booking emails from the last year",
                    "read only the trip details — where, when, PNR, seat",
                    "give the Gmail permission back straight away",
                    "show you what it found; nothing is saved until you tap Keep").forEach {
                    Text("• $it", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(top = 4.dp))
                }
                Text((data?.text("gmail_note") ?: "").ifBlank { "We never keep your emails." }, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 10.dp))
            }
        },
        confirmButton = { TextButton(onClick = {
            consent = false; busy = true
            scope.launch {
                try {
                    val url = Api.post("tickets/gmail").text("url")
                    try {
                        androidx.browser.customtabs.CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(ctx, android.net.Uri.parse(url))
                    } catch (_: Exception) { ctx.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)) }
                } catch (e: Exception) { err = errorText(e) }
                busy = false
            }
        }) { Text("Continue to Google") } },
        dismissButton = { TextButton(onClick = { consent = false }) { Text("Not now") } })
    if (sharing > 0) ShareTicketDialog(sharing, { sharing = 0 }) { msg -> sharing = 0; shared = msg }
    if (adding) AddTicketDialog({ adding = false }) { r -> adding = false; data = JSONObject(data?.toString() ?: "{}").put("items", r.optJSONArray("items")) }
}

fun kindIcon(kind: String): ImageVector = when (kind) {
    "flight" -> Icons.Outlined.Flight
    "train" -> Icons.Outlined.Train
    "bus" -> Icons.Outlined.DirectionsBus
    "ferry" -> Icons.Outlined.DirectionsBoat
    "cab" -> Icons.Outlined.LocalTaxi
    else -> Icons.Outlined.ConfirmationNumber
}

private fun whenText(iso: String?): String = try {
    if (iso == null) "" else java.time.LocalDateTime.parse(iso.replace(' ', 'T')).format(java.time.format.DateTimeFormatter.ofPattern("EEE d MMM yyyy · h:mm a"))
} catch (_: Exception) { iso ?: "" }

/** The boarding-pass outline: rounded corners with a round notch on each side at the tear line. */
class TicketShape(private val notchY: androidx.compose.ui.unit.Dp, private val corner: androidx.compose.ui.unit.Dp = 22.dp, private val notch: androidx.compose.ui.unit.Dp = 12.dp) : androidx.compose.ui.graphics.Shape {
    override fun createOutline(size: androidx.compose.ui.geometry.Size, layoutDirection: androidx.compose.ui.unit.LayoutDirection, density: androidx.compose.ui.unit.Density): androidx.compose.ui.graphics.Outline {
        val c = with(density) { corner.toPx() }; val r = with(density) { notch.toPx() }; val y = with(density) { notchY.toPx() }.coerceIn(r + c, size.height - r - c)
        val body = androidx.compose.ui.graphics.Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, size.width, size.height, androidx.compose.ui.geometry.CornerRadius(c, c))) }
        val holes = androidx.compose.ui.graphics.Path().apply {
            addOval(androidx.compose.ui.geometry.Rect(-r, y - r, r, y + r))
            addOval(androidx.compose.ui.geometry.Rect(size.width - r, y - r, size.width + r, y + r))
        }
        return androidx.compose.ui.graphics.Outline.Generic(androidx.compose.ui.graphics.Path.combine(androidx.compose.ui.graphics.PathOperation.Difference, body, holes))
    }
}

/** A short code for a place: "Chennai Central" → "CHE" (an airport code like "MAA" stays as it is). */
private fun placeCode(p: String): String {
    val t = p.trim()
    if (t.isEmpty()) return "—"
    Regex("\\(([A-Z]{3,4})\\)").find(t)?.let { return it.groupValues[1] }
    if (t.length <= 4 && t.all { it.isLetter() }) return t.uppercase()
    return t.filter { it.isLetter() }.take(3).uppercase()
}

private fun timeText(iso: String?): String = try { if (iso == null) "" else java.time.LocalDateTime.parse(iso.replace(' ', 'T')).format(java.time.format.DateTimeFormatter.ofPattern("h:mm a")) } catch (_: Exception) { "" }
private fun dayText(iso: String?): String = try { if (iso == null) "" else java.time.LocalDateTime.parse(iso.replace(' ', 'T')).format(java.time.format.DateTimeFormatter.ofPattern("EEE, d MMM yyyy")) } catch (_: Exception) { "" }

/**
 * A ticket as a boarding pass: operator on top, big FROM → TO codes with the times, a tear line with side notches,
 * then PNR, seat, class and travellers. [actions] go at the bottom (keep, share, delete).
 */
@Composable
fun BoardingPass(t: JSONObject, modifier: Modifier = Modifier, actions: (@Composable () -> Unit)? = null) {
    val kind = t.text("kind")
    val top = 150.dp
    Column(modifier.fillMaxWidth().padding(bottom = 12.dp).appear()
        .shadow(3.dp, TicketShape(top), ambientColor = Color(0x18000000), spotColor = Color(0x22B81D2B))
        .glass(TicketShape(top), strength = 0.8f)) {
        // top: operator and route
        Column(Modifier.height(top).fillMaxWidth().background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0x1FD7192A), Color(0x08FFC72C)))).padding(horizontal = 18.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(30.dp).clip(CircleShape).background(Brand.Blue), contentAlignment = Alignment.Center) { Icon(kindIcon(kind), null, tint = Color.White, modifier = Modifier.size(17.dp)) }
                Text(t.text("provider").ifBlank { kind.replaceFirstChar { it.uppercase() } }, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 8.dp).weight(1f))
                Text(when (t.text("status")) { "found" -> "FOUND IN GMAIL"; else -> kind.uppercase() }, style = MaterialTheme.typography.labelSmall, color = Brand.Blue, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.weight(1f))
            Row(verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    Text(placeCode(t.text("from")), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Brand.Ink, letterSpacing = 1.sp)
                    Text(t.text("from").ifBlank { "From" }, style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    timeText(t.str("depart_at")).takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.titleSmall, color = Brand.Blue) }
                }
                Column(Modifier.padding(horizontal = 6.dp).padding(bottom = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        repeat(4) { Box(Modifier.padding(horizontal = 2.dp).size(4.dp).clip(CircleShape).background(Brand.Muted.copy(alpha = 0.5f))) }
                        Icon(kindIcon(kind), null, tint = Brand.Blue, modifier = Modifier.padding(horizontal = 4.dp).size(22.dp).floaty(3f))
                        repeat(4) { Box(Modifier.padding(horizontal = 2.dp).size(4.dp).clip(CircleShape).background(Brand.Muted.copy(alpha = 0.5f))) }
                    }
                }
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                    Text(placeCode(t.text("to")), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Brand.Ink, letterSpacing = 1.sp)
                    Text(t.text("to").ifBlank { "To" }, style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    timeText(t.str("arrive_at")).takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.titleSmall, color = Brand.Blue) }
                }
            }
        }
        // tear line between the notches
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            repeat(28) { Box(Modifier.weight(1f).height(2.dp).clip(RoundedCornerShape(1.dp)).background(Brand.Muted.copy(alpha = 0.35f))) }
        }
        Column(Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            Row(Modifier.fillMaxWidth()) {
                Detail("Date", dayText(t.str("depart_at")).ifBlank { "—" }, Modifier.weight(1.4f))
                Detail("PNR / booking", t.text("ref").ifBlank { "—" }, Modifier.weight(1.3f))
            }
            Row(Modifier.fillMaxWidth().padding(top = 10.dp)) {
                Detail("Seat", t.text("seat").ifBlank { "—" }, Modifier.weight(1f))
                Detail("Class", t.text("travel_class").ifBlank { "—" }, Modifier.weight(1f))
                Detail("Travellers", if (t.int("travellers") > 0) t.int("travellers").toString() else "—", Modifier.weight(0.8f))
            }
            if (t.text("source") == "gmail" && t.text("title").isNotBlank()) Text("From your email: " + t.text("title"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 10.dp))
            actions?.let { Box(Modifier.padding(top = 10.dp)) { it() } }
        }
    }
}

@Composable
private fun TicketCard(t: JSONObject, onKeep: (() -> Unit)? = null, onShare: (() -> Unit)? = null, onDelete: () -> Unit) {
    BoardingPass(t) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            if (onKeep != null) PrimaryButton("Keep in My trips", onKeep, Modifier.weight(1f), coral = true)
            if (onShare != null) OutlinedButton(onClick = onShare, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.Groups, null, Modifier.size(18.dp)); Text(" Share with group") }
            TextButton(onClick = onDelete) { Text(if (onKeep != null) "Not mine" else "Delete", color = Brand.Muted) }
        }
    }
}

@Composable
private fun Detail(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, letterSpacing = 0.5.sp)
        Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Share a ticket with one of your group trips (or keep it just for you — it already is). */
@Composable
private fun ShareTicketDialog(ticketId: Int, onClose: () -> Unit, onShared: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val l = rememberLoader(ticketId) { Api.get("trip-groups").objs("items") }
    var err by remember { mutableStateOf<String?>(null) }
    AlertDialog(onDismissRequest = onClose, title = { Text("Share with a group trip") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            Text("Your family or friends in the trip will see this boarding pass (route, times, PNR, seat). It stays in your own My trips too.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            Gap(8)
            val groups = l.data.value
            when {
                groups == null && l.loading.value -> Loading()
                groups.isNullOrEmpty() -> Text("You're not in a group trip yet — make one in My trips → Group trips.", color = Brand.Muted)
                else -> groups.forEach { g ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(14.dp)).border(1.dp, Brand.Line, RoundedCornerShape(14.dp)).clickable {
                        scope.launch {
                            try { Api.post("trip-groups/${g.int("id")}/items", mapOf("kind" to "ticket", "ref" to ticketId)); onShared("Shared with " + g.text("title") + ".") }
                            catch (e: Exception) { err = errorText(e) }
                        }
                    }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Groups, null, tint = Brand.Blue)
                        Column(Modifier.padding(start = 10.dp).weight(1f)) {
                            Text(g.text("title"), style = MaterialTheme.typography.titleSmall)
                            Text("${g.int("members")} people" + if (g.text("dates").isNotBlank()) " · " + g.text("dates") else "", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                        }
                        Text("Share", color = Brand.Coral, fontWeight = FontWeight.Bold)
                    }
                }
            }
            err?.let { Notice(it, "bad", Modifier.padding(top = 8.dp)) }
        }
    }, confirmButton = { TextButton(onClick = onClose) { Text("Keep just for me") } })
}

@Composable
private fun AddTicketDialog(onClose: () -> Unit, onDone: (JSONObject) -> Unit) {
    val scope = rememberCoroutineScope()
    var kind by rememberSaveable { mutableStateOf("train") }
    var provider by rememberSaveable { mutableStateOf("") }
    var ref by rememberSaveable { mutableStateOf("") }
    var from by rememberSaveable { mutableStateOf("") }
    var to by rememberSaveable { mutableStateOf("") }
    var depart by rememberSaveable { mutableStateOf("") }
    var seat by rememberSaveable { mutableStateOf("") }
    var people by rememberSaveable { mutableStateOf("") }
    var err by remember { mutableStateOf<String?>(null) }
    AlertDialog(onDismissRequest = onClose, title = { Text("Add a ticket") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("flight" to "Flight", "train" to "Train", "bus" to "Bus", "ferry" to "Ferry", "event" to "Event", "other" to "Other").forEach { (v, l) ->
                    val on = kind == v
                    Text(l, color = if (on) Color.White else Brand.InkSoft, style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Brand.Sky).clickable { kind = v }.padding(horizontal = 12.dp, vertical = 7.dp))
                }
            }
            Gap(8)
            Field("From", from, { from = it.take(100) }); Gap(6)
            Field("To", to, { to = it.take(100) }); Gap(6)
            Field("Leaves (YYYY-MM-DD HH:MM)", depart, { depart = it.take(16) }); Gap(6)
            Field("Airline / train / operator", provider, { provider = it.take(80) }); Gap(6)
            Field("PNR / booking number", ref, { ref = it.take(30) }); Gap(6)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Field("Seat", seat, { seat = it.take(60) }, Modifier.weight(1f))
                Field("People", people, { people = it.filter { c -> c.isDigit() }.take(2) }, Modifier.width(100.dp))
            }
            err?.let { Notice(it, "bad", Modifier.padding(top = 8.dp)) }
        }
    }, confirmButton = { TextButton(onClick = {
        scope.launch {
            try { onDone(Api.post("tickets", mapOf("kind" to kind, "provider" to provider, "booking_ref" to ref, "from" to from, "to" to to, "depart" to depart, "seat" to seat, "travellers" to people.toIntOrNull()))) }
            catch (e: Exception) { err = errorText(e) }
        }
    }) { Text("Save ticket") } }, dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } })
}

/** The tickets screen opened when the browser hands back from Gmail (with what was found). */
@Composable
fun TicketsScreen(nav: NavHostController, message: String?) {
    Column(Modifier.fillMaxSize()) {
        BackBar("Tickets", { nav.popBackStack() })
        TicketsList(nav, message)
    }
}
