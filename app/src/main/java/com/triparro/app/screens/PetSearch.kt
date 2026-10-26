@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
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
import androidx.core.content.ContextCompat
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.openWeb
import com.triparro.app.ui.Brand
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

@SuppressLint("MissingPermission")
fun lastLocation(context: Context): Location? {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return null
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER)
        .mapNotNull { p -> try { lm.getLastKnownLocation(p) } catch (_: Exception) { null } }.maxByOrNull { it.time }
}

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
    val askLocation = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        val loc = if (granted.values.any { it }) lastLocation(ctx) else null
        if (loc != null) { near = loc.latitude to loc.longitude; city = ""; sort = "distance"; info = "Showing pet hosts near you."; search() }
        else info = "Location is off or not allowed — type a city instead."
    }
    LaunchedEffect(Unit) { if (items == null) search() }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Column(Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Brand.TealDark, Brand.Blue))).padding(16.dp)) {
                Text("Pet boarding with verified hosts", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                Text("Homes and facilities that look after dogs, cats and other pets while you travel — checked by our team, paid securely.", color = Color(0xFFD7F2EE), style = MaterialTheme.typography.bodyMedium)
                Gap()
                Column(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(18.dp)).padding(12.dp)) {
                    OutlinedTextField(value = city, onValueChange = { city = it; near = null }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                        placeholder = { Text(if (near != null) "Near my location" else "City or area, e.g. Coimbatore") },
                        trailingIcon = { IconButton(onClick = { askLocation.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)) }) { Icon(Icons.Outlined.MyLocation, "Use my location", tint = Brand.Teal) } })
                    Gap(8)
                    DateRangeField(checkIn, checkOut, { a, b -> checkIn = a; checkOut = b })
                    Gap(8)
                    Row { Choice("Pet", type, petTypes, { type = it }, Modifier.weight(1f)) }
                    Stepper("Pets", pets, { pets = it }, min = 1, max = 6)
                    Gap(6)
                    PrimaryButton("Search", { search() }, coral = true, icon = Icons.Outlined.Search, loading = loading)
                }
                Gap(10)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = { AppState.aiMode.value = "pets"; nav.navigate("ai") }, label = { Text("Ask TripArro AI", color = Color.White) },
                        leadingIcon = { Icon(Icons.Outlined.AutoAwesome, null, tint = Color.White) })
                    AssistChip(onClick = { nav.navigate("mypets") }, label = { Text("My pets", color = Color.White) })
                    AssistChip(onClick = { nav.openWeb("/become-a-pet-host", "Become a pet host") }, label = { Text("Become a host", color = Color.White) })
                }
            }
        }
        item {
            FlowRow(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = instant, onClick = { instant = !instant; search() }, label = { Text("Instant booking") })
                FilterChip(selected = daycare, onClick = { daycare = !daycare; search() }, label = { Text("Daycare") })
                facilityChips.forEach { (k, l) ->
                    FilterChip(selected = k in facilities, onClick = { if (k in facilities) facilities.remove(k) else facilities.add(k); search() }, label = { Text(l) })
                }
            }
            Row(Modifier.padding(horizontal = 16.dp)) {
                Choice("Sort", sort, listOf("relevance" to "Best match", "price_asc" to "Lowest price", "rating" to "Top rated", "distance" to "Nearest"), { sort = it; search() }, Modifier.weight(1f))
            }
            info?.let { Text(it, color = Brand.InkSoft, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(16.dp, 8.dp)) }
        }
        val list = items
        when {
            list == null && loading -> item { Loading() }
            error != null -> item { ErrorBox(error ?: "", { search() }) }
            list != null && list.isEmpty() -> item { EmptyBox("No pet hosts found", "Try another area, other dates or fewer filters.") }
            list != null -> {
                item { Text("${list.size} pet ${if (list.size == 1) "host" else "hosts"}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 4.dp)) }
                items(list, key = { it.int("id") }) { c ->
                    Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) { PetHostCard(c) { nav.navigate("petlisting/${c.int("id")}") } }
                }
            }
        }
    }
}
