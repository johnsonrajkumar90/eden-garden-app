package com.triparro.app.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AcUnit
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.BeachAccess
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.DirectionsBoat
import androidx.compose.material.icons.outlined.Forest
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Landscape
import androidx.compose.material.icons.outlined.LocationCity
import androidx.compose.material.icons.outlined.Luggage
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.TempleHindu
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.triparro.app.R
import com.triparro.app.core.int
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.appear
import com.triparro.app.ui.glass
import org.json.JSONObject

/* Group trips look: the round logo button, the hub's tabs, trip cards and trip pictures that match the trip's name. */

private val Red1 = Color(0xFFB3122A)
private val Red2 = Color(0xFFFF5A5A)

/** The round floating button on the main screens: the TripArro mark, opens Group trips. Pulses gently twice when it appears. */
@Composable
fun GroupTripsFab(onClick: () -> Unit) {
    val ring = remember { Animatable(0f) }
    LaunchedEffect(Unit) { repeat(2) { ring.snapTo(0f); ring.animateTo(1f, tween(1400, easing = FastOutSlowInEasing)) } }
    Box(Modifier.padding(bottom = 4.dp).size(68.dp), contentAlignment = Alignment.Center) {
        val p = ring.value
        if (p > 0f && p < 1f) Box(Modifier.size(62.dp).graphicsLayer { scaleX = 1f + p * 0.4f; scaleY = 1f + p * 0.4f; alpha = 0.45f * (1f - p) }.clip(CircleShape).background(Red2))
        Box(
            Modifier.size(62.dp).shadow(12.dp, CircleShape, ambientColor = Red1, spotColor = Red1).clip(CircleShape)
                .background(Brush.linearGradient(listOf(Red1, Color(0xFFE0182D), Red2)))
                .border(2.dp, Color(0x55FFFFFF), CircleShape)
                .semantics { contentDescription = "Group trips"; role = Role.Button }
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) { Image(painterResource(R.drawable.logo_mark_white), null, Modifier.size(46.dp)) }
    }
}

/** The three parts of Group trips, as a sliding switch on the red band under the title. */
@Composable
fun HubTabs(tab: String, onTab: (String) -> Unit) {
    val tabs = listOf(Triple("trips", "Trips", Icons.Outlined.Groups), Triple("plans", "Trip plans", Icons.Outlined.Route), Triple("tickets", "Tickets", Icons.Outlined.ConfirmationNumber))
    val i = tabs.indexOfFirst { it.first == tab }.coerceAtLeast(0)
    Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
        .background(Brush.horizontalGradient(listOf(Brand.Matte, Color(0xFFD7192A), Color(0xFFE8452F)))).padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp)) {
        BoxWithConstraints(Modifier.fillMaxWidth().height(50.dp).clip(RoundedCornerShape(50)).background(Color(0x33FFFFFF)).padding(4.dp)) {
            val w = maxWidth / tabs.size
            val x by animateDpAsState(w * i, spring(dampingRatio = 0.8f, stiffness = 500f), label = "tab")
            Box(Modifier.offset(x = x).width(w).fillMaxHeight().shadow(4.dp, RoundedCornerShape(50)).clip(RoundedCornerShape(50)).background(Color.White))
            Row(Modifier.fillMaxSize()) {
                tabs.forEach { (v, t, ic) ->
                    val on = v == tab
                    Row(Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(50)).clickable { onTab(v) }, horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic, null, tint = if (on) Brand.Matte else Color.White, modifier = Modifier.size(18.dp))
                        Text(" $t", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = if (on) Brand.Matte else Color.White, maxLines = 1)
                    }
                }
            }
        }
    }
}

/** A picture for a trip without a photo, chosen from the words in its name: beach, hills, snow, temples, backwaters, forest, city. */
data class TripTheme(val colors: List<Color>, val icon: ImageVector)

