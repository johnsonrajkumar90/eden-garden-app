package com.triparro.app.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.TipsAndUpdates
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.arr
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.HeroGallery
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Photo
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.RoundAction
import com.triparro.app.ui.SectionTitle
import com.triparro.app.ui.appear
import com.triparro.app.ui.floaty
import com.triparro.app.ui.pressable
import com.triparro.app.ui.pulse
import org.json.JSONObject

private val catEmoji = mapOf("temple" to "🛕", "waterfall" to "💧", "hills" to "⛰️", "lake" to "🏞️", "park" to "🎡", "beach" to "🏖️", "wildlife" to "🐘",
    "heritage" to "🏛️", "museum" to "🏛️", "garden" to "🌿", "dam" to "🌊", "trek" to "🥾", "church" to "⛪", "mosque" to "🕌", "food" to "🍛", "shopping" to "🛍️")

fun weatherEmoji(icon: String?): String = when (icon) {
    "sun" -> "☀️"; "cloud_sun" -> "⛅"; "cloud" -> "☁️"; "fog" -> "🌫️"; "drizzle" -> "🌦️"; "rain" -> "🌧️"; "heavy_rain" -> "🌧️"; "storm" -> "⛈️"; "snow" -> "❄️"; else -> "🌤️"
}

/** A tourist place in a row: photo (or a coloured tile), name, category and how far / when to go. */
@Composable
fun PlaceCard(p: JSONObject, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(modifier.shadow(5.dp, RoundedCornerShape(22.dp), spotColor = Color(0x33B81D2B)).clip(RoundedCornerShape(22.dp)).background(Color.White).pressable(onClick)) {
        Box(Modifier.fillMaxWidth().height(130.dp)) {
            if (p.str("image") != null) Photo(p.str("image"), Modifier.fillMaxSize(), corner = 0.dp)
            else Box(Modifier.fillMaxSize().background(com.triparro.app.ui.RedBrush), contentAlignment = Alignment.Center) { Text(catEmoji[p.text("cat")] ?: "📍", fontSize = 44.sp, modifier = Modifier.floaty()) }
            Text(p.text("category"), style = MaterialTheme.typography.labelSmall, color = Brand.Ink,
                modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.94f)).padding(horizontal = 9.dp, vertical = 4.dp))
        }
        Column(Modifier.padding(12.dp)) {
            Text(p.text("title"), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(p.str("distance_note") ?: p.text("location"), style = MaterialTheme.typography.labelMedium, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            p.str("best_time")?.let { Text("🗓 $it", style = MaterialTheme.typography.labelMedium, color = Brand.TealDark, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp)) }
        }
    }
}

/** A tourist place: photos, today's weather and whether to go now, tips, nearest stays and resorts. */
@Composable
fun PlaceScreen(nav: NavHostController, id: Int) {
    val ctx = LocalContext.current
    val l = rememberLoader("place", id) { Api.get("places/$id") }
    val p = l.data.value
    Column(Modifier.fillMaxSize().background(com.triparro.app.ui.PageGlass).verticalScroll(rememberScrollState())) {
        when {
            p == null && l.loading.value -> { Spacer(Modifier.height(80.dp)); Loading() }
            p == null -> { Spacer(Modifier.height(60.dp)); ErrorBox(l.error.value ?: "Could not load this place.", { l.reload() }) }
            else -> {
                val photos = p.objs("photos").mapNotNull { it.str("url") }.ifEmpty { listOfNotNull(p.str("image")) }
                if (photos.isNotEmpty()) HeroGallery(photos) { RoundAction(Icons.AutoMirrored.Filled.ArrowBack, "Back") { nav.popBackStack() } }
                else Box(Modifier.fillMaxWidth().height(220.dp).background(com.triparro.app.ui.RedBrush)) {
                    Box(Modifier.padding(12.dp)) { RoundAction(Icons.AutoMirrored.Filled.ArrowBack, "Back") { nav.popBackStack() } }
                    Text(catEmoji[p.text("cat")] ?: "📍", fontSize = 72.sp, modifier = Modifier.align(Alignment.Center).floaty(10f))
                }
                Column(Modifier.padding(16.dp)) {
                    Text(p.text("category"), style = MaterialTheme.typography.labelMedium, color = Brand.Blue, modifier = Modifier.appear())
                    Text(p.text("title"), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.appear(1))
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp).appear(2)) {
                        Icon(Icons.Outlined.Place, null, tint = Brand.Blue, modifier = Modifier.size(16.dp))
                        Text(" " + listOfNotNull(p.str("location"), p.str("distance_note")).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                    }
                    Gap(16)
                    p.obj("weather")?.let { WeatherCard(it, Modifier.appear(3)) }
                        ?: Notice2("Weather for this place isn't available right now.")
                    Gap(16)
                    Text(p.str("description") ?: p.text("summary"), style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft)
                    Gap(14)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        p.str("best_time")?.let { InfoTile(Icons.Outlined.Schedule, "Best time", it, Modifier.weight(1f)) }
                        p.str("visit_tips")?.let { InfoTile(Icons.Outlined.TipsAndUpdates, "Tips", it, Modifier.weight(1f)) }
                    }
                    Gap(14)
                    val c = p.arr("coords")
                    PrimaryButton("Directions", {
                        if (c != null && c.length() == 2) openMaps(ctx, c.optDouble(0), c.optDouble(1), p.text("title"))
                        else p.str("map_url")?.let { u -> try { ctx.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(u))) } catch (_: Exception) { } }
                    }, icon = Icons.Outlined.Directions)
                }
                val stays = p.objs("stays")
                if (stays.isNotEmpty()) {
                    SectionTitle("Stays around ${p.text("title")}", Modifier.padding(horizontal = 16.dp), sub = "Nearest first — homestays and resorts")
                    stays.chunked(2).forEachIndexed { i, row -> GridRow(row, i) { s -> nav.navigate("property/${s.text("kind", "stay")}/${s.int("id")}") } }
                }
                val near = p.objs("nearby").filter { it.int("id") != id }
                if (near.isNotEmpty()) {
                    SectionTitle("Also nearby", Modifier.padding(start = 16.dp, end = 16.dp, top = 18.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        near.take(8).forEach { n -> PlaceCard(n, Modifier.width(200.dp)) { nav.navigate("place/${n.int("id")}") } }
                    }
                }
                Gap(28)
            }
        }
    }
}

