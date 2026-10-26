package com.triparro.app.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.copyToCache
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.CheckRow
import com.triparro.app.ui.Choice
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.PrimaryButton
import kotlinx.coroutines.launch

/** My pets: each pet's care notes, used when booking (the host sees them for your bookings only). */
@Composable
fun MyPetsScreen(nav: NavHostController) {
    val session by Api.session.collectAsState()
    val l = rememberLoader(session?.user?.id) { if (session?.user == null) null else Api.get("pets/my") }
    Scaffold(
        topBar = { BackBar("My pets", { nav.popBackStack() }) },
        floatingActionButton = { if (session?.user != null) ExtendedFloatingActionButton(onClick = { nav.navigate("petform/0") }, icon = { Icon(Icons.Filled.Add, null) }, text = { Text("Add a pet") }) },
        containerColor = Brand.Page,
    ) { pad ->
        Box(Modifier.padding(pad)) {
            val d = l.data.value
            when {
                session?.user == null -> EmptyBox("Sign in to add your pets", "Your pets' care notes go to the host with each booking.", "Sign in") { nav.navigate("login") }
                d == null && l.loading.value -> Loading()
                d == null -> ErrorBox(l.error.value ?: "Could not load your pets.", { l.reload() })
                d.objs("items").isEmpty() -> EmptyBox("No pets yet", "Add your dog, cat or other pet — feeding, medicines, allergies and vet details.", "Add a pet") { nav.navigate("petform/0") }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(d.objs("items"), key = { it.int("id") }) { p ->
                        Card(onClick = { nav.navigate("petform/${p.int("id")}") }) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (p.str("photo") != null) Photo(p.str("photo"), Modifier.size(56.dp).clip(CircleShape), corner = 28.dp)
                                else Box(Modifier.size(56.dp).clip(CircleShape).background(Brand.TealSoft), contentAlignment = Alignment.Center) { Text(petEmoji[p.text("type")] ?: "🐾") }
                                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                                    Text(p.text("name"), style = MaterialTheme.typography.titleMedium)
                                    Text(listOfNotNull(petTypes.firstOrNull { it.first == p.text("type") }?.second, p.str("breed"), p.num("age_years")?.let { "${it.toString().removeSuffix(".0")} yrs" }).joinToString(" · "),
                                        style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                                    Text(if (p.bool("vaccinated")) "Vaccinated" else "Vaccination not marked", style = MaterialTheme.typography.bodySmall, color = if (p.bool("vaccinated")) Brand.TealDark else Brand.Warn)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Add or edit a pet (id 0 = new). */
@Composable
fun PetFormScreen(nav: NavHostController, id: Int) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val l = rememberLoader(id) { if (id == 0) null else Api.get("pets/my").objs("items").firstOrNull { it.int("id") == id } }
    val p = l.data.value
    val ready = id == 0 || p != null
    var loaded by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("dog") }
    var breed by remember { mutableStateOf("") }
    var size by remember { mutableStateOf("medium") }
    var age by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf("") }
    var vaccinated by remember { mutableStateOf(false) }
    var vaccDate by remember { mutableStateOf("") }
    var neutered by remember { mutableStateOf(false) }
    var feeding by remember { mutableStateOf("") }
    var allergies by remember { mutableStateOf("") }
    var medication by remember { mutableStateOf("") }
    var behaviour by remember { mutableStateOf("") }
    var vetName by remember { mutableStateOf("") }
    var vetPhone by remember { mutableStateOf("") }
    var emName by remember { mutableStateOf("") }
    var emPhone by remember { mutableStateOf("") }
    var photo by remember { mutableStateOf<Uri?>(null) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var errs by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var confirmDelete by remember { mutableStateOf(false) }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { if (it != null) photo = it }

    if (p != null && !loaded) {
        loaded = true
        name = p.text("name"); type = p.text("type", "dog"); breed = p.text("breed"); size = p.text("size", "medium")
        age = p.num("age_years")?.toString()?.removeSuffix(".0") ?: ""; weight = p.num("weight_kg")?.toString()?.removeSuffix(".0") ?: ""
        gender = p.text("gender"); vaccinated = p.bool("vaccinated"); vaccDate = p.text("vaccination_date"); neutered = p.bool("neutered")
        feeding = p.text("feeding"); allergies = p.text("allergies"); medication = p.text("medication"); behaviour = p.text("behaviour")
        vetName = p.text("vet_name"); vetPhone = p.text("vet_phone"); emName = p.text("emergency_name"); emPhone = p.text("emergency_phone")
    }

    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar(if (id == 0) "Add a pet" else name.ifEmpty { "Edit pet" }, { nav.popBackStack() })
        if (!ready) { if (l.loading.value) Loading() else ErrorBox(l.error.value ?: "Pet not found.") }
        else Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val shown: Any? = photo ?: p?.str("photo")
                if (shown != null) AsyncImage(shown, null, Modifier.size(72.dp).clip(CircleShape))
                else Box(Modifier.size(72.dp).clip(CircleShape).background(Brand.TealSoft), contentAlignment = Alignment.Center) { Text(petEmoji[type] ?: "🐾", style = MaterialTheme.typography.headlineSmall) }
                OutlinedButton(onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.padding(start = 12.dp)) { Text(if (shown == null) "Add a photo" else "Change photo") }
            }
            Gap()
            Field("Name", name, { name = it }, error = errs["name"])
            Gap(6)
            Choice("Type", type, petTypes.drop(1), { type = it })
            Gap(6)
            Field("Breed (optional)", breed, { breed = it })
            Gap(6)
            Choice("Size", size, petSizes, { size = it })
            Gap(6)
            Row {
                Field("Age (years)", age, { age = it }, Modifier.weight(1f).padding(end = 6.dp), keyboard = KeyboardType.Decimal)
                Field("Weight (kg)", weight, { weight = it }, Modifier.weight(1f).padding(start = 6.dp), keyboard = KeyboardType.Decimal)
            }
            Gap(6)
            Choice("Gender", gender, listOf("" to "Not given", "male" to "Male", "female" to "Female"), { gender = it })
            CheckRow("Vaccinated", vaccinated, { vaccinated = it })
            if (vaccinated) Field("Last vaccination (YYYY-MM-DD)", vaccDate, { vaccDate = it }, error = errs["vaccination_date"])
            CheckRow("Neutered / spayed", neutered, { neutered = it })
            Gap(6)
            Text("Care notes for the host", style = MaterialTheme.typography.titleMedium)
            Field("Feeding (what, how much, when)", feeding, { feeding = it }, lines = 2)
            Gap(6)
            Field("Allergies", allergies, { allergies = it })
            Gap(6)
            Field("Medication (name, dose, time)", medication, { medication = it }, lines = 2)
            Gap(6)
            Field("Behaviour (with dogs, cats, people…)", behaviour, { behaviour = it }, lines = 2)
            Gap(6)
            Row {
                Field("Vet's name", vetName, { vetName = it }, Modifier.weight(1f).padding(end = 6.dp))
                Field("Vet's phone", vetPhone, { vetPhone = it }, Modifier.weight(1f).padding(start = 6.dp), keyboard = KeyboardType.Phone)
            }
            Gap(6)
            Row {
                Field("Emergency contact", emName, { emName = it }, Modifier.weight(1f).padding(end = 6.dp))
                Field("Their phone", emPhone, { emPhone = it }, Modifier.weight(1f).padding(start = 6.dp), keyboard = KeyboardType.Phone)
            }
            err?.let { Gap(8); Notice(it, "bad") }
            Gap()
            PrimaryButton("Save pet", {
                busy = true; err = null; errs = emptyMap()
                scope.launch {
                    try {
                        val fields = mutableListOf("name" to name.trim(), "type" to type, "breed" to breed.trim(), "size" to size, "age_years" to age.trim(), "weight_kg" to weight.trim(),
                            "gender" to gender, "vaccinated" to (if (vaccinated) "1" else "0"), "vaccination_date" to (if (vaccinated) vaccDate.trim() else ""), "neutered" to (if (neutered) "1" else "0"),
                            "feeding" to feeding.trim(), "allergies" to allergies.trim(), "medication" to medication.trim(), "behaviour" to behaviour.trim(),
                            "vet_name" to vetName.trim(), "vet_phone" to vetPhone.trim(), "emergency_name" to emName.trim(), "emergency_phone" to emPhone.trim())
                        if (id != 0) fields.add("id" to id.toString())
                        val files = photo?.let { u -> copyToCache(ctx, u, "pet")?.let { listOf(Upload("photo", it.first, it.second)) } } ?: emptyList()
                        Api.postMultipart("pets/my", fields, files)
                        nav.popBackStack()
                    } catch (e: ApiException) { err = e.message; errs = e.errors } catch (e: Exception) { err = errorText(e) }
                    busy = false
                }
            }, enabled = name.isNotBlank(), loading = busy)
            if (id != 0) TextButton(onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth()) { Text("Delete this pet", color = Brand.Danger) }
            Gap(30)
        }
    }
    if (confirmDelete) AlertDialog(onDismissRequest = { confirmDelete = false }, title = { Text("Delete $name?") },
        text = { Text("Bookings keep the details they were made with.") },
        confirmButton = { TextButton(onClick = { confirmDelete = false; scope.launch { try { Api.post("pets/my/$id/delete"); nav.popBackStack() } catch (e: Exception) { err = errorText(e) } } }) { Text("Delete", color = Brand.Danger) } },
        dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Keep") } })
}

/** Saved pet hosts (the heart on a pet host's page). */
@Composable
fun SavedPetsScreen(nav: NavHostController) {
    val l = rememberLoader("saved") { Api.get("pets/saved") }
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar("Saved pet hosts", { nav.popBackStack() })
        val d = l.data.value
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load.", { l.reload() })
            d.objs("items").isEmpty() -> EmptyBox("Nothing saved yet", "Tap the heart on a pet host's page to keep it here.", "Find pet boarding") { nav.navigate("pets") }
            else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(d.objs("items"), key = { it.int("id") }) { c -> PetHostCard(c) { nav.navigate("petlisting/${c.int("id")}") } }
            }
        }
    }
}

