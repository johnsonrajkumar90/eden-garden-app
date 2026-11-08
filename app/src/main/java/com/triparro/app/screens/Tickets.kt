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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
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
                if (upcoming.isNotEmpty()) { Text("Upcoming", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp)); upcoming.forEach { t -> TicketCard(t, onDelete = { act("tickets/${t.int("id")}/delete") }) } }
                if (past.isNotEmpty()) { Gap(); Text("Past", style = MaterialTheme.typography.titleMedium, color = Brand.Muted, modifier = Modifier.padding(bottom = 8.dp)); past.forEach { t -> TicketCard(t, onDelete = { act("tickets/${t.int("id")}/delete") }) } }
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
    if (adding) AddTicketDialog({ adding = false }) { r -> adding = false; data = JSONObject(data?.toString() ?: "{}").put("items", r.optJSONArray("items")) }
}

private fun kindIcon(kind: String): ImageVector = when (kind) {
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

/** A ticket, shaped like a boarding pass: route on top, details below a dashed tear line. */
@Composable
private fun TicketCard(t: JSONObject, onKeep: (() -> Unit)? = null, onDelete: () -> Unit) {
    Card(Modifier.padding(bottom = 10.dp), padding = 0.dp) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).clip(CircleShape).background(Brand.Sky), contentAlignment = Alignment.Center) { Icon(kindIcon(t.text("kind")), null, tint = Brand.Blue) }
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                val route = listOf(t.text("from"), t.text("to")).filter { it.isNotBlank() }.joinToString("  →  ")
                Text(route.ifBlank { t.text("provider").ifBlank { t.text("title") } }, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                val sub = listOf(t.text("provider"), t.text("kind").replaceFirstChar { it.uppercase() }).filter { it.isNotBlank() }.distinct().joinToString(" · ")
                Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            }
        }
        // tear line
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            repeat(30) { Box(Modifier.weight(1f).height(1.5.dp).background(Brand.Line)) }
        }
        Column(Modifier.padding(16.dp)) {
            whenText(t.str("depart_at")).takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.titleSmall, color = Brand.Blue) }
            Row(Modifier.padding(top = 6.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                t.str("ref")?.let { Detail("PNR / booking", it) }
                t.str("seat")?.let { Detail("Seat", it) }
                t.str("travel_class")?.let { Detail("Class", it) }
                if (t.int("travellers") > 0) Detail("Travellers", t.int("travellers").toString())
            }
            if (t.text("source") == "gmail" && t.text("title").isNotBlank()) Text("From your email: " + t.text("title"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 8.dp))
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (onKeep != null) PrimaryButton("Keep", onKeep, Modifier.weight(1f), coral = true)
                TextButton(onClick = onDelete, modifier = if (onKeep != null) Modifier.weight(1f) else Modifier) { Text(if (onKeep != null) "Not mine / delete" else "Delete", color = Brand.Muted) }
            }
        }
    }
}

@Composable
private fun Detail(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
        Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
    }
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
