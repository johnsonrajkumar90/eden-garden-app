package com.triparro.app.screens

import androidx.compose.runtime.collectAsState
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.Notifier
import com.triparro.app.core.bool
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
import com.triparro.app.ui.Notice
import com.triparro.app.ui.appear
import com.triparro.app.ui.money
import kotlinx.coroutines.launch
import org.json.JSONObject

/** The guest's TripArro wallet: balance, how rewards are earned, and every change. */
@Composable
fun WalletScreen(nav: NavHostController) {
    val l = rememberLoader(Unit) { Api.get("wallet") }
    Scaffold(topBar = { BackBar("My wallet", { nav.popBackStack() }) }, containerColor = Brand.Page) { pad ->
        val w = l.data.value
        when {
            w == null && l.loading.value -> Box(Modifier.padding(pad)) { Loading() }
            w == null -> Box(Modifier.padding(pad).padding(16.dp)) { ErrorBox(l.error.value ?: "Could not load your wallet.", { l.reload() }) }
            else -> LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Brush.linearGradient(listOf(Color(0xFF8E0F1D), Color(0xFFD7192A), Color(0xFFFF6A3D)))).padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.AccountBalanceWallet, null, tint = Color.White); Text("  TripArro wallet", color = Color(0xFFFFE3DE), fontWeight = FontWeight.Bold) }
                        Text(money(w.num("balance")), style = MaterialTheme.typography.displaySmall, color = Color.White, fontWeight = FontWeight.ExtraBold)
                        Text("Rewards earned so far: ${money(w.num("rewards_earned"))}", color = Color(0xFFFFE3DE))
                    }
                }
                item { ReferCard() }
                item {
                    val r = w.obj("rules") ?: JSONObject()
                    if (w.bool("on")) Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).padding(16.dp)) {
                        Text("How you earn", fontWeight = FontWeight.ExtraBold)
                        if ((r.num("signup") ?: 0.0) > 0) Text("🎁 ${money(r.num("signup"))} when you sign up (after confirming your email)", style = MaterialTheme.typography.bodyMedium)
                        if ((r.num("refer") ?: 0.0) > 0) Text("🤝 ${money(r.num("refer"))} for every friend you invite who completes a stay", style = MaterialTheme.typography.bodyMedium)
                        if ((r.num("first_booking") ?: 0.0) > 0) Text("🏡 ${money(r.num("first_booking"))} after ${if (r.text("booking_mode") == "first") "your first stay" else "every stay"} — added once you have checked out", style = MaterialTheme.typography.bodyMedium)
                        Gap(6)
                        Text(r.text("text"), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    } else Notice("Wallet rewards are paused right now. Your balance is kept.", "info")
                }
                item { Text("History", fontWeight = FontWeight.ExtraBold) }
                val items = w.objs("items")
                if (items.isEmpty()) item { Text("Nothing yet.", color = Brand.Muted) }
                items(items) { i ->
                    val amt = i.num("amount") ?: 0.0
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(i.text("label"), fontWeight = FontWeight.Bold)
                            Text(listOfNotNull(i.str("note"), i.text("date").take(16).replace("T", " ")).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                        }
                        Text((if (amt >= 0) "+" else "−") + money(kotlin.math.abs(amt)), fontWeight = FontWeight.ExtraBold, color = if (amt >= 0) Brand.TealDark else Brand.Danger)
                    }
                }
            }
        }
    }
}

