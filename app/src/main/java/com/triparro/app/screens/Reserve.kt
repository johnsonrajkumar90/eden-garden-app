package com.triparro.app.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.AppState
import com.triparro.app.PaymentForm
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.Upload
import com.triparro.app.core.bool
import com.triparro.app.core.copyToCache
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.priceLines
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.CheckRow
import com.triparro.app.ui.Choice
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.PriceTable
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.money
import com.triparro.app.ui.plural
import com.triparro.app.ui.prettyDate
import kotlinx.coroutines.launch

private val idTypes = listOf("aadhaar" to "Aadhaar card", "passport" to "Passport", "dl" to "Driving licence", "voter" to "Voter ID", "pan" to "PAN card", "other" to "Other government ID")

/** Guest details, the price once more, and payment (or a booking request with the ID photo). */
@Composable
fun ReserveScreen(nav: NavHostController) {
    val d = AppState.reserve.value
    val session by Api.session.collectAsState()
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    if (d == null) { Column { BackBar("Reserve", { nav.popBackStack() }); EmptyBox("Nothing to book", "Choose a stay first.") }; return }
    val user = session?.user
    var name by remember { mutableStateOf(user?.name ?: "") }
    var email by remember { mutableStateOf(user?.email ?: "") }
    var phone by remember { mutableStateOf("") }
    var requests by remember { mutableStateOf("") }
    var arrival by remember { mutableStateOf("") }
    var agree by remember { mutableStateOf(false) }
    val advance = d.quote.obj("advance")
    var payAdvance by remember { mutableStateOf(advance?.bool("only") == true) }
    val isRequest = d.quote.text("booking_mode") == "request"
    var idType by remember { mutableStateOf("aadhaar") }
    var idFront by remember { mutableStateOf<Uri?>(null) }
    var idBack by remember { mutableStateOf<Uri?>(null) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var fieldErr by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    val pickFront = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { if (it != null) idFront = it }
    val pickBack = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { if (it != null) idBack = it }

    fun submit() {
        if (!agree) { err = "Please accept the house rules and cancellation policy."; return }
        if (isRequest && idFront == null) { err = "Add a photo of the front of your ID."; return }
        busy = true; err = null; fieldErr = emptyMap()
        scope.launch {
            try {
                if (session?.user == null && session?.loginToBook != false) { busy = false; nav.navigate("login"); return@launch }
                val base = linkedMapOf<String, Any?>("kind" to d.kind, "id" to d.id, "check_in" to d.checkIn, "check_out" to d.checkOut, "adults" to d.adults,
                    "food" to (if (d.food) 1 else 0), "coupon" to d.coupon.ifEmpty { null }, "room_id" to d.roomId, "plan_id" to d.planId, "rooms" to d.rooms,
                    "name" to name.trim(), "email" to email.trim(), "phone" to phone.trim(), "requests" to requests.trim(), "arrival_time" to arrival.trim(),
                    "agree" to true, "expected_total" to d.quote.num("total"))
                val r = if (isRequest) {
                    val files = mutableListOf<Upload>()
                    copyToCache(ctx, idFront!!, "id-front")?.let { files.add(Upload("id_front", it.first, it.second)) }
                    idBack?.let { u -> copyToCache(ctx, u, "id-back")?.let { files.add(Upload("id_back", it.first, it.second)) } }
                    val fields = base.filterValues { it != null && it.toString().isNotEmpty() }.map { (k, v) -> k to (if (v is Boolean) (if (v) "1" else "0") else v.toString()) }.toMutableList()
                    fields.add("children_ages" to d.ages.joinToString(","))
                    fields.add("id_type" to idType)
                    Api.postMultipart("bookings", fields, files)
                } else Api.post("bookings", base + ("children_ages" to d.ages))
                val ref = r.text("ref")
                AppState.refreshTick.value++
                if (r.text("next") == "payment") {
                    val pay = Api.post("payments", mapOf("ref" to ref, "kind" to (if (payAdvance) "advance" else "full")))
                    AppState.payment.value = PaymentForm(pay.text("action"), pay.obj("fields") ?: org.json.JSONObject(), "Pay securely")
                    nav.popBackStack()
                    nav.navigate("booking/$ref")
                    nav.navigate("pay")
                } else {
                    nav.popBackStack()
                    nav.navigate("booking/$ref")
                }
            } catch (e: ApiException) {
                if (e.status == 401) nav.navigate("login") else { err = e.message; fieldErr = e.errors }
            } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar(if (isRequest) "Request to book" else "Confirm and pay", { nav.popBackStack() })
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp)) {
            Card {
                Row {
                    Photo(d.image, Modifier.width(96.dp).aspectRatio(1.2f))
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(d.title, style = MaterialTheme.typography.titleMedium)
                        Text("${prettyDate(d.checkIn)} → ${prettyDate(d.checkOut)}", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                        Text(plural(d.adults, "adult") + (if (d.ages.isNotEmpty()) " · " + plural(d.ages.size, "child") else "") + (if (d.kind == "resort") " · " + plural(d.rooms, "room") else ""),
                            style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                    }
                }
                Gap()
                PriceTable(d.quote.priceLines(), d.quote.num("total"))
                if (advance != null) {
                    Gap(8)
                    if (advance.bool("only")) Notice("Pay ${money(advance.num("amount"))} now; the balance ${money(advance.num("balance"))} is paid later.", "info")
                    else {
                        CheckRow("Pay in full now · ${money(d.quote.num("total"))}", !payAdvance, { payAdvance = false })
                        CheckRow("Pay an advance now · ${money(advance.num("amount"))}", payAdvance, { payAdvance = true }, note = advance.str("label") ?: "Balance ${money(advance.num("balance"))} later")
                    }
                }
            }
            Gap()
            Text("Your details", style = MaterialTheme.typography.titleLarge)
            Gap(6)
            Field("Full name", name, { name = it }, error = fieldErr["name"])
            Gap(6)
            Field("Email", email, { email = it }, keyboard = KeyboardType.Email, error = fieldErr["email"])
            Gap(6)
            Field("Mobile number", phone, { phone = it }, keyboard = KeyboardType.Phone, error = fieldErr["phone"])
            Gap(6)
            Field("Arrival time (optional)", arrival, { arrival = it }, placeholder = "e.g. 3 pm")
            Gap(6)
            Field("Requests for the host (optional)", requests, { requests = it }, lines = 3)
            if (isRequest) {
                Gap()
                Text("Your ID", style = MaterialTheme.typography.titleLarge)
                Text("The host approves each booking first and needs your ID. You pay only after they accept (within 24 hours).", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                Gap(6)
                Choice("ID type", idType, idTypes, { idType = it })
                Gap(6)
                Row {
                    Column(Modifier.weight(1f).padding(end = 6.dp)) {
                        OutlinedButton(onClick = { pickFront.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.fillMaxWidth()) { Text(if (idFront == null) "Front photo" else "Change front") }
                        idFront?.let { AsyncImage(it, null, Modifier.fillMaxWidth().aspectRatio(1.6f).padding(top = 6.dp)) }
                        fieldErr["id_front"]?.let { Text(it, color = Brand.Danger, style = MaterialTheme.typography.bodySmall) }
                    }
                    Column(Modifier.weight(1f).padding(start = 6.dp)) {
                        OutlinedButton(onClick = { pickBack.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.fillMaxWidth()) { Text(if (idBack == null) "Back (optional)" else "Change back") }
                        idBack?.let { AsyncImage(it, null, Modifier.fillMaxWidth().aspectRatio(1.6f).padding(top = 6.dp)) }
                    }
                }
            }
            Gap()
            CheckRow("I accept the house rules and the cancellation policy", agree, { agree = it })
            err?.let { Gap(6); Notice(it, "bad") }
            Gap()
            PrimaryButton(if (isRequest) "Send request" else "Book and pay", { submit() }, loading = busy, coral = true)
            if (!isRequest) Text("You pay on the secure PayU / Razorpay page. The booking is confirmed when the payment succeeds.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 8.dp))
            Gap(30)
        }
    }
}
