package com.triparro.app.screens

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.triparro.app.core.Api
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.bool
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import org.json.JSONObject

/*
 * Add a place from where you are: the phone's live location, named by Google (the nearest places, closest first).
 * When Google can't name the spot, the place is still pinned and the guest types the name.
 */

/** [onSpot] gets the spot: a chosen Google place (name, lat, lng) or just the position (empty name) to type a name for. */
@Composable
internal fun LiveSpot(onSpot: (name: String, lat: Double, lng: Double) -> Unit) {
    val ctx = LocalContext.current
    var state by remember { mutableStateOf("start") }   // start, locating, naming, named, unnamed, denied, off, notfound
    var here by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var options by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var chosen by remember { mutableIntStateOf(0) }
    var round by remember { mutableIntStateOf(0) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { g -> if (g.values.any { it }) round++ else state = "denied" }
    LaunchedEffect(round) {
        if (!LocationHelper.hasPermission(ctx)) {
            if (round == 0) ask.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) else state = "denied"
            return@LaunchedEffect
        }
        state = "locating"
        when (val r = LocationHelper.current(ctx, 12_000)) {
            is LocResult.Found -> {
                here = r.lat to r.lng; state = "naming"
                options = try { Api.get("places/here", mapOf("lat" to r.lat, "lng" to r.lng)).objs("items") } catch (_: Exception) { emptyList() }
                chosen = 0
                if (options.isNotEmpty()) { state = "named"; options[0].let { onSpot(it.text("name"), it.optDouble("lat"), it.optDouble("lng")) } }
                else { state = "unnamed"; onSpot("", r.lat, r.lng) }
            }
            LocResult.Off -> state = "off"
            LocResult.Denied -> state = "denied"
            LocResult.NotFound -> state = "notfound"
        }
    }
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Brush.linearGradient(listOf(Color(0xFFFFF1EE), Color(0xFFFFF8F0)))).border(1.dp, Color(0x22D7192A), RoundedCornerShape(20.dp)).padding(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Pulse(state == "locating" || state == "naming")
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                Text(when (state) {
                    "locating", "start" -> "Finding where you are…"
                    "naming" -> "Getting the name from Google…"
                    "named" -> "You're here"
                    "unnamed" -> "Got your location"
                    "denied" -> "Location isn't allowed"
                    "off" -> "Location is switched off"
                    else -> "Couldn't find your location"
                }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Brand.Ink)
                Text(when (state) {
                    "named" -> "Pick the right place — or change the name below."
                    "unnamed" -> "Google couldn't name this spot. Type its name below — it's pinned on the map."
                    "denied" -> "Allow location for TripArro, or search for the place instead."
                    "off" -> "Turn on location on your phone, then try again."
                    "notfound" -> "Step outside or try again — or search for the place."
                    else -> "Uses your phone's live location."
                }, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            }
            if (state in listOf("named", "unnamed", "notfound", "off", "denied")) Icon(Icons.Outlined.Refresh, "Try again", tint = Brand.Matte,
                modifier = Modifier.clip(CircleShape).clickable {
                    when (state) { "off" -> LocationHelper.openLocationSettings(ctx); "denied" -> if (round > 0) LocationHelper.openAppSettings(ctx) else round++; else -> round++ }
                }.padding(8.dp))
        }
        if (state == "named") Column(Modifier.padding(top = 10.dp)) {
            options.take(5).forEachIndexed { i, p ->
                val on = i == chosen
                Row(Modifier.padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (on) Color.White else Color(0x80FFFFFF))
                    .border(if (on) 1.5.dp else 1.dp, if (on) Brand.Matte else Brand.Line, RoundedCornerShape(14.dp))
                    .clickable { chosen = i; onSpot(p.text("name"), p.optDouble("lat"), p.optDouble("lng")) }.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (on) Icons.Filled.CheckCircle else Icons.Outlined.Place, null, tint = if (on) Brand.Matte else Brand.Muted, modifier = Modifier.size(20.dp))
                    Column(Modifier.padding(start = 10.dp).weight(1f)) {
                        Text(p.text("name"), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        val sub = listOf(p.text("type"), p.text("address")).filter { it.isNotBlank() }.joinToString(" · ")
                        if (sub.isNotBlank()) Text(sub, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Text(if (p.optInt("metres") < 1000) "${p.optInt("metres")} m" else "%.1f km".format(p.optInt("metres") / 1000.0), style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft)
                }
            }
            Text("Place names from Google", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

/** A location dot with a ring that pulses while the phone is finding its position. */
@Composable
private fun Pulse(active: Boolean) {
    val t = rememberInfiniteTransition(label = "pulse")
    val p by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1300), RepeatMode.Restart), label = "p")
    Box(Modifier.size(44.dp), contentAlignment = Alignment.Center) {
        if (active) Box(Modifier.size(44.dp).graphicsLayer { scaleX = 0.5f + p * 0.6f; scaleY = 0.5f + p * 0.6f; alpha = 1f - p }.clip(CircleShape).background(Color(0x55D7192A)))
        Box(Modifier.size(34.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFFB3122A), Color(0xFFFF5A5A)))), contentAlignment = Alignment.Center) {
            Icon(Icons.Outlined.MyLocation, null, tint = Color.White, modifier = Modifier.size(18.dp))
        }
    }
}

