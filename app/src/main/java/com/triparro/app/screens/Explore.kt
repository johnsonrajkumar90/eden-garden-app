@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.screens

import androidx.compose.foundation.Image
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

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Column(Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Color.White, Brand.Page))).padding(16.dp)) {
                Image(painterResource(R.drawable.logo_full), contentDescription = "TripArro", modifier = Modifier.height(40.dp))
                Gap(10)
                Text("Book. Stay. Discover.", style = MaterialTheme.typography.headlineSmall)
                Text("Verified homestays, villas and resorts — the full price before you pay.", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
                Gap(14)
                OutlinedTextField(value = q, onValueChange = { q = it }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.Search, null) }, placeholder = { Text("Where to? e.g. Ooty, Munnar, Goa") },
                    shape = RoundedCornerShape(14.dp))
                Gap(10)
                DateRangeField(checkIn, checkOut, { a, b -> checkIn = a; checkOut = b })
                Gap(6)
                Stepper("Guests", adults, { adults = it }, min = 1, max = 30)
                Gap(6)
                Segmented(listOf("all" to "All", "stay" to "Homestays", "resort" to "Resorts"), kind) { kind = it }
                Gap(12)
                PrimaryButton("Search", { search() }, coral = true, icon = Icons.Outlined.Search, loading = loading && page == 1)
            }
        }
        if (searched) {
            item {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (loading && results.isEmpty()) "Searching…" else "$total ${if (total == 1) "place" else "places"}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Text("Clear", color = Brand.Blue, modifier = Modifier.clickable { searched = false; results.clear(); q = "" }.padding(6.dp))
                }
                error?.let { ErrorBox(it) }
                if (!loading && results.isEmpty() && error == null) EmptyBox("No places found", "Try another place, other dates or fewer guests.")
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
                    ErrorBox(if (e == "Not found.") "The website at ${Api.baseUrl} does not answer the app yet. Upload the latest TripArro website package to it, then try again." else e, { home.reload() })
                }
            }
            if (h != null) {
                val places = h.objs("destinations")
                if (places.isNotEmpty()) {
                    item { Text("Popular places", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp)) }
                    item {
                        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(places) { d ->
                                Column(Modifier.width(140.dp).clickable { q = d.text("name"); search() }) {
                                    Photo(d.str("image"), Modifier.fillMaxWidth().aspectRatio(1.1f))
                                    Text(d.text("name"), style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 6.dp))
                                    Text("${d.int("count")} stays", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                                }
                            }
                        }
                    }
                }
                val fav = h.objs("favourites")
                if (fav.isNotEmpty()) {
                    item { Text("Guest favourites", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(16.dp, 18.dp, 16.dp, 4.dp)) }
                    items(fav, key = { "f" + it.text("kind") + it.int("id") }) { p -> PropertyCard(p) { nav.navigate("property/${p.text("kind", "stay")}/${p.int("id")}") } }
                }
                val sp = h.objs("sponsored")
                if (sp.isNotEmpty()) {
                    item { Text("Sponsored", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(16.dp, 18.dp, 16.dp, 4.dp)) }
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
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp).clip(RoundedCornerShape(18.dp)).background(Color.White).clickable(onClick = onClick)) {
        Box {
            Photo(p.str("image"), Modifier.fillMaxWidth().aspectRatio(1.6f), corner = 0.dp, description = p.text("title"))
            Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (badges.bool("sponsored")) Pill("Sponsored", "warn")
                if (badges.bool("favourite")) Pill("Guest favourite", "info")
            }
        }
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Place, null, tint = Brand.Teal, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(4.dp))
                Text(listOfNotNull(p.str("area"), p.str("location")).joinToString(", "), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Stars(p.num("rating"), p.int("reviews"))
            }
            Text(p.text("title"), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
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
