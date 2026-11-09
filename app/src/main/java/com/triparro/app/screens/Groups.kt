package com.triparro.app.screens

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CheckBox
import androidx.compose.material.icons.outlined.CheckBoxOutlineBlank
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Hotel
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.shareLink
import com.triparro.app.ui.appear
import kotlinx.coroutines.launch
import org.json.JSONObject

/*
 * Group trips: make a trip, invite friends and family with a link or code, and plan it together —
 * bookings each person chooses to share, saved trip plans, places on a Google map, notes, a to-do list and a chat.
 */

/** The list in My trips → Group trips: your group trips, make a new one, or join with a code. */
@Composable
fun GroupTripsList(nav: NavHostController) {
    val tick by AppState.refreshTick
    val l = rememberLoader(tick) { Api.get("trip-groups") }
    var creating by remember { mutableStateOf(false) }
    var newIdea by remember { mutableStateOf("") }
    var joining by remember { mutableStateOf(false) }
    var sharing by remember { mutableStateOf<JSONObject?>(null) }
    var made by remember { mutableStateOf<JSONObject?>(null) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        MakeTripCard(onNew = { idea -> newIdea = idea; creating = true }, onJoin = { joining = true })
        Gap()
        val data = l.data.value
        data?.objs("invites")?.forEach { inv ->
            InvitationCard(inv, onJoin = { nav.navigate("groupjoin/${inv.text("code")}") }) {
                scope.launch { try { Api.post("trip-groups/invites/${inv.int("id")}/decline"); AppState.refreshTick.value++ } catch (_: Exception) { } }
            }
        }
        when {
            data == null && l.loading.value -> Loading()
            data == null -> ErrorBox(l.error.value ?: "Could not load your group trips.", { l.reload() })
            data.objs("items").isEmpty() -> Text("No trips yet. Name one above — or tap an idea — and share its link with family and friends.", style = MaterialTheme.typography.bodyMedium, color = Brand.Muted, modifier = Modifier.padding(8.dp))
            else -> {
                Text("Your trips  ·  ${data.objs("items").size}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Brand.Ink, modifier = Modifier.padding(start = 4.dp, bottom = 10.dp))
                data.objs("items").forEach { g -> TripCard(g, onOpen = { nav.navigate("group/${g.int("id")}") }, onShare = { sharing = g }) }
            }
        }
        Spacer(Modifier.height(90.dp))
    }
    if (creating) NewGroupDialog(newIdea, { creating = false }) { g -> creating = false; AppState.refreshTick.value++; made = g }
    // just made: share its link straight away, then open it
    made?.let { g -> ShareTripDialog(g, justMade = true, onClose = { made = null; nav.navigate("group/${g.int("id")}") }) }
    sharing?.let { g -> ShareTripDialog(g, justMade = false, onClose = { sharing = null }) }
    if (joining) JoinCodeDialog({ joining = false }) { code -> joining = false; nav.navigate("groupjoin/$code") }
}

@Composable
private fun NewGroupDialog(idea: String, onClose: () -> Unit, onMade: (JSONObject) -> Unit) {
    val scope = rememberCoroutineScope()
    var title by rememberSaveable { mutableStateOf(idea) }
    // a photo that matches the name (or the place), looked up as you type
    var cover by remember { mutableStateOf<JSONObject?>(null) }
    var dest by remember { mutableStateOf<JSONObject?>(null) }
    var start by rememberSaveable { mutableStateOf("") }
    var end by rememberSaveable { mutableStateOf("") }
    var err by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pickDates by remember { mutableStateOf(false) }
    val destName = dest?.text("name") ?: ""
    LaunchedEffect(title, destName) {
        if (title.trim().length < 3 && destName.isBlank()) { cover = null; return@LaunchedEffect }
        kotlinx.coroutines.delay(650)
        cover = try { Api.get("trip-groups/cover-suggest", mapOf("title" to title.trim(), "destination" to destName)) } catch (_: Exception) { null }
    }
    AlertDialog(onDismissRequest = onClose, title = { Text("New trip") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            Box(Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(20.dp))) {
                TripCover(cover?.str("photo_url"), "$title $destName", Modifier.fillMaxSize(), iconSize = 96)
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.4f to Color(0x00000000), 1f to Color(0xCC15161C))))
                Text(title.ifBlank { "Your trip" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 2,
                    overflow = TextOverflow.Ellipsis, modifier = Modifier.align(Alignment.BottomStart).padding(14.dp))
            }
            Gap(12)
            Field("Name the trip", title, { title = it.take(80) }, placeholder = "Ooty with family")
            Gap(8)
            PlacePicker("Where to (optional)", dest) { dest = it }
            Gap(8)
            OutlinedButton(onClick = { pickDates = true }, modifier = Modifier.fillMaxWidth()) {
                Text(if (start.isBlank()) "Add dates (optional)" else prettyRange(start, end))
            }
            err?.let { Notice(it, "bad", Modifier.padding(top = 8.dp)) }
        }
    }, confirmButton = {
        TextButton(enabled = !busy, onClick = {
            busy = true; err = null
            scope.launch {
                try {
                    val body = mutableMapOf<String, Any?>("title" to title, "start_date" to start.ifBlank { null }, "end_date" to end.ifBlank { null })
                    dest?.let { body["destination"] = it.text("name"); body["lat"] = it.optDouble("lat"); body["lng"] = it.optDouble("lng") }
                    cover?.str("photo")?.let { body["cover_photo"] = it }
                    onMade(Api.post("trip-groups", body).obj("group") ?: JSONObject())
                } catch (e: Exception) { err = errorText(e) }
                busy = false
            }
        }) { Text("Make the trip") }
    }, dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } })
    if (pickDates) TripDatesPicker(start, end, { pickDates = false }) { a, b -> start = a; end = b; pickDates = false }
}

