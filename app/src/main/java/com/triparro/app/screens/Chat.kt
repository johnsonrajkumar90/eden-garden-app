package com.triparro.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.int
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.ColorHeader
import com.triparro.app.ui.Notice
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

/** "Ask a question" on a stay or resort: chat with TripArro AI about the listing, or with the host — in the app. */
@Composable
fun ChatScreen(nav: NavHostController, kind: String, id: Int) {
    val scope = rememberCoroutineScope()
    var token by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<JSONObject?>(null) }
    val msgs = remember { mutableStateListOf<JSONObject>() }
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val list = rememberLazyListState()
    fun take(j: JSONObject) {
        info = j; token = j.text("token")
        val have = msgs.map { it.int("id") }.toSet()
        j.objs("messages").filter { it.int("id") !in have }.forEach { msgs.add(it) }
    }
    LaunchedEffect(kind, id) {
        try { take(Api.post("chat/start", mapOf("kind" to kind, "id" to id))) } catch (e: Exception) { err = errorText(e) }
        // new answers from the host arrive while the chat is open
        while (true) {
            delay(6000)
            val t = token ?: continue
            try { take(Api.get("chat/$t", mapOf("after" to (msgs.maxOfOrNull { it.int("id") } ?: 0)))) } catch (_: Exception) { }
        }
    }
    LaunchedEffect(msgs.size) { if (msgs.isNotEmpty()) list.animateScrollToItem(msgs.size - 1) }
    fun send() {
        val t = token ?: return; val body = text.trim(); if (body.isEmpty()) return
        busy = true; text = ""; err = null
        scope.launch {
            try { take(Api.post("chat/$t/message", mapOf("body" to body))) } catch (e: Exception) { err = errorText(e); text = body }
            busy = false
        }
    }
    val i = info
    Column(Modifier.fillMaxSize().background(Brand.Page).imePadding()) {
        ColorHeader(i?.obj("listing")?.text("title") ?: "Ask a question",
            if (i?.text("mode") == "ai") "TripArro AI answers now · the host can join any time" else "Chat with ${i?.text("host_name") ?: "the host"}", onBack = { nav.popBackStack() })
        err?.let { Notice(it, "bad", Modifier.padding(12.dp)) }
        LazyColumn(Modifier.weight(1f), state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(msgs, key = { it.int("id") }) { m ->
                val from = m.text("from")
                val mine = from == "guest"
                if (from == "system") Text(m.text("body"), style = MaterialTheme.typography.bodySmall, color = Brand.Muted, modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                else Column(Modifier.fillMaxWidth(), horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
                    if (!mine) Text(if (from == "ai") "TripArro AI" else (i?.text("host_name") ?: "Host"), style = MaterialTheme.typography.labelMedium, color = Brand.Muted, modifier = Modifier.padding(start = 6.dp, bottom = 2.dp))
                    val shape = if (mine) RoundedCornerShape(20.dp, 20.dp, 6.dp, 20.dp) else RoundedCornerShape(20.dp, 20.dp, 20.dp, 6.dp)
                    Text(m.text("body"), color = if (mine) Color.White else Brand.Ink, style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.widthIn(max = 320.dp).shadow(if (mine) 0.dp else 1.dp, shape).background(if (mine) Brand.Blue else Color.White, shape).padding(horizontal = 14.dp, vertical = 10.dp))
                    m.obj("offer")?.let { o -> Notice("Offer: ${o.text("percent").removeSuffix(".0")}% off with code ${o.text("code")}", "ok", Modifier.widthIn(max = 320.dp).padding(top = 6.dp)) }
                }
            }
        }
        if (i != null && i.text("mode") == "ai") OutlinedButton(onClick = {
            val t = token ?: return@OutlinedButton
            scope.launch { try { take(Api.post("chat/$t/human", emptyMap())) } catch (e: Exception) { err = errorText(e) } }
        }, modifier = Modifier.padding(horizontal = 16.dp)) { Icon(Icons.Outlined.SupportAgent, null, Modifier.size(18.dp)); Text("  Talk to the host") }
        HorizontalDivider(color = Brand.Line, thickness = 0.5.dp)
        Row(Modifier.background(Color.White).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = text, onValueChange = { text = it }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), maxLines = 4,
                placeholder = { Text("Ask about dates, rooms, food…") },
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Brand.Line, focusedBorderColor = Brand.Blue, unfocusedContainerColor = Brand.Page, focusedContainerColor = Color.White))
            FilledIconButton(onClick = { send() }, enabled = text.isNotBlank() && !busy && token != null, modifier = Modifier.padding(start = 8.dp).size(48.dp),
                colors = IconButtonDefaults.filledIconButtonColors(containerColor = Brand.CoralDark)) { Icon(Icons.AutoMirrored.Filled.Send, "Send") }
        }
    }
}
