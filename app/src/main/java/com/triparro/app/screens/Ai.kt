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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.AssistChip
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.AppState
import com.triparro.app.core.Api
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.openWeb
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Segmented
import kotlinx.coroutines.launch
import org.json.JSONObject

private class Msg(val user: Boolean, val text: String, val stays: List<JSONObject> = emptyList(), val pets: List<JSONObject> = emptyList(), val actions: List<JSONObject> = emptyList())

/** TripArro AI: the travel companion (real stays at live prices, guest limits and extra-guest charges) and the pet boarding assistant. */
@Composable
fun AiScreen(nav: NavHostController) {
    var mode by AppState.aiMode
    val travel = remember { mutableStateListOf<Msg>() }
    val pets = remember { mutableStateListOf<Msg>() }
    val msgs = if (mode == "pets") pets else travel
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val list = rememberLazyListState()
    LaunchedEffect(msgs.size, mode) { if (msgs.isNotEmpty()) list.animateScrollToItem(msgs.size - 1) }

    fun send(q: String) {
        val question = q.trim()
        if (question.isEmpty() || busy) return
        val target = msgs
        val history = target.takeLast(10).map { mapOf("role" to (if (it.user) "user" else "assistant"), "content" to it.text) }
        target.add(Msg(true, question))
        text = ""; busy = true
        scope.launch {
            try {
                if (mode == "pets") {
                    val r = Api.post("pets/ai", mapOf("message" to question, "history" to history))
                    target.add(Msg(false, r.text("reply").replace(Regex("\\s*\\[pet:\\d+]"), ""), pets = r.objs("items")))
                } else {
                    val r = Api.post("ai/chat", mapOf("messages" to history + mapOf("role" to "user", "content" to question)))
                    target.add(Msg(false, r.text("reply"), stays = r.objs("listings"), actions = r.objs("actions")))
                }
            } catch (e: Exception) { target.add(Msg(false, errorText(e))) }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        Column(Modifier.background(Color.White).padding(16.dp)) {
            Text("TripArro AI", style = MaterialTheme.typography.headlineSmall)
            Text(if (mode == "pets") "Find verified pet hosts in plain words. Only real hosts and prices. Not veterinary advice."
                 else "Ask for stays and resorts, guest limits and extra-guest charges, or plan your trip. Only real listings at live prices.",
                style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            Gap(10)
            Segmented(listOf("travel" to "Stays & trips", "pets" to "Pet boarding"), mode) { mode = it }
        }
        LazyColumn(Modifier.weight(1f), state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (msgs.isEmpty()) item {
                val ideas = if (mode == "pets") listOf("Find dog boarding in Coimbatore", "Cat-friendly boarding with pickup", "Boarding for my Labrador under ₹800", "What should I pack for my dog?")
                            else listOf("A cottage in Ooty for 6 people this weekend", "How many guests can stay, and what do extra guests cost?", "Resorts in Munnar under ₹6,000", "Plan 3 days in Kodaikanal")
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Try asking", style = MaterialTheme.typography.titleSmall)
                    ideas.forEach { AssistChip(onClick = { send(it) }, label = { Text(it) }) }
                }
            }
            items(msgs) { m ->
                Column(Modifier.fillMaxWidth(), horizontalAlignment = if (m.user) Alignment.End else Alignment.Start) {
                    Text(m.text, color = if (m.user) Color.White else Brand.Ink,
                        modifier = Modifier.widthIn(max = 320.dp).background(if (m.user) Brand.Blue else Color.White, RoundedCornerShape(16.dp)).padding(12.dp))
                    m.stays.take(5).forEach { s -> Column(Modifier.padding(top = 8.dp)) { PropertyCard(s) { nav.navigate("property/${s.text("kind", "stay")}/${s.int("id")}") } } }
                    m.pets.take(5).forEach { c -> Column(Modifier.padding(top = 8.dp)) { PetHostCard(c, compact = true) { nav.navigate("petlisting/${c.int("id")}") } } }
                    m.actions.forEach { a ->
                        val url = a.str("url")
                        if (url != null) OutlinedButton(onClick = { nav.openWeb(url, a.text("label", "TripArro")) }, modifier = Modifier.padding(top = 6.dp)) { Text(a.text("label", "Open")) }
                    }
                }
            }
            if (busy) item { Text("Thinking…", color = Brand.Muted) }
        }
        Row(Modifier.background(Color.White).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = text, onValueChange = { text = it }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), maxLines = 4,
                placeholder = { Text(if (mode == "pets") "e.g. Boarding for 2 cats in Ooty" else "Ask TripArro AI…") })
            FilledIconButton(onClick = { send(text) }, enabled = text.isNotBlank() && !busy, modifier = Modifier.padding(start = 8.dp)) { Icon(Icons.AutoMirrored.Filled.Send, "Send") }
        }
    }
}
