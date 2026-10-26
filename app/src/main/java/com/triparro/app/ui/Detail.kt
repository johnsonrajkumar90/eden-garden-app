@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.AcUnit
import androidx.compose.material.icons.outlined.Bathtub
import androidx.compose.material.icons.outlined.Bed
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Deck
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.FreeBreakfast
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Kitchen
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.LocalLaundryService
import androidx.compose.material.icons.outlined.LocalParking
import androidx.compose.material.icons.outlined.Landscape
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Shower
import androidx.compose.material.icons.outlined.Spa
import androidx.compose.material.icons.outlined.Tv
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material.icons.outlined.Wifi
import androidx.compose.material.icons.outlined.Yard
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.ContentCut
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Elevator
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.SportsTennis
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.util.Locale

/** Photos across the top of a details page: swipe, dot indicators, a soft shade so the buttons read on any photo. */
@Composable
fun HeroGallery(urls: List<String>, onOpen: ((String) -> Unit)? = null, actions: @Composable RowScope.() -> Unit) {
    val list = urls.ifEmpty { listOf("") }
    val state = rememberPagerState { list.size }
    Box(Modifier.fillMaxWidth().aspectRatio(1.08f)) {
        HorizontalPager(state = state, modifier = Modifier.fillMaxSize()) { i ->
            Photo(list[i].ifEmpty { null }, Modifier.fillMaxSize().let { m -> if (onOpen != null && list[i].isNotEmpty()) m.clickable { onOpen(list[i]) } else m }, corner = 0.dp)
        }
        Box(Modifier.fillMaxWidth().height(120.dp).background(Brush.verticalGradient(listOf(Color(0x66000000), Color.Transparent))))
        Box(Modifier.fillMaxWidth().height(110.dp).align(Alignment.BottomCenter).background(Brush.verticalGradient(listOf(Color.Transparent, Color(0x55000000)))))
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, content = actions)
        if (list.size > 1) Row(Modifier.align(Alignment.BottomCenter).padding(bottom = 40.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            val shown = list.size.coerceAtMost(7)
            repeat(shown) { i ->
                val on = (state.currentPage.coerceAtMost(shown - 1)) == i
                Box(Modifier.height(7.dp).width(if (on) 20.dp else 7.dp).clip(CircleShape).background(if (on) Color.White else Color.White.copy(alpha = 0.55f)))
            }
        }
    }
}

/** The rating as a small badge: ★ 4.9 · 12 reviews. */
@Composable
fun RatingBadge(rating: Double?, count: Int?) {
    if (rating == null || rating <= 0) { Text("New", style = MaterialTheme.typography.labelLarge, color = Brand.TealDark, modifier = Modifier.clip(RoundedCornerShape(50)).background(Brand.TealSoft).padding(horizontal = 10.dp, vertical = 4.dp)); return }
    Row(Modifier.clip(RoundedCornerShape(50)).background(Color(0xFFFFF6E5)).padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.Star, null, tint = Brand.Star, modifier = Modifier.size(16.dp))
        Text(" " + String.format(Locale.ENGLISH, "%.1f", rating), style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold), color = Brand.Ink)
        if (count != null && count > 0) Text(" · $count review${if (count == 1) "" else "s"}", style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft)
    }
}

/** The white card with the title that overlaps the photos. */
@Composable
fun TitleCard(content: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = 12.dp).fillMaxWidth()
        .shadow(10.dp, RoundedCornerShape(26.dp), ambientColor = Brand.Navy.copy(alpha = 0.16f), spotColor = Brand.Navy.copy(alpha = 0.16f))
        .clip(RoundedCornerShape(26.dp)).background(Color.White).padding(18.dp)) { content() }
}

/** Quick facts as tiles (icon + text), wrapped over lines. */
@Composable
fun FactTiles(items: List<Pair<ImageVector, String>>) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { (icon, text) ->
            Row(Modifier.clip(RoundedCornerShape(14.dp)).background(Brand.Sky).padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = Brand.Blue, modifier = Modifier.size(18.dp))
                Text("  $text", style = MaterialTheme.typography.labelLarge, color = Brand.Ink)
            }
        }
    }
}

/** A section of a details page: white rounded card with an icon and a title. */
@Composable
fun DetailSection(title: String, icon: ImageVector? = null, sub: String? = null, content: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = 12.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).padding(18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
            if (icon != null) Box(Modifier.size(34.dp).clip(RoundedCornerShape(11.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Brand.Blue, modifier = Modifier.size(19.dp)) }
            Column(Modifier.padding(start = if (icon != null) 12.dp else 0.dp)) {
                Text(title, style = MaterialTheme.typography.titleLarge)
                if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            }
        }
        content()
    }
}

