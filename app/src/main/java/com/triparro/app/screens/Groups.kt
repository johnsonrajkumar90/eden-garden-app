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
    var joining by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Card {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(CircleShape).background(Brand.Sky), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Groups, null, tint = Brand.Blue) }
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text("Plan a trip together", style = MaterialTheme.typography.titleMedium)
                    Text("Invite friends and family, share your bookings, pick places on the map and chat — all in one trip.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                }
            }
            Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PrimaryButton("New group trip", { creating = true }, Modifier.weight(1f), icon = Icons.Outlined.Add)
                OutlinedButton(onClick = { joining = true }, modifier = Modifier.weight(1f).height(52.dp)) { Text("Join with a code") }
            }
        }
        Gap()
        val data = l.data.value
        when {
            data == null && l.loading.value -> Loading()
            data == null -> ErrorBox(l.error.value ?: "Could not load your group trips.", { l.reload() })
            data.objs("items").isEmpty() -> Text("No group trips yet. Make one and send the invite to your group.", style = MaterialTheme.typography.bodyMedium, color = Brand.Muted, modifier = Modifier.padding(8.dp))
            else -> data.objs("items").forEach { g ->
                // a trip card: its photo, name, place and dates, and who has joined
                Box(Modifier.padding(bottom = 12.dp).fillMaxWidth().height(170.dp).appear().clip(RoundedCornerShape(26.dp)).background(Brush.linearGradient(listOf(Color(0xFF6A1019), Color(0xFFB81D2B), Color(0xFFFF8A3D))))
                    .clickable { nav.navigate("group/${g.int("id")}") }) {
                    g.str("cover")?.let { coil.compose.AsyncImage(model = it, contentDescription = null, contentScale = androidx.compose.ui.layout.ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x11000000), Color(0xCC15161C)))))
                    Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
                        val sub = listOf(g.text("destination"), g.text("dates")).filter { it.isNotBlank() }.joinToString(" · ")
                        if (sub.isNotBlank()) Text(sub, style = MaterialTheme.typography.labelMedium, color = Color(0xCCFFFFFF))
                        Text(g.text("title"), style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 2)
                        Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            val people = (0 until (g.optJSONArray("people")?.length() ?: 0)).map { g.optJSONArray("people")!!.optString(it) }
                            people.take(4).forEachIndexed { i, n ->
                                Box(Modifier.padding(end = 4.dp).size(28.dp).clip(CircleShape).background(listOf(Color(0xFFFFC72C), Color(0xFFFF8A7A), Color(0xFF8C9BF2), Color(0xFF5CC29A))[i % 4]), contentAlignment = Alignment.Center) {
                                    Text(n.take(1), fontWeight = FontWeight.Bold, color = Brand.Ink, style = MaterialTheme.typography.labelMedium)
                                }
                            }
                            Text(" " + people.joinToString(", ").ifBlank { "Just you" } + if (g.int("members") > people.size) " +${g.int("members") - people.size}" else "",
                                style = MaterialTheme.typography.labelMedium, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
    }
    if (creating) NewGroupDialog({ creating = false }) { id -> creating = false; AppState.refreshTick.value++; nav.navigate("group/$id") }
    if (joining) JoinCodeDialog({ joining = false }) { code -> joining = false; nav.navigate("groupjoin/$code") }
}

@Composable
private fun NewGroupDialog(onClose: () -> Unit, onMade: (Int) -> Unit) {
    val scope = rememberCoroutineScope()
    var title by rememberSaveable { mutableStateOf("") }
    var dest by remember { mutableStateOf<JSONObject?>(null) }
    var start by rememberSaveable { mutableStateOf("") }
    var end by rememberSaveable { mutableStateOf("") }
    var err by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    AlertDialog(onDismissRequest = onClose, title = { Text("New group trip") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            Field("Trip name", title, { title = it }, placeholder = "Ooty with family")
            Gap(8)
            PlacePicker("Where to (optional)", dest) { dest = it }
            Gap(8)
            Field("First day (YYYY-MM-DD, optional)", start, { start = it.take(10) })
            Gap(8)
            Field("Last day (YYYY-MM-DD, optional)", end, { end = it.take(10) })
            err?.let { Notice(it, "bad", Modifier.padding(top = 8.dp)) }
        }
    }, confirmButton = {
        TextButton(enabled = !busy, onClick = {
            busy = true; err = null
            scope.launch {
                try {
                    val body = mutableMapOf<String, Any?>("title" to title, "start_date" to start.ifBlank { null }, "end_date" to end.ifBlank { null })
                    dest?.let { body["destination"] = it.text("name"); body["lat"] = it.optDouble("lat"); body["lng"] = it.optDouble("lng") }
                    onMade(Api.post("trip-groups", body).int("id"))
                } catch (e: Exception) { err = errorText(e) }
                busy = false
            }
        }) { Text("Make the trip") }
    }, dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } })
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
    }
}

/** Google Map of the trip (the destination, places to visit, booked stays) with buttons to open it in Google Maps. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
internal fun GroupMap(g: JSONObject, ctx: Context, tall: Boolean) {
    val map = g.obj("map") ?: return
    val embed = map.text("embed")
    Card(padding = 0.dp) {
        Box(Modifier.fillMaxWidth().height(if (tall) 380.dp else 200.dp).clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))) {
            AndroidView(factory = { c ->
                WebView(c).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    webViewClient = WebViewClient()
                    loadData("<html><body style='margin:0'><iframe src='" + embed.replace("'", "%27") + "' width='100%' height='100%' style='border:0;position:absolute;inset:0' loading='lazy' referrerpolicy='no-referrer-when-downgrade'></iframe></body></html>", "text/html", "utf-8")
                }
            }, update = { }, modifier = Modifier.fillMaxSize())
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
                OutlinedButton(onClick = { openUrl(ctx, map.text("open")) }, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.Map, null, Modifier.size(18.dp)); Text(" Google Maps") }
                map.str("route")?.let { r -> OutlinedButton(onClick = { openUrl(ctx, r) }, modifier = Modifier.weight(1f)) { Icon(Icons.Outlined.Directions, null, Modifier.size(18.dp)); Text(" Directions") } }
            }
        }
    }
}

internal fun openUrl(ctx: Context, url: String) {
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
                "place" -> item.optJSONArray("coords")?.let { c -> openUrl(ctx, "https://www.google.com/maps/search/?api=1&query=${c.optDouble(0)},${c.optDouble(1)}") }
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
            OutlinedTextField(text, { text = it.take(2000) }, Modifier.weight(1f), placeholder = { Text("Message the group") }, maxLines = 4, shape = RoundedCornerShape(20.dp))
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
                if (kind == "place") { PlacePicker("Find the place on the map", place) { place = it; if (it != null && title.isBlank()) title = it.text("name") }; Gap(8) }
                Field(if (kind == "todo") "What needs doing" else if (kind == "place") "Name" else "Title", title, { title = it.take(160) })
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