fun tripTheme(name: String): TripTheme {
    val s = name.lowercase()
    fun has(vararg w: String) = w.any { s.contains(it) }
    return when {
        has("goa", "beach", "kovalam", "varkala", "gokarna", "andaman", "pondicherry", "puducherry", "lakshadweep", "maldives", "bali", "phuket", "sea", "coast", "island") -> TripTheme(listOf(Color(0xFF0B4F8A), Color(0xFF1597B8), Color(0xFF6FD6C8)), Icons.Outlined.BeachAccess)
        has("kashmir", "ladakh", "leh", "manali", "shimla", "snow", "gulmarg", "sikkim", "spiti", "auli", "himalaya", "switzerland") -> TripTheme(listOf(Color(0xFF2E3A6B), Color(0xFF5B79C2), Color(0xFFC7DAF5)), Icons.Outlined.AcUnit)
        has("ooty", "munnar", "kodai", "coorg", "wayanad", "yercaud", "hill", "valparai", "trek", "mountain", "darjeeling", "nilgiri", "chikmagalur") -> TripTheme(listOf(Color(0xFF14432A), Color(0xFF2E8B57), Color(0xFFA8D672)), Icons.Outlined.Landscape)
        has("alleppey", "alappuzha", "kumarakom", "backwater", "houseboat", "cruise", "boat", "lake", "kerala") -> TripTheme(listOf(Color(0xFF0F5257), Color(0xFF2A9D8F), Color(0xFFE9C46A)), Icons.Outlined.DirectionsBoat)
        has("temple", "tirupati", "madurai", "rameswaram", "varanasi", "kashi", "sabarimala", "pilgrim", "palani", "shirdi", "velankanni", "darshan", "kanchipuram", "thanjavur", "puri") -> TripTheme(listOf(Color(0xFF7A2E0E), Color(0xFFD9741A), Color(0xFFFFC94A)), Icons.Outlined.TempleHindu)
        has("forest", "jungle", "safari", "wildlife", "bandipur", "mudumalai", "thekkady", "jim corbett", "kabini", "camp") -> TripTheme(listOf(Color(0xFF1F3A1A), Color(0xFF4F7A28), Color(0xFFC9B458)), Icons.Outlined.Forest)
        has("chennai", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "kolkata", "city", "dubai", "singapore", "london", "paris") -> TripTheme(listOf(Color(0xFF2A1B4A), Color(0xFF6A3FA0), Color(0xFFF08AB4)), Icons.Outlined.LocationCity)
        else -> TripTheme(listOf(Color(0xFF6A1019), Color(0xFFB81D2B), Color(0xFFFF8A3D)), Icons.Outlined.Luggage)
    }
}

