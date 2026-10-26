@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Cottage
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material.icons.outlined.TravelExplore
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import com.triparro.app.core.Notifier
import com.triparro.app.ui.SectionTitle
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.R
import com.triparro.app.core.Api
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.intOrNull
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.DateRangeField
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.Segmented
import com.triparro.app.ui.Stars
import com.triparro.app.ui.Stepper
import com.triparro.app.ui.money
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Explore: find homestays, villas and resorts (search, dates, guests), with favourites and places on the home view. */
@Composable
fun ExploreScreen(nav: NavHostController) {
    var q by rememberSaveable { mutableStateOf("") }
    var kind by rememberSaveable { mutableStateOf("all") }
    var checkIn by rememberSaveable { mutableStateOf("") }
    var checkOut by rememberSaveable { mutableStateOf("") }
    var adults by rememberSaveable { mutableIntStateOf(2) }
    var searched by rememberSaveable { mutableStateOf(false) }
    val results = remember { mutableStateListOf<JSONObject>() }
    var total by remember { mutableIntStateOf(0) }
    var page by remember { mutableIntStateOf(1) }
    var pages by remember { mutableIntStateOf(1) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val home = rememberLoader("home") { Api.get("home") }

    fun search(p: Int = 1) {
        searched = true
        loading = true
        error = null
        scope.launch {
            try {
                val r = Api.get("properties", mapOf("q" to q.trim(), "kind" to kind.takeIf { it != "all" }, "check_in" to checkIn.ifEmpty { null },
                    "check_out" to checkOut.ifEmpty { null }, "adults" to adults, "page" to p, "per_page" to 20))
                if (p == 1) results.clear()
                results.addAll(r.objs("items"))
                total = r.int("total"); page = r.int("page", p); pages = r.int("pages", 1)
                r.str("date_error")?.let { error = it }
            } catch (e: Exception) { error = errorText(e) }
            loading = false
        }
    }

    val unread by Notifier.unread.collectAsState()
    val session by Api.session.collectAsState()
    val first = session?.user?.name?.substringBefore(' ')

    LazyColumn(Modifier.fillMaxSize().background(Brand.Page), contentPadding = PaddingValues(bottom = 28.dp)) {
        item {
            // top bar: logo + notifications
            Row(Modifier.fillMaxWidth().background(Color.White).padding(start = 16.dp, end = 6.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.logo_full), contentDescription = "TripArro", modifier = Modifier.height(32.dp))
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { nav.navigate(if (session?.user != null) "notifications" else "login") }) {
                    BadgedBox(badge = { if (unread > 0) Badge(containerColor = Brand.Coral) { Text(if (unread > 9) "9+" else "$unread") } }) {
                        Icon(Icons.Outlined.Notifications, "Notifications", tint = Brand.Ink)
                    }
                }
            }
            Box(Modifier.fillMaxWidth()) {
                Box(Modifier.fillMaxWidth().height(210.dp).clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
                    .background(Brush.linearGradient(listOf(Brand.Navy, Brand.Blue, Color(0xFF1C5BB0)))))
                Column(Modifier.padding(horizontal = 16.dp).padding(top = 22.dp)) {
                    Text(if (first != null) "Hi $first, where to next?" else "Where to next?", style = MaterialTheme.typography.headlineMedium, color = Color.White)
                    Text("Verified homestays, villas and resorts — the full price before you pay.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFFC9D8F2), modifier = Modifier.padding(top = 4.dp))
                    Gap(18)
                    Column(Modifier.fillMaxWidth().shadow(10.dp, RoundedCornerShape(22.dp), ambientColor = Brand.Navy.copy(alpha = 0.25f), spotColor = Brand.Navy.copy(alpha = 0.25f))
                        .clip(RoundedCornerShape(22.dp)).background(Color.White).padding(14.dp)) {
                        OutlinedTextField(value = q, onValueChange = { q = it }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                            leadingIcon = { Icon(Icons.Outlined.Search, null, tint = Brand.Blue) }, placeholder = { Text("Where to? Ooty, Munnar, Goa…") },
                            shape = RoundedCornerShape(14.dp),
                            colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Brand.Line, focusedBorderColor = Brand.Blue, unfocusedContainerColor = Brand.Page, focusedContainerColor = Color.White))
                        Gap(10)
                        DateRangeField(checkIn, checkOut, { a, b -> checkIn = a; checkOut = b })
                        Gap(4)
                        Stepper("Guests", adults, { adults = it }, min = 1, max = 30)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 6.dp)) {
                            listOf("all" to "All", "stay" to "Homestays", "resort" to "Resorts").forEach { (k, l) ->
                                FilterChip(selected = kind == k, onClick = { kind = k }, label = { Text(l) }, shape = RoundedCornerShape(50),
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Brand.Blue, selectedLabelColor = Color.White))
                            }
                        }
                        Gap(4)
                        PrimaryButton("Search stays", { search() }, coral = true, icon = Icons.Outlined.Search, loading = loading && page == 1)
                    }
                }
            }
            // shortcuts
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 18.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Shortcut(Icons.Outlined.Cottage, "Homestays", Brand.Blue, Brand.Sky) { kind = "stay"; search() }
                Shortcut(Icons.Outlined.Pool, "Resorts", Brand.TealDark, Brand.TealSoft) { kind = "resort"; search() }
                Shortcut(Icons.Outlined.Pets, "Pet boarding", Brand.CoralDark, Color(0xFFFFECEC)) { nav.navigate("pets") { launchSingleTop = true } }
                Shortcut(Icons.Outlined.AutoAwesome, "Ask AI", Color(0xFF6B4BC8), Color(0xFFF0EBFF)) { nav.navigate("ai") { launchSingleTop = true } }
            }
        }
        if (searched) {
            item {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (loading && results.isEmpty()) "Searching…" else "$total ${if (total == 1) "place" else "places"}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Text("Clear", color = Brand.Blue, modifier = Modifier.clickable { searched = false; results.clear(); q = "" }.padding(6.dp))
                }
                error?.let { ErrorBox(it) }
                if (!loading && results.isEmpty() && error == null) EmptyBox("No places found", "Try another place, other dates or fewer guests.", icon = Icons.Outlined.TravelExplore)
            }
            items(results, key = { it.text("kind") + it.int("id") }) { p -> PropertyCard(p) { nav.navigate("property/${p.text("kind", "stay")}/${p.int("id")}") } }
            if (page < pages) item {
                OutlinedButton(onClick = { search(page + 1) }, modifier = Modifier.fillMaxWidth().padding(16.dp)) { Text(if (loading) "Loading…" else "Show more") }
            }
        } else {
            val h = home.data.value
            if (home.loading.value && h == null) item { Loading() }
            home.error.value?.let { e ->
                item {
                    ErrorBox(if (e == "Not found.") "We can't reach TripArro right now (${Api.baseUrl.removePrefix("https://")}). Check your internet connection and try again." else e, { home.reload() })
                }
            }
            if (h != null) {
                val places = h.objs("destinations")
                if (places.isNotEmpty()) {
                    item { SectionTitle("Popular places", Modifier.padding(horizontal = 16.dp), sub = "Tap a place to see its stays") }
                    item {
                        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(places) { d ->
                                Box(Modifier.width(150.dp).height(196.dp).clip(RoundedCornerShape(20.dp)).clickable { q = d.text("name"); search() }) {
                                    Photo(d.str("image"), Modifier.fillMaxSize(), corner = 0.dp, description = d.text("name"))
                                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.45f to Color.Transparent, 1f to Color(0xCC061A36))))
                                    Column(Modifier.align(Alignment.BottomStart).padding(12.dp)) {
                                        Text(d.text("name"), style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text("${d.int("count")} ${if (d.int("count") == 1) "stay" else "stays"}", style = MaterialTheme.typography.bodySmall, color = Color(0xFFDDE7F7))
                                    }
                                }
                            }
                        }
                    }
                }
                val fav = h.objs("favourites")
                if (fav.isNotEmpty()) {
                    item { SectionTitle("Guest favourites", Modifier.padding(start = 16.dp, end = 16.dp, top = 22.dp), sub = "Loved by guests, rated highly") }
                    items(fav, key = { "f" + it.text("kind") + it.int("id") }) { p -> PropertyCard(p) { nav.navigate("property/${p.text("kind", "stay")}/${p.int("id")}") } }
                }
                val sp = h.objs("sponsored")
                if (sp.isNotEmpty()) {
                    item { SectionTitle("Sponsored", Modifier.padding(start = 16.dp, end = 16.dp, top = 22.dp), sub = "Paid placements, labelled") }
                    items(sp, key = { "s" + it.text("kind") + it.int("id") }) { p -> PropertyCard(p) { nav.navigate("property/${p.text("kind", "stay")}/${p.int("id")}") } }
                }
            }
        }
    }
}

