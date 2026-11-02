package com.triparro.app.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.int
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.EmptyBox
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.RedBrush
import com.triparro.app.ui.SunBrush
import com.triparro.app.ui.appear
import com.triparro.app.ui.initialsOf
import com.triparro.app.ui.matte
import com.triparro.app.ui.pressable
import com.triparro.app.ui.pulse
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/* ---------------------------------------------------------------------------------------------
 * Chat between guests and hosts, WhatsApp-style: bubbles with the time, ✓ sent, ✓✓ delivered and
 * blue ✓✓ once the other person has read it. New messages arrive every few seconds while open.
 * ------------------------------------------------------------------------------------------- */

private val Wallpaper = Color(0xFFF3EBE2)
private val MineBubble = Color(0xFFFFE9B0)     // warm yellow, like the brand's buttons
private val ReadBlue = Color(0xFF34B7F1)

private fun parseAt(at: String?): LocalDateTime? = try { LocalDateTime.parse(at!!.replace(' ', 'T').take(19)) } catch (_: Exception) { null }
private fun clock(at: String?): String = parseAt(at)?.format(DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH))?.lowercase() ?: ""
private fun dayLabel(at: String?): String {
    val d = parseAt(at)?.toLocalDate() ?: return ""
    val today = LocalDate.now()
    return when (d) { today -> "Today"; today.minusDays(1) -> "Yesterday"; else -> d.format(DateTimeFormatter.ofPattern("EEE, d MMM", Locale.ENGLISH)) }
}
/** Short time for a list: "4:05 pm", "Yesterday", "12 Oct". */
fun listTime(at: String?): String {
    val t = parseAt(at) ?: return ""
    val today = LocalDate.now()
    return when (t.toLocalDate()) { today -> clock(at); today.minusDays(1) -> "Yesterday"; else -> t.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)) }
}

/** A faint pattern of dots behind the messages (the chat "wallpaper"). */
private fun Modifier.wallpaper(): Modifier = this.background(Wallpaper).drawBehind {
    val step = 46.dp.toPx()
    var y = 0f; var row = 0
    while (y < size.height) {
        var x = if (row % 2 == 0) 0f else step / 2
        while (x < size.width) { drawCircle(Color(0x14B81D2B), 2.4.dp.toPx(), Offset(x, y)); x += step }
        y += step; row++
    }
}