/** Profile (name, phone, emails) and password. */
@Composable
fun ProfileScreen(nav: NavHostController) {
    val scope = rememberCoroutineScope()
    val l = rememberLoader("profile") { Api.get("profile") }
    var loaded by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var emails by remember { mutableStateOf(false) }
    var current by remember { mutableStateOf("") }
    var newPw by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf<Pair<String, String>?>(null) }
    var busy by remember { mutableStateOf(false) }
    val p = l.data.value
    if (p != null && !loaded) { loaded = true; name = p.text("name"); phone = p.text("phone"); emails = p.bool("search_emails") }
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar("Profile", { nav.popBackStack() })
        when {
            p == null && l.loading.value -> Loading()
            p == null -> ErrorBox(l.error.value ?: "Could not load your profile.", { l.reload() })
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                msg?.let { (t, tone) -> Notice(t, tone); Gap() }
                Card {
                    Text(p.text("email"), color = Brand.InkSoft)
                    Gap(8)
                    Field("Name", name, { name = it })
                    Gap(6)
                    Field("Mobile number", phone, { phone = it }, keyboard = KeyboardType.Phone)
                    CheckRow("Email me about stays I searched for", emails, { emails = it })
                    Gap(6)
                    PrimaryButton("Save", {
                        busy = true
                        scope.launch {
                            try { Api.post("profile", mapOf("name" to name, "phone" to phone, "search_emails" to emails)); Api.refreshSession(); msg = "Saved." to "ok" } catch (e: Exception) { msg = errorText(e) to "bad" }
                            busy = false
                        }
                    }, loading = busy)
                }
                Gap()
                Card {
                    Text("Change password", style = MaterialTheme.typography.titleMedium)
                    Gap(6)
                    Field("Current password", current, { current = it }, password = true)
                    Gap(6)
                    Field("New password (8+ letters and numbers)", newPw, { newPw = it }, password = true)
                    Gap(6)
                    PrimaryButton("Change password", {
                        busy = true
                        scope.launch {
                            try { Api.post("profile/password", mapOf("current" to current, "new" to newPw)); current = ""; newPw = ""; msg = "Password changed." to "ok" } catch (e: Exception) { msg = errorText(e) to "bad" }
                            busy = false
                        }
                    }, enabled = current.isNotEmpty() && newPw.length >= 8, loading = busy)
                }
            }
        }
    }
}
