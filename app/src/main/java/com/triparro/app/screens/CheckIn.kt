package com.triparro.app.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddAPhoto
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.copyToCache
import com.triparro.app.core.int
import com.triparro.app.core.intOrNull
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
import com.triparro.app.ui.prettyDate
import kotlinx.coroutines.launch

/** One person on the online check-in. keep = the index of an earlier saved guest whose ID photos stay. */
private class CiGuest(name: String = "", age: String = "", idType: String = "aadhaar", val keep: Int? = null, val hadFront: Boolean = false, val last4: String? = null) {
    var name by mutableStateOf(name); var age by mutableStateOf(age); var idType by mutableStateOf(idType); var idNumber by mutableStateOf("")
    var front by mutableStateOf<Uri?>(null); var back by mutableStateOf<Uri?>(null)
}

@Composable
private fun IdPhoto(label: String, uri: Uri?, saved: Boolean, error: String?, onPick: (Uri) -> Unit) {
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { it?.let(onPick) }
    Column(Modifier.padding(vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, if (error != null) Brand.Danger else Brand.Line, RoundedCornerShape(12.dp))
            .clickable { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) {
                when {
                    uri != null -> AsyncImage(model = uri, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    saved -> Icon(Icons.Outlined.CheckCircle, null, tint = Brand.Teal)
                    else -> Icon(Icons.Outlined.AddAPhoto, null, tint = Brand.Blue)
                }
            }
            Column(Modifier.padding(start = 10.dp)) {
                Text(label, style = MaterialTheme.typography.titleSmall)
                Text(when { uri != null -> "New photo chosen"; saved -> "Sent earlier — tap to replace"; else -> "Tap to add a photo" }, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            }
        }
        error?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
    }
}

/** Online check-in in the app: the guest register details and ID photos, sent to the host before arrival. */
@Composable
fun OnlineCheckinScreen(nav: NavHostController, link: String) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val u = Uri.parse(link)
    val ref = u.pathSegments?.lastOrNull().orEmpty()
    val k = u.getQueryParameter("k").orEmpty()
    var tick by remember { mutableStateOf(0) }
    val l = rememberLoader(ref, tick) { Api.getSite("checkin/$ref", mapOf("k" to k)) }
    val f = remember { mutableStateMapOf<String, String>() }
    val guests = remember { mutableStateListOf<CiGuest>() }
    var consent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var errs by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var done by remember { mutableStateOf<String?>(null) }
    val d = l.data.value
    LaunchedEffect(d) {
        if (d == null || guests.isNotEmpty()) return@LaunchedEffect
        val sent = d.obj("sent"); val g = d.obj("guest")
        f["lead_name"] = sent?.str("lead_name") ?: g?.text("name").orEmpty(); f["phone"] = sent?.str("phone") ?: g?.text("phone").orEmpty()
        f["email"] = sent?.str("email") ?: g?.text("email").orEmpty(); f["address"] = sent?.text("address").orEmpty(); f["city"] = sent?.text("city").orEmpty()
        f["nationality"] = sent?.str("nationality") ?: "Indian"; f["arrival_time"] = sent?.text("arrival_time").orEmpty(); f["coming_from"] = sent?.text("coming_from").orEmpty()
        f["vehicle"] = sent?.text("vehicle").orEmpty(); f["notes"] = sent?.text("notes").orEmpty()
        val old = sent?.objs("guests").orEmpty()
        if (old.isEmpty()) guests.add(CiGuest(f["lead_name"].orEmpty()))
        else old.forEachIndexed { i, o -> guests.add(CiGuest(o.text("name"), o.intOrNull("age")?.toString().orEmpty(), o.str("id_type") ?: "aadhaar", keep = i, hadFront = o.bool("has_front"), last4 = o.str("id_last4"))) }
        consent = sent != null
    }
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        ColorHeader("Online check-in", d?.let { "${it.text("title")} · ${prettyDate(it.text("check_in"))}" } ?: "Save time at arrival", onBack = { nav.popBackStack() })
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not open the check-in.", { l.reload() })
            done != null -> Column(Modifier.padding(16.dp)) { Notice(done!!, "ok"); Gap(); PrimaryButton("Back to my booking", { AppState.refreshTick.value++; nav.popBackStack() }) }
            d.text("state") != "open" -> Column(Modifier.padding(16.dp)) {
                Notice(when (d.text("state")) { "done" -> "You are checked in — enjoy your stay!"; "early" -> "Online check-in opens once your booking is confirmed."; else -> "Online check-in is closed for this booking." }, "info")
            }
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                val opts = d.objs("id_types").map { it.text("value") to it.text("label") }
                if (d.obj("sent") != null) { Notice("Your details were sent. You can update them until you arrive.", "ok"); Gap() }
                Card {
                    Text("Main guest", style = MaterialTheme.typography.titleLarge); Gap(8)
                    listOf("lead_name" to "Full name", "phone" to "Mobile number", "email" to "Email", "address" to "Home address", "city" to "City", "nationality" to "Nationality").forEach { (key, label) ->
                        Field(label, f[key].orEmpty(), { f[key] = it }, error = errs[key], keyboard = when (key) { "phone" -> KeyboardType.Phone; "email" -> KeyboardType.Email; else -> KeyboardType.Text }, lines = if (key == "address") 2 else 1); Gap(8)
                    }
                }
                Gap()
                Card {
                    Text("Arrival", style = MaterialTheme.typography.titleLarge); Gap(8)
                    Field("Arrival time (e.g. 15:30)", f["arrival_time"].orEmpty(), { f["arrival_time"] = it }, error = errs["arrival_time"]); Gap(8)
                    Field("Coming from (optional)", f["coming_from"].orEmpty(), { f["coming_from"] = it }); Gap(8)
                    Field("Vehicle number (optional)", f["vehicle"].orEmpty(), { f["vehicle"] = it }); Gap(8)
                    Field("Note for the host (optional)", f["notes"].orEmpty(), { f["notes"] = it }, lines = 2)
                }
                Gap()
                Card {
                    Text("Guests and IDs", style = MaterialTheme.typography.titleLarge)
                    Text("Indian law asks hosts to record every adult's ID. Children under 18 need only a name and age. ID numbers are stored sealed.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    guests.forEachIndexed { i, g ->
                        Gap(12)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(if (i == 0) "Guest 1 (you)" else "Guest ${i + 1}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                            if (i > 0) IconButton(onClick = { guests.removeAt(i) }) { Icon(Icons.Outlined.DeleteOutline, "Remove guest", tint = Brand.Danger) }
                        }
                        Field("Name as on the ID", g.name, { g.name = it }, error = errs["g${i}_name"]); Gap(6)
                        Field("Age", g.age, { g.age = it.filter(Char::isDigit).take(3) }, keyboard = KeyboardType.Number, error = errs["g${i}_age"]); Gap(6)
                        val child = g.age.toIntOrNull()?.let { it < 18 } ?: false
                        if (!child) {
                            Choice("ID type", g.idType, opts, { g.idType = it }); Gap(6)
                            Field(if (g.last4 != null) "ID number (sent earlier, ends ${g.last4})" else "ID number", g.idNumber, { g.idNumber = it }, error = errs["g${i}_id_number"])
                            IdPhoto("ID — front", g.front, g.hadFront, errs["g${i}_front"]) { g.front = it }
                            IdPhoto("ID — back (optional)", g.back, false, null) { g.back = it }
                        }
                    }
                    if (guests.size < d.int("max_people", 1)) {
                        Gap(8)
                        OutlinedButton(onClick = { guests.add(CiGuest()) }) { Icon(Icons.Outlined.PersonAdd, null, Modifier.size(18.dp)); Text("  Add a guest") }
                    }
                }
                Gap()
                CheckRow("I agree to share these details with my host for the guest register", consent, { consent = it })
                errs["consent"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
                err?.let { Gap(6); Notice(it, "bad") }
                if (errs.isNotEmpty() && err == null) { Gap(6); Notice(errs["upload"] ?: "Please check the highlighted fields.", "bad") }
                Gap(10)
                PrimaryButton(if (d.obj("sent") != null) "Update my check-in" else "Send my check-in", {
                    busy = true; err = null; errs = emptyMap()
                    scope.launch {
                        try {
                            val fields = mutableListOf<Pair<String, String>>()
                            f.forEach { (k2, v) -> fields.add(k2 to v) }
                            if (consent) fields.add("consent" to "1")
                            val files = mutableListOf<Upload>()
                            guests.forEachIndexed { i, g ->
                                fields += listOf("guests[$i][name]" to g.name, "guests[$i][age]" to g.age, "guests[$i][id_type]" to g.idType, "guests[$i][id_number]" to g.idNumber)
                                g.keep?.let { fields.add("guests[$i][keep]" to it.toString()) }
                                g.front?.let { uri -> copyToCache(ctx, uri, "idf$i")?.let { files.add(Upload("front_$i", it.first, it.second)) } }
                                g.back?.let { uri -> copyToCache(ctx, uri, "idb$i")?.let { files.add(Upload("back_$i", it.first, it.second)) } }
                            }
                            val r = Api.postSiteMultipart("checkin/$ref?k=$k", fields, files)
                            done = r.text("message", "Thank you — your details are with the host.")
                        } catch (e: ApiException) { err = if (e.errors.isEmpty()) e.message else null; errs = e.errors } catch (e: Exception) { err = errorText(e) }
                        busy = false
                    }
                }, coral = true, loading = busy)
                Gap(24)
            }
        }
    }
}
