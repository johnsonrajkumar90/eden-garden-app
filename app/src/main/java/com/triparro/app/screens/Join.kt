@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.outlined.AddAPhoto
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.Upload
import com.triparro.app.core.arr
import com.triparro.app.core.copyToCache
import com.triparro.app.core.objs
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.CheckRow
import com.triparro.app.ui.Choice
import com.triparro.app.ui.ColorHeader
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.Stepper
import kotlinx.coroutines.launch

@Composable
private fun SectionHead(n: Int, title: String, sub: String? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
        Box(Modifier.size(28.dp).clip(CircleShape).background(Brand.Blue), contentAlignment = Alignment.Center) { Text("$n", color = androidx.compose.ui.graphics.Color.White, style = MaterialTheme.typography.labelLarge) }
        Column(Modifier.padding(start = 10.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        }
    }
}

@Composable
private fun Done(title: String, text: String, button: String, onClick: () -> Unit) {
    Card {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Outlined.CheckCircle, null, tint = Brand.Teal, modifier = Modifier.size(48.dp))
            Gap(8)
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(text, color = Brand.InkSoft, modifier = Modifier.padding(top = 6.dp))
            Gap()
            PrimaryButton(button, onClick)
        }
    }
}

/** Become a host: why list with TripArro, and the application (the team calls back to set the stay up). */
@Composable
fun BecomeHostScreen(nav: NavHostController) {
    val scope = rememberCoroutineScope()
    val meta = rememberLoader("become-host") { Api.getSite("become-a-host") }
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var city by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf("") }
    var units by rememberSaveable { mutableIntStateOf(1) }
    val channels = remember { mutableStateListOf<String>() }
    var link by rememberSaveable { mutableStateOf("") }
    var message by rememberSaveable { mutableStateOf("") }
    var consent by rememberSaveable { mutableStateOf(false) }
    var terms by rememberSaveable { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var errs by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var sent by remember { mutableStateOf<String?>(null) }
    val m = meta.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page).verticalScroll(rememberScrollState())) {
        ColorHeader("Become a host", "List your homestay, villa or resort on TripArro — free to join.", onBack = { nav.popBackStack() })
        Column(Modifier.padding(16.dp)) {
            if (sent != null) { Done("Application sent", sent!!, "Back to TripArro") { nav.popBackStack() }; return@Column }
            if (m != null) {
                Card {
                    Text("Why host with TripArro", style = MaterialTheme.typography.titleLarge)
                    Text("${m.text("commission")}% commission only when you get a booking · online payments · one calendar for Airbnb, Booking.com and more.",
                        style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 2.dp, bottom = 6.dp))
                    m.arr("advantages")?.let { a ->
                        for (i in 0 until minOf(a.length(), 6)) {
                            val row = a.optJSONArray(i) ?: continue
                            Row(Modifier.padding(vertical = 6.dp)) {
                                Icon(Icons.Outlined.CheckCircle, null, tint = Brand.Teal, modifier = Modifier.size(20.dp).padding(top = 2.dp))
                                Column(Modifier.padding(start = 10.dp)) {
                                    Text(row.optString(1), style = MaterialTheme.typography.titleSmall)
                                    Text(row.optString(2), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                                }
                            }
                        }
                    }
                }
                Gap()
            }
            Card {
                SectionHead(1, "About you")
                Field("Your name", name, { name = it }, error = errs["name"]); Gap(8)
                Field("Mobile number", phone, { phone = it }, keyboard = KeyboardType.Phone, error = errs["phone"]); Gap(8)
                Field("Email", email, { email = it }, keyboard = KeyboardType.Email, error = errs["email"])
            }
            Gap()
            Card {
                SectionHead(2, "Your property")
                Field("City or area", city, { city = it }, error = errs["city"]); Gap(8)
                Choice("Type of property", type, listOf("" to "Choose…") + (m?.strings("types") ?: emptyList()).map { it to it }, { type = it })
                errs["property_type"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
                Gap(8)
                Stepper("Rooms or units", units, { units = it }, min = 1, max = 99)
                Text("Already listed on", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    (m?.strings("channels") ?: emptyList()).forEach { c ->
                        FilterChip(selected = c in channels, onClick = { if (c in channels) channels.remove(c) else channels.add(c) }, label = { Text(c) })
                    }
                }
                Gap(8)
                Field("Link to your listing (optional)", link, { link = it }, keyboard = KeyboardType.Uri, error = errs["link"]); Gap(8)
                Field("Anything else? (optional)", message, { message = it }, lines = 3)
            }
            Gap()
            Card {
                CheckRow("TripArro may call or email me about my application", consent, { consent = it })
                errs["consent"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
                CheckRow("I have read and accept the host terms", terms, { terms = it })
                errs["terms"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
                TextButton(onClick = { nav.navigate("page/host-terms") }) { Text("Read the host terms") }
                err?.let { Gap(6); Notice(it, "bad") }
                Gap(8)
                PrimaryButton("Send my application", {
                    busy = true; err = null; errs = emptyMap()
                    scope.launch {
                        try {
                            val r = Api.postSite("become-a-host", mapOf("name" to name, "phone" to phone, "email" to email, "city" to city, "property_type" to type, "units" to units,
                                "channels" to org.json.JSONArray(channels.toList()), "link" to link, "message" to message, "consent" to consent, "terms" to terms))
                            sent = r.text("message", "Thank you! Our team will call you within 1–2 working days.")
                        } catch (e: ApiException) { err = e.message; errs = e.errors } catch (e: Exception) { err = errorText(e) }
                        busy = false
                    }
                }, coral = true, loading = busy)
            }
            Gap(24)
        }
    }
}

@Composable
private fun PhotoPick(label: String, uri: Uri?, error: String?, onPick: (Uri) -> Unit) {
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { it?.let(onPick) }
    Column(Modifier.padding(vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, if (error != null) Brand.Danger else Brand.Line, RoundedCornerShape(14.dp))
            .background(Brand.Page).clickable { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)).background(Brand.Sky), contentAlignment = Alignment.Center) {
                if (uri != null) AsyncImage(model = uri, contentDescription = null, contentScale = androidx.compose.ui.layout.ContentScale.Crop, modifier = Modifier.fillMaxSize())
                else Icon(Icons.Outlined.AddAPhoto, null, tint = Brand.Blue)
            }
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                Text(label, style = MaterialTheme.typography.titleSmall)
                Text(if (uri != null) "Tap to change" else "Tap to choose a photo", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
            }
        }
        error?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 4.dp, top = 2.dp)) }
    }
}

