@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.triparro.app.screens

import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.layout.imePadding
import android.Manifest
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Add
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.outlined.AddAPhoto
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.BookmarkAdd
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.Upload
import com.triparro.app.core.copyToCache
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.pressable
import kotlinx.coroutines.launch
import org.json.JSONObject

/*
 * Travel Planner: from where you are to a stay, resort, EV station, pet services, tourist place or any town —
 * restaurants, coffee shops, petrol pumps and EV chargers on the way, each with directions, a TripArro AI guide,
 * saved plans (My trips → Trip plans) and favourite places (private, or public for every traveller).
 */

private fun openUrl(ctx: android.content.Context, u: String) { try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (_: Exception) { } }
private fun hm(min: Int) = if (min >= 60) "${min / 60} h ${min % 60} min" else "$min min"
private val PlannerBrush = Brush.linearGradient(listOf(Color(0xFF8E0F1D), Color(0xFFD7192A), Color(0xFFFF6A3D)))

/** Ask for location permission once, then return a fix (or a message). */
@Composable
private fun rememberLocator(onFix: (Double, Double) -> Unit, onMessage: (String) -> Unit): () -> Unit {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    fun locate() {
        onMessage("Finding your location…")
        scope.launch {
            when (val r = LocationHelper.current(ctx)) {
                is LocResult.Found -> { onFix(r.lat, r.lng); onMessage("") }
                LocResult.Off -> onMessage("Location is switched off on your phone. Turn it on, or type where you start.")
                LocResult.Denied -> onMessage("Location is not allowed for TripArro. Allow it in settings, or type where you start.")
                LocResult.NotFound -> onMessage("We couldn't find your location just now. Try again, or type where you start.")
            }
        }
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { g -> if (g.values.any { it }) locate() else onMessage("Location is not allowed — type where you start instead.") }
    return {
        if (LocationHelper.hasPermission(ctx)) locate()
        else ask.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }
}

private data class Spot(val lat: Double, val lng: Double, val name: String, val kind: String = "town", val kindLabel: String = "", val id: String = "")

private fun JSONObject.toSpot() = Spot(num("lat") ?: 0.0, num("lng") ?: 0.0, text("name"), text("kind", "town"), text("kind_label"), text("id"))

/** Search box for a destination: TripArro listings, the guest's bookings, or any town. */
@Composable
private fun SpotSearch(label: String, chosen: Spot?, onChoose: (Spot?) -> Unit, showBookings: Boolean) {
    var q by remember { mutableStateOf("") }
    var items by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    val focus = LocalFocusManager.current
    LaunchedEffect(q, showBookings) {
        if (q.length == 1) return@LaunchedEffect
        if (q.isEmpty() && !showBookings) { items = emptyList(); return@LaunchedEffect }
        kotlinx.coroutines.delay(350)
        busy = true
        items = try { Api.get("trip/destinations", mapOf("q" to q)).objs("items") } catch (_: Exception) { emptyList() }
        busy = false
    }
    if (chosen != null) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brand.Sky).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Place, null, tint = Brand.Blue)
            Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                Text(label, style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                Text(chosen.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (chosen.kindLabel.isNotEmpty()) Text(chosen.kindLabel, style = MaterialTheme.typography.labelSmall, color = Brand.Blue)
            }
            IconButton(onClick = { onChoose(null); q = "" }) { Icon(Icons.Outlined.Close, "Change") }
        }
        return
    }
    OutlinedTextField(q, { q = it }, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true, shape = RoundedCornerShape(16.dp),
        placeholder = { Text("Stay, EV station, pet services, town…") }, leadingIcon = { Icon(Icons.Outlined.Search, null) },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }))
    if (busy && items.isEmpty()) Text("Searching…", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
    val bring = remember { androidx.compose.foundation.relocation.BringIntoViewRequester() }
    LaunchedEffect(items) { if (items.isNotEmpty()) { kotlinx.coroutines.delay(150); try { bring.bringIntoView() } catch (_: Exception) { } } }
    if (items.isNotEmpty()) {
        Column(Modifier.bringIntoViewRequester(bring).padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, Brand.Line, RoundedCornerShape(16.dp)).background(Color.White)) {
            items.take(10).forEach { d ->
                Row(Modifier.fillMaxWidth().clickable { onChoose(d.toSpot()); focus.clearFocus() }.padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    val emoji = when (d.text("kind")) { "stay" -> "🏡"; "resort" -> "🏝️"; "ev" -> "🔌"; "pet" -> "🐾"; "place" -> "📸"; "booking" -> "🧳"; else -> "📍" }
                    Text(emoji, Modifier.width(30.dp))
                    Column(Modifier.weight(1f)) {
                        Text(d.text("name"), fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(listOf(d.text("kind_label"), d.text("sub")).filter { it.isNotEmpty() }.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}

@Composable
fun PlannerScreen(nav: NavHostController) {
    val scope = rememberCoroutineScope()
    var from by remember { mutableStateOf<Spot?>(null) }
    var to by remember { mutableStateOf<Spot?>(null) }
    var locMsg by remember { mutableStateOf("") }
    var plan by remember { mutableStateOf<JSONObject?>(null) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var typeStart by remember { mutableStateOf(false) }
    val locate = rememberLocator({ la, ln -> from = Spot(la, ln, "Your location", "gps") }, { locMsg = it })
    LaunchedEffect(Unit) { LocationHelper.lastFix?.let { from = Spot(it.lat, it.lng, "Your location", "gps") } ?: locate() }

    fun make() {
        val f = from ?: return; val t = to ?: return
        busy = true; err = null
        scope.launch {
            try {
                plan = Api.post("trip/plan", mapOf("from_lat" to f.lat, "from_lng" to f.lng, "from_name" to f.name, "to_lat" to t.lat, "to_lng" to t.lng,
                    "to_name" to t.name, "to_kind" to t.kind, "to_id" to t.id)).obj("plan")
            } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }
    val p = plan
    if (p != null) { PlanView(nav, p, null, onBack = { plan = null }); return }
    if (busy) { TripLoading(if (from?.kind == "gps") "Your location" else from?.name, to?.name); return }

    Scaffold(topBar = { BackBar("Travel planner", { nav.popBackStack() }) { IconButton(onClick = { nav.navigate("myplaces") }) { Icon(Icons.Outlined.Star, "My places") } } }, containerColor = Brand.Page) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).imePadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(PlannerBrush).padding(18.dp)) {
                Text("Plan your drive", style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.ExtraBold)
                Text("Restaurants, coffee, petrol pumps and EV chargers on the way — each with directions, and TripArro AI to guide you.", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.bodyMedium)
            }
            Gap(16)
            if (typeStart) {
                SpotSearch("Starting from", from?.takeIf { it.kind != "gps" }, { from = it; if (it == null) typeStart = true }, false)
                TextButton(onClick = { typeStart = false; locate() }) { Icon(Icons.Outlined.MyLocation, null, Modifier.size(18.dp)); Text(" Use my location instead") }
            } else {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(16.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(38.dp).clip(CircleShape).background(Brand.SunSoft), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.MyLocation, null, tint = Brand.SunInk) }
                    Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                        Text("Starting from", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                        Text(if (from != null) "Your location" else "Not found yet", fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = { typeStart = true; from = null }) { Text("Type a place") }
                }
                if (locMsg.isNotEmpty()) Text(locMsg, style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
                if (from == null && locMsg.isNotEmpty() && !locMsg.startsWith("Finding")) TextButton(onClick = locate) { Text("Try my location again") }
            }
            Gap(12)
            SpotSearch("Where are you going?", to, { to = it }, true)
            Gap(18)
            err?.let { Notice(it, "bad"); Gap(10) }
            PrimaryButton(if (from == null) "Choose where you start" else if (to == null) "Choose where you're going" else "Plan my trip", { make() },
                enabled = from != null && to != null, loading = busy, icon = Icons.Outlined.Map)
            Gap(20)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { nav.navigate("tripplans") }, modifier = Modifier.weight(1f)) { Text("Saved plans") }
                OutlinedButton(onClick = { nav.navigate("myplaces") }, modifier = Modifier.weight(1f)) { Text("My places") }
            }
            Gap(30)
        }
    }
}

/** A plan: summary, AI guide, stops by category with directions, save, ask TripArro AI. */
@Composable
private fun PlanView(nav: NavHostController, plan: JSONObject, savedId: Int?, onBack: () -> Unit, onDeleted: (() -> Unit)? = null, tripInfo: JSONObject? = null) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    val cats = plan.objs("categories").filter { it.int("count") > 0 }
    var cat by remember { mutableStateOf(cats.firstOrNull()?.text("key") ?: "restaurant") }
    var saved by remember { mutableStateOf(savedId) }
    var saveMsg by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val chat = remember { mutableStateListOf<Pair<String, String>>() }
    var q by remember { mutableStateOf("") }
    var asking by remember { mutableStateOf(false) }
    val route = plan.obj("route") ?: JSONObject()
    val stops = plan.obj("stops")?.let { s -> s.objs(cat) } ?: emptyList()
    val title = plan.str("title") ?: "${plan.obj("from")?.text("name")} → ${plan.obj("to")?.text("name")}"
    // the traveller's own trip: stops they add, the totals through them, Start
    val picked = remember { mutableStateListOf<JSONObject>() }
    val pickedKeys = picked.map { stopKey(it) }
    var routeTrip by remember { mutableStateOf<JSONObject?>(null) }
    var routing by remember { mutableStateOf(false) }
    var starting by remember { mutableStateOf(false) }
    var openStop by remember { mutableStateOf<JSONObject?>(null) }
    fun toggle(st: JSONObject) { val k = stopKey(st); val i = picked.indexOfFirst { stopKey(it) == k }; if (i >= 0) picked.removeAt(i) else if (picked.size < 12) picked.add(st) }
    LaunchedEffect(pickedKeys.joinToString()) {
        if (picked.isEmpty()) { routeTrip = null; return@LaunchedEffect }
        routing = true; kotlinx.coroutines.delay(400)
        try {
            val body = mutableMapOf<String, Any?>("stops" to picked.toList())
            if (saved != null) body["plan_id"] = saved else body["token"] = plan.text("token")
            routeTrip = Api.post("trip/route", body).obj("trip")
        } catch (_: Exception) { routeTrip = null }
        routing = false
    }
    fun startTrip() {
        if (picked.isEmpty() || starting) return
        starting = true
        scope.launch {
            try {
                if (session?.user != null) {
                    val body = mutableMapOf<String, Any?>("stops" to picked.toList(), "title" to title)
                    if (saved != null) body["plan_id"] = saved else body["token"] = plan.text("token")
                    val r = Api.post("trip/start", body)
                    saved = r.int("id"); AppState.refreshTick.value++
                    nav.navigate("triprun/${r.int("id")}")
                } else {
                    val t = routeTrip ?: Api.post("trip/route", mapOf("stops" to picked.toList(), "token" to plan.text("token"))).obj("trip")
                    AppState.localTrip.value = t; AppState.localTripDone.value = 0; AppState.localTripTitle.value = title
                    nav.navigate("triprun/0")
                }
            } catch (e: Exception) { saveMsg = errorText(e) }
            starting = false
        }
    }

    fun ask() {
        val question = q.trim(); if (question.length < 2) return
        val history = chat.map { mapOf("role" to it.first, "text" to it.second) }
        chat.add("user" to question); q = ""; asking = true
        scope.launch {
            try {
                val body = mutableMapOf<String, Any?>("question" to question, "history" to history)
                if (saved != null) body["plan_id"] = saved else body["token"] = plan.text("token")
                chat.add("assistant" to Api.post("trip/ask", body).text("answer"))
            } catch (e: Exception) { chat.add("assistant" to errorText(e)) }
            asking = false
        }
    }

    Scaffold(topBar = { BackBar(title, onBack) {
        if (saved != null && onDeleted != null) IconButton(onClick = {
            scope.launch { try { Api.post("trip/plans/$saved/delete"); onDeleted() } catch (_: Exception) { } }
        }) { Icon(Icons.Outlined.Delete, "Delete plan") }
    } }, containerColor = Brand.Page,
        bottomBar = { if (picked.isNotEmpty()) TripTotalsBar(picked.size, routeTrip, routing, starting) { startTrip() } }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad).imePadding(), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 40.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            tripInfo?.takeIf { it.text("status") in listOf("ready", "on_the_way", "finished") && saved != null }?.let { ti ->
                item {
                    val st = ti.text("status")
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(if (st == "finished") Brand.TealSoft else Brand.SunSoft)
                        .pressable({ nav.navigate("triprun/$saved") }).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(if (st == "finished") "🎉" else "🧭", style = MaterialTheme.typography.titleLarge)
                        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                            Text(if (st == "finished") "You finished this trip" else "Continue your trip", fontWeight = FontWeight.ExtraBold)
                            Text("${ti.int("done_count")} of ${ti.int("steps")} done · ${ti.obj("trip")?.num("km")} km", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                        }
                        Text(if (st == "finished") "View" else "Go", color = Brand.Blue, fontWeight = FontWeight.Bold)
                    }
                }
            }
            item {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(PlannerBrush).padding(18.dp)) {
                    Text("${plan.obj("from")?.text("name")}  →  ${plan.obj("to")?.text("name")}", color = Color.White, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.titleMedium)
                    plan.obj("to")?.str("kind_label")?.let { Text(it, color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelMedium) }
                    Gap(10)
                    Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                        Column { Text("${route.num("km") ?: 0} km", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold); Text("distance", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelSmall) }
                        Column { Text(hm(route.int("minutes")), color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold); Text("driving", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelSmall) }
                    }
                    Text(route.text("note"), color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 6.dp))
                    Gap(12)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Open route in Maps", color = Brand.SunInk, fontWeight = FontWeight.Bold, modifier = Modifier.clip(RoundedCornerShape(50)).background(Brand.Sun).pressable({ openUrl(ctx, plan.text("directions_url")) }).padding(horizontal = 14.dp, vertical = 9.dp))
                        if (saved == null) Text(if (saving) "Saving…" else "Save to My trips", color = Color.White, fontWeight = FontWeight.Bold,
                            modifier = Modifier.clip(RoundedCornerShape(50)).border(1.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(50)).pressable({
                                if (session?.user == null) { nav.navigate("login"); return@pressable }
                                saving = true
                                scope.launch {
                                    try { saved = Api.post("trip/plans", mapOf("token" to plan.text("token"))).int("id"); saveMsg = "Saved — find it in My trips → Trip plans." }
                                    catch (e: Exception) { saveMsg = errorText(e) }
                                    saving = false
                                }
                            }).padding(horizontal = 14.dp, vertical = 9.dp))
                        else Text("✓ Saved", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 9.dp))
                    }
                    saveMsg?.let { Text(it, color = Color.White, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp)) }
                }
            }
            plan.obj("weather")?.let { w ->
                item {
                    val tone = w.text("verdict")
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(when (tone) { "bad" -> Brand.DangerSoft; "caution" -> Brand.WarnSoft; else -> Brand.TealSoft }).padding(14.dp)) {
                        Text("${weatherEmoji(w.obj("now")?.str("icon"))}  ${w.text("headline")}", fontWeight = FontWeight.Bold)
                        Text(w.text("advice"), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                    }
                }
            }
            item {
                val g = plan.obj("guide")
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(18.dp)).padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.AutoAwesome, null, tint = Brand.Blue, modifier = Modifier.size(20.dp))
                        Text(if (g?.text("source") == "ai") "  TripArro AI guide" else "  Your trip at a glance", fontWeight = FontWeight.ExtraBold)
                    }
                    Gap(6)
                    Text(g?.text("text") ?: "", style = MaterialTheme.typography.bodyMedium)
                }
            }
            plan.strings("notes").forEach { n -> item { Notice(n, "warn") } }
            item {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    plan.objs("categories").forEach { c ->
                        FilterChip(selected = cat == c.text("key"), onClick = { cat = c.text("key") }, enabled = c.int("count") > 0, shape = RoundedCornerShape(50),
                            label = { Text("${c.text("icon")} ${c.text("label")} (${c.int("count")})") },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Brand.Sun, selectedLabelColor = Brand.SunInk))
                    }
                }
            }
            item { Text("Tap a place to see its photos · tap + to add it to your trip, then Start.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
            if (stops.isEmpty()) item { Text("Nothing found in this group along the way.", color = Brand.Muted, style = MaterialTheme.typography.bodySmall) }
            itemsIndexed(stops) { i, s -> StopRow(s, Modifier.appear(i.coerceAtMost(8)), stopKey(s) in pickedKeys, { toggle(s) }, { openStop = s }) }
            item {
                Gap(6)
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(18.dp)).padding(14.dp)) {
                    Text("Ask TripArro AI about this trip", fontWeight = FontWeight.ExtraBold)
                    Text("Where to stop for lunch, where to charge, what's open near the destination…", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    chat.forEach { (role, text) ->
                        val me = role == "user"
                        Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = if (me) Arrangement.End else Arrangement.Start) {
                            Text(text, color = if (me) Color.White else Brand.Ink, style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.fillMaxWidth(0.85f).clip(RoundedCornerShape(16.dp)).background(if (me) Brand.Blue else Brand.Page).padding(10.dp))
                        }
                    }
                    if (asking) Text("TripArro AI is thinking…", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
                    Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(q, { q = it }, Modifier.weight(1f), placeholder = { Text("Ask a question") }, singleLine = true, shape = RoundedCornerShape(50),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { ask() }))
                        IconButton(onClick = { ask() }, enabled = !asking) { Icon(Icons.AutoMirrored.Filled.Send, "Ask", tint = Brand.Blue) }
                    }
                }
            }
            item { Text(plan.text("attribution"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted) }
        }
    }
    openStop?.let { st -> StopSheet(st, stopKey(st) in pickedKeys, { toggle(st) }) { openStop = null } }
}

