package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Directions
import androidx.compose.material.icons.outlined.EvStation
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.pressable
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/* -------------------------------------------------------------------------------------------------
 * TripArro EV stations in the app (EV charging lives in the app, not on the website):
 * stations added by the TripArro team with live charger status, reserve a charger (held free for a few minutes,
 * pay the station for the energy), and the guest's own reservations with cancel.
 * ----------------------------------------------------------------------------------------------- */

private fun kwText(v: Double?) = v?.let { if (it % 1.0 == 0.0) "${it.toInt()} kW" else "${"%.1f".format(it)} kW" } ?: ""

/** The TripArro stations near the place being searched (shown above the public charger list). */
@Composable
fun TripArroStations(lat: Double, lng: Double, km: Int) {
    val l = rememberLoader("evst", lat, lng, km) { Api.get("ev/stations", mapOf("lat" to lat, "lng" to lng, "radius" to km.coerceAtLeast(25))) }
    val session by Api.session.collectAsState()
    val mine = if (session?.user != null) rememberLoader("evmine", session?.user?.id) { Api.get("ev/reservations") } else null
    var open by remember { mutableStateOf<Int?>(null) }
    Column(Modifier.fillMaxWidth()) {
        mine?.data?.value?.objs("reservations")?.filter { it.text("state") in listOf("held", "charging") }?.takeIf { it.isNotEmpty() }?.let { rs ->
            Text("Your charger reservations", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
            Gap(6)
            rs.forEach { r -> MyEvReservation(r) { mine?.reload() }; Gap(8) }
            Gap(6)
        }
        val d = l.data.value
        val list = d?.objs("stations").orEmpty()
        if (d == null && l.loading.value) { Loading(); return@Column }
        if (list.isEmpty()) return@Column
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Verified, null, tint = Brand.Teal, modifier = Modifier.size(20.dp))
            Text("  TripArro stations · live status", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
        }
        Text("Checked by the TripArro team. Reserve a charger free — you pay the station for the energy.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        Gap(8)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            list.forEachIndexed { i, s ->
                Column(Modifier.width(250.dp).appear(i.coerceAtMost(6)).clip(RoundedCornerShape(20.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(20.dp))
                    .pressable({ open = s.int("id") })) {
                    Box {
                        Photo(s.str("photo"), Modifier.fillMaxWidth().size(width = 250.dp, height = 120.dp), corner = 0.dp)
                        val free = s.int("chargers_free"); val total = s.int("chargers_total")
                        Text(if (free > 0) "$free of $total free" else "All in use", style = MaterialTheme.typography.labelMedium, color = Color.White,
                            modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(50)).background(if (free > 0) Brand.Teal else Brand.Danger).padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                    Column(Modifier.padding(12.dp)) {
                        Text(s.text("title"), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(listOfNotNull(s.str("city"), s.num("km")?.let { "%.1f km".format(it) }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                        Text("${s.strings("connectors").joinToString(", ")} · up to ${kwText(s.num("max_kw"))}" + (s.num("price_from")?.let { " · from ₹${it.toInt()}/kWh" } ?: ""),
                            style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
    }
    open?.let { id -> EvStationSheet(id, { open = null }) { mine?.reload() } }
}

@Composable
private fun MyEvReservation(r: JSONObject, changed: () -> Unit) {
    val scope = rememberCoroutineScope()
    var msg by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Brand.TealSoft).padding(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.EvStation, null, tint = Brand.TealDark)
            Column(Modifier.padding(start = 10.dp).weight(1f)) {
                Text(r.obj("station")?.text("title").orEmpty(), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${r.obj("charger")?.text("label")} · ${r.text("start_at").drop(11).take(5)} · held until ${r.text("hold_until").drop(11).take(5)}", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            }
            Pill(r.text("state_label"), "ok")
        }
        if (r.bool("can_cancel")) TextButton(onClick = {
            busy = true
            scope.launch {
                msg = try { Api.post("ev/reservations/${r.text("ref")}/cancel").text("message", "Reservation cancelled.") } catch (e: Exception) { errorText(e) }
                busy = false; changed()
            }
        }, enabled = !busy) { Text("Cancel reservation", color = Brand.Danger) }
        msg?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EvStationSheet(id: Int, onClose: () -> Unit, reserved: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val l = rememberLoader("evs", id) { Api.get("ev/stations/$id").obj("station") }
    val me = Api.session.collectAsState().value?.user
    var charger by remember { mutableStateOf<Int?>(null) }
    var inMin by remember { mutableStateOf(15) }
    var duration by remember { mutableStateOf(60) }
    var name by remember { mutableStateOf(me?.name.orEmpty()) }
    var phone by remember { mutableStateOf("") }
    var car by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf<String?>(null) }
    ModalBottomSheet(onDismissRequest = onClose, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = com.triparro.app.ui.PageGlass) {
        val s = l.data.value
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 28.dp)) {
            when {
                s == null && l.loading.value -> Loading()
                s == null -> ErrorBox(l.error.value ?: "Could not open the station.", { l.reload() })
                else -> {
                    Text(s.text("title"), style = MaterialTheme.typography.headlineSmall)
                    Text(listOfNotNull(s.str("address"), s.str("city"), s.str("opening_hours")).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    Gap(8)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        s.str("maps_url")?.let { u -> OutlinedButton(onClick = { try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (_: Exception) { } }) { Icon(Icons.Outlined.Directions, null, Modifier.size(18.dp)); Text("  Directions") } }
                        s.str("phone")?.let { p -> OutlinedButton(onClick = { try { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$p"))) } catch (_: Exception) { } }) { Icon(Icons.Outlined.Call, null, Modifier.size(18.dp)); Text("  Call") } }
                    }
                    if (s.objs("amenities").isNotEmpty()) { Gap(8); Text(s.objs("amenities").joinToString("   ") { it.text("icon") + " " + it.text("label") }, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft) }
                    Gap(14)
                    Text("Chargers", style = MaterialTheme.typography.titleMedium)
                    Gap(6)
                    s.objs("chargers").forEach { c ->
                        val free = c.text("state") == "available"
                        val on = charger == c.int("id")
                        Row(Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(16.dp)).background(if (on) Brand.SunSoft else Color.White)
                            .border(if (on) 2.dp else 1.dp, if (on) Brand.Sun else Brand.Line, RoundedCornerShape(16.dp)).pressable({ charger = c.int("id"); done = null }).padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(12.dp).clip(CircleShape).background(if (free) Brand.Teal else if (c.text("state") == "offline") Color(0xFF9E9E9E) else Brand.Danger))
                            Column(Modifier.padding(start = 10.dp).weight(1f)) {
                                Text("${c.text("label")} · ${c.text("connector")} · ${kwText(c.num("power_kw"))}${if (c.bool("dc")) " DC" else ""}", style = MaterialTheme.typography.titleSmall)
                                Text(c.text("state_label") + (c.num("price_per_kwh")?.let { " · ₹${it.toInt()}/kWh" } ?: "") +
                                    (c.objs("reserved").takeIf { it.isNotEmpty() }?.let { r -> " · reserved " + r.take(3).joinToString(", ") { it.text("from").drop(11).take(5) + "–" + it.text("to").drop(11).take(5) } } ?: ""),
                                    style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                            }
                        }
                    }
                    if (charger != null) {
                        Gap(8)
                        Text("Reserve this charger", style = MaterialTheme.typography.titleMedium)
                        Gap(6)
                        Text("I will arrive in", style = MaterialTheme.typography.labelLarge, color = Brand.InkSoft)
                        Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(0 to "Now", 15 to "15 min", 30 to "30 min", 60 to "1 hour", 120 to "2 hours").forEach { (m, t) -> EvChip(t, inMin == m) { inMin = m } }
                        }
                        Text("Charging for", style = MaterialTheme.typography.labelLarge, color = Brand.InkSoft)
                        Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(30 to "30 min", 60 to "1 hour", 90 to "1½ hours", 120 to "2 hours").forEach { (m, t) -> EvChip(t, duration == m) { duration = m } }
                        }
                        Field("Your name", name, { name = it }); Gap(6)
                        Field("Mobile number", phone, { phone = it.take(15) }, keyboard = KeyboardType.Phone); Gap(6)
                        Field("Car (optional)", car, { car = it.take(60) })
                        err?.let { Gap(8); Notice(it, "bad") }
                        done?.let { Gap(8); Notice(it, "ok") }
                        Gap(10)
                        if (done == null) PrimaryButton("Hold this charger", {
                            busy = true; err = null
                            scope.launch {
                                try {
                                    val start = LocalDateTime.now().plusMinutes(inMin.toLong()).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                                    done = Api.post("ev/reservations", mapOf("charger_id" to charger, "start" to start, "duration" to duration, "name" to name, "phone" to phone, "vehicle" to car.ifBlank { null }))
                                        .text("message", "Charger held for you.")
                                    reserved(); l.reload()
                                } catch (e: ApiException) { err = e.message } catch (e: Exception) { err = errorText(e) }
                                busy = false
                            }
                        }, coral = true, loading = busy)
                    } else Text("Tap a charger to reserve it.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                }
            }
        }
    }
}

@Composable
private fun EvChip(label: String, on: Boolean, onClick: () -> Unit) {
    Text(label, style = MaterialTheme.typography.labelLarge, color = if (on) Brand.SunInk else Brand.InkSoft,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Sun else Color.White).border(1.dp, if (on) Brand.Sun else Brand.Line, RoundedCornerShape(50))
            .pressable(onClick).padding(horizontal = 14.dp, vertical = 8.dp))
}