/** Where to take the place from: where you are now, or a search. */
@Composable
internal fun PlaceSource(here: Boolean, onHere: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Brand.Sky).padding(4.dp)) {
        listOf(true to ("I'm here now" to Icons.Outlined.MyLocation), false to ("Search a place" to Icons.Outlined.Search)).forEach { (v, l) ->
            val on = v == here
            Row(Modifier.weight(1f).clip(RoundedCornerShape(50)).background(if (on) Color.White else Color.Transparent).clickable { onHere(v) }.padding(vertical = 9.dp),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(l.second, null, tint = if (on) Brand.Matte else Brand.InkSoft, modifier = Modifier.size(17.dp))
                Text(" " + l.first, style = MaterialTheme.typography.labelLarge, color = if (on) Brand.Matte else Brand.InkSoft, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal)
            }
        }
    }
}

/**
 * The trip photo: a big preview, then where the new one comes from — the photo album, the camera, or the web
 * (Google photos of the place, with the automatic match first). Everyone in the trip sees it.
 */
@Composable
internal fun CoverSheet(id: Int, g: JSONObject, busy: Boolean, onAlbum: () -> Unit, onCamera: () -> Unit, onWeb: (String?) -> Unit) {
    val opts = rememberLoader(id) { Api.get("trip-groups/$id/cover-options") }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp).padding(bottom = 28.dp)) {
        Text("Trip photo", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("Everyone in the trip sees it at the top and on the trip card.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
        Box(Modifier.padding(top = 14.dp).fillMaxWidth().height(200.dp).clip(RoundedCornerShape(26.dp))) {
            TripCover(g.str("cover"), g.text("title") + " " + g.text("destination"), Modifier.fillMaxSize(), iconSize = 140)
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.45f to Color(0x00000000), 1f to Color(0xCC15161C))))
            Text(g.text("title"), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.align(Alignment.BottomStart).padding(16.dp))
            Text(when (g.text("cover_kind")) { "photo" -> "Your photo"; "web" -> "From the web"; else -> "No photo yet" }, style = MaterialTheme.typography.labelMedium, color = Color.White,
                modifier = Modifier.align(Alignment.TopStart).padding(12.dp).clip(RoundedCornerShape(50)).background(Color(0x66000000)).padding(horizontal = 10.dp, vertical = 5.dp))
            if (busy) Box(Modifier.fillMaxSize().background(Color(0x66000000)), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color.White) }
        }
        Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SourceTile(Modifier.weight(1f), Icons.Outlined.PhotoLibrary, "Photo album", listOf(Color(0xFF7C3AED), Color(0xFFC084FC)), !busy, onAlbum)
            SourceTile(Modifier.weight(1f), Icons.Outlined.PhotoCamera, "Camera", listOf(Color(0xFF0E7490), Color(0xFF22D3EE)), !busy, onCamera)
            SourceTile(Modifier.weight(1f), Icons.Outlined.AutoAwesome, "Auto from web", listOf(Color(0xFFB3122A), Color(0xFFFF8A3D)), !busy) { onWeb(null) }
        }
        val o = opts.data.value
        val items = o?.objs("items") ?: emptyList()
        Text("Photos from the web", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 20.dp, bottom = 8.dp))
        when {
            o == null && opts.loading.value -> Text("Looking for photos of ${g.text("destination").ifBlank { g.text("title") }}…", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            o != null && !o.bool("google") -> Text("Web photos show here once Google Places is set up for the site. You can still use a photo from your album or camera.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            items.isEmpty() -> Text("No photos found for this trip's name. Add a destination to the trip, or use your own photo.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            else -> {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items.forEach { it2 ->
                        val current = o?.str("current") == it2.text("photo")
                        Column(Modifier.width(150.dp)) {
                            Box(Modifier.fillMaxWidth().height(110.dp).clip(RoundedCornerShape(18.dp)).border(if (current) 3.dp else 0.dp, if (current) Brand.Matte else Color.Transparent, RoundedCornerShape(18.dp))
                                .clickable(enabled = !busy) { onWeb(it2.text("photo")) }) {
                                coil.compose.AsyncImage(model = it2.str("photo_url"), contentDescription = it2.text("label"), contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().background(Brand.Sky))
                                if (current) Icon(Icons.Filled.CheckCircle, "Current photo", tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).clip(CircleShape).background(Brand.Matte))
                            }
                            Text(it2.text("label"), style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                            if (it2.text("credit").isNotBlank()) Text("Photo: ${it2.text("credit")}", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
                Text("Photos from Google", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
            }
        }
    }
}

@Composable
private fun SourceTile(modifier: Modifier, icon: ImageVector, label: String, colors: List<Color>, enabled: Boolean, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(20.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(20.dp)).clickable(enabled = enabled, onClick = onClick).padding(vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(46.dp).clip(RoundedCornerShape(15.dp)).background(Brush.linearGradient(colors)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Color.White) }
        Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Brand.Ink, modifier = Modifier.padding(top = 8.dp), maxLines = 1)
    }
}
