@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.sp
import com.triparro.app.core.bool
import com.triparro.app.core.num
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.core.strings
import com.triparro.app.core.intOrNull
import com.triparro.app.ui.appear
import com.triparro.app.ui.floaty
import com.triparro.app.ui.pressable
import androidx.compose.foundation.layout.height
import androidx.compose.ui.res.painterResource
import com.triparro.app.R
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.AssistChip
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.TextButton
import androidx.compose.foundation.layout.size
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.openLink
import com.triparro.app.openPdf
import com.triparro.app.ui.Brand
import com.triparro.app.ui.matte
import com.triparro.app.ui.Choice
import com.triparro.app.ui.DateRangeField
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.Stepper
import kotlinx.coroutines.launch
import org.json.JSONObject

private val facilityChips = listOf("pickup" to "Pickup & drop", "ac" to "AC", "cctv" to "CCTV", "grooming" to "Grooming", "vet" to "Vet help",
    "supervision" to "24-hour care", "outdoor" to "Outdoor play", "indoor" to "Indoor", "private_room" to "Private room")

/** Pet boarding: verified pet hosts by city or near you, dates, pet, filters, and the AI assistant. */
@Composable
fun PetSearchScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var city by rememberSaveable { mutableStateOf("") }
    var checkIn by rememberSaveable { mutableStateOf("") }
    var checkOut by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf("") }
    var pets by rememberSaveable { mutableIntStateOf(1) }
    var sort by rememberSaveable { mutableStateOf("relevance") }
    var instant by rememberSaveable { mutableStateOf(false) }
    var daycare by rememberSaveable { mutableStateOf(false) }
    val facilities = remember { mutableStateListOf<String>() }
    var near by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var items by remember { mutableStateOf<List<JSONObject>?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }

    fun search() {
        loading = true; error = null
        scope.launch {
            try {
                val r = Api.get("pets/search", mapOf("city" to city.trim().ifEmpty { null }, "check_in" to checkIn.ifEmpty { null }, "check_out" to checkOut.ifEmpty { null },
                    "type" to type.ifEmpty { null }, "pets" to pets, "sort" to sort, "instant" to instant, "daycare" to daycare,
                    "facilities" to facilities.joinToString(",").ifEmpty { null },
                    "lat" to near?.first, "lng" to near?.second, "radius_km" to (if (near != null && city.isBlank()) 50 else null)))
                items = r.objs("items")
            } catch (e: Exception) { error = errorText(e) }
            loading = false
        }
    }
    var locating by remember { mutableStateOf(false) }
    var locFix by remember { mutableStateOf<(() -> Unit)?>(null) }   // "Turn on location" / "Open settings" button
    fun useLocation() {
        locating = true; locFix = null; info = "Finding your location…"
        scope.launch {
            when (val r = LocationHelper.current(ctx)) {
                is LocResult.Found -> { near = r.lat to r.lng; city = ""; sort = "distance"; info = "Showing pet hosts near you."; search() }
                LocResult.Off -> { info = "Location is switched off on your phone. Turn it on, then tap the location button again."; locFix = { LocationHelper.openLocationSettings(ctx) } }
                LocResult.Denied -> { info = "Location permission is not allowed. Allow it in the app settings, or type a city."; locFix = { LocationHelper.openAppSettings(ctx) } }
                LocResult.NotFound -> info = "We couldn't find your location just now (weak signal?). Try again outdoors or type a city."
            }
            locating = false
        }
    }
    val askLocation = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) useLocation()
        else {
            val forever = (ctx as? android.app.Activity)?.let { !androidx.core.app.ActivityCompat.shouldShowRequestPermissionRationale(it, Manifest.permission.ACCESS_COARSE_LOCATION) } ?: false
            info = "Location is not allowed — type a city instead."
            locFix = if (forever) ({ LocationHelper.openAppSettings(ctx) }) else null
        }
    }
    fun locate() {
        if (LocationHelper.hasPermission(ctx)) useLocation()
        else askLocation.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
    }
    LaunchedEffect(Unit) { if (items == null) search() }

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    var userSearched by remember { mutableStateOf(false) }
    LaunchedEffect(loading) { if (!loading && userSearched) { try { listState.animateScrollToItem(2) } catch (_: Exception) { }; userSearched = false } }
    fun go() { userSearched = true; search() }

    LazyColumn(Modifier.fillMaxSize().background(Brand.Page), state = listState, contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            androidx.compose.foundation.layout.Box(Modifier.fillMaxWidth()) {
                // red hero with floating paws
                androidx.compose.foundation.layout.Box(Modifier.fillMaxWidth().height(250.dp)
                    .clip(RoundedCornerShape(bottomStart = 34.dp, bottomEnd = 34.dp)).background(com.triparro.app.ui.RedBrush).matte(Color.Transparent))
                Text("🐾", fontSize = 46.sp, modifier = Modifier.padding(start = 300.dp, top = 30.dp).floaty(8f, 2400).graphicsLayer { alpha = 0.35f; rotationZ = 18f })
                Text("🐾", fontSize = 28.sp, modifier = Modifier.padding(start = 250.dp, top = 110.dp).floaty(6f, 1900).graphicsLayer { alpha = 0.3f; rotationZ = -12f })
                Text("🦴", fontSize = 30.sp, modifier = Modifier.padding(start = 330.dp, top = 150.dp).floaty(5f, 2100).graphicsLayer { alpha = 0.35f })
                Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp)) {
                    Image(painterResource(R.drawable.logo_white), "TripArro", Modifier.height(28.dp))
                    Gap(14)
                    Text("A loving home for your pet", style = MaterialTheme.typography.headlineMedium, color = Color.White, modifier = Modifier.appear())
                    Text("Verified pet hosts · daily photo diary · secure payment", color = Color(0xFFFFE0DC), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.appear(1))
                    Gap(16)
                    Column(Modifier.fillMaxWidth().appear(2).shadow(10.dp, RoundedCornerShape(26.dp), spotColor = Color(0x44B81D2B)).clip(RoundedCornerShape(26.dp)).background(Color.White).padding(14.dp)) {
                        OutlinedTextField(value = city, onValueChange = { city = it; near = null }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                            leadingIcon = { Icon(Icons.Outlined.Search, null, tint = Brand.Blue) },
                            placeholder = { Text(if (near != null) "Near my location" else "City or area, e.g. Coimbatore") },
                            trailingIcon = { if (locating) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Brand.Teal) else IconButton(onClick = { locate() }) { Icon(Icons.Outlined.MyLocation, "Use my location", tint = Brand.Teal) } })
                        Gap(10)
                        DateRangeField(checkIn, checkOut, { a, b -> checkIn = a; checkOut = b })
                        Gap(10)
                        // pet type as big emoji chips
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            petTypes.forEach { (k, l) ->
                                val on = type == k
                                Row(Modifier.clip(RoundedCornerShape(50)).background(if (on) com.triparro.app.ui.SunBrush else androidx.compose.ui.graphics.SolidColor(Brand.Page))
                                    .pressable({ type = k }).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text((petEmoji[k] ?: "🐾") + " ", fontSize = 16.sp)
                                    Text(l, style = MaterialTheme.typography.labelLarge, color = if (on) Brand.SunInk else Brand.InkSoft)
                                }
                            }
                        }
                        Stepper("Pets", pets, { pets = it }, min = 1, max = 6)
                        Gap(4)
                        PrimaryButton("Find pet hosts", { go() }, icon = Icons.Outlined.Search, loading = loading)
                    }
                }
            }
            // quick actions
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PetTile("✨", "Ask AI", Brand.SunSoft, Modifier.weight(1f).appear(3)) { AppState.aiMode.value = "pets"; nav.navigate("ai") }
                PetTile("🐶", "My pets", Brand.Sky, Modifier.weight(1f).appear(4)) { nav.navigate("mypets") }
                PetTile("🏡", "Pet host", Brand.TealSoft, Modifier.weight(1f).appear(5)) { nav.navigate("become-pet-host") }
            }
        }
        item {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FChip("⚡ Instant", instant) { instant = !instant; go() }
                FChip("☀️ Daycare", daycare) { daycare = !daycare; go() }
                facilityChips.forEach { (k, l) -> FChip(l, k in facilities) { if (k in facilities) facilities.remove(k) else facilities.add(k); go() } }
            }
            Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Choice("Sort", sort, listOf("relevance" to "Best match", "price_asc" to "Lowest price", "rating" to "Top rated", "distance" to "Nearest"), { sort = it; go() }, Modifier.weight(1f))
            }
            info?.let { Text(it, color = Brand.InkSoft, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(16.dp, 8.dp)) }
            locFix?.let { fix -> TextButton(onClick = fix, modifier = Modifier.padding(horizontal = 8.dp)) { Text(if (LocationHelper.hasPermission(ctx)) "Turn on location" else "Open app settings") } }
        }
        val list = items
        when {
            list == null && loading -> item { com.triparro.app.ui.SkeletonGrid(2) }
            error != null -> item { ErrorBox(error ?: "", { search() }) }
            list != null && list.isEmpty() -> item { EmptyBox("No pet hosts found", "Try another area, other dates or fewer filters.", icon = Icons.Outlined.Pets) }
            list != null -> {
                item { Text("${list.size} verified pet ${if (list.size == 1) "host" else "hosts"}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 4.dp)) }
                itemsIndexed(list.chunked(2), key = { _, row -> row.joinToString("|") { it.int("id").toString() } }) { i, row ->
                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEachIndexed { j, c -> PetGridCard(c, Modifier.weight(1f).appear(i * 2 + j)) { nav.navigate("petlisting/${c.int("id")}") } }
                        if (row.size == 1) androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun PetTile(emoji: String, label: String, bg: Color, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.shadow(3.dp, RoundedCornerShape(20.dp), spotColor = Color(0x22B81D2B)).clip(RoundedCornerShape(20.dp)).background(Color.White).pressable(onClick).padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        androidx.compose.foundation.layout.Box(Modifier.size(46.dp).clip(androidx.compose.foundation.shape.CircleShape).background(bg), contentAlignment = Alignment.Center) { Text(emoji, fontSize = 22.sp) }
        Text(label, style = MaterialTheme.typography.labelMedium, color = Brand.Ink, modifier = Modifier.padding(top = 6.dp), maxLines = 1)
    }
}

@Composable
private fun FChip(label: String, on: Boolean, onClick: () -> Unit) {
    Text(label, style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else Brand.InkSoft,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Matte else Color.White).border(1.dp, if (on) Brand.Matte else Brand.Line, RoundedCornerShape(50))
            .pressable(onClick).padding(horizontal = 14.dp, vertical = 8.dp))
}

/** A pet host as a grid card: photo, rating, pets they take and the price. */
@Composable
fun PetGridCard(c: JSONObject, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(modifier.shadow(5.dp, RoundedCornerShape(22.dp), spotColor = Color(0x33B81D2B)).clip(RoundedCornerShape(22.dp)).background(Color.White).pressable(onClick)) {
        androidx.compose.foundation.layout.Box {
            com.triparro.app.ui.Photo(c.str("image"), Modifier.fillMaxWidth().aspectRatio(0.95f), corner = 0.dp, description = c.text("title"))
            androidx.compose.foundation.layout.Box(Modifier.matchParentSize().background(Brush.verticalGradient(0.55f to Color.Transparent, 1f to Color(0x99300A10))))
            if (c.bool("verified")) Text("✓ Verified", style = MaterialTheme.typography.labelSmall, color = Brand.TealDark,
                modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(50)).background(Color.White).padding(horizontal = 8.dp, vertical = 3.dp))
            Text(c.strings("pet_types").joinToString("") { petEmoji[it] ?: "🐾" }, fontSize = 16.sp, modifier = Modifier.align(Alignment.BottomStart).padding(10.dp))
            c.num("rating")?.takeIf { it > 0 }?.let { r -> Text("★ " + String.format(java.util.Locale.ENGLISH, "%.1f", r), style = MaterialTheme.typography.labelMedium, color = Color.White, modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp)) }
        }
        Column(Modifier.padding(start = 11.dp, end = 11.dp, top = 9.dp, bottom = 12.dp)) {
            Text(c.text("title"), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            Text(c.text("location"), style = MaterialTheme.typography.labelMedium, color = Brand.Muted, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 6.dp)) {
                Text(com.triparro.app.ui.money(c.num("price")), style = MaterialTheme.typography.titleSmall.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold), color = Brand.BlueDark)
                Text(" /night", style = MaterialTheme.typography.labelMedium, color = Brand.Muted)
            }
            c.intOrNull("free")?.let { Text(if (it > 0) "$it free for your dates" else "Full for your dates", style = MaterialTheme.typography.labelSmall, color = if (it > 0) Brand.TealDark else Brand.Warn) }
        }
    }
}
