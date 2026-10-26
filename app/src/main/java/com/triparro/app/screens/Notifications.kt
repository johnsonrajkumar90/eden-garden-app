package com.triparro.app.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Login
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.Notifier
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.text
import com.triparro.app.openLink
import com.triparro.app.ui.BackBar
import com.triparro.app.ui.Brand
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.dateTime
import kotlinx.coroutines.launch

/** Account → Notifications: booking updates from the website, newest first. Tap one to open it. */
@Composable
fun NotificationsScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    var tick by remember { mutableIntStateOf(0) }
    var allowed by remember { mutableStateOf(Notifier.canPost(ctx)) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { allowed = Notifier.canPost(ctx) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed = Notifier.canPost(ctx); if (!it) LocationHelper.openAppSettings(ctx) }
    val l = rememberLoader(tick, session?.user?.id) { if (session?.user == null) null else Api.get("notifications", mapOf("limit" to 50)) }
    LaunchedEffect(l.data.value) { l.data.value?.let { Notifier.setUnread(it.int("unread")) } }

    Column(Modifier.fillMaxSize()) {
        BackBar("Notifications", { nav.popBackStack() }) {
            if ((l.data.value?.int("unread") ?: 0) > 0) TextButton(onClick = {
                scope.launch { try { Notifier.setUnread(Api.post("notifications/read", mapOf("all" to true)).int("unread")); tick++ } catch (_: Exception) { } }
            }) { Text("Mark all read") }
        }
        when {
            session?.user == null -> EmptyBox("Sign in to see your notifications", "Booking confirmations, check-in news and Pet Stay Diary updates appear here and on your phone.", "Sign in") { nav.navigate("login") }
            l.loading.value && l.data.value == null -> Loading()
            l.error.value != null -> ErrorBox(l.error.value ?: "", { tick++ })
            else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!allowed) item {
                    Column(Modifier.fillMaxWidth().background(Brand.WarnSoft, RoundedCornerShape(14.dp)).padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.NotificationsOff, null, tint = Brand.Warn)
                            Text("  Phone notifications are off", fontWeight = FontWeight.SemiBold, color = Brand.Ink)
                        }
                        Text("Turn them on to hear about confirmations, check-in and diary updates even when the app is closed.", style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                        TextButton(onClick = {
                            if (Build.VERSION.SDK_INT >= 33) ask.launch(Manifest.permission.POST_NOTIFICATIONS) else LocationHelper.openAppSettings(ctx)
                        }) { Text("Turn on notifications") }
                    }
                }
                val list = l.data.value?.objs("items").orEmpty()
                if (list.isEmpty()) item { EmptyBox("No notifications yet", "When you book, we'll let you know here about confirmations, payments, check-in and Pet Stay Diary updates.", icon = Icons.Outlined.Notifications) }
                items(list, key = { it.int("id") }) { n ->
                    val unread = !n.bool("read")
                    Row(Modifier.fillMaxWidth().background(if (unread) Brand.Sky else Color.White, RoundedCornerShape(14.dp)).clickable {
                        scope.launch { if (unread) try { Notifier.setUnread(Api.post("notifications/read", mapOf("id" to n.int("id"))).int("unread")) } catch (_: Exception) { } }
                        val link = n.text("link")
                        if (link.startsWith("http")) nav.openLink(link) else tick++
                    }.padding(14.dp), verticalAlignment = Alignment.Top) {
                        Box(Modifier.size(36.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                            Icon(when (n.text("kind")) { "checkin" -> Icons.Outlined.Login; "reminder" -> Icons.Outlined.Schedule; "message" -> Icons.Outlined.ChatBubbleOutline
                                "booking" -> Icons.Outlined.CalendarMonth; else -> Icons.Outlined.Notifications }, null, tint = Brand.Blue, modifier = Modifier.size(20.dp))
                        }
                        Column(Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(n.text("title"), fontWeight = if (unread) FontWeight.SemiBold else FontWeight.Normal, color = Brand.Ink)
                            if (n.text("body").isNotEmpty()) Text(n.text("body"), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text(dateTime(n.text("created_at")), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                        }
                        if (unread) Box(Modifier.padding(top = 6.dp).size(8.dp).background(Brand.Coral, CircleShape))
                    }
                }
            }
        }
    }
}
