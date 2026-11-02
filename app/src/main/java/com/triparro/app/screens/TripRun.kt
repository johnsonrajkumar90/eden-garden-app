package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Replay
import androidx.compose.material.icons.outlined.Undo
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Photo
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.pressable
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/*
 * The traveller's own trip: they add stops from the plan (restaurants, coffee, petrol, EV, places travellers love),
 * see the total km and hours, tap Start, then go stop by stop — Directions to the next stop, "I'm done here",
 * "next stop is coming up", until "You have finished this trip". Saved in My trips when signed in.
 */

private val RunBrush = Brush.linearGradient(listOf(Color(0xFF8E0F1D), Color(0xFFD7192A), Color(0xFFFF6A3D)))

internal fun stopKey(s: JSONObject) = "${s.text("category")}:${"%.4f".format(s.num("lat") ?: 0.0)}:${"%.4f".format(s.num("lng") ?: 0.0)}"
internal fun stopEmoji(cat: String?) = when (cat) { "coffee" -> "☕"; "petrol" -> "⛽"; "ev" -> "🔌"; "community" -> "⭐"; "restaurant" -> "🍽️"; else -> "📍" }
internal fun hmText(min: Int) = if (min >= 60) "${min / 60} h ${min % 60} min" else "$min min"
private fun kmBetween(a1: Double, o1: Double, a2: Double, o2: Double): Double {
    val dLat = Math.toRadians(a2 - a1); val dLng = Math.toRadians(o2 - o1)
    val h = sin(dLat / 2).let { it * it } + cos(Math.toRadians(a1)) * cos(Math.toRadians(a2)) * sin(dLng / 2).let { it * it }
    return 2 * 6371.0 * asin(minOf(1.0, sqrt(h)))
}
private fun openLink(ctx: android.content.Context, u: String?) { if (u.isNullOrBlank()) return; try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (_: Exception) { } }

/** Turn-by-turn in Google Maps when it is installed, otherwise the web directions link. */
internal fun navigateTo(ctx: android.content.Context, lat: Double?, lng: Double?, fallback: String?) {
    if (lat != null && lng != null) {
        try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$lat,$lng")).setPackage("com.google.android.apps.maps")); return } catch (_: Exception) { }
    }
    openLink(ctx, fallback)
}

