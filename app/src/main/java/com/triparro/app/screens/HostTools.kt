package com.triparro.app.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.ElectricCar
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.HowToReg
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Percent
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.RoomService
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.Storage
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.copyToCache
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.CheckRow
import com.triparro.app.ui.Choice
import com.triparro.app.ui.ColorHeader
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.money
import com.triparro.app.ui.pressable
import com.triparro.app.ui.prettyDate
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.time.LocalDate
import java.time.YearMonth

/* -------------------------------------------------------------------------------------------------
 * Host tools in the app:
 *   - "More": every other page of the host dashboard (visitors, finance, reports, plan, AI tokens, booking requests,
 *     smart pricing, services, reviews, advertise, fees, FAQ, terms, EV reservations, new booking…), opened signed in.
 *   - Every listing on one calendar.
 *   - Check a guest in with the ID card photographed with the camera or attached from the phone.
 * ----------------------------------------------------------------------------------------------- */

/** Open a page of the website inside the app (signed in). */
fun NavHostController.openSite(path: String, title: String) =
    navigate("site?path=" + URLEncoder.encode(path, "UTF-8") + "&title=" + URLEncoder.encode(title, "UTF-8"))

private fun toolIcon(key: String): ImageVector = when (key) {
    "visitors" -> Icons.Outlined.Visibility
    "finance", "earnings", "payouts" -> Icons.Outlined.Payments
    "reports", "revenue", "petstats" -> Icons.Outlined.BarChart
    "calendar", "rscal" -> Icons.Outlined.CalendarMonth
    "subscription" -> Icons.Outlined.WorkspacePremium
    "aicredit", "petai" -> Icons.Outlined.AutoAwesome
    "requests" -> Icons.Outlined.Inbox
    "pricing" -> Icons.AutoMirrored.Outlined.TrendingUp
    "services" -> Icons.Outlined.RoomService
    "reviews", "petrev" -> Icons.Outlined.Star
    "advertise" -> Icons.Outlined.Campaign
    "coupons" -> Icons.Outlined.LocalOffer
    "fees" -> Icons.Outlined.Percent
    "faq" -> Icons.AutoMirrored.Outlined.HelpOutline
    "terms", "owncancel" -> Icons.Outlined.Gavel
    "evstations", "evres" -> Icons.Outlined.ElectricCar
    "newbooking", "rsnew" -> Icons.Outlined.PersonAdd
    "guests" -> Icons.Outlined.HowToReg
    "invoices" -> Icons.Outlined.Receipt
    "channels" -> Icons.Outlined.Sync
    "storage" -> Icons.Outlined.Storage
    "manual" -> Icons.AutoMirrored.Outlined.MenuBook
    "account" -> Icons.Outlined.AccountCircle
    else -> Icons.Outlined.ChevronRight
}