@Composable
private fun Notice2(text: String) = com.triparro.app.ui.Notice(text, "info")

@Composable
private fun InfoTile(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, text: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(18.dp)).background(Color.White).padding(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Brand.Blue, modifier = Modifier.size(17.dp)); Text("  $label", style = MaterialTheme.typography.titleSmall) }
        Text(text, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(top = 4.dp))
    }
}

/** Today's weather at the place, the next days, and plain advice: go now, or when to go. */
@Composable
fun WeatherCard(w: JSONObject, modifier: Modifier = Modifier) {
    val verdict = w.text("verdict")
    val (top, accent) = when (verdict) {
        "bad" -> Brush.linearGradient(listOf(Color(0xFF3A3F55), Color(0xFF5B6178))) to Color(0xFFFFB4A8)
        "caution" -> Brush.linearGradient(listOf(Color(0xFF4F6D8F), Color(0xFF7FA0C2))) to Brand.Sun
        else -> Brush.linearGradient(listOf(Color(0xFFFF9A3D), Color(0xFFFFC42E))) to Color.White
    }
    val now = w.obj("now") ?: JSONObject()
    Column(modifier.fillMaxWidth().shadow(6.dp, RoundedCornerShape(24.dp), spotColor = Color(0x44000000)).clip(RoundedCornerShape(24.dp)).background(Color.White)) {
        Column(Modifier.fillMaxWidth().background(top).padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(weatherEmoji(now.str("icon")), fontSize = 46.sp, modifier = Modifier.floaty(4f))
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text((now.num("temp")?.let { "${it.toInt()}°C" } ?: "—") + "  " + now.text("label"), style = MaterialTheme.typography.titleLarge, color = Color.White)
                    Text(listOfNotNull(now.num("feels")?.let { "Feels ${it.toInt()}°" }, now.num("humidity")?.let { "Humidity ${it.toInt()}%" }, now.num("wind")?.let { "Wind ${it.toInt()} km/h" }).joinToString(" · "),
                        style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.9f))
                }
            }
            Gap(12)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(10.dp).pulse().clip(CircleShape).background(accent))
                Text("  " + w.text("headline"), style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = Color.White)
            }
            Text(w.text("advice"), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.95f), modifier = Modifier.padding(top = 4.dp))
        }
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            w.objs("days").forEachIndexed { i, d ->
                val tone = when (d.text("rating")) { "bad" -> Brand.DangerSoft; "caution" -> Brand.WarnSoft; else -> Brand.TealSoft }
                Column(Modifier.width(62.dp).clip(RoundedCornerShape(16.dp)).background(tone).padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (i == 0) "Today" else d.text("day"), style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft)
                    Text(weatherEmoji(d.str("icon")), fontSize = 22.sp, modifier = Modifier.padding(vertical = 2.dp))
                    Text("${d.int("max")}°", style = MaterialTheme.typography.labelLarge, color = Brand.Ink)
                    Text("${d.int("min")}°", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                    if (d.int("rain_chance") >= 30) Text("💧${d.int("rain_chance")}%", style = MaterialTheme.typography.labelSmall, color = Color(0xFF2B6CB0))
                }
            }
        }
        w.str("season")?.let { Text("🗓 $it", style = MaterialTheme.typography.bodySmall, color = Brand.TealDark, modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp)) }
        Text("Forecast: ${w.text("source", "Open-Meteo")}", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(start = 16.dp, bottom = 12.dp))
    }
}