/** A stop's photos and details, with Directions and Add / Remove. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun StopSheet(s: JSONObject, picked: Boolean?, onToggle: (() -> Unit)?, onClose: () -> Unit) {
    val ctx = LocalContext.current
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val own = remember(s) { s.strings("photos").ifEmpty { listOfNotNull(s.str("photo")) } }
    var google by remember(s) { mutableStateOf<List<JSONObject>>(emptyList()) }
    var mapsUrl by remember(s) { mutableStateOf(s.str("maps_url")) }
    var loading by remember(s) { mutableStateOf(true) }
    LaunchedEffect(s) {
        try {
            val r = Api.get("trip/photos", mapOf("name" to s.text("name"), "lat" to s.num("lat"), "lng" to s.num("lng"), "address" to s.str("address")))
            google = r.objs("photos"); r.str("maps_url")?.let { mapsUrl = it }
        } catch (_: Exception) { }
        loading = false
    }
    val photos: List<Pair<String, String?>> = own.map { it to null } + google.map { it.text("url") to it.str("credit") }
    ModalBottomSheet(onDismissRequest = onClose, sheetState = state, containerColor = Color.White) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(bottom = 28.dp)) {
            if (photos.isNotEmpty()) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    photos.forEach { (u, credit) ->
                        Column(Modifier.width(if (photos.size == 1) 340.dp else 280.dp)) {
                            Photo(u, Modifier.fillMaxWidth().aspectRatio(4f / 3f), corner = 18.dp)
                            credit?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 2.dp)) }
                        }
                    }
                }
            } else {
                Box(Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(150.dp).clip(RoundedCornerShape(18.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(stopEmoji(s.str("category")), style = MaterialTheme.typography.displaySmall)
                        Text(if (loading) "Looking for photos…" else "No photos here yet", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    }
                }
            }
            Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
                Text(s.text("name"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                val where = if (s.optBoolean("near_destination")) "Near your destination · ${s.num("to_destination_km")} km away"
                            else s.num("km_from_start")?.let { "At km $it from the start" + (s.num("off_route_km")?.let { o -> " · $o km off the road" } ?: "") }
                where?.let { Text(it, color = Brand.Blue, style = MaterialTheme.typography.labelLarge) }
                Gap(8)
                listOfNotNull(s.str("info"), s.str("details"), s.str("opening_hours")?.let { "Open: $it" }, s.str("address"), s.str("by")?.let { "Shared by $it" }, s.num("stop_minutes")?.let { "Plan about ${it.toInt()} min here" })
                    .forEach { Text(it, style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.padding(bottom = 4.dp)) }
                s.str("source")?.let { Text("Information: $it", style = MaterialTheme.typography.labelSmall, color = Brand.Muted) }
                Gap(14)
                PrimaryButton("Directions", { navigateTo(ctx, s.num("lat"), s.num("lng"), s.str("directions_url")) }, icon = Icons.Outlined.Directions)
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (picked != null && onToggle != null) OutlinedButton(onClick = onToggle, modifier = Modifier.weight(1f)) {
                        Icon(if (picked) Icons.Outlined.Check else Icons.Outlined.Add, null, Modifier.size(18.dp)); Text(if (picked) " In my trip — remove" else " Add to my trip")
                    }
                    s.str("phone")?.let { ph -> OutlinedButton(onClick = { openLink(ctx, "tel:" + ph.replace(" ", "")) }) { Icon(Icons.Outlined.Call, null, Modifier.size(18.dp)) } }
                }
                TextButton(onClick = { openLink(ctx, mapsUrl) }) { Icon(Icons.Outlined.PhotoLibrary, null, Modifier.size(18.dp)); Text(" More photos & reviews on Google Maps") }
            }
        }
    }
}

/** Bottom bar of a plan once stops are added: stops, km, hours and Start. */
@Composable
internal fun TripTotalsBar(count: Int, trip: JSONObject?, busy: Boolean, starting: Boolean, onStart: () -> Unit) {
    Column(Modifier.fillMaxWidth().background(Color.White).border(1.dp, Brand.Line).navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("$count stop${if (count == 1) "" else "s"} in your trip", fontWeight = FontWeight.ExtraBold)
                Text(if (trip == null) (if (busy) "Working out km and hours…" else "") else "${trip.num("km")} km · ${hmText(trip.int("total_minutes"))} in all",
                    color = Brand.Blue, style = MaterialTheme.typography.labelLarge)
                trip?.str("note")?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 2) }
            }
            Box(Modifier.clip(RoundedCornerShape(50)).background(Brand.Sun).pressable(onStart).padding(horizontal = 18.dp, vertical = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.PlayArrow, null, tint = Brand.SunInk); Text(if (starting) " Starting…" else " Start trip", color = Brand.SunInk, fontWeight = FontWeight.ExtraBold) }
            }
        }
    }
}

/**
 * The trip, stop by stop. id > 0: a trip saved in My trips (progress kept on the server); id == 0: a trip started
 * without signing in (AppState.localTrip, kept while the app is open).
 */
