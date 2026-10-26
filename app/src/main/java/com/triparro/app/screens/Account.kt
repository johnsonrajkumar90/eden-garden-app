package com.triparro.app.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.Policy
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.BuildConfig
import com.triparro.app.R
import com.triparro.app.core.Api
import com.triparro.app.core.text
import com.triparro.app.openWeb
import com.triparro.app.ui.Avatar
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import kotlinx.coroutines.launch

private val roleNames = mapOf("guest" to "Guest", "host" to "Host", "resort" to "Resort owner", "admin" to "Admin", "pethost" to "Pet host", "referral" to "Booking partner", "lister" to "Property partner")

@Composable
private fun Item(icon: ImageVector, text: String, sub: String? = null, tint: Color = Brand.Blue, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Column(Modifier.padding(start = 14.dp).weight(1f)) {
            Text(text, style = MaterialTheme.typography.titleSmall, color = if (tint == Brand.Danger) Brand.Danger else Brand.Ink)
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        }
    }
}

/** Account: sign in, profile, pets, dashboards (hosts, resort owners, pet hosts, partners, admin), help and settings. */
@Composable
fun AccountScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    var server by remember { mutableStateOf(false) }
    // Someone may have signed in on a web page (one-time code, Google): read the session again
    LaunchedEffect(Unit) { try { Api.refreshSession() } catch (_: Exception) { } }
    val u = session?.user
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Image(painterResource(R.drawable.logo_full), "TripArro", Modifier.height(34.dp))
        Gap()
        if (u == null) {
            Card {
                Text("Welcome to TripArro", style = MaterialTheme.typography.titleLarge)
                Text("Sign in to book, see your trips and pets, and open your dashboard if you host.", color = Brand.InkSoft)
                Gap()
                PrimaryButton("Sign in", { nav.navigate("login") })
                Gap(8)
                TextButton(onClick = { nav.openWeb(session?.links?.text("signup") ?: "/signup", "Sign up") }, modifier = Modifier.fillMaxWidth()) { Text("New here? Create an account") }
            }
        } else {
            Card {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(u.initials)
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(u.name, style = MaterialTheme.typography.titleMedium)
                        Text(u.email, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                        Text(roleNames[u.role] ?: u.role, style = MaterialTheme.typography.bodySmall, color = Brand.Teal)
                    }
                }
                if (u.dashboard != null && u.role != "guest") {
                    Gap()
                    PrimaryButton("Open my dashboard", { nav.openWeb(u.dashboard, "Dashboard") }, icon = Icons.Outlined.Dashboard)
                    Text("Bookings, calendar, listings, check-in, earnings and settings — signed in already.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
                }
            }
            Gap()
            Card {
                Item(Icons.Outlined.Person, "Profile and password") { nav.navigate("profile") }
                HorizontalDivider(color = Brand.Line)
                Item(Icons.Outlined.Pets, "My pets", "Care notes the host sees when you book") { nav.navigate("mypets") }
                HorizontalDivider(color = Brand.Line)
                Item(Icons.Outlined.Favorite, "Saved pet hosts") { nav.navigate("saved") }
            }
        }
        Gap()
        Card {
            Item(Icons.Outlined.Home, "Become a host", "List a homestay, villa or resort — free") { nav.openWeb("/become-a-host", "Become a host") }
            HorizontalDivider(color = Brand.Line)
            Item(Icons.Outlined.Pets, "Become a pet host", "Board pets and earn from home") { nav.openWeb("/become-a-pet-host", "Become a pet host") }
            HorizontalDivider(color = Brand.Line)
            Item(Icons.AutoMirrored.Outlined.MenuBook, "Pet boarding user manual", "PDF") { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Api.url("assets/manuals/pet-boarding-manual.pdf")))) }
        }
        Gap()
        Card {
            val s = session
            s?.supportPhone?.let { ph -> Item(Icons.Outlined.Call, "Call customer care", s.supportHours ?: ph) { ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$ph"))) }; HorizontalDivider(color = Brand.Line) }
            s?.supportWhatsapp?.let { wa -> Item(Icons.Outlined.SupportAgent, "WhatsApp us") { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$wa"))) }; HorizontalDivider(color = Brand.Line) }
            s?.supportEmail?.let { em -> Item(Icons.Outlined.Email, "Email us", em) { ctx.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$em"))) }; HorizontalDivider(color = Brand.Line) }
            Item(Icons.Outlined.Policy, "Privacy policy") { nav.openWeb("/privacy-policy", "Privacy policy") }
            HorizontalDivider(color = Brand.Line)
            Item(Icons.Outlined.Badge, "Cancellation policy") { nav.openWeb("/cancellation-policy", "Cancellation policy") }
            HorizontalDivider(color = Brand.Line)
            Item(Icons.Outlined.Dns, "Server", Api.baseUrl, tint = Brand.Muted) { server = true }
            if (u != null) {
                HorizontalDivider(color = Brand.Line)
                Item(Icons.Outlined.DeleteOutline, "Delete my account", tint = Brand.Danger) { nav.openWeb("/delete-account", "Delete account") }
                HorizontalDivider(color = Brand.Line)
                Item(Icons.AutoMirrored.Outlined.Logout, "Sign out", tint = Brand.Danger) { scope.launch { Api.logout() } }
            }
        }
        Text("TripArro for Android · version ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(16.dp))
    }
    if (server) {
        var v by remember { mutableStateOf(Api.baseUrl) }
        AlertDialog(onDismissRequest = { server = false }, title = { Text("Website address") },
            text = { Column { Text("The TripArro website this app uses. Change it only to try a test site.", style = MaterialTheme.typography.bodySmall); Gap(8); Field("Address", v, { v = it }, keyboard = KeyboardType.Uri) } },
            confirmButton = { TextButton(onClick = {
                if (v.startsWith("https://") || v.startsWith("http://")) { Api.baseUrl = v; scope.launch { try { Api.refreshSession() } catch (_: Exception) { } } }
                server = false
            }) { Text("Save") } },
            dismissButton = { TextButton(onClick = { Api.baseUrl = BuildConfig.SITE_URL; server = false; scope.launch { try { Api.refreshSession() } catch (_: Exception) { } } }) { Text("Reset") } })
    }
}

/** Sign in with email and password (the website's own log-in, kept on this phone until you sign out). */
@Composable
fun LoginScreen(nav: NavHostController) {
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        BackBar("Sign in", { nav.popBackStack() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
            Image(painterResource(R.drawable.logo_full), "TripArro", Modifier.height(40.dp))
            Gap()
            Text("Sign in to TripArro", style = MaterialTheme.typography.headlineSmall)
            Text("Guests, hosts, resort owners, pet hosts and partners — one sign-in.", color = Brand.InkSoft)
            Gap()
            Field("Email", email, { email = it }, keyboard = KeyboardType.Email)
            Gap(8)
            Field("Password", password, { password = it }, password = true, keyboard = KeyboardType.Password)
            err?.let { Gap(8); Notice(it, "bad") }
            Gap()
            PrimaryButton("Sign in", {
                busy = true; err = null
                scope.launch {
                    try { Api.login(email, password); nav.popBackStack() } catch (e: Exception) { err = errorText(e) }
                    busy = false
                }
            }, enabled = email.contains("@") && password.isNotEmpty(), loading = busy)
            Gap(8)
            TextButton(onClick = { nav.openWeb(session?.links?.text("login") ?: "/login", "Sign in") }, modifier = Modifier.fillMaxWidth()) { Text("Sign in with a one-time code or Google") }
            TextButton(onClick = { nav.openWeb("/forgot-password", "Forgot password") }, modifier = Modifier.fillMaxWidth()) { Text("Forgot your password?") }
            TextButton(onClick = { nav.openWeb(session?.links?.text("signup") ?: "/signup", "Sign up") }, modifier = Modifier.fillMaxWidth()) { Text("Create an account") }
        }
    }
}