/** A stay or resort in a list: photo, badges, place, rating and the honest price. */
@Composable
fun PropertyCard(p: JSONObject, onClick: () -> Unit) {
    val price = p.obj("price") ?: JSONObject()
    val badges = p.obj("badges") ?: JSONObject()
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        .shadow(3.dp, RoundedCornerShape(22.dp), ambientColor = Brand.Navy.copy(alpha = 0.12f), spotColor = Brand.Navy.copy(alpha = 0.12f))
        .clip(RoundedCornerShape(22.dp)).background(Color.White).clickable(onClick = onClick)) {
        Box {
            Photo(p.str("image"), Modifier.fillMaxWidth().aspectRatio(1.55f), corner = 0.dp, description = p.text("title"))
            Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (badges.bool("sponsored")) OverlayTag("Sponsored")
                if (badges.bool("favourite")) OverlayTag("★ Guest favourite")
            }
            p.num("rating")?.takeIf { it > 0 }?.let { r ->
                Row(Modifier.align(Alignment.BottomEnd).padding(12.dp).clip(RoundedCornerShape(50)).background(Color.White).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Star, null, tint = Brand.Star, modifier = Modifier.size(15.dp))
                    Text(" " + String.format(java.util.Locale.ENGLISH, "%.1f", r), style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = Brand.Ink)
                    if (p.int("reviews") > 0) Text(" (${p.int("reviews")})", style = MaterialTheme.typography.labelMedium, color = Brand.Muted)
                }
            }
        }
        Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Place, null, tint = Brand.Teal, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(4.dp))
                Text(listOfNotNull(p.str("area"), p.str("location")).joinToString(", "), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(p.text("title"), style = MaterialTheme.typography.titleLarge, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                Text(listOfNotNull(p.str("type"), p.intOrNull("max_guests")?.let { "up to $it guests" }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                if (badges.bool("verified")) {
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Outlined.Verified, null, tint = Brand.Teal, modifier = Modifier.size(14.dp))
                    Text(" Verified", style = MaterialTheme.typography.bodySmall, color = Brand.Teal)
                }
            }
            if (p.bool("bookable") || !p.has("bookable")) {
                Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 8.dp)) {
                    val total = price.obj("total")
                    val offer = price.num("offer_nightly")
                    val nightly = price.num("nightly")
                    if (total != null) {
                        Text(money(total.num("amount")), style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = Brand.BlueDark)
                        Text("  for ${total.int("nights")} nights", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    } else {
                        if (offer != null && nightly != null && offer < nightly) {
                            Text(money(nightly), style = MaterialTheme.typography.bodySmall.copy(textDecoration = TextDecoration.LineThrough), color = Brand.Muted)
                            Spacer(Modifier.width(6.dp))
                        }
                        Text((if (price.bool("from")) "from " else "") + money(offer ?: nightly), style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = Brand.BlueDark)
                        Text(" / night", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    }
                }
                p.str("cancellation")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.TealDark, modifier = Modifier.padding(top = 2.dp)) }
            } else Text("Not taking bookings right now", style = MaterialTheme.typography.bodySmall, color = Brand.Warn, modifier = Modifier.padding(top = 6.dp))
        }
    }
}


/** A label on top of a photo (white chip). */
@Composable
fun OverlayTag(text: String) {
    Text(text, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold), color = Brand.Ink,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.94f)).padding(horizontal = 10.dp, vertical = 5.dp))
}

/** A round shortcut on Explore (Homestays, Resorts, Pet boarding, Ask AI). */
@Composable
private fun Shortcut(icon: ImageVector, label: String, tint: Color, bg: Color, onClick: () -> Unit) {
    Column(Modifier.width(82.dp).clip(RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(vertical = 4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(56.dp).clip(CircleShape).background(bg), contentAlignment = Alignment.Center) { Icon(icon, null, tint = tint, modifier = Modifier.size(26.dp)) }
        Text(label, style = MaterialTheme.typography.labelMedium, color = Brand.Ink, modifier = Modifier.padding(top = 6.dp), maxLines = 1)
    }
}
