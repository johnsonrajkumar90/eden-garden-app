package com.triparro.app.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.EvStation
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.intOrNull
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.pressable
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Public EV chargers from Open Charge Map, through our own server (/api/chargers — the API key never reaches the app).
 * Place search or the phone's location, filters, a list sorted by distance or power, details in a sheet, and directions.
 */
private val DC = Color(0xFF00875A)
private val AC = Color(0xFF1F6FEB)
private val SLOW = Color(0xFF8A8580)
private fun tierColor(t: String?) = when (t) { "dc" -> DC; "ac" -> AC; else -> SLOW }
private fun kw(v: Double?) = v?.let { if (it % 1.0 == 0.0) "${it.toInt()} kW" else "${"%.1f".format(it)} kW" }
private fun isDown(c: JSONObject) = c.obj("status")?.let { it.has("is_operational") && !it.isNull("is_operational") && !it.optBoolean("is_operational") } ?: false
private fun isUp(c: JSONObject) = c.obj("status")?.let { it.has("is_operational") && !it.isNull("is_operational") && it.optBoolean("is_operational") } ?: false

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChargersScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val focus = LocalFocusManager.current
    var center by remember { mutableStateOf<Triple<Double, Double, String>?>(null) }
    var distance by remember { mutableStateOf(25) }
    var type by remember { mutableStateOf<Int?>(null) }
    var minKw by remember { mutableStateOf(0) }
    var working by remember { mutableStateOf(false) }
    var sort by remember { mutableStateOf("distance") }
    var items by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var q by remember { mutableStateOf("") }
    var details by remember { mutableStateOf<Long?>(null) }
    var meta by remember { mutableStateOf<JSONObject?>(null) }

    LaunchedEffect(Unit) {
        try { meta = Api.get("chargers/meta") } catch (_: Exception) { }
        if (center == null) {
            val fix = if (LocationHelper.hasPermission(ctx)) (LocationHelper.lastFix ?: LocationHelper.current(ctx, 8_000) as? LocResult.Found) else null
            center = if (fix != null) Triple(fix.lat, fix.lng, "your location")
            else Triple(meta?.obj("center")?.num("lat") ?: 11.0168, meta?.obj("center")?.num("lng") ?: 76.9558, "Coimbatore")
        }
    }
    // search again whenever the place or a filter changes (the newest search wins)
    LaunchedEffect(center, distance, type, minKw, working, sort) {
        val c = center ?: return@LaunchedEffect
        loading = true; error = null
        try {
            val r = Api.get("chargers", mapOf("lat" to c.first, "lng" to c.second, "distance" to distance, "connection_type_id" to type,
                "min_power_kw" to (if (minKw > 0) minKw else null), "operational_only" to working, "sort" to sort))
            items = r.objs("data")
        } catch (e: Exception) { items = emptyList(); error = errorText(e) }
        loading = false
    }

    fun useLocation() {
        info = "Finding your location…"
        scope.launch {
            info = when (val r = LocationHelper.current(ctx)) {
                is LocResult.Found -> { center = Triple(r.lat, r.lng, "your location"); null }
                LocResult.Off -> "Location is switched off on your phone. Turn it on, or type a place."
                LocResult.Denied -> "Location is not allowed for TripArro. Allow it in the app settings, or type a place."
                LocResult.NotFound -> "We couldn't find your location just now. Try again, or type a place."
            }
        }
    }
    val askLocation = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) useLocation() else info = "Location is not allowed — type a place instead."
    }
    fun findPlace() {
        if (q.trim().length < 2) return
        focus.clearFocus(); info = "Finding ${q.trim()}…"
        scope.launch {
            try {
                val r = Api.get("geocode", mapOf("q" to q.trim()))
                center = Triple(r.num("lat") ?: return@launch, r.num("lng") ?: return@launch, q.trim()); info = null
            } catch (e: Exception) { info = errorText(e) }
        }
    }

    Scaffold(topBar = { BackBar("EV chargers", { nav.popBackStack() }) }, containerColor = Brand.Page) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White).padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(q, { q = it }, Modifier.weight(1f), placeholder = { Text("Town or area, e.g. Ooty") }, singleLine = true,
                            leadingIcon = { Icon(Icons.Outlined.Search, null) }, shape = RoundedCornerShape(16.dp),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { findPlace() }))
                        Spacer(Modifier.width(8.dp))
                        IconButton(onClick = {
                            if (LocationHelper.hasPermission(ctx)) useLocation()
                            else askLocation.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                        }, modifier = Modifier.size(52.dp).clip(CircleShape).background(Brand.SunSoft)) { Icon(Icons.Outlined.MyLocation, "My location", tint = Brand.SunInk) }
                    }
                    info?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp)) }
                    Gap(10)
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        (meta?.optJSONArray("distances")?.let { a -> List(a.length()) { a.optInt(it) } } ?: listOf(5, 10, 25, 50, 100)).forEach { d ->
                            Chip("$d km", distance == d) { distance = d }
                        }
                    }
                    Gap(6)
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(0 to "Any power", 7 to "7 kW+", 22 to "22 kW+", 50 to "50 kW+", 150 to "150 kW+").forEach { (v, l) -> Chip(l, minKw == v) { minKw = v } }
                        Chip("Working only", working) { working = !working }
                    }
                    val types = meta?.objs("connection_types").orEmpty()
                    if (types.isNotEmpty()) {
                        Gap(6)
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Chip("Any connector", type == null) { type = null }
                            types.forEach { t -> val id = t.intOrNull("id"); Chip(t.text("name"), type == id) { type = id } }
                        }
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(if (loading) "Finding chargers…" else if (error != null) "Chargers" else "${items.size} charger${if (items.size == 1) "" else "s"} within $distance km",
                            style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
                        center?.let { Text("Around ${it.third}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
                    }
                    Chip("Nearest", sort == "distance") { sort = "distance" }
                    Spacer(Modifier.width(6.dp))
                    Chip("Most power", sort == "power") { sort = "power" }
                }
                FlowRow(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(DC to "DC fast", AC to "AC", SLOW to "Slow").forEach { (c, l) ->
                        Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(10.dp).clip(CircleShape).background(c)); Text(" $l", style = MaterialTheme.typography.labelSmall, color = Brand.Muted) }
                    }
                }
            }
            when {
                loading && items.isEmpty() -> item { Loading() }
                error != null -> item { ErrorBox(error!!) }
                meta != null && meta?.optBoolean("configured") == false -> item { Text("The charger map is not switched on yet.", color = Brand.Muted) }
                items.isEmpty() && !loading -> item {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🔌", style = MaterialTheme.typography.headlineMedium)
                        Text("No chargers found here", fontWeight = FontWeight.ExtraBold)
                        Text("Choose a bigger distance or remove a filter.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    }
                }
                else -> itemsIndexed(items, key = { _, c -> c.optLong("id") }) { i, c -> ChargerCard(c, Modifier.appear(i.coerceAtMost(8))) { details = c.optLong("id") } }
            }
            item {
                Text("Public chargers come from community databases (Open Charge Map / OpenStreetMap) — status and prices can be out of date. Data © Open Charge Map and OpenStreetMap contributors.",
                    style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
            }
        }
    }
    details?.let { id -> ChargerSheet(id) { details = null } }
}