/** Which notifications reach the phone: guests arriving today / tomorrow, messages, bookings… (saved on the website, also for push). */
@Composable
fun NotifyPrefsScreen(nav: NavHostController) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val l = rememberLoader(Unit) { Api.get("notify-prefs").objs("topics") }
    var topics by remember { mutableStateOf<List<JSONObject>?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    val list = topics ?: l.data.value
    Scaffold(topBar = { BackBar("Notification settings", { nav.popBackStack() }) }, containerColor = Brand.Page) { pad ->
        when {
            list == null && l.loading.value -> Box(Modifier.padding(pad)) { Loading() }
            list == null -> Box(Modifier.padding(pad).padding(16.dp)) { ErrorBox(l.error.value ?: "Could not load your settings.", { l.reload() }) }
            else -> LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!Notifier.canPost(ctx)) item { Notice("Notifications are switched off for TripArro on this phone — allow them in the phone's settings to get these.", "warn") }
                item { Text("Choose what reaches your phone. Everything still shows in Notifications in the app.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted) }
                item {
                    var snd by remember { mutableStateOf(Notifier.soundOn(ctx)) }
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Sound", fontWeight = FontWeight.SemiBold)
                            Text("Play a sound for new messages and updates", style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                        }
                        Switch(checked = snd, onCheckedChange = { snd = it; Notifier.setSound(ctx, it); if (it) Notifier.chime(ctx) }, colors = SwitchDefaults.colors(checkedTrackColor = Brand.Teal))
                    }
                }
                item {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White)) {
                        list.forEachIndexed { i, t ->
                            if (i > 0) HorizontalDivider(color = Brand.Line)
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(t.text("label"), Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                                Switch(checked = t.bool("on"), onCheckedChange = { on ->
                                    val key = t.text("key")
                                    topics = list.map { if (it.text("key") == key) JSONObject(it.toString()).put("on", on) else it }
                                    scope.launch {
                                        try { topics = Api.post("notify-prefs", mapOf(key to on)).objs("topics"); err = null } catch (e: Exception) { err = errorText(e) }
                                    }
                                }, colors = SwitchDefaults.colors(checkedTrackColor = Brand.Teal))
                            }
                        }
                    }
                }
                err?.let { e -> item { Notice(e, "bad") } }
                item { Text("Guests arriving today and tomorrow are sent in the morning (Admin → Notifications sets the hour). The app checks about every 15 minutes.", style = MaterialTheme.typography.labelSmall, color = Brand.Muted) }
            }
        }
    }
}

/**
 * The rewards wallet at the top right of the app: the balance for signed-in guests (tap → My wallet),
 * or the sign-up reward for visitors (tap → create an account). Refreshed when the app's data changes.
 */
@Composable
fun WalletChip(nav: NavHostController) {
    val session by Api.session.collectAsState()
    val tick by com.triparro.app.AppState.refreshTick
    val u = session?.user
    if (u != null && u.role != "guest") return
    var bal by remember { mutableStateOf(u?.wallet) }
    var signup by remember { mutableStateOf<Double?>(null) }
    androidx.compose.runtime.LaunchedEffect(u?.id, tick) {
        try {
            val w = Api.get("wallet")
            if (!w.bool("on") && (w.num("balance") ?: 0.0) <= 0) { bal = null; return@LaunchedEffect }
            bal = w.num("balance")
        } catch (_: Exception) {
            if (u == null) signup = null
        }
    }
    val label = when {
        u != null && bal != null -> money(bal)
        u == null -> "Rewards"
        else -> return
    }
    Row(Modifier.padding(end = 4.dp).clip(RoundedCornerShape(50)).background(Brand.Sun)
        .clickable { nav.navigate(if (u != null) "wallet" else "signup") }.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Outlined.AccountBalanceWallet, "Rewards wallet", tint = Brand.SunInk, modifier = Modifier.size(18.dp))
        Text(" $label", color = Brand.SunInk, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.labelLarge)
    }
}


/** Refer & earn in the app: the guest's invite link, a share button, how it works and how many friends joined. */
@Composable
private fun ReferCard() {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val l = rememberLoader("refer") { Api.get("refer") }
    val r = l.data.value ?: return
    if (!r.bool("on") || r.str("link") == null) return
    val friendTotal = (r.num("signup_reward") ?: 0.0) + (r.num("friend_gets") ?: 0.0)
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Brand.SunSoft).padding(16.dp)) {
        Text("🎁 Refer & earn ${money(r.num("you_get"))}", fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.titleMedium, color = Brand.SunInk)
        Text("Invite friends with your link. They start with ${money(friendTotal)} in their wallet, and you get ${money(r.num("you_get"))} when they complete their first stay.",
            style = MaterialTheme.typography.bodyMedium, color = Brand.SunInk)
        Gap(8)
        Text("Your code: ${r.text("code")}", fontWeight = FontWeight.Bold, color = Brand.Ink)
        Gap(8)
        com.triparro.app.ui.PrimaryButton("Share my invite link", { com.triparro.app.ui.shareLink(ctx, r.text("share_text"), r.text("link")) }, Modifier.fillMaxWidth(), coral = true)
        Gap(8)
        Text("1. Share your link  ·  2. Your friend signs up and confirms their email  ·  3. After their first stay (check-out) you get the bonus  ·  Wallet pays up to ${r.num("wallet_max_percent")?.toInt() ?: 50}% of a homestay booking",
            style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
        Gap(6)
        Text("${r.optInt("invited")} invited · ${r.optInt("stayed")} stayed · ${money(r.num("earned"))} earned", style = MaterialTheme.typography.labelLarge, color = Brand.Ink)
    }
}