@Composable
fun TripRunScreen(nav: NavHostController, id: Int) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var trip by remember { mutableStateOf<JSONObject?>(if (id == 0) AppState.localTrip.value else null) }
    var done by remember { mutableIntStateOf(if (id == 0) AppState.localTripDone.value else 0) }
    var title by remember { mutableStateOf(if (id == 0) AppState.localTripTitle.value else "") }
    var err by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(id != 0) }
    var banner by remember { mutableStateOf<String?>(null) }
    var reachedNear by remember { mutableStateOf(false) }
    var sheet by remember { mutableStateOf<JSONObject?>(null) }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(id) {
        if (id == 0) return@LaunchedEffect
        try {
            val r = Api.get("trip/plans/$id")
            trip = r.obj("trip"); done = r.int("done_count"); title = r.obj("plan")?.str("title") ?: ""
            if (trip == null) err = "This plan has no trip yet — open it, add stops and tap Start trip."
        } catch (e: Exception) { err = errorText(e) }
        loading = false
    }
    val t = trip
    val stops = t?.objs("stops") ?: emptyList()
    val dest = t?.obj("destination")
    val steps = stops.size + 1
    val finished = t != null && done >= steps
    // the next place to reach: a stop, or the destination
    val target: JSONObject? = when { t == null || finished -> null; done < stops.size -> stops[done]; else -> dest }
    val targetLeg: JSONObject? = when { t == null || finished -> null; done < stops.size -> stops[done].obj("leg"); else -> t.obj("final_leg") }

    // arrival: check the phone's position every 30 s while this screen is open
    LaunchedEffect(target?.toString()) {
        reachedNear = false
        val tg = target ?: return@LaunchedEffect
        while (true) {
            if (LocationHelper.hasPermission(ctx)) {
                val fix = LocationHelper.current(ctx, 8_000) as? LocResult.Found
                if (fix != null) reachedNear = kmBetween(fix.lat, fix.lng, tg.num("lat") ?: 0.0, tg.num("lng") ?: 0.0) <= 0.35
            }
            delay(30_000)
        }
    }

    fun move(action: String) {
        val before = done
        val newDone = when (action) { "done" -> minOf(steps, done + 1); "undo" -> maxOf(0, done - 1); else -> 0 }
        val finishedName = if (action == "done") (if (before < stops.size) stops[before].text("name") else dest?.text("name")) else null
        val next = if (newDone < stops.size) stops[newDone] else if (newDone == stops.size) dest else null
        banner = when {
            finishedName == null -> null
            newDone >= steps -> null
            next != null -> "✓ You finished ${finishedName}. Next: ${next.text("name")} is coming up" + ((if (newDone < stops.size) stops[newDone].obj("leg") else t?.obj("final_leg"))?.num("km")?.let { " — $it km" } ?: "") + "."
            else -> null
        }
        if (id == 0) { done = newDone; AppState.localTripDone.value = newDone; return }
        busy = true
        scope.launch {
            try { done = Api.post("trip/plans/$id/progress", mapOf("action" to action)).int("done_count"); AppState.refreshTick.value++ }
            catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }
    LaunchedEffect(banner) { if (banner != null) { delay(7_000); banner = null } }

    Scaffold(topBar = { BackBar(title.ifEmpty { "Your trip" }, { nav.popBackStack() }) }, containerColor = Brand.Page) { pad ->
        when {
            loading -> Box(Modifier.padding(pad)) { Loading() }
            t == null -> Box(Modifier.padding(pad).padding(16.dp)) { ErrorBox(err ?: "This trip is not available any more.") }
            else -> LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 40.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(RunBrush).padding(18.dp)) {
                        Text(if (finished) "Trip finished" else if (done == 0) "Ready to go" else "On the way", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelLarge)
                        Text("${t.num("km")} km · ${hmText(t.int("total_minutes"))}", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                        Text("${stops.size} stop${if (stops.size == 1) "" else "s"} · ${t.text("note")}", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.bodySmall)
                        Gap(10)
                        LinearProgressIndicator(progress = { done.toFloat() / steps }, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)), color = Brand.Sun, trackColor = Color.White.copy(alpha = 0.25f))
                        Text("${minOf(done, steps)} of $steps done", color = Color.White, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 4.dp))
                        if (id == 0) Text("Not saved — sign in and start again to keep this trip in My trips.", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                item {
                    AnimatedVisibility(banner != null, enter = fadeIn() + slideInVertically(), exit = fadeOut()) {
                        Text(banner ?: "", color = Brand.TealDark, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brand.TealSoft).padding(14.dp))
                    }
                }
                err?.let { e -> item { ErrorBox(e) } }
                if (finished) item {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(22.dp)).padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🎉", style = MaterialTheme.typography.displayMedium)
                        Text("You have finished this trip!", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                        Text("You reached ${dest?.text("name")} — ${t.num("km")} km with ${stops.size} stop${if (stops.size == 1) "" else "s"}.", color = Brand.Muted, style = MaterialTheme.typography.bodyMedium)
                        Gap(14)
                        PrimaryButton("Back to My trips", { nav.navigate("trips") { launchSingleTop = true } })
                        TextButton(onClick = { move("restart") }) { Icon(Icons.Outlined.Replay, null, Modifier.size(18.dp)); Text(" Do this trip again") }
                    }
                } else if (target != null) item {
                    val isDest = done >= stops.size
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).border(2.dp, if (reachedNear) Brand.Teal else Brand.Sun, RoundedCornerShape(22.dp))) {
                        val photo = target.strings("photos").firstOrNull() ?: target.str("photo")
                        if (photo != null) Photo(photo, Modifier.fillMaxWidth().aspectRatio(16f / 9f).pressable({ sheet = target }), corner = 0.dp)
                        Column(Modifier.padding(16.dp)) {
                            Text(if (isDest) "Your destination" else "Next stop · ${done + 1} of ${stops.size}", color = Brand.Blue, style = MaterialTheme.typography.labelLarge)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (!isDest) Text(stopEmoji(target.str("category")) + " ", style = MaterialTheme.typography.titleLarge)
                                Text(target.text("name"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                            targetLeg?.let { Text("${it.num("km")} km · about ${hmText(it.int("minutes"))} from ${if (done == 0) "the start" else "your last stop"}", color = Brand.InkSoft) }
                            target.str("info")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
                            if (reachedNear) Text("📍 You're here!", color = Brand.TealDark, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 6.dp))
                            Gap(12)
                            PrimaryButton("Directions", { navigateTo(ctx, target.num("lat"), target.num("lng"), target.str("directions_url")) }, icon = Icons.Outlined.Directions)
                            Gap(8)
                            OutlinedButton(onClick = { move("done") }, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                                Icon(if (isDest) Icons.Outlined.Flag else Icons.Outlined.Check, null, Modifier.size(18.dp))
                                Text(if (isDest) " I've arrived — finish the trip" else " Done here — next stop")
                            }
                            Row {
                                if (target !== dest) TextButton(onClick = { sheet = target }) { Icon(Icons.Outlined.PhotoLibrary, null, Modifier.size(16.dp)); Text(" Photos & details") }
                                if (done > 0) TextButton(onClick = { move("undo") }, enabled = !busy) { Icon(Icons.Outlined.Undo, null, Modifier.size(16.dp)); Text(" Undo") }
                            }
                        }
                    }
                }
                item { Text("Your stops", fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 4.dp)) }
                itemsIndexed(stops + listOfNotNull(dest)) { i, s ->
                    val isDest = i == stops.size
                    val state = when { i < done -> "done"; i == done && !finished -> "now"; else -> "later" }
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(if (state == "now") Brand.SunSoft else Color.White)
                        .border(1.dp, if (state == "now") Brand.Sun else Brand.Line, RoundedCornerShape(18.dp)).pressable({ if (!isDest) sheet = s }).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(34.dp).clip(CircleShape).background(when (state) { "done" -> Brand.Teal; "now" -> Brand.Sun; else -> Brand.Page }), contentAlignment = Alignment.Center) {
                            if (state == "done") Icon(Icons.Outlined.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                            else Text(if (isDest) "🏁" else "${i + 1}", fontWeight = FontWeight.Bold, color = Brand.Ink)
                        }
                        val photo = s.strings("photos").firstOrNull() ?: s.str("photo")
                        if (photo != null) Photo(photo, Modifier.padding(start = 10.dp).size(48.dp), corner = 10.dp)
                        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                            Text((if (isDest) "" else stopEmoji(s.str("category")) + " ") + s.text("name"), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            val leg = if (isDest) t.obj("final_leg") else s.obj("leg")
                            Text(listOfNotNull(leg?.let { "${it.num("km")} km · ${hmText(it.int("minutes"))}" }, if (!isDest) s.num("stop_minutes")?.let { "~${it.toInt()} min stop" } else "destination",
                                if (state == "done") "done" else null).joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                        }
                        Box(Modifier.size(40.dp).clip(CircleShape).background(Brand.Sun).pressable({ navigateTo(ctx, s.num("lat"), s.num("lng"), s.str("directions_url")) }), contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.Directions, "Directions", tint = Brand.SunInk)
                        }
                    }
                }
            }
        }
    }
    sheet?.let { s -> StopSheet(s, null, null) { sheet = null } }
}