private fun prettyRange(a: String, b: String): String = try {
    val f = java.time.format.DateTimeFormatter.ofPattern("EEE d MMM")
    val x = java.time.LocalDate.parse(a).format(f)
    if (b.isBlank() || b == a) x else x + "  →  " + java.time.LocalDate.parse(b).format(f)
} catch (_: Exception) { a }

/** Pick the trip's first and last day on a calendar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TripDatesPicker(start: String, end: String, onClose: () -> Unit, onPick: (String, String) -> Unit) {
    fun millis(d: String): Long? = try { java.time.LocalDate.parse(d).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli() } catch (_: Exception) { null }
    fun day(m: Long?): String = m?.let { java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneOffset.UTC).toLocalDate().toString() } ?: ""
    val state = androidx.compose.material3.rememberDateRangePickerState(initialSelectedStartDateMillis = millis(start), initialSelectedEndDateMillis = millis(end))
    androidx.compose.material3.DatePickerDialog(onDismissRequest = onClose,
        confirmButton = { TextButton(enabled = state.selectedStartDateMillis != null, onClick = { onPick(day(state.selectedStartDateMillis), day(state.selectedEndDateMillis ?: state.selectedStartDateMillis)) }) { Text("Done") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } }) {
        androidx.compose.material3.DateRangePicker(state = state, modifier = Modifier.height(480.dp), title = { Text("Trip dates", Modifier.padding(start = 24.dp, top = 16.dp)) })
    }
}

/** A trip's own link: share it, send it on WhatsApp, copy it — everyone who opens it can join this trip. */
@Composable
internal fun ShareTripDialog(g: JSONObject, justMade: Boolean, onClose: () -> Unit) {
    val ctx = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    val link = g.text("link"); val text = g.text("share_text").ifBlank { "Join my trip \"${g.text("title")}\" on TripArro:" }
    AlertDialog(onDismissRequest = onClose, icon = { Icon(Icons.Outlined.Groups, null, tint = Brand.Blue) },
        title = { Text(if (justMade) "“${g.text("title")}” is ready" else "Share “${g.text("title")}”") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text("Send this link to family and friends. Whoever joins sees this trip's plan, expenses, favourites and chat — your other trips stay private.", style = MaterialTheme.typography.bodyMedium)
                Row(Modifier.padding(top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, Brand.Line, RoundedCornerShape(14.dp)).padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(link.removePrefix("https://"), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("Code " + g.text("code"), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = { (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Trip link", link)); copied = true }) { Text(if (copied) "Copied" else "Copy") }
                }
                Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("Share", { shareLink(ctx, text, link) }, Modifier.weight(1f), icon = Icons.Outlined.Share)
                    OutlinedButton(onClick = { openGroupUrl(ctx, "https://wa.me/?text=" + Uri.encode("$text $link")) }, modifier = Modifier.weight(1f).height(52.dp)) { Text("WhatsApp") }
                }
                HorizontalDivider(Modifier.padding(vertical = 12.dp), color = Brand.Line)
                InviteByEmail(g)
            }
        },
        confirmButton = { TextButton(onClick = onClose) { Text(if (justMade) "Open the trip" else "Done") } })
}

@Composable
private fun JoinCodeDialog(onClose: () -> Unit, onCode: (String) -> Unit) {
    var code by rememberSaveable { mutableStateOf("") }
    AlertDialog(onDismissRequest = onClose, title = { Text("Join a group trip") }, text = {
        Column {
            Text("Enter the 8-letter code from the invite, or open the invite link on this phone.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            Gap(8)
            Field("Trip code", code, { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(8) })
        }
    }, confirmButton = { TextButton(enabled = code.length == 8, onClick = { onCode(code) }) { Text("Next") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } })
}

/** Search a town or place (the travel planner's search) and pick it — gives the map position. */
@Composable
internal fun PlacePicker(label: String, chosen: JSONObject?, onChoose: (JSONObject?) -> Unit) {
    var q by remember { mutableStateOf("") }
    var items by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    if (chosen != null) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Brand.Sky).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Place, null, tint = Brand.Blue)
            Text(chosen.text("name"), Modifier.weight(1f).padding(horizontal = 8.dp), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            TextButton(onClick = { onChoose(null); q = "" }) { Text("Change") }
        }
        return
    }
    LaunchedEffect(q) {
        if (q.length < 2) { items = emptyList(); return@LaunchedEffect }
        kotlinx.coroutines.delay(350)
        items = try { Api.get("trip/destinations", mapOf("q" to q)).objs("items").filter { it.has("lat") && !it.isNull("lat") } } catch (_: Exception) { emptyList() }
    }
    Field(label, q, { q = it }, placeholder = "Town or place")
    items.take(5).forEach { it2 ->
        Row(Modifier.fillMaxWidth().clickable { onChoose(it2) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Place, null, tint = Brand.Muted, modifier = Modifier.size(18.dp))
            Column(Modifier.padding(start = 8.dp)) {
                Text(it2.text("name"), style = MaterialTheme.typography.bodyMedium, maxLines = 1)
                if (it2.text("sub").isNotBlank()) Text(it2.text("sub"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

/** An invite link or code opened on the phone: what trip it is, then join (sign in first when needed). */
@Composable
fun GroupJoinScreen(nav: NavHostController, code: String) {
    val session by Api.session.collectAsState()
    val scope = rememberCoroutineScope()
    val l = rememberLoader(code, session?.user?.id) { Api.get("trip-groups/code/$code") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var relation by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().background(com.triparro.app.ui.PageGlass)) {
        BackBar("Join a group trip", { nav.popBackStack() })
        val p = l.data.value
        when {
            p == null && l.loading.value -> Loading()
            p == null -> ErrorBox(l.error.value ?: "This trip was not found.", { l.reload() })
            p.bool("member") -> LaunchedEffect(Unit) { nav.navigate("group/${p.int("id")}") { popUpTo("groupjoin/$code") { inclusive = true } } }
            else -> Column(Modifier.padding(16.dp)) {
                Card {
                    Text("${p.text("by")} invited you", style = MaterialTheme.typography.labelLarge, color = Brand.Coral)
                    Text(p.text("title"), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 4.dp))
                    val sub = listOf(p.text("destination"), p.text("dates")).filter { it.isNotBlank() }.joinToString(" · ")
                    if (sub.isNotBlank()) Text(sub, style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft)
                    Text("${p.int("members")} already planning · share bookings, places on the map, a to-do list and a chat.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
                    Text("They are your…", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 12.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("family" to "Family", "friend" to "Friends", "partner" to "Partner", "colleague" to "Colleagues").forEach { (v, t) ->
                            val on = relation == v
                            Text(t, color = if (on) Color.White else Brand.InkSoft, style = MaterialTheme.typography.labelLarge,
                                modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Brand.Sky).clickable { relation = if (on) "" else v }.padding(horizontal = 14.dp, vertical = 8.dp))
                        }
                    }
                }
                Gap()
                err?.let { Notice(it, "bad"); Gap(8) }
                if (session?.user == null) PrimaryButton("Sign in to join", { nav.navigate("login") }, Modifier.fillMaxWidth())
                else PrimaryButton("Join this trip", {
                    busy = true; err = null
                    scope.launch {
                        try {
                            val id = Api.post("trip-groups/join", mapOf("code" to code, "relation" to relation)).int("id")
                            AppState.refreshTick.value++
                            nav.navigate("group/$id") { popUpTo("groupjoin/$code") { inclusive = true } }
                        } catch (e: Exception) { err = errorText(e) }
                        busy = false
                    }
                }, Modifier.fillMaxWidth(), loading = busy, coral = true)
            }
        }
    }
}

@Composable
internal fun InviteCard(g: JSONObject, ctx: Context, newCode: () -> Unit) {
    Card {
        Text("Invite friends and family", style = MaterialTheme.typography.titleMedium)
        Text("Send the link, or tell them the code — they join in the TripArro app or on the website.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
        Row(Modifier.padding(top = 10.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, Brand.Line, RoundedCornerShape(14.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Trip code", style = MaterialTheme.typography.labelSmall, color = Brand.Muted); Text(g.text("code"), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
            IconButton(onClick = { (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Trip code", g.text("link"))) }) { Icon(Icons.Outlined.ContentCopy, "Copy the invite link") }
        }
        Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PrimaryButton("Share invite", { shareLink(ctx, g.text("share_text"), g.text("link")) }, Modifier.weight(1f), icon = Icons.Outlined.Share)
            OutlinedButton(onClick = {
                try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text=" + Uri.encode(g.text("share_text") + " " + g.text("link")))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { }
            }, modifier = Modifier.weight(1f).height(52.dp)) { Text("WhatsApp") }
        }
        if (g.bool("owner")) TextButton(onClick = newCode) { Text("Make a new code (the old link stops working)") }
        HorizontalDivider(Modifier.padding(vertical = 10.dp), color = Brand.Line)
        InviteByEmail(g)
    }
}

/** Google Map of the trip (the destination, places to visit, booked stays) with buttons to open it in Google Maps. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
internal fun GroupMap(g: JSONObject, ctx: Context, tall: Boolean) {
    val map = g.obj("map") ?: return
    Card(padding = 0.dp) {
        Box(Modifier.fillMaxWidth().height(if (tall) 380.dp else 200.dp).clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))) {
            // a real map with a pin for every place in the trip (OpenStreetMap — no key needed); "Google Maps" below opens the full app
            val html = remember(g.objs("pins").size, g.optJSONArray("dest")?.toString()) { tripMapHtml(g) }
            AndroidView(factory = { c ->
                WebView(c).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                            request?.url?.toString()?.let { u -> if (u.startsWith("http")) openGroupUrl(c, u) }; return true   // a tapped pin's "Directions" opens Google Maps
                        }
                    }
                    loadDataWithBaseURL("https://triparro.com/", html, "text/html", "utf-8", null)
                }
            }, update = { w -> if (w.tag != html) { w.tag = html; w.loadDataWithBaseURL("https://triparro.com/", html, "text/html", "utf-8", null) } }, modifier = Modifier.fillMaxSize())
        }
        Column(Modifier.padding(12.dp)) {
            val pins = g.objs("pins")
            if (tall) pins.forEach { p ->
                Row(Modifier.fillMaxWidth().clickable {
                    try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=" + p.optDouble("lat") + "," + p.optDouble("lng"))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { }
                }.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(when (p.text("kind")) { "booking" -> Icons.Outlined.Hotel; "destination" -> Icons.Outlined.Map; else -> Icons.Outlined.Place }, null, tint = Brand.Coral, modifier = Modifier.size(20.dp))
                    Text(p.text("label"), Modifier.padding(start = 8.dp), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { openGroupUrl(ctx, map.text("open")) }, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.Map, null, Modifier.size(18.dp)); Text(" Google Maps") }
                map.str("route")?.let { r -> OutlinedButton(onClick = { openGroupUrl(ctx, r) }, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.Directions, null, Modifier.size(18.dp)); Text(" Directions") } }
            }
        }
    }
}

internal fun openGroupUrl(ctx: Context, url: String) {
    try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { }
}

@Composable
internal fun GroupItem(nav: NavHostController, groupId: Int, item: JSONObject, ctx: Context, toggle: () -> Unit, delete: () -> Unit) {
    val kind = item.text("kind")
    if (kind == "ticket") {   // a member's travel ticket, as a boarding pass
        item.obj("ticket")?.let { t ->
            BoardingPass(t) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Shared by " + item.text("by"), style = MaterialTheme.typography.labelMedium, color = Brand.Muted, modifier = Modifier.weight(1f))
                    if (item.bool("can_delete")) TextButton(onClick = delete) { Text(if (item.bool("mine")) "Stop sharing" else "Remove", color = Brand.Muted) }
                }
            }
        }
        return
    }
    Row(Modifier.padding(bottom = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(16.dp))
        .clickable {
            when (kind) {
                "booking" -> item.obj("booking")?.let { b -> nav.navigate("property/${b.text("kind")}/${b.int("listing_id")}") }
                "plan" -> item.obj("plan")?.let { p -> if (p.bool("owner")) nav.navigate("tripplan/${p.int("id")}") }
                "place" -> item.optJSONArray("coords")?.let { c -> openGroupUrl(ctx, "https://www.google.com/maps/search/?api=1&query=${c.optDouble(0)},${c.optDouble(1)}") }
                "todo" -> toggle()
                else -> {}
            }
        }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
        when (kind) {
            "booking" -> Photo(item.obj("booking")?.str("image"), Modifier.size(64.dp), corner = 12.dp)
            "todo" -> Icon(if (item.bool("done")) Icons.Outlined.CheckBox else Icons.Outlined.CheckBoxOutlineBlank, null, tint = Brand.Blue)
            "place" -> Icon(Icons.Outlined.Place, null, tint = Brand.Coral)
            "plan" -> Icon(Icons.Outlined.Route, null, tint = Brand.Blue)
            else -> Icon(Icons.Outlined.Description, null, tint = Brand.Muted)
        }
        Column(Modifier.padding(start = 12.dp).weight(1f)) {
            when (kind) {
                "booking" -> item.obj("booking")?.let { b ->
                    Text(b.text("title"), style = MaterialTheme.typography.titleSmall, maxLines = 2)
                    Text("${b.text("dates")} · ${b.int("guests")} guests" + if (b.bool("cancelled")) " · cancelled" else "", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                    Text(b.text("location"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1)
                }
                "plan" -> item.obj("plan")?.let { p ->
                    Text(p.text("title"), style = MaterialTheme.typography.titleSmall)
                    Text("${p.text("from")} → ${p.text("to")} · ${p.optDouble("km").toInt()} km", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                }
                else -> {
                    Text(item.text("title"), style = MaterialTheme.typography.titleSmall,
                        textDecoration = if (kind == "todo" && item.bool("done")) androidx.compose.ui.text.style.TextDecoration.LineThrough else null)
                    item.str("body")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft) }
                    item.str("day")?.let { Text(prettyDay(it), style = MaterialTheme.typography.labelSmall, color = Brand.Blue) }
                }
            }
            Text("by " + item.text("by"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
        }
        if (item.bool("can_delete")) IconButton(onClick = delete) { Icon(Icons.Outlined.Delete, "Delete", tint = Brand.Muted) }
    }
}

private fun prettyDay(iso: String): String = try {
    java.time.LocalDate.parse(iso).format(java.time.format.DateTimeFormatter.ofPattern("EEE d MMM"))
} catch (_: Exception) { iso }

@Composable
internal fun GroupChat(g: JSONObject, send: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    val scroll = rememberScrollState()
    val msgs = g.objs("messages")
    LaunchedEffect(msgs.size) { scroll.animateScrollTo(scroll.maxValue) }
    Column(Modifier.fillMaxSize().imePadding()) {
        Column(Modifier.weight(1f).verticalScroll(scroll).padding(16.dp)) {
            if (msgs.isEmpty()) Text("Say hello to the group — plan who brings what, where to meet and when to leave.", color = Brand.Muted, style = MaterialTheme.typography.bodyMedium)
            msgs.forEach { m ->
                val mine = m.bool("mine")
                Column(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
                    if (!mine) Text(m.text("by"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                    Text(m.text("body"), color = if (mine) Color.White else Brand.Ink,
                        modifier = Modifier.widthIn(max = 280.dp).clip(RoundedCornerShape(16.dp)).background(if (mine) Brand.Blue else Color.White).padding(horizontal = 12.dp, vertical = 9.dp))
                }
            }
        }
        Row(Modifier.fillMaxWidth().background(Color.White).padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(text, { text = it.take(2000) }, Modifier.weight(1f), colors = com.triparro.app.ui.fieldColors(), placeholder = { Text("Message the group") }, maxLines = 4, shape = RoundedCornerShape(20.dp))
            IconButton(onClick = { if (text.isNotBlank()) { send(text.trim()); text = "" } }) { Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = Brand.Blue) }
        }
    }
}

/** Add to the plan: share a booking or a saved trip plan, or add a place, a note or a to-do. */
@Composable
internal fun AddToGroup(id: Int, done: (JSONObject) -> Unit) {
    val scope = rememberCoroutineScope()
    var kind by remember { mutableStateOf("place") }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var day by remember { mutableStateOf("") }
    var place by remember { mutableStateOf<JSONObject?>(null) }
    var here by remember { mutableStateOf(true) }        // a place: where you are now (live location), or a search
    var autoName by remember { mutableStateOf("") }      // the name Google gave, replaced when another place is picked
    var err by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val share = rememberLoader(id) { Api.get("trip-groups/$id/shareable") }
    fun post(b: Map<String, Any?>) {
        busy = true; err = null
        scope.launch { try { done(Api.post("trip-groups/$id/items", b)) } catch (e: Exception) { err = errorText(e) }; busy = false }
    }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
        Text("Add to the plan", style = MaterialTheme.typography.titleLarge)
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("place" to "Place", "booking" to "My booking", "ticket" to "My ticket", "plan" to "My trip plan", "todo" to "To-do", "note" to "Note").forEach { (v, t) ->
                val on = kind == v
                Text(t, style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else Brand.InkSoft,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Brand.Sky).clickable { kind = v; err = null }.padding(horizontal = 14.dp, vertical = 8.dp))
            }
        }
        err?.let { Notice(it, "bad"); Gap(8) }
        when (kind) {
            "booking", "plan", "ticket" -> {
                val s = share.data.value
                val list = s?.objs(when (kind) { "booking" -> "bookings"; "ticket" -> "tickets"; else -> "plans" }) ?: emptyList()
                when {
                    s == null && share.loading.value -> Loading()
                    list.isEmpty() -> Text(when (kind) { "booking" -> "You have no upcoming stay or resort bookings to share."; "ticket" -> "No tickets yet — add them in My trips → Tickets (from Gmail or by hand)."; else -> "You have no saved trip plans yet — make one in the Travel planner." }, color = Brand.Muted)
                    else -> list.forEach { x ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(14.dp)).border(1.dp, Brand.Line, RoundedCornerShape(14.dp)).clickable(enabled = !busy) { post(mapOf("kind" to kind, "ref" to x.text("ref"))) }.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Icon(when (kind) { "booking" -> Icons.Outlined.Hotel; "ticket" -> kindIcon(x.text("kind")); else -> Icons.Outlined.Route }, null, tint = Brand.Blue)
                            Column(Modifier.padding(start = 10.dp).weight(1f)) {
                                Text(x.text("title"), style = MaterialTheme.typography.titleSmall)
                                x.str("dates")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft) }
                            }
                            Text("Share", color = Brand.Coral, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                if (kind == "booking") Text("The group sees the stay, dates and number of guests — not the price or your contact details.", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 8.dp))
            }
            else -> {
                if (kind == "place") {
                    PlaceSource(here) { v -> here = v; place = null; if (title == autoName) title = ""; autoName = "" }
                    Gap(10)
                    if (here) LiveSpot { n, la, ln ->
                        place = JSONObject().put("name", n).put("lat", la).put("lng", ln)
                        if (title.isBlank() || title == autoName) { title = n; autoName = n }
                    } else PlacePicker("Find the place on the map", place) { place = it; if (it != null && (title.isBlank() || title == autoName)) { title = it.text("name"); autoName = title } }
                    Gap(10)
                }
                Field(if (kind == "todo") "What needs doing" else if (kind == "place") "Place name" else "Title", title, { title = it.take(160) },
                    placeholder = if (kind == "place") "e.g. Doddabetta Peak" else "")
                Gap(8)
                if (kind != "todo") { Field("Details (optional)", body, { body = it.take(2000) }, lines = 3); Gap(8) }
                if (kind != "note") { Field("Day (YYYY-MM-DD, optional)", day, { day = it.take(10) }); Gap(8) }
                PrimaryButton("Add", {
                    val b = mutableMapOf<String, Any?>("kind" to kind, "title" to title, "body" to body, "day" to day.ifBlank { null })
                    place?.let { b["lat"] = it.optDouble("lat"); b["lng"] = it.optDouble("lng") }
                    post(b)
                }, Modifier.fillMaxWidth(), loading = busy, coral = true)
            }
        }
    }
}


/**
 * Invite by email: someone already on TripArro sees the invitation in My trips; anyone else is emailed the trip link
 * (and can be sent it on WhatsApp too). Also: send the link from your own email app.
 */
@Composable
internal fun InviteByEmail(g: JSONObject, onGroup: (JSONObject) -> Unit = {}) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf<Pair<String, String>?>(null) }   // status to message
    val text = g.text("share_text").ifBlank { "Join my trip \"${g.text("title")}\" on TripArro:" }
    Column {
        Text("Invite by email", style = MaterialTheme.typography.titleSmall)
        Text("Friends already on TripArro get the invitation in their app; others get the link by email.", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
        Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Field("Email address", email, { email = it.trim().take(190) }, Modifier.weight(1f), keyboard = androidx.compose.ui.text.input.KeyboardType.Email)
            TextButton(enabled = !busy && email.contains("@"), onClick = {
                busy = true; msg = null
                scope.launch {
                    try {
                        val r = Api.post("trip-groups/${g.int("id")}/invite", mapOf("email" to email))
                        msg = r.text("status") to r.text("message"); r.obj("group")?.let(onGroup)
                        if (r.text("status") in listOf("invited", "emailed")) email = ""
                    } catch (e: Exception) { msg = "error" to errorText(e) }
                    busy = false
                }
            }) { Text(if (busy) "Sending…" else "Invite") }
        }
        msg?.let { (st, m) ->
            Notice(m, if (st == "invited" || st == "emailed" || st == "member") "ok" else "bad", Modifier.padding(top = 6.dp))
            if (st == "emailed" || st == "not_sent") OutlinedButton(onClick = { openGroupUrl(ctx, "https://wa.me/?text=" + Uri.encode(text + " " + g.text("link"))) }, modifier = Modifier.padding(top = 6.dp).fillMaxWidth()) { Text("Also send on WhatsApp") }
        }
        TextButton(onClick = {
            try {
                val i = android.content.Intent(android.content.Intent.ACTION_SENDTO, Uri.parse("mailto:"))
                    .putExtra(android.content.Intent.EXTRA_SUBJECT, "Join my trip: " + g.text("title"))
                    .putExtra(android.content.Intent.EXTRA_TEXT, text + "\n" + g.text("link"))
                ctx.startActivity(i)
            } catch (_: Exception) { }
        }) { Text("Or send the link from your email app") }
    }
}

/** An invitation waiting for me: join or say no. */
@Composable
private fun InvitationCard(inv: JSONObject, onJoin: () -> Unit, onDecline: () -> Unit) {
    Column(Modifier.padding(bottom = 10.dp).fillMaxWidth().appear().clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(Color(0xFFFFF4D6), Color(0xFFFFE3DE))))
        .border(1.dp, Color(0x33B81D2B), RoundedCornerShape(22.dp)).padding(16.dp)) {
        Text("${inv.text("by")} invited you", style = MaterialTheme.typography.labelLarge, color = Brand.Blue)
        Text(inv.text("trip"), style = MaterialTheme.typography.titleLarge)
        val sub = listOf(inv.text("destination"), inv.text("dates")).filter { it.isNotBlank() }.joinToString(" · ")
        if (sub.isNotBlank()) Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
        Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PrimaryButton("Join the trip", onJoin, Modifier.weight(1f), coral = true)
            OutlinedButton(onClick = onDecline, modifier = Modifier.height(52.dp)) { Text("No thanks") }
        }
    }
}


/** Group trips (from the floating button): your trips, your route plans and your tickets, in one place. */
@Composable
fun GroupsHub(nav: NavHostController) {
    var tab by rememberSaveable { mutableStateOf("trips") }
    Column(Modifier.fillMaxSize()) {
        com.triparro.app.ui.BackBar("Group trips", { nav.popBackStack() })
        HubTabs(tab) { tab = it }
        androidx.compose.animation.Crossfade(tab, label = "hub") { t ->
            when (t) {
                "plans" -> SavedPlansList(nav)
                "tickets" -> TicketsList(nav)
                else -> GroupTripsList(nav)
            }
        }
    }
}


/** The trip map page: Leaflet with OpenStreetMap tiles, every pin labelled, zoomed to fit them all. */
private fun tripMapHtml(g: JSONObject): String {
    val pins = org.json.JSONArray()
    g.objs("pins").forEach { p ->
        pins.put(JSONObject().put("lat", p.optDouble("lat")).put("lng", p.optDouble("lng")).put("label", p.text("label")).put("kind", p.text("kind")))
    }
    if (pins.length() == 0) g.optJSONArray("dest")?.let { d -> pins.put(JSONObject().put("lat", d.optDouble(0)).put("lng", d.optDouble(1)).put("label", g.text("destination").ifBlank { g.text("title") }).put("kind", "destination")) }
    val data = pins.toString().replace("</", "<\\/")
    return """<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>html,body,#m{margin:0;height:100%;font-family:sans-serif}.pin{width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.leaflet-popup-content{margin:10px 12px;font-size:14px}.leaflet-popup-content a{display:inline-block;margin-top:6px;color:#d7192a;font-weight:700;text-decoration:none}
#empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#667;text-align:center;padding:24px;z-index:999;background:#f4f1ef}</style></head>
<body><div id="m"></div><script>
var pins=$data, colors={destination:'#d7192a',booking:'#1f6feb',fav:'#e8452f',place:'#0e9f6e'};
if(!pins.length||typeof L==='undefined'){document.body.insertAdjacentHTML('beforeend','<div id="empty">'+(pins.length?'The map needs the internet — try again.':'Add places to the plan (or a destination) to see them on the map.')+'</div>');}
else{var m=L.map('m',{zoomControl:true,attributionControl:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);
var b=[];pins.forEach(function(p){var c=colors[p.kind]||'#0e9f6e';
var ic=L.divIcon({className:'',html:'<div class="pin" style="background:'+c+'"></div>',iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-28]});
var t=document.createElement('div');t.textContent=p.label;
L.marker([p.lat,p.lng],{icon:ic}).addTo(m).bindPopup(t.innerHTML+'<br><a href="https://www.google.com/maps/dir/?api=1&destination='+p.lat+','+p.lng+'">Directions in Google Maps ›</a>');b.push([p.lat,p.lng]);});
if(b.length==1)m.setView(b[0],13);else m.fitBounds(b,{padding:[36,36],maxZoom:14});}
</script></body></html>"""
}