@Composable
private fun StopRow(s: JSONObject, modifier: Modifier = Modifier, picked: Boolean = false, onToggle: (() -> Unit)? = null, onOpen: (() -> Unit)? = null) {
    val ctx = LocalContext.current
    Row(modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(if (picked) Brand.SunSoft else Color.White)
        .border(1.5.dp, if (picked) Brand.Sun else Brand.Line, RoundedCornerShape(18.dp)).then(if (onOpen != null) Modifier.pressable(onOpen) else Modifier).padding(10.dp),
        verticalAlignment = Alignment.CenterVertically) {
        val photo = s.strings("photos").firstOrNull() ?: s.str("photo")
        Box {
            if (photo != null) Photo(photo, Modifier.size(72.dp), corner = 14.dp)
            else Box(Modifier.size(72.dp).clip(RoundedCornerShape(14.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) {
                Text(stopEmoji(s.str("category")), style = MaterialTheme.typography.headlineSmall)
            }
            val n = s.strings("photos").size
            if (n > 1) Text("$n", color = Color.White, style = MaterialTheme.typography.labelSmall, modifier = Modifier.align(Alignment.BottomEnd).padding(4.dp).clip(RoundedCornerShape(50)).background(Color.Black.copy(alpha = 0.55f)).padding(horizontal = 6.dp))
        }
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(s.text("name"), fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            val where = if (s.optBoolean("near_destination")) "Near your destination · ${s.num("to_destination_km")} km away" else "At km ${s.num("km_from_start")} · ${s.num("off_route_km")} km off the road"
            Text(where, style = MaterialTheme.typography.labelMedium, color = Brand.Blue)
            listOfNotNull(s.str("info"), s.str("opening_hours")?.let { "Hours $it" }, s.str("by")?.let { "Shared by $it" }).joinToString(" · ").takeIf { it.isNotEmpty() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Text(s.text("source"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (onToggle != null) Box(Modifier.size(40.dp).clip(CircleShape).background(if (picked) Brand.Teal else Brand.Sky).pressable(onToggle), contentAlignment = Alignment.Center) {
                Icon(if (picked) Icons.Outlined.Check else Icons.Outlined.Add, if (picked) "Remove from my trip" else "Add to my trip", tint = if (picked) Color.White else Brand.Blue)
            }
            Box(Modifier.size(40.dp).clip(CircleShape).background(Brand.Sun).pressable({ navigateTo(ctx, s.num("lat"), s.num("lng"), s.str("directions_url")) }), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Directions, "Directions", tint = Brand.SunInk)
            }
        }
    }
}

/** My trips → Trip plans: every saved plan. */
@Composable
fun SavedPlansList(nav: NavHostController) {
    val l = rememberLoader(Unit) { Api.get("trip/plans").objs("items") }
    val items = l.data.value
    when {
        items == null && l.loading.value -> Loading()
        items == null -> ErrorBox(l.error.value ?: "Could not load your plans.", { l.reload() })
        items.isEmpty() -> EmptyBox("No saved trip plans yet", "Plan a drive in the Travel planner and tap Save to My trips.", "Plan a trip", icon = Icons.Outlined.Map) { nav.navigate("planner") }
        else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { PrimaryButton("Plan a new trip", { nav.navigate("planner") }, icon = Icons.Outlined.Map) }
            itemsIndexed(items) { i, p ->
                val stt = p.text("status")
                Row(Modifier.appear(i.coerceAtMost(8)).fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(18.dp))
                    .pressable({ nav.navigate(if (stt == "ready" || stt == "on_the_way") "triprun/${p.int("id")}" else "tripplan/${p.int("id")}") }).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(46.dp).clip(CircleShape).background(PlannerBrush), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Map, null, tint = Color.White) }
                    Column(Modifier.padding(start = 12.dp).weight(1f)) {
                        Text(p.text("title"), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${p.num("km")} km · ${hm(p.int("minutes"))}" + (if (p.int("stops") > 0) " · ${p.int("stops")} stops" else "") + " · saved ${p.text("created_at").take(10)}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                        when (stt) {
                            "ready" -> Text("Ready to start", style = MaterialTheme.typography.labelMedium, color = Brand.Blue, fontWeight = FontWeight.Bold)
                            "on_the_way" -> Text("On the way · ${p.int("done_count")} of ${p.int("steps")} done", style = MaterialTheme.typography.labelMedium, color = Brand.SunInk, fontWeight = FontWeight.Bold)
                            "finished" -> Text("✓ Trip finished", style = MaterialTheme.typography.labelMedium, color = Brand.TealDark, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SavedPlansScreen(nav: NavHostController) {
    Scaffold(topBar = { BackBar("Saved trip plans", { nav.popBackStack() }) }, containerColor = Brand.Page) { pad -> Box(Modifier.padding(pad)) { SavedPlansList(nav) } }
}

@Composable
fun SavedPlanScreen(nav: NavHostController, id: Int) {
    val tick by AppState.refreshTick
    val l = rememberLoader(id, tick) { Api.get("trip/plans/$id") }
    val p = l.data.value?.obj("plan")
    when {
        p != null -> PlanView(nav, p, id, onBack = { nav.popBackStack() }, onDeleted = { nav.popBackStack() }, tripInfo = l.data.value)
        l.loading.value -> TripLoadingSmall("Opening your trip plan")
        else -> Scaffold(topBar = { BackBar("Trip plan", { nav.popBackStack() }) }) { pad -> Box(Modifier.padding(pad)) { ErrorBox(l.error.value ?: "Could not open this plan.", { l.reload() }) } }
    }
}

/* ---------- favourite places ---------- */

@Composable
fun MyPlacesScreen(nav: NavHostController) {
    val session by Api.session.collectAsState()
    val tick by AppState.refreshTick
    var tab by remember { mutableStateOf(0) }
    var here by remember { mutableStateOf<Pair<Double, Double>?>(LocationHelper.lastFix?.let { it.lat to it.lng }) }
    var msg by remember { mutableStateOf("") }
    val locate = rememberLocator({ a, b -> here = a to b }, { msg = it })
    val mine = rememberLoader(session?.user?.id, tick) { if (session?.user == null) null else Api.get("places/mine").objs("items") }
    val community = rememberLoader(here, tick) { here?.let { (a, b) -> Api.get("places/community", mapOf("lat" to a, "lng" to b, "km" to 50)).objs("items") } }
    LaunchedEffect(tab) { if (tab == 1 && here == null) locate() }
    Scaffold(topBar = { BackBar("Favourite places", { nav.popBackStack() }) }, containerColor = Brand.Page,
        floatingActionButton = { if (session?.user != null) FloatingActionButton(onClick = { nav.navigate("placeedit/0") }, containerColor = Brand.Sun) { Icon(Icons.Outlined.AddAPhoto, "Add a place", tint = Brand.SunInk) } }) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {
            Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("My places", "Shared by travellers").forEachIndexed { i, t ->
                    Text(t, style = MaterialTheme.typography.labelLarge, color = if (tab == i) Color.White else Brand.InkSoft,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (tab == i) Brand.Blue else Brand.Sky).clickable { tab = i }.padding(horizontal = 16.dp, vertical = 9.dp))
                }
            }
            if (tab == 0) {
                if (session?.user == null) EmptyBox("Sign in to keep your places", "Save the spots you love with photos — just for you, or shared with every traveller.", "Sign in", icon = Icons.Outlined.Star) { nav.navigate("login") }
                else {
                    val items = mine.data.value
                    when {
                        items == null && mine.loading.value -> Loading()
                        items == null -> ErrorBox(mine.error.value ?: "Could not load your places.", { mine.reload() })
                        items.isEmpty() -> EmptyBox("No favourite places yet", "Tap the camera button to save a place with photos and notes.", "Add a place", icon = Icons.Outlined.AddAPhoto) { nav.navigate("placeedit/0") }
                        else -> PlaceList(nav, items, mine = true)
                    }
                }
            } else {
                val items = community.data.value
                when {
                    here == null -> Column(Modifier.padding(16.dp)) { Text(msg.ifEmpty { "Share your location to see places travellers shared near you." }, color = Brand.Muted); TextButton(onClick = locate) { Text("Use my location") } }
                    items == null && community.loading.value -> Loading()
                    items == null -> ErrorBox(community.error.value ?: "Could not load places.", { community.reload() })
                    items.isEmpty() -> EmptyBox("Nothing shared near you yet", "Places other travellers make public within 50 km appear here.", null, icon = Icons.Outlined.Public)
                    else -> PlaceList(nav, items, mine = false)
                }
            }
        }
    }
}

@Composable
private fun PlaceList(nav: NavHostController, items: List<JSONObject>, mine: Boolean) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var reported by remember { mutableStateOf(setOf<Int>()) }
    LazyColumn(contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 90.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        itemsIndexed(items, key = { _, p -> p.int("id") }) { i, p ->
            Column(Modifier.appear(i.coerceAtMost(8)).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(20.dp))
                .then(if (mine) Modifier.pressable({ nav.navigate("placeedit/${p.int("id")}") }) else Modifier)) {
                val photos = p.strings("photos")
                if (photos.isNotEmpty()) Row(Modifier.horizontalScroll(rememberScrollState())) {
                    photos.forEach { u -> Photo(u, Modifier.width(if (photos.size == 1) 400.dp else 220.dp).aspectRatio(4f / 3f).padding(end = 2.dp), corner = 0.dp) }
                }
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(p.text("name"), fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                        if (mine) Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clip(RoundedCornerShape(50)).background(if (p.text("visibility") == "public") Brand.TealSoft else Brand.Page).padding(horizontal = 8.dp, vertical = 3.dp)) {
                            Icon(if (p.text("visibility") == "public") Icons.Outlined.Public else Icons.Outlined.Lock, null, Modifier.size(14.dp), tint = Brand.InkSoft)
                            Text(if (p.optBoolean("hidden")) " Hidden by TripArro" else if (p.text("visibility") == "public") " Public" else " Private", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    Text(listOfNotNull(p.text("category_label"), p.num("km")?.let { "$it km away" }, if (!mine) "Shared by ${p.text("by")}" else null).joinToString(" · "), style = MaterialTheme.typography.labelMedium, color = Brand.Blue)
                    p.str("details")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, maxLines = 4, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp)) }
                    p.str("address")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
                    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { openUrl(ctx, p.text("directions_url")) }) { Icon(Icons.Outlined.Directions, null, Modifier.size(18.dp)); Text(" Directions") }
                        if (!mine) {
                            val id = p.int("id")
                            TextButton(onClick = { scope.launch { try { Api.post("places/$id/report"); reported = reported + id } catch (_: Exception) { } } }, enabled = id !in reported) {
                                Icon(Icons.Outlined.Flag, null, Modifier.size(16.dp)); Text(if (id in reported) " Reported" else " Report")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PlaceEditScreen(nav: NavHostController, id: Int) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("viewpoint") }
    var details by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var lat by remember { mutableStateOf<Double?>(null) }
    var lng by remember { mutableStateOf<Double?>(null) }
    var public by remember { mutableStateOf(false) }
    val keep = remember { mutableStateListOf<String>() }
    val added = remember { mutableStateListOf<Uri>() }
    var cats by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var errs by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var locMsg by remember { mutableStateOf("") }
    val locate = rememberLocator({ a, b -> lat = a; lng = b }, { locMsg = it })
    LaunchedEffect(id) {
        try {
            val r = Api.get("places/mine")
            cats = r.objs("categories")
            r.objs("items").firstOrNull { it.int("id") == id }?.let { p ->
                name = p.text("name"); category = p.text("category", "other"); details = p.text("details"); address = p.text("address")
                lat = p.num("lat"); lng = p.num("lng"); public = p.text("visibility") == "public"; keep.clear(); keep.addAll(p.strings("photos"))
            }
        } catch (_: Exception) { }
        if (id == 0 && lat == null) locate()
    }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(6)) { uris -> uris.forEach { if (keep.size + added.size < 6) added.add(it) } }

    Scaffold(topBar = { BackBar(if (id == 0) "Add a favourite place" else "Edit place", { nav.popBackStack() }) {
        if (id != 0) IconButton(onClick = { scope.launch { try { Api.post("places/$id/delete"); AppState.refreshTick.value++; nav.popBackStack() } catch (e: Exception) { err = errorText(e) } } }) { Icon(Icons.Outlined.Delete, "Delete") }
    } }, containerColor = Brand.Page) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).imePadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
            Text("Photos", fontWeight = FontWeight.Bold)
            Row(Modifier.padding(top = 6.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                keep.toList().forEach { u -> Box { Photo(u, Modifier.size(96.dp), corner = 14.dp); RemoveDot { keep.remove(u) } } }
                added.toList().forEach { u -> Box { Photo(u.toString(), Modifier.size(96.dp), corner = 14.dp); RemoveDot { added.remove(u) } } }
                if (keep.size + added.size < 6) Box(Modifier.size(96.dp).clip(RoundedCornerShape(14.dp)).background(Brand.Sky).pressable({ pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Outlined.AddAPhoto, null, tint = Brand.Blue); Text("Add", style = MaterialTheme.typography.labelSmall, color = Brand.Blue) }
                }
            }
            errs["photos"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
            Gap(14)
            Field("Name of the place", name, { name = it }, error = errs["name"])
            Gap(8)
            Text("Type", style = MaterialTheme.typography.labelMedium, color = Brand.Muted)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                cats.forEach { c -> FilterChip(selected = category == c.text("key"), onClick = { category = c.text("key") }, label = { Text(c.text("label")) }, shape = RoundedCornerShape(50),
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Brand.Sun, selectedLabelColor = Brand.SunInk)) }
            }
            Gap(8)
            Field("What's special here", details, { details = it }, lines = 4, placeholder = "Best time to go, what to try, parking…")
            Gap(8)
            Field("Address or landmark (optional)", address, { address = it })
            Gap(12)
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, if (errs["location"] != null) Brand.Danger else Brand.Line, RoundedCornerShape(16.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Place, null, tint = Brand.Blue)
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    Text("Location", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                    Text(if (lat != null) "%.5f, %.5f".format(lat, lng) else "Not set", fontWeight = FontWeight.SemiBold)
                    if (locMsg.isNotEmpty()) Text(locMsg, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                }
                TextButton(onClick = locate) { Text(if (lat == null) "Use my location" else "Update") }
            }
            errs["location"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
            Gap(14)
            Text("Who can see it?", fontWeight = FontWeight.Bold)
            Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(false to "Only me", true to "Everyone").forEach { (v, l) ->
                    Row(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(if (public == v) Brand.SunSoft else Color.White).border(1.5.dp, if (public == v) Brand.Sun else Brand.Line, RoundedCornerShape(16.dp)).clickable { public = v }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (v) Icons.Outlined.Public else Icons.Outlined.Lock, null, tint = Brand.InkSoft, modifier = Modifier.size(20.dp))
                        Text("  $l", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            Text(if (public) "Other travellers will see the name, photos, details and location, with your first name. Phone numbers, emails and links are removed. You can make it private again any time."
                 else "Only you can see this place.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
            Gap(16)
            err?.let { Notice(it, "bad"); Gap(8) }
            PrimaryButton("Save place", {
                busy = true; err = null; errs = emptyMap()
                scope.launch {
                    try {
                        val fields = mutableListOf("name" to name.trim(), "category" to category, "details" to details.trim(), "address" to address.trim(),
                            "lat" to (lat?.toString() ?: ""), "lng" to (lng?.toString() ?: ""), "visibility" to (if (public) "public" else "private"))
                        if (id != 0) fields.add("id" to id.toString())
                        keep.forEach { fields.add("keep_photos[]" to it) }
                        val files = added.mapIndexedNotNull { i, u -> copyToCache(ctx, u, "place$i")?.let { Upload("photos[]", it.first, it.second) } }
                        Api.postMultipart("places", fields, files)
                        AppState.refreshTick.value++
                        nav.popBackStack()
                    } catch (e: ApiException) { err = e.message; errs = e.errors } catch (e: Exception) { err = errorText(e) }
                    busy = false
                }
            }, enabled = name.isNotBlank(), loading = busy)
            Gap(30)
        }
    }
}

@Composable
private fun RemoveDot(onClick: () -> Unit) {
    Box(Modifier.padding(4.dp).size(26.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.55f)).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(Icons.Outlined.Close, "Remove photo", tint = Color.White, modifier = Modifier.size(16.dp))
    }
}
