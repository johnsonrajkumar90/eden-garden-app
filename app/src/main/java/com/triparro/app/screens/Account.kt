package com.triparro.app.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
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
import com.triparro.app.core.Notifier
import androidx.compose.material.icons.outlined.Notifications
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
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(if (tint == Brand.Danger) Brand.DangerSoft else Brand.Sky), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.padding(start = 14.dp).weight(1f)) {
            Text(text, style = MaterialTheme.typography.titleSmall, color = if (tint == Brand.Danger) Brand.Danger else Brand.Ink)
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        }
        if (tint != Brand.Danger) Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Brand.Muted, modifier = Modifier.size(20.dp))
    }
}

/** Account: sign in, profile, pets, dashboards (hosts, resort owners, pet hosts, partners, admin), help and settings. */
@Composable
fun AccountScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    val unread by Notifier.unread.collectAsState()
    // Someone may have signed in on a web page (one-time code, Google): read the session again
    LaunchedEffect(Unit) { try { Api.refreshSession() } catch (_: Exception) { } }
    val u = session?.user
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        // full-colour header (continues behind the status bar)
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
            .background(Brush.verticalGradient(listOf(Brand.Navy, Brand.Blue))).padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 22.dp)) {
            Image(painterResource(R.drawable.logo_white), "TripArro", Modifier.height(30.dp))
            Text("Account", style = MaterialTheme.typography.headlineMedium, color = Color.White, modifier = Modifier.padding(top = 14.dp, bottom = 10.dp))
            if (u == null) Text("Sign in to book, see your trips and pets, and open your dashboard if you host.", color = Color(0xFFC9D8F2), style = MaterialTheme.typography.bodyMedium)
            else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(56.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) {
                        Text(u.initials.take(2).uppercase(), style = MaterialTheme.typography.titleLarge, color = Brand.Blue)
                    }
                    Column(Modifier.padding(start = 14.dp).weight(1f)) {
                        Text(u.name, style = MaterialTheme.typography.titleLarge, color = Color.White)
                        Text(u.email, style = MaterialTheme.typography.bodySmall, color = Color(0xFFC9D8F2))
                        Text(roleNames[u.role] ?: u.role, style = MaterialTheme.typography.labelMedium, color = Brand.Navy,
                            modifier = Modifier.padding(top = 6.dp).clip(RoundedCornerShape(50)).background(Color(0xFFBFF0E8)).padding(horizontal = 10.dp, vertical = 3.dp))
                    }
                }
                if (u.dashboard != null && u.role != "guest") {
                    Gap()
                    Button(onClick = { nav.openWeb(u.dashboard, "Dashboard") }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Brand.Blue)) {
                        Icon(Icons.Outlined.Dashboard, null, Modifier.size(18.dp)); Text("  Open my dashboard")
                    }
                    Text("Bookings, calendar, listings, check-in, earnings and settings — signed in already.", style = MaterialTheme.typography.bodySmall, color = Color(0xFFC9D8F2), modifier = Modifier.padding(top = 8.dp))
                }
            }
        }
        Column(Modifier.padding(16.dp)) {
        if (u == null) {
            Card {
                Text("Welcome to TripArro", style = MaterialTheme.typography.titleLarge)
                Gap(10)
                PrimaryButton("Sign in", { nav.navigate("login") })
                Gap(8)
                TextButton(onClick = { nav.navigate("signup") }, modifier = Modifier.fillMaxWidth()) { Text("New here? Create an account") }
            }
        } else {
            Card {
                Item(Icons.Outlined.Notifications, if (unread > 0) "Notifications ($unread new)" else "Notifications", "Booking updates, check-in and Pet Stay Diary") { nav.navigate("notifications") }
                HorizontalDivider(color = Brand.Line)
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
            if (u != null) {
                HorizontalDivider(color = Brand.Line)
                Item(Icons.Outlined.DeleteOutline, "Delete my account", tint = Brand.Danger) { nav.openWeb("/delete-account", "Delete account") }
                HorizontalDivider(color = Brand.Line)
                Item(Icons.AutoMirrored.Outlined.Logout, "Sign out", tint = Brand.Danger) { scope.launch { Api.logout(); Notifier.reset(ctx) } }
            }
        }
        Text("TripArro for Android · version ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.padding(16.dp))
        }
    }
}