/** One message bubble with its time and, on my own messages, the ticks. */
@Composable
private fun Bubble(m: JSONObject, mine: Boolean, seenUpTo: Int, sending: Boolean, otherName: String) {
    val from = m.text("from")
    if (from == "system") {
        Text(m.text("body"), style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 30.dp, vertical = 2.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFFF6D6)).padding(horizontal = 12.dp, vertical = 7.dp))
        return
    }
    val shape = if (mine) RoundedCornerShape(18.dp, 4.dp, 18.dp, 18.dp) else RoundedCornerShape(4.dp, 18.dp, 18.dp, 18.dp)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        Column(Modifier.widthIn(max = 300.dp).shadow(1.dp, shape).clip(shape).background(if (mine) MineBubble else Color.White).padding(start = 12.dp, end = 10.dp, top = 7.dp, bottom = 5.dp)) {
            if (!mine && from == "ai") Text("TripArro AI", style = MaterialTheme.typography.labelSmall, color = Brand.Blue)
            Text(m.text("body"), style = MaterialTheme.typography.bodyMedium, color = Brand.Ink)
            m.obj("offer")?.let { o -> Text("🏷 ${o.text("percent").removeSuffix(".0")}% off · code ${o.text("code")}", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = Brand.TealDark, modifier = Modifier.padding(top = 4.dp)) }
            Row(Modifier.align(Alignment.End).padding(top = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(clock(m.str("at")), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                if (mine) {
                    Spacer(Modifier.width(4.dp))
                    when {
                        sending -> Icon(Icons.Outlined.Schedule, "Sending", tint = Brand.Muted, modifier = Modifier.size(14.dp))
                        m.int("id") <= seenUpTo -> Icon(Icons.Filled.DoneAll, "Read by $otherName", tint = ReadBlue, modifier = Modifier.size(16.dp))
                        else -> Icon(Icons.Filled.DoneAll, "Delivered", tint = Brand.Muted, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

/**
 * The chat window used by guests and hosts. [load] fetches messages after an id (and marks them read);
 * [send] posts a message. [me] is "guest" or "host".
 */
@Composable
private fun ChatWindow(
    title: String, sub: String, avatar: String, image: String?, me: String, otherName: String, onBack: () -> Unit,
    start: suspend () -> JSONObject, load: suspend (Int) -> JSONObject, send: suspend (String, Int) -> JSONObject,
    footer: @Composable (JSONObject?, (JSONObject) -> Unit) -> Unit = { _, _ -> },
) {
    val scope = rememberCoroutineScope()
    val msgs = remember { mutableStateListOf<JSONObject>() }
    var info by remember { mutableStateOf<JSONObject?>(null) }
    var seen by remember { mutableIntStateOf(0) }
    var text by remember { mutableStateOf("") }
    var pending by remember { mutableStateOf<String?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    var loaded by remember { mutableStateOf(false) }
    val list = rememberLazyListState()
    fun take(j: JSONObject) {
        info = j
        seen = maxOf(seen, j.int("seen_by_other"))
        val have = msgs.map { it.int("id") }.toSet()
        j.objs("messages").filter { it.int("id") !in have }.forEach { msgs.add(it) }
        loaded = true
    }
    LaunchedEffect(Unit) {
        try { take(start()) } catch (e: Exception) { err = errorText(e); loaded = true }
        while (true) {   // new messages and read ticks while the chat is open
            delay(4000)
            try { take(load(msgs.maxOfOrNull { it.int("id") } ?: 0)) } catch (_: Exception) { }
        }
    }
    LaunchedEffect(msgs.size, pending) { val n = msgs.size + (if (pending != null) 1 else 0); if (n > 0) list.animateScrollToItem(n - 1) }
    fun doSend() {
        val body = text.trim(); if (body.isEmpty() || pending != null) return
        pending = body; text = ""; err = null
        scope.launch {
            try { take(send(body, msgs.maxOfOrNull { it.int("id") } ?: 0)) } catch (e: Exception) { err = errorText(e); text = body }
            pending = null
        }
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        // header: back, avatar, name and listing
        Row(Modifier.fillMaxWidth().background(RedBrush).matte(Color.Transparent).padding(start = 4.dp, end = 12.dp, top = 6.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
            Box(Modifier.size(42.dp).clip(CircleShape).background(SunBrush), contentAlignment = Alignment.Center) {
                if (image != null) Photo(image, Modifier.fillMaxSize(), corner = 50.dp) else Text(avatar, style = MaterialTheme.typography.titleSmall, color = Brand.SunInk)
            }
            Column(Modifier.padding(start = 10.dp).weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(sub, style = MaterialTheme.typography.labelMedium, color = Color(0xFFFFE0DC), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Box(Modifier.weight(1f).fillMaxWidth().wallpaper()) {
            if (!loaded) Loading()
            LazyColumn(Modifier.fillMaxSize(), state = list, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                itemsIndexed(msgs, key = { _, m -> m.int("id") }) { i, m ->
                    val day = dayLabel(m.str("at"))
                    if (day.isNotEmpty() && (i == 0 || dayLabel(msgs[i - 1].str("at")) != day)) {
                        Box(Modifier.fillMaxWidth().padding(vertical = 6.dp), contentAlignment = Alignment.Center) {
                            Text(day, style = MaterialTheme.typography.labelSmall, color = Brand.InkSoft, modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.9f)).padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                    Box(Modifier.appear()) { Bubble(m, m.text("from") == me, seen, false, otherName) }
                }
                pending?.let { body -> item(key = "pending") { Bubble(JSONObject().put("id", Int.MAX_VALUE).put("from", me).put("body", body).put("at", LocalDateTime.now().toString()), true, seen, true, otherName) } }
            }
        }
        err?.let { Notice(it, "bad", Modifier.padding(8.dp)) }
        footer(info) { take(it) }
        // the message box and the round send button
        Row(Modifier.fillMaxWidth().background(Wallpaper).padding(8.dp), verticalAlignment = Alignment.Bottom) {
            TextField(value = text, onValueChange = { text = it }, modifier = Modifier.weight(1f).shadow(1.dp, RoundedCornerShape(26.dp)), shape = RoundedCornerShape(26.dp), maxLines = 5,
                placeholder = { Text("Message") },
                colors = TextFieldDefaults.colors(focusedContainerColor = Color.White, unfocusedContainerColor = Color.White, focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = Brand.Blue))
            Spacer(Modifier.width(8.dp))
            Box(Modifier.size(52.dp).shadow(4.dp, CircleShape).clip(CircleShape).background(if (text.isNotBlank()) SunBrush else androidx.compose.ui.graphics.SolidColor(Color(0xFFE6DCD3)))
                .pressable({ doSend() }, enabled = text.isNotBlank() && pending == null), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = Brand.SunInk)
            }
        }
    }
}

/** Guest: chat about a stay or resort (TripArro AI first when it is on, the host any time). */
@Composable
fun ChatScreen(nav: NavHostController, kind: String, id: Int) = GuestChat(nav) { Api.post("chat/start", mapOf("kind" to kind, "id" to id)) }

/** Guest: an existing chat from Messages. */
@Composable
fun ChatTokenScreen(nav: NavHostController, token: String) = GuestChat(nav) { Api.get("chat/$token") }

@Composable
private fun GuestChat(nav: NavHostController, start: suspend () -> JSONObject) {
    var token by remember { mutableStateOf<String?>(null) }
    var head by remember { mutableStateOf<JSONObject?>(null) }
    val scope = rememberCoroutineScope()
    val h = head
    val host = h?.text("host_name") ?: "the host"
    ChatWindow(
        title = h?.obj("listing")?.text("title") ?: "Chat", sub = if (h?.text("mode") == "ai") "TripArro AI answers now · $host can join" else "Chat with $host",
        avatar = initialsOf(host), image = null, me = "guest", otherName = host, onBack = { nav.popBackStack() },
        start = { start().also { token = it.text("token"); head = it } },
        load = { after -> Api.get("chat/${token}", mapOf("after" to after)).also { head = it } },
        send = { body, after -> Api.post("chat/${token}/message", mapOf("body" to body, "after" to after)).also { head = it } },
        footer = { info, take ->
            if (info != null && info.text("mode") == "ai") Row(Modifier.fillMaxWidth().background(Wallpaper).padding(horizontal = 12.dp), horizontalArrangement = Arrangement.Center) {
                Text("🙋 Talk to the host", style = MaterialTheme.typography.labelLarge, color = Brand.BlueDark,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White).pressable({
                        val t = token ?: return@pressable
                        scope.launch { try { take(Api.post("chat/$t/human", emptyMap())) } catch (_: Exception) { } }
                    }).padding(horizontal = 16.dp, vertical = 8.dp))
            }
        },
    )
}

/** Host: a guest's chat about one of my listings. */
@Composable
fun HostChatScreen(nav: NavHostController, id: Int) {
    var head by remember { mutableStateOf<JSONObject?>(null) }
    val h = head
    val guest = h?.text("guest") ?: "Guest"
    ChatWindow(
        title = guest, sub = h?.obj("listing")?.text("title") ?: "", avatar = initialsOf(guest), image = null, me = "host", otherName = guest, onBack = { nav.popBackStack() },
        start = { Api.get("hostapp/chats/$id").also { head = it } },
        load = { after -> Api.get("hostapp/chats/$id", mapOf("after" to after)) },
        send = { body, after -> Api.post("hostapp/chats/$id", mapOf("body" to body, "after" to after)) },
    )
}

/** A list of chats (guest's Messages, or the host's guest chats). */
@Composable
fun ChatList(chats: List<JSONObject>, host: Boolean, open: (JSONObject) -> Unit) {
    if (chats.isEmpty()) {
        EmptyBox(if (host) "No guest chats yet" else "No messages yet", if (host) "When a guest asks about your listing, the chat shows up here." else "Ask a host a question from any stay or resort page — the chat shows up here.", icon = Icons.Outlined.ChatBubbleOutline)
        return
    }
    Column {
        chats.forEachIndexed { i, c ->
            val name = if (host) c.text("guest", "Guest") else c.text("listing")
            Row(Modifier.fillMaxWidth().appear(i).pressable({ open(c) }, scaleTo = 0.98f).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(52.dp)) {
                    if (c.str("image") != null && !host) Photo(c.str("image"), Modifier.fillMaxSize(), corner = 50.dp)
                    else Box(Modifier.fillMaxSize().clip(CircleShape).background(SunBrush), contentAlignment = Alignment.Center) { Text(initialsOf(name), style = MaterialTheme.typography.titleMedium, color = Brand.SunInk) }
                }
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        Text(listTime(c.str("at")), style = MaterialTheme.typography.labelSmall, color = if (c.int("unread") > 0) Brand.Blue else Brand.Muted)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                        val mineLast = c.text("last_from") == (if (host) "host" else "guest")
                        if (mineLast) Icon(Icons.Filled.DoneAll, null, tint = Brand.Muted, modifier = Modifier.size(15.dp).padding(end = 3.dp))
                        Text((if (host) c.text("listing") + " · " else "${c.text("host")}: ") + c.text("last"), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        if (c.int("unread") > 0) Box(Modifier.padding(start = 6.dp).size(22.dp).pulse().clip(CircleShape).background(Brand.Blue), contentAlignment = Alignment.Center) {
                            Text(if (c.int("unread") > 9) "9+" else "${c.int("unread")}", style = MaterialTheme.typography.labelSmall, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

/** Guest: Messages — every chat with hosts. */
@Composable
fun MessagesScreen(nav: NavHostController) {
    val l = rememberLoader("mychats") { Api.get("chat/mine") }
    LaunchedEffect(Unit) { while (true) { delay(15000); l.reload() } }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        com.triparro.app.ui.ColorHeader("Messages", "Your chats with hosts", onBack = { nav.popBackStack() })
        val d = l.data.value
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load your messages.", { l.reload() })
            else -> androidx.compose.foundation.lazy.LazyColumn { item { ChatList(d.objs("chats"), host = false) { c -> nav.navigate("chatt/${c.text("token")}") } } }
        }
    }
}