/** The trip's picture: its photo (uploaded, or a Google photo of the place in its name), else a matching coloured picture. */
@Composable
fun TripCover(cover: String?, name: String, modifier: Modifier = Modifier, iconSize: Int = 120) {
    val th = tripTheme(name)
    Box(modifier.background(Brush.linearGradient(th.colors)), contentAlignment = Alignment.CenterEnd) {
        Icon(th.icon, null, tint = Color(0x2EFFFFFF), modifier = Modifier.padding(end = 18.dp).size(iconSize.dp).graphicsLayer { rotationZ = -12f })
        if (!cover.isNullOrBlank()) coil.compose.AsyncImage(model = cover, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
    }
}

/** "In 12 days", "On now", "Tomorrow" — from the trip's dates. */
fun tripWhen(start: String, end: String): String? = try {
    val a = java.time.LocalDate.parse(start); val b = if (end.isBlank()) a else java.time.LocalDate.parse(end)
    val now = java.time.LocalDate.now()
    val d = java.time.temporal.ChronoUnit.DAYS.between(now, a)
    when {
        now.isAfter(b) -> "Done"
        !now.isBefore(a) -> "On now"
        d == 1L -> "Tomorrow"
        d < 60 -> "In $d days"
        else -> null
    }
} catch (_: Exception) { null }

private val AvatarColors = listOf(Color(0xFFFFC72C), Color(0xFFFF8A7A), Color(0xFF8C9BF2), Color(0xFF5CC29A))

/** One trip in the list: big photo, when it is, name and place, who joined (overlapping faces), share its link. */
@Composable
fun TripCard(g: JSONObject, onOpen: () -> Unit, onShare: () -> Unit) {
    Box(Modifier.padding(bottom = 14.dp).fillMaxWidth().height(214.dp).appear().shadow(10.dp, RoundedCornerShape(28.dp), ambientColor = Color(0x33000000))
        .clip(RoundedCornerShape(28.dp)).clickable(onClick = onOpen)) {
        TripCover(g.str("cover"), g.text("title") + " " + g.text("destination"), Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0x33000000), 0.35f to Color(0x00000000), 1f to Color(0xE015161C))))
        Row(Modifier.align(Alignment.TopStart).padding(12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            tripWhen(g.text("start_date"), g.text("end_date"))?.let { w ->
                Text(w, color = Brand.Ink, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (w == "On now") Color(0xFF7CE0A3) else Brand.Sun).padding(horizontal = 10.dp, vertical = 5.dp))
            }
            if (g.text("role") == "owner") Text("Your trip", color = Color.White, style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(Color(0x55000000)).border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 5.dp))
        }
        Box(Modifier.align(Alignment.TopEnd).padding(10.dp).size(40.dp).clip(CircleShape).background(Color(0x55000000)).border(1.dp, Color(0x44FFFFFF), CircleShape)
            .semantics { contentDescription = "Share this trip's link"; role = Role.Button }.clickable(onClick = onShare), contentAlignment = Alignment.Center) {
            Icon(Icons.Outlined.Share, null, tint = Color.White, modifier = Modifier.size(19.dp))
        }
        Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(16.dp)) {
            Text(g.text("title"), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
            val sub = listOf(g.text("destination"), g.text("dates")).filter { it.isNotBlank() }.joinToString("  ·  ")
            if (sub.isNotBlank()) Text(sub, style = MaterialTheme.typography.bodySmall, color = Color(0xDDFFFFFF), maxLines = 1)
            Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                val arr = g.optJSONArray("people")
                val people = (0 until (arr?.length() ?: 0)).map { arr!!.optString(it) }
                Box(Modifier.width((if (people.isEmpty()) 30 else 30 + (people.take(4).size - 1) * 20).dp).height(30.dp)) {
                    people.take(4).forEachIndexed { i, n ->
                        Box(Modifier.offset(x = (i * 20).dp).size(30.dp).clip(CircleShape).background(Color(0xFF15161C)).padding(2.dp).clip(CircleShape).background(AvatarColors[i % 4]), contentAlignment = Alignment.Center) {
                            Text(n.take(1), fontWeight = FontWeight.Bold, color = Brand.Ink, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
                Text("  " + (if (g.int("members") <= 1) "Just you so far" else "${g.int("members")} going"),
                    style = MaterialTheme.typography.labelLarge, color = Color.White, modifier = Modifier.weight(1f))
                if (g.int("items") > 0) Text("${g.int("items")} saved", style = MaterialTheme.typography.labelMedium, color = Color(0xCCFFFFFF),
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(Color(0x33FFFFFF)).padding(horizontal = 9.dp, vertical = 4.dp))
            }
        }
    }
}

/** Top of the Trips list: start a trip (or from an idea), or join one with a code. */
@Composable
fun MakeTripCard(onNew: (String) -> Unit, onJoin: () -> Unit) {
    Column(Modifier.fillMaxWidth().appear().glass(RoundedCornerShape(26.dp)).padding(18.dp)) {
        Text("Where to next?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Brand.Ink)
        Text("Name a trip, share its link — everyone who joins plans it with you.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
        Row(Modifier.padding(top = 14.dp).fillMaxWidth().height(54.dp).clip(RoundedCornerShape(18.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(18.dp))
            .clickable { onNew("") }.padding(horizontal = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(listOf(Red1, Red2))), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Add, null, tint = Color.White)
            }
            Text("  Name your trip…", style = MaterialTheme.typography.bodyLarge, color = Brand.Muted, modifier = Modifier.weight(1f))
        }
        Row(Modifier.padding(top = 12.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Ooty with family", "Goa with friends", "Munnar weekend", "Tirupati darshan").forEach { idea ->
                val th = tripTheme(idea)
                Row(Modifier.clip(RoundedCornerShape(50)).background(th.colors[1].copy(alpha = 0.12f)).clickable { onNew(idea) }.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(th.icon, null, tint = th.colors[1], modifier = Modifier.size(16.dp))
                    Text(" $idea", style = MaterialTheme.typography.labelLarge, color = Brand.Ink)
                }
            }
        }
        Text("Got a code from a friend? Join their trip", style = MaterialTheme.typography.labelLarge, color = Brand.Matte, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(8.dp)).clickable(onClick = onJoin).padding(vertical = 6.dp))
    }
}