/** An icon for an amenity / facility name (Wifi, Pool, Parking, CCTV, Grooming…). */
fun amenityIcon(name: String): ImageVector {
    val n = name.lowercase()
    return when {
        "wifi" in n || "internet" in n -> Icons.Outlined.Wifi
        "pool" in n -> Icons.Outlined.Pool
        "parking" in n -> Icons.Outlined.LocalParking
        "kitchen" in n -> Icons.Outlined.Kitchen
        "breakfast" in n -> Icons.Outlined.FreeBreakfast
        "restaurant" in n || "meal" in n || "food" in n || "dining" in n -> Icons.Outlined.Restaurant
        "fire" in n || "bonfire" in n -> Icons.Outlined.LocalFireDepartment
        "tv" in n || "television" in n -> Icons.Outlined.Tv
        "ac" == n || "air" in n || "a/c" in n -> Icons.Outlined.AcUnit
        "view" in n || "mountain" in n || "valley" in n -> Icons.Outlined.Landscape
        "garden" in n || "lawn" in n || "outdoor" in n -> Icons.Outlined.Yard
        "balcony" in n || "terrace" in n || "deck" in n -> Icons.Outlined.Deck
        "laundry" in n || "washing" in n -> Icons.Outlined.LocalLaundryService
        "spa" in n || "massage" in n -> Icons.Outlined.Spa
        "hot water" in n || "geyser" in n || "shower" in n -> Icons.Outlined.Shower
        "bath" in n -> Icons.Outlined.Bathtub
        "cctv" in n || "camera" in n -> Icons.Outlined.Videocam
        "vet" in n || "medic" in n || "first aid" in n -> Icons.Outlined.MedicalServices
        "groom" in n -> Icons.Outlined.ContentCut
        "pickup" in n || "pick-up" in n || "drop" in n || "taxi" in n || "transfer" in n -> Icons.Outlined.DirectionsCar
        "power" in n || "backup" in n || "generator" in n -> Icons.Outlined.Bolt
        "security" in n || "guard" in n || "24-hour" in n || "supervision" in n -> Icons.Outlined.Security
        "lift" in n || "elevator" in n -> Icons.Outlined.Elevator
        "gym" in n || "fitness" in n -> Icons.Outlined.FitnessCenter
        "game" in n || "play" in n || "sport" in n -> Icons.Outlined.SportsTennis
        "pet" in n || "dog" in n || "cat" in n -> Icons.Outlined.Pets
        "room" in n || "bed" in n -> Icons.Outlined.Bed
        "indoor" in n || "home" in n -> Icons.Outlined.Home
        "guest" in n -> Icons.Outlined.People
        else -> Icons.Outlined.CheckCircle
    }
}

/** Amenities / facilities in two columns with icons; long lists open with "Show all". */
@Composable
fun AmenityGrid(items: List<String>, first: Int = 8) {
    var all by remember { mutableStateOf(false) }
    val shown = if (all) items else items.take(first)
    Column(Modifier.animateContentSize()) {
        shown.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth().padding(vertical = 7.dp)) {
                row.forEach { a ->
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                        Icon(amenityIcon(a), null, tint = Brand.TealDark, modifier = Modifier.size(20.dp))
                        Text("  $a", style = MaterialTheme.typography.bodyMedium, color = Brand.Ink, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        if (items.size > first) Text(if (all) "Show less" else "Show all ${items.size}", style = MaterialTheme.typography.titleSmall, color = Brand.Blue,
            modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(10.dp)).border1().clickable { all = !all }.padding(horizontal = 14.dp, vertical = 9.dp))
    }
}

private fun Modifier.border1() = this.then(Modifier.background(Brand.Sky))

/** Two time tiles: check-in / check-out (or drop-off / pick-up). */
@Composable
fun TimeTiles(leftLabel: String, left: String, rightLabel: String, right: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        listOf(leftLabel to left, rightLabel to right).forEach { (l, v) ->
            Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(Brand.Page).padding(14.dp)) {
                Text(l, style = MaterialTheme.typography.labelMedium, color = Brand.Muted)
                Text(v, style = MaterialTheme.typography.titleLarge, color = Brand.Ink)
            }
        }
    }
}

/** A row that opens to show its text (Things to know). */
@Composable
fun ExpandRow(title: String, text: String, startOpen: Boolean = false) {
    var open by remember { mutableStateOf(startOpen) }
    Column(Modifier.fillMaxWidth().animateContentSize()) {
        Row(Modifier.fillMaxWidth().clickable { open = !open }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            Icon(if (open) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, if (open) "Hide" else "Show", tint = Brand.Muted)
        }
        if (open) Text(text, style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.padding(bottom = 12.dp))
        HorizontalDivider(color = Brand.Line)
    }
}

/** The refund for cancelling at each point, as a coloured timeline. */
@Composable
fun RefundTimeline(rows: List<Pair<String, Int>>) {
    Column {
        rows.forEachIndexed { i, (whenText, pct) ->
            val tone = when { pct >= 100 -> Brand.Teal; pct > 0 -> Brand.Warn; else -> Brand.Danger }
            Row(verticalAlignment = Alignment.Top) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(14.dp).clip(CircleShape).background(tone))
                    if (i < rows.lastIndex) Box(Modifier.width(2.dp).height(34.dp).background(Brand.Line))
                }
                Column(Modifier.padding(start = 12.dp, bottom = 8.dp)) {
                    Text("$pct% refund", style = MaterialTheme.typography.titleSmall, color = tone)
                    Text(whenText, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                }
            }
        }
    }
}

/** The sticky bar at the bottom of a details page: price, a note, and the main button. */
@Composable
fun PriceBar(price: String, unit: String, was: String? = null, note: String? = null, button: @Composable () -> Unit) {
    Surface(color = Color.White, shadowElevation = 14.dp, shape = RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    if (was != null) Text(was + " ", style = MaterialTheme.typography.bodyMedium.copy(textDecoration = TextDecoration.LineThrough), color = Brand.Muted)
                    Text(price, style = MaterialTheme.typography.headlineSmall, color = Brand.BlueDark)
                    Text(" $unit", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                }
                if (note != null) Text(note, style = MaterialTheme.typography.labelMedium, color = Brand.TealDark, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            button()
        }
    }
}
