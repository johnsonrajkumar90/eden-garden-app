package com.triparro.app.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.BeachAccess
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Flight
import androidx.compose.material.icons.outlined.Hotel
import androidx.compose.material.icons.outlined.Luggage
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Loading
import kotlinx.coroutines.launch
import org.json.JSONObject

/*
 * Trip chat, laid out like WhatsApp: everyone who joined the trip, bubbles with the sender's name in their own colour,
 * time and a sent tick, day dividers, a doodle wallpaper and a round send button. New messages show up every few seconds.
 * Long-press your own message to delete it.
 */

private val Wallpaper = Color(0xFFEFE7DE)
private val Mine = Color(0xFFD9FDD3)
private val WaGreen = Color(0xFF00A884)
private val TimeGrey = Color(0xFF667781)
private val NameColors = listOf(Color(0xFF1F7AEC), Color(0xFFD62976), Color(0xFF0E9F6E), Color(0xFFB45309), Color(0xFF7C3AED), Color(0xFFDC2626), Color(0xFF0891B2), Color(0xFF65A30D))

/** A bubble with a small tail at the top corner (left for others, right for you), like WhatsApp. */
private fun bubbleShape(mine: Boolean, tail: Boolean) = GenericShape { size, _ ->
    val r = 22f; val t = 22f
    val body = if (mine) Rect(0f, 0f, size.width - (if (tail) t else 0f), size.height) else Rect(if (tail) t else 0f, 0f, size.width, size.height)
    addRoundRect(RoundRect(body, CornerRadius(r)))
    if (tail) {
        if (mine) { moveTo(body.right - r, 0f); lineTo(size.width, 0f); lineTo(body.right, t * 1.4f); close() }
        else { moveTo(body.left + r, 0f); lineTo(0f, 0f); lineTo(body.left, t * 1.4f); close() }
    }
}

private fun dayLabel(at: String): String = try {
    val d = java.time.LocalDateTime.parse(at.replace(' ', 'T')).toLocalDate()
    val today = java.time.LocalDate.now()
    when (d) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        else -> if (d.isAfter(today.minusDays(6))) d.format(java.time.format.DateTimeFormatter.ofPattern("EEEE")) else d.format(java.time.format.DateTimeFormatter.ofPattern("d MMMM yyyy"))
    }
} catch (_: Exception) { "" }

private fun clock(at: String): String = try {
    java.time.LocalDateTime.parse(at.replace(' ', 'T')).format(java.time.format.DateTimeFormatter.ofPattern("h:mm a")).lowercase()
} catch (_: Exception) { "" }