@Composable
private fun Chip(label: String, on: Boolean, onClick: () -> Unit) {
    FilterChip(selected = on, onClick = onClick, label = { Text(label, maxLines = 1) }, shape = RoundedCornerShape(50),
        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Brand.Sun, selectedLabelColor = Brand.SunInk))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChargerCard(c: JSONObject, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val ctx = LocalContext.current
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White)
        .border(1.5.dp, if (isDown(c)) Brand.Danger.copy(alpha = 0.4f) else Brand.Line, RoundedCornerShape(20.dp)).pressable(onClick).padding(14.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(c.text("name", "EV charging point"), fontWeight = FontWeight.ExtraBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                c.str("address")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted, maxLines = 2, overflow = TextOverflow.Ellipsis) }
            }
            kw(c.num("max_power_kw"))?.let {
                Text(it, color = Color.White, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(start = 8.dp).clip(RoundedCornerShape(50)).background(tierColor(c.str("speed_tier"))).padding(horizontal = 10.dp, vertical = 4.dp))
            }
        }
        FlowRow(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            c.num("distance_km")?.let { Text("$it km", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold) }
            val st = c.obj("status")?.str("label") ?: "Unknown status"
            Text(st, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold,
                color = if (isDown(c)) Brand.Danger else if (isUp(c)) Brand.Teal else Brand.Muted,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(if (isDown(c)) Brand.DangerSoft else if (isUp(c)) Brand.TealSoft else Brand.Page).padding(horizontal = 8.dp, vertical = 2.dp))
            c.intOrNull("number_of_points")?.let { Text("$it point${if (it == 1) "" else "s"}", style = MaterialTheme.typography.labelMedium, color = Brand.Muted) }
        }
        val types = c.objs("connections").map { it.text("type") }.distinct().take(4)
        if (types.isNotEmpty()) FlowRow(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            types.forEach { Text("⚡ $it", style = MaterialTheme.typography.labelSmall, modifier = Modifier.clip(RoundedCornerShape(50)).background(Brand.Page).padding(horizontal = 8.dp, vertical = 3.dp)) }
        }
        c.str("directions_url")?.let { u ->
            OutlinedButton(onClick = { try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (_: Exception) { } }, modifier = Modifier.padding(top = 8.dp)) {
                Icon(Icons.Outlined.Directions, null, Modifier.size(18.dp)); Text(" Get directions")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChargerSheet(id: Long, onClose: () -> Unit) {
    val ctx = LocalContext.current
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val load = rememberLoader(id) { Api.get("chargers/$id").obj("data") }
    fun open(u: String) { try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (_: Exception) { } }
    ModalBottomSheet(onDismissRequest = onClose, sheetState = state, containerColor = Color.White) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, bottom = 32.dp)) {
            val c = load.data.value
            when {
                load.loading.value -> Loading()
                load.error.value != null -> ErrorBox(load.error.value!!)
                c != null -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(44.dp).clip(CircleShape).background(tierColor(c.str("speed_tier"))), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.EvStation, null, tint = Color.White) }
                        Spacer(Modifier.width(12.dp))
                        Column { Text(c.text("name"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold); c.str("address")?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Muted) } }
                    }
                    Gap(14)
                    fun yn(k: String) = if (!c.has(k) || c.isNull(k)) "Not specified" else if (c.optBoolean(k)) "Yes" else "No"
                    listOf("Status" to (c.obj("status")?.str("label") ?: "Unknown status"), "Operator" to (c.obj("operator")?.str("name") ?: "Unknown operator"),
                        "Usage" to c.text("usage_type", "Not specified"), "Cost" to c.text("usage_cost", "Not specified"),
                        "Membership needed" to yn("membership_required"), "Pay on site" to yn("pay_at_location"),
                        "Charging points" to (c.intOrNull("number_of_points")?.toString() ?: "Not specified"), "Max power" to (kw(c.num("max_power_kw")) ?: "Not specified"),
                        "Last verified" to (c.str("last_verified")?.take(10) ?: "Not known"), "Phone" to (c.str("phone") ?: "—")
                    ).forEach { (k, v) ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) { Text(k, Modifier.width(140.dp), color = Brand.Muted, style = MaterialTheme.typography.bodySmall); Text(v, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium) }
                    }
                    listOfNotNull(c.str("access_comments"), c.str("general_comments")).forEach { Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp).clip(RoundedCornerShape(12.dp)).background(Brand.Page).padding(10.dp)) }
                    val conns = c.objs("connections")
                    if (conns.isNotEmpty()) {
                        Gap(14); Text("Connectors", fontWeight = FontWeight.ExtraBold)
                        conns.forEach { x ->
                            HorizontalDivider(color = Brand.Line, modifier = Modifier.padding(vertical = 6.dp))
                            Text(x.text("type"), fontWeight = FontWeight.Bold)
                            Text(listOfNotNull(kw(x.num("power_kw")), x.str("current_type"), x.intOrNull("quantity")?.let { "× $it" }, x.str("status")).joinToString(" · ").ifEmpty { "No details" },
                                style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                        }
                    }
                    Gap(16)
                    c.str("directions_url")?.let { u -> PrimaryButton("Get directions", { open(u) }, icon = Icons.Outlined.Directions) }
                    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        c.obj("operator")?.str("website")?.let { u -> OutlinedButton(onClick = { open(u) }) { Icon(Icons.Outlined.OpenInNew, null, Modifier.size(16.dp)); Text(" Operator") } }
                        (c.str("source_url") ?: c.str("ocm_url"))?.let { u -> OutlinedButton(onClick = { open(u) }) { Icon(Icons.Outlined.OpenInNew, null, Modifier.size(16.dp)); Text(" " + (c.str("source") ?: "Open Charge Map")) } }
                    }
                }
            }
        }
    }
}