@Composable
fun HostToolsTab(nav: NavHostController) {
    val l = rememberLoader("hosttools") { Api.get("hostapp/tools") }
    val d = l.data.value
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load your tools.", { l.reload() })
            else -> {
                var n = 0
                d.objs("groups").forEach { g ->
                    Text(g.text("title"), style = MaterialTheme.typography.titleMedium, color = Brand.InkSoft, modifier = Modifier.padding(top = 6.dp, bottom = 8.dp))
                    g.objs("items").chunked(3).forEach { row ->
                        Row(Modifier.fillMaxWidth().padding(bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            row.forEach { t ->
                                Column(Modifier.weight(1f).appear(n++).clip(RoundedCornerShape(18.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(18.dp))
                                    .pressable({ nav.openSite(t.text("path"), t.text("label")) }).padding(vertical = 14.dp, horizontal = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(Modifier.size(42.dp).clip(CircleShape).background(Brand.Sky), contentAlignment = Alignment.Center) {
                                        Icon(toolIcon(t.text("key")), null, tint = Brand.Blue, modifier = Modifier.size(22.dp))
                                    }
                                    Text(t.text("label"), style = MaterialTheme.typography.labelMedium, color = Brand.Ink, textAlign = TextAlign.Center, maxLines = 2,
                                        overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 8.dp))
                                }
                            }
                            repeat(3 - row.size) { Box(Modifier.weight(1f)) }
                        }
                    }
                    Gap(6)
                }
                Text("These pages open your TripArro dashboard inside the app — you stay signed in.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            }
        }
        Gap(20)
    }
}

/* ---------- Every listing on one calendar ---------- */
private fun stateColor(st: String): Color = when (st) {
    "booked" -> Brand.Blue; "request" -> Color(0xFFFFB74D); "platform" -> Color(0xFF7E57C2); "closed" -> Color(0xFF9E9E9E); "some" -> Brand.Sun; else -> Brand.TealSoft
}

@Composable
fun AllListingsCalendar(d: JSONObject, month: String, onMonth: (String) -> Unit, onListing: (String) -> Unit) {
    var picked by remember(month) { mutableStateOf<String?>(null) }
    val today = LocalDate.now().toString()
    val days = d.objs("days")
    Card(padding = 12.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { onMonth(YearMonth.parse(month).minusMonths(1).toString()) }, enabled = YearMonth.parse(month) > YearMonth.now()) { Icon(Icons.Outlined.ChevronLeft, "Previous month") }
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(d.text("label"), style = MaterialTheme.typography.titleMedium)
                Text("All ${d.objs("listings").size} listings", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
            }
            IconButton(onClick = { onMonth(YearMonth.parse(month).plusMonths(1).toString()) }) { Icon(Icons.Outlined.ChevronRight, "Next month") }
        }
        Row { listOf("Mo", "Tu", "We", "Th", "Fr", "Sa", "Su").forEach { Text(it, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, textAlign = TextAlign.Center, modifier = Modifier.weight(1f)) } }
        val lead = days.firstOrNull()?.let { LocalDate.parse(it.text("date")).dayOfWeek.value - 1 } ?: 0
        val cells: List<JSONObject?> = List(lead) { null } + days
        cells.chunked(7).forEach { week ->
            Row(Modifier.padding(vertical = 2.dp)) {
                (0 until 7).forEach { i ->
                    val c = week.getOrNull(i)
                    Box(Modifier.weight(1f).aspectRatio(0.78f).padding(2.dp)) {
                        if (c != null) {
                            val date = c.text("date"); val busy = c.int("busy"); val total = busy + c.int("free")
                            val sel = picked == date
                            Column(Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp))
                                .background(if (sel) Brand.Sun else if (busy == 0) Brand.TealSoft else Brand.Sky)
                                .border(if (date == today) 2.dp else 0.dp, if (date == today) Brand.Blue else Color.Transparent, RoundedCornerShape(10.dp))
                                .pressable({ picked = date }, scaleTo = 0.9f).padding(3.dp),
                                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                Text("${LocalDate.parse(date).dayOfMonth}", style = MaterialTheme.typography.labelLarge.copy(fontWeight = if (date == today) FontWeight.ExtraBold else FontWeight.SemiBold), color = if (date < today) Brand.Muted else Brand.Ink)
                                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {   // one dot per listing (up to 6)
                                    c.objs("items").take(6).forEach { it2 -> Box(Modifier.size(5.dp).clip(CircleShape).background(if (it2.text("state") == "free") Color(0x3300875A) else stateColor(it2.text("state")))) }
                                }
                                if (total > 0) Text("$busy/$total", style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft)
                            }
                        }
                    }
                }
            }
        }
        Gap(8)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf("free" to "Free", "booked" to "Booked", "request" to "Request", "platform" to "Other platform", "closed" to "Closed", "some" to "Some rooms left").forEach { (k, t) ->
                Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(10.dp).clip(CircleShape).background(stateColor(k))); Text(" $t", style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft) }
            }
        }
    }
    Gap(12)
    val day = days.firstOrNull { it.text("date") == picked }
    if (day == null) Text("Each day shows how many of your listings are taken (booked / all). Tap a day to see who is staying where.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
    else Card {
        Text(prettyDate(day.text("date")), style = MaterialTheme.typography.titleMedium); Gap(6)
        day.objs("items").forEach { x ->
            Row(Modifier.fillMaxWidth().pressable({ onListing(x.text("tag")) }).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(12.dp).clip(CircleShape).background(stateColor(x.text("state"))))
                Column(Modifier.padding(start = 10.dp).weight(1f)) {
                    Text(x.text("title"), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(x.str("label") ?: when (x.text("state")) { "free" -> "Free"; "closed" -> "Closed"; "booked" -> "Booked"; else -> x.text("state") }, style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Icon(Icons.Outlined.ChevronRight, "Open this listing's calendar", tint = Brand.Muted)
            }
        }
    }
}

/* ---------- Check-in with the guest's ID ---------- */
private class HcGuest(name: String = "", val online: Int? = null, type: String = "aadhaar") {
    var name by mutableStateOf(name); var type by mutableStateOf(type); var number by mutableStateOf("")
    var front by mutableStateOf<Uri?>(null); var back by mutableStateOf<Uri?>(null)
}

private fun newPhotoUri(ctx: Context, prefix: String): Uri {
    val dir = File(ctx.cacheDir, "images").apply { mkdirs() }
    val f = File.createTempFile(prefix, ".jpg", dir)
    return FileProvider.getUriForFile(ctx, ctx.packageName + ".files", f)
}

/** Take the ID photo with the camera, or attach one from the phone. */
@Composable
private fun IdShot(label: String, uri: Uri?, done: Boolean, onPick: (Uri) -> Unit) {
    val ctx = LocalContext.current
    var pending by remember { mutableStateOf<Uri?>(null) }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> if (ok) pending?.let(onPick) }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { it?.let(onPick) }
    Column(Modifier.padding(vertical = 6.dp)) {
        Text(label, style = MaterialTheme.typography.titleSmall)
        Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp).clip(RoundedCornerShape(10.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) {
                when {
                    uri != null -> AsyncImage(model = uri, contentDescription = "$label photo", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    done -> Icon(Icons.Outlined.CheckCircle, "Sent by the guest", tint = Brand.Teal)
                    else -> Icon(Icons.Outlined.PhotoCamera, null, tint = Brand.Blue)
                }
            }
            Column(Modifier.padding(start = 10.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(onClick = { try { val u = newPhotoUri(ctx, "id"); pending = u; camera.launch(u) } catch (_: Exception) { } }, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Outlined.PhotoCamera, null, Modifier.size(18.dp)); Text("  Scan with camera")
                }
                OutlinedButton(onClick = { gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Outlined.AddPhotoAlternate, null, Modifier.size(18.dp)); Text("  Attach a photo")
                }
            }
        }
    }
}

@Composable
fun HostCheckinScreen(nav: NavHostController, id: Int) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val l = rememberLoader("hcin", id) { Api.get("hostapp/checkin/$id") }
    val d = l.data.value
    val guests = remember { mutableStateListOf<HcGuest>() }
    var arrived by rememberSaveable { mutableStateOf("") }
    var verified by remember { mutableStateOf(false) }
    var noId by remember { mutableStateOf(false) }
    var collected by remember { mutableStateOf(false) }
    var notes by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(d) {
        if (d == null || guests.isNotEmpty()) return@LaunchedEffect
        arrived = d.int("guests").coerceAtLeast(1).toString()
        val online = d.objs("online")
        if (online.isEmpty()) guests.add(HcGuest(d.text("guest")))
        else online.forEach { o -> guests.add(HcGuest(o.text("name"), online = o.int("index"), type = o.str("type")?.takeIf { it.isNotBlank() } ?: "other")) }
    }
    Column(Modifier.fillMaxSize().background(com.triparro.app.ui.PageGlass)) {
        ColorHeader("Check in guest", d?.let { "${it.text("guest")} · ${it.text("listing")}" }, onBack = { nav.popBackStack() })
        when {
            d == null && l.loading.value -> Loading()
            d == null -> Column(Modifier.padding(16.dp)) { ErrorBox(l.error.value ?: "Could not open the check-in.", { l.reload() }) }
            done != null -> Column(Modifier.padding(16.dp)) { Notice(done!!, "ok"); Gap(); PrimaryButton("Back to my hosting", { nav.popBackStack() }) }
            d.bool("checked_in") -> Column(Modifier.padding(16.dp)) { Notice("${d.text("guest")} is already checked in.", "ok") }
            !d.bool("can") -> Column(Modifier.padding(16.dp)) { Notice("Check-in opens on ${prettyDate(d.text("check_in"))} for confirmed bookings.", "info") }
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                val types = d.objs("id_types").map { it.text("key") to it.text("label") }
                Card {
                    Text("Booking ${d.text("ref")}", style = MaterialTheme.typography.titleMedium)
                    Text("${prettyDate(d.text("check_in"))} → ${prettyDate(d.text("check_out"))} · ${d.int("guests")} guests booked", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    Gap(10)
                    Field("Guests who arrived (1–${d.int("max_guests")})", arrived, { arrived = it.filter(Char::isDigit).take(2) }, keyboard = KeyboardType.Number)
                }
                Gap()
                Card {
                    Text("Guest IDs", style = MaterialTheme.typography.titleLarge)
                    Text("Photograph each adult's ID card with the camera, or attach a photo. IDs are stored privately; Aadhaar numbers are kept masked.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    guests.forEachIndexed { i, g ->
                        Gap(12)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Guest ${i + 1}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                            if (i > 0) IconButton(onClick = { guests.removeAt(i) }) { Icon(Icons.Outlined.DeleteOutline, "Remove guest", tint = Brand.Danger) }
                        }
                        if (g.online != null) Notice("The guest sent this ID with their online check-in. Check it against the original card.", "ok")
                        Field("Name as on the ID", g.name, { g.name = it }); Gap(6)
                        Choice("ID type", g.type, types, { g.type = it }); Gap(6)
                        Field("ID number (optional)", g.number, { g.number = it.take(30) })
                        IdShot("ID — front", g.front, g.online != null) { g.front = it }
                        IdShot("ID — back (optional)", g.back, false) { g.back = it }
                    }
                    if (guests.size < d.int("max_guests").coerceAtMost(12)) {
                        Gap(8)
                        OutlinedButton(onClick = { guests.add(HcGuest()) }) { Icon(Icons.Outlined.PersonAdd, null, Modifier.size(18.dp)); Text("  Add a guest") }
                    }
                }
                Gap()
                CheckRow("I have seen the original ID card", verified, { verified = it })
                CheckRow("Check in without an ID (my choice)", noId, { noId = it }, note = "Only if the guest has no ID with them. It is noted on the booking.")
                val bal = d.num("balance") ?: 0.0
                if (bal > 0) CheckRow("I received the balance of ${money(bal)}", collected, { collected = it }, note = "Otherwise the guest gets a payment link.")
                Gap(6)
                Field("Notes (optional)", notes, { notes = it.take(500) }, lines = 2)
                err?.let { Gap(8); Notice(it, "bad") }
                Gap(12)
                PrimaryButton("Check in", {
                    busy = true; err = null
                    scope.launch {
                        try {
                            val fields = mutableListOf("guests_arrived" to arrived, "notes" to notes)
                            if (verified) fields.add("verified" to "1"); if (noId) fields.add("no_id" to "1"); if (collected) fields.add("collected" to "1")
                            val files = mutableListOf<Upload>()
                            guests.forEachIndexed { i, g ->
                                fields += listOf("name_$i" to g.name, "type_$i" to g.type, "number_$i" to g.number)
                                if (g.online != null && g.front == null) fields.add("online_$i" to g.online.toString())
                                g.front?.let { u -> copyToCache(ctx, u, "hidf$i")?.let { files.add(Upload("front_$i", it.first, it.second)) } }
                                g.back?.let { u -> copyToCache(ctx, u, "hidb$i")?.let { files.add(Upload("back_$i", it.first, it.second)) } }
                            }
                            done = Api.postMultipart("hostapp/checkin/$id", fields, files).text("message", "Checked in.")
                        } catch (e: ApiException) { err = e.message } catch (e: Exception) { err = errorText(e) }
                        busy = false
                    }
                }, coral = true, loading = busy, icon = Icons.Outlined.HowToReg)
                Gap(24)
            }
        }
    }
}