/** One row in the chat: a day divider or a message. */
private sealed interface ChatRow {
    data class Day(val label: String) : ChatRow
    data class Msg(val m: JSONObject, val firstOfRun: Boolean, val pending: Boolean = false) : ChatRow
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TripChatScreen(nav: NavHostController, id: Int) {
    val scope = rememberCoroutineScope()
    var g by remember { mutableStateOf<JSONObject?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    var text by remember { mutableStateOf("") }
    val pending = remember { mutableStateListOf<String>() }
    var deleting by remember { mutableStateOf<JSONObject?>(null) }
    // load, then keep it fresh while the chat is open
    LaunchedEffect(id) {
        while (true) {
            try { g = Api.get("trip-groups/$id"); err = null } catch (e: Exception) { if (g == null) err = errorText(e) }
            kotlinx.coroutines.delay(5000)
        }
    }
    fun send() {
        val msg = text.trim(); if (msg.isEmpty()) return
        text = ""; pending.add(msg)
        scope.launch {
            try { g = Api.post("trip-groups/$id/items", mapOf("kind" to "message", "body" to msg)) } catch (e: Exception) { err = errorText(e); text = msg }
            pending.remove(msg)
        }
    }
    val gg = g
    Column(Modifier.fillMaxSize().background(Wallpaper).imePadding()) {
        // header: red like every screen, with the trip photo, name and who is in it
        Row(Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(Brand.Matte, Color(0xFFD7192A), Color(0xFFE8452F)))).padding(horizontal = 4.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
            Box(Modifier.size(42.dp).clip(CircleShape)) { TripCover(gg?.str("cover"), (gg?.text("title") ?: "") + " " + (gg?.text("destination") ?: ""), Modifier.fillMaxSize(), iconSize = 26) }
            Column(Modifier.padding(start = 10.dp).weight(1f)) {
                Text(gg?.text("title") ?: "Trip chat", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val names = gg?.objs("members")?.sortedBy { it.bool("you") }?.map { if (it.bool("you")) "You" else it.text("name").substringBefore(' ') } ?: emptyList()
                Text(names.joinToString(", ").ifBlank { "Everyone in the trip" }, color = Color(0xD9FFFFFF), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Box(Modifier.weight(1f).fillMaxWidth().doodles()) {
            when {
                gg == null && err == null -> Loading()
                gg == null -> ErrorBox(err ?: "Could not open the chat.", {})
                else -> {
                    val msgs = gg.objs("messages")
                    val colorOf = remember(gg) { gg.objs("members").filter { !it.bool("you") }.mapIndexed { i, m -> m.int("id") to NameColors[i % NameColors.size] }.toMap() }
                    val rows = buildList<ChatRow> {
                        var lastDay = ""; var lastUid = -1
                        msgs.forEach { m ->
                            val day = dayLabel(m.text("at"))
                            if (day != lastDay) { add(ChatRow.Day(day)); lastDay = day; lastUid = -1 }
                            add(ChatRow.Msg(m, m.int("uid") != lastUid)); lastUid = m.int("uid")
                        }
                        pending.forEach { p -> add(ChatRow.Msg(JSONObject().put("body", p).put("mine", true).put("at", ""), lastUid != -2, pending = true)); lastUid = -2 }
                    }
                    val list = rememberLazyListState()
                    LaunchedEffect(rows.size) { if (rows.isNotEmpty()) list.animateScrollToItem(rows.size - 1) }
                    LazyColumn(Modifier.fillMaxSize(), state = list, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 10.dp)) {
                        item {
                            Text("Messages here are seen only by the people in this trip.", style = MaterialTheme.typography.labelSmall, color = Color(0xFF54656F),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 30.dp, vertical = 6.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFFFF3C4)).padding(10.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                        if (msgs.isEmpty() && pending.isEmpty()) item {
                            Text("Say hello 👋 — plan who brings what, where to meet and when to leave.", style = MaterialTheme.typography.bodyMedium, color = TimeGrey,
                                modifier = Modifier.fillMaxWidth().padding(24.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                        items(rows) { row ->
                            when (row) {
                                is ChatRow.Day -> Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                                    Text(row.label, style = MaterialTheme.typography.labelMedium, color = Color(0xFF54656F),
                                        modifier = Modifier.shadow(1.dp, RoundedCornerShape(8.dp)).clip(RoundedCornerShape(8.dp)).background(Color.White).padding(horizontal = 12.dp, vertical = 5.dp))
                                }
                                is ChatRow.Msg -> {
                                    val m = row.m; val mine = m.bool("mine")
                                    Row(Modifier.fillMaxWidth().padding(top = if (row.firstOfRun) 6.dp else 2.dp), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                                        val shape = bubbleShape(mine, row.firstOfRun)
                                        Column(Modifier.widthIn(min = 90.dp, max = 300.dp).shadow(0.6.dp, shape).clip(shape).background(if (mine) Mine else Color.White)
                                            .combinedClickable(onClick = {}, onLongClick = { if (mine && !row.pending && m.bool("can_delete")) deleting = m })
                                            .padding(start = if (!mine && row.firstOfRun) 18.dp else 10.dp, end = if (mine && row.firstOfRun) 18.dp else 10.dp, top = 6.dp, bottom = 5.dp)) {
                                            if (!mine && row.firstOfRun) Text(m.text("by"), color = colorOf[m.int("uid")] ?: NameColors[0], style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                                            Text(m.text("body"), color = Color(0xFF111B21), style = MaterialTheme.typography.bodyLarge.copy(fontSize = 15.5.sp, lineHeight = 21.sp))
                                            Row(Modifier.align(Alignment.End), verticalAlignment = Alignment.CenterVertically) {
                                                Text(if (row.pending) "" else clock(m.text("at")), color = TimeGrey, fontSize = 11.sp)
                                                if (mine) Icon(if (row.pending) Icons.Outlined.AccessTime else Icons.Filled.Done, if (row.pending) "Sending" else "Sent",
                                                    tint = TimeGrey, modifier = Modifier.padding(start = 3.dp).size(14.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // the message box and the round send button
        Row(Modifier.fillMaxWidth().padding(6.dp), verticalAlignment = Alignment.Bottom) {
            Box(Modifier.weight(1f).shadow(1.dp, RoundedCornerShape(26.dp)).clip(RoundedCornerShape(26.dp)).background(Color.White).padding(horizontal = 18.dp, vertical = 13.dp)) {
                if (text.isEmpty()) Text("Message", color = TimeGrey, style = MaterialTheme.typography.bodyLarge)
                BasicTextField(text, { text = it.take(2000) }, Modifier.fillMaxWidth(), textStyle = TextStyle(fontSize = 16.sp, color = Color(0xFF111B21)), maxLines = 5, cursorBrush = SolidColor(WaGreen))
            }
            Box(Modifier.padding(start = 6.dp).size(50.dp).clip(CircleShape).background(if (text.isBlank()) Color(0xFF8FCFBF) else WaGreen)
                .combinedClickable(enabled = text.isNotBlank(), onClick = { send() }), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = Color.White, modifier = Modifier.padding(start = 3.dp).size(22.dp))
            }
        }
    }
    deleting?.let { m ->
        AlertDialog(onDismissRequest = { deleting = null }, title = { Text("Delete message?") }, text = { Text("It is removed for everyone in the trip.") },
            confirmButton = { TextButton(onClick = { deleting = null; scope.launch { try { g = Api.post("trip-groups/$id/items/${m.int("id")}/delete") } catch (e: Exception) { err = errorText(e) } } }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } })
    }
}

/** WhatsApp-style doodle wallpaper: faint travel icons in a loose grid. */
@Composable
private fun Modifier.doodles(): Modifier {
    val icons = listOf(Icons.Outlined.Flight, Icons.Outlined.Place, Icons.Outlined.Luggage, Icons.Outlined.BeachAccess, Icons.Outlined.CameraAlt, Icons.Outlined.Hotel).map { rememberVectorPainter(it) }
    val tint = ColorFilter.tint(Color(0x14000000))
    return this.drawBehind {
        val step = 62.dp.toPx(); val s = 22.dp.toPx()
        var row = 0; var y = 0f
        while (y < size.height + step) {
            var x = if (row % 2 == 0) 0f else step / 2; var col = 0
            while (x < size.width + step) {
                val p = icons[(row * 3 + col) % icons.size]
                translate(x, y) { with(p) { draw(Size(s, s), colorFilter = tint) } }
                x += step; col++
            }
            y += step; row++
        }
    }
}