/** Become a pet host: register a pet host account (ID, payouts, emergency contact, photos). The team checks it before listings go live. */
@Composable
fun BecomePetHostScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val meta = rememberLoader("pet-join") { Api.getSite("become-a-pet-host") }
    val f = remember { mutableStateMapOfStrings("state" to "Tamil Nadu", "id_type" to "aadhaar") }
    var idFront by remember { mutableStateOf<Uri?>(null) }
    var idBack by remember { mutableStateOf<Uri?>(null) }
    var photo by remember { mutableStateOf<Uri?>(null) }
    var wa by remember { mutableStateOf(true) }
    var terms by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var locating by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var errs by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var sent by remember { mutableStateOf<String?>(null) }
    var signedIn by remember { mutableStateOf(false) }
    fun fld(key: String, label: String, kb: KeyboardType = KeyboardType.Text, pw: Boolean = false, lines: Int = 1): @Composable () -> Unit = {
        Field(label, f[key] ?: "", { f[key] = it }, keyboard = kb, password = pw, lines = lines, error = errs[key]); Gap(8)
    }
    Column(Modifier.fillMaxSize().background(Brand.Page).verticalScroll(rememberScrollState())) {
        ColorHeader("Become a pet host", "Board dogs, cats and other pets from home — verified pet parents, paid securely.", onBack = { nav.popBackStack() })
        Column(Modifier.padding(16.dp)) {
            if (sent != null) {
                Done("Registration sent", sent!!, if (signedIn) "Open My hosting" else "Sign in") { if (signedIn) nav.navigate("hosting") { popUpTo("account") } else nav.navigate("login") { popUpTo("account") } }
                return@Column
            }
            Card {
                SectionHead(1, "About you")
                fld("name", "Full name")(); fld("business_name", "Business name (optional)")(); fld("email", "Email", KeyboardType.Email)(); fld("phone", "Mobile number", KeyboardType.Phone)()
                fld("password", "Password (8+ letters and numbers)", KeyboardType.Password, pw = true)(); fld("password_confirmation", "Password again", KeyboardType.Password, pw = true)()
            }
            Gap()
            Card {
                SectionHead(2, "Where pets will stay", "Pet parents see only the area until they book.")
                fld("address", "Address", lines = 2)(); fld("city", "City")(); fld("state", "State")(); fld("pin", "PIN code", KeyboardType.Number)()
                TextButton(onClick = {
                    locating = true
                    scope.launch {
                        when (val r = LocationHelper.current(ctx)) {
                            is LocResult.Found -> { f["latitude"] = r.lat.toString(); f["longitude"] = r.lng.toString() }
                            else -> err = "Allow location in the phone's settings to add the map pin (optional)."
                        }
                        locating = false
                    }
                }) {
                    Icon(Icons.Outlined.MyLocation, null, Modifier.size(18.dp))
                    Text(if (locating) "  Finding…" else if (f["latitude"].isNullOrEmpty()) "  Add my location on the map (optional)" else "  Location added ✓")
                }
            }
            Gap()
            Card {
                SectionHead(3, "Your ID", "Checked by our team; Aadhaar is kept as the last 4 digits only.")
                Choice("ID type", f["id_type"] ?: "aadhaar", meta.data.value?.objs("id_types")?.map { it.text("value") to it.text("label") } ?: listOf("aadhaar" to "Aadhaar card"), { f["id_type"] = it })
                Gap(8)
                fld("id_number", "ID number")()
                PhotoPick("ID — front", idFront, errs["id_front"]) { idFront = it }
                PhotoPick("ID — back (optional)", idBack, errs["id_back"]) { idBack = it }
                PhotoPick("Your profile photo", photo, errs["photo"]) { photo = it }
                Gap(8)
                fld("business_reg", "Business registration number (optional)")()
            }
            Gap()
            Card {
                SectionHead(4, "Payouts", "A bank account or a UPI ID — we pay you after each stay.")
                fld("bank_holder", "Account holder name")(); fld("bank_name", "Bank name")(); fld("bank_account", "Account number", KeyboardType.Number)(); fld("bank_ifsc", "IFSC")()
                Text("or", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                fld("upi", "UPI ID (e.g. name@okbank)")()
            }
            Gap()
            Card {
                SectionHead(5, "Emergency contact")
                fld("emergency_name", "Name")(); fld("emergency_phone", "Phone", KeyboardType.Phone)()
                CheckRow("Send me booking updates on WhatsApp", wa, { wa = it })
                CheckRow("I accept the host terms and will care for every pet as described in its profile", terms, { terms = it })
                errs["terms"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
                TextButton(onClick = { nav.navigate("page/host-terms") }) { Text("Read the host terms") }
                err?.let { Gap(6); Notice(it, "bad") }
                if (errs.isNotEmpty() && err == null) { Gap(6); Notice("Please check the highlighted fields.", "bad") }
                Gap(8)
                PrimaryButton("Create my pet host account", {
                    busy = true; err = null; errs = emptyMap()
                    scope.launch {
                        try {
                            val files = listOfNotNull(
                                idFront?.let { u -> copyToCache(ctx, u, "idf")?.let { Upload("id_front", it.first, it.second) } },
                                idBack?.let { u -> copyToCache(ctx, u, "idb")?.let { Upload("id_back", it.first, it.second) } },
                                photo?.let { u -> copyToCache(ctx, u, "me")?.let { Upload("photo", it.first, it.second) } })
                            val fields = f.entries.map { it.key to it.value } + listOfNotNull("terms" to (if (terms) "1" else ""), if (wa) "whatsapp_optin" to "1" else null)
                            val r = Api.postSiteMultipart("become-a-pet-host", fields, files)
                            signedIn = r.text("verify").isEmpty()
                            if (signedIn) try { Api.refreshSession() } catch (_: Exception) { }
                            sent = r.text("message", "Your pet host account is created.")
                        } catch (e: ApiException) { err = if (e.errors.isEmpty()) e.message else null; errs = e.errors } catch (e: Exception) { err = errorText(e) }
                        busy = false
                    }
                }, coral = true, loading = busy)
            }
            Gap(24)
        }
    }
}

private fun mutableStateMapOfStrings(vararg pairs: Pair<String, String>) = androidx.compose.runtime.mutableStateMapOf<String, String>().apply { pairs.forEach { put(it.first, it.second) } }
