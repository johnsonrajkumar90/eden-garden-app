package com.triparro.app.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.TravelExplore
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.ui.platform.LocalContext
import com.triparro.app.core.Api
import com.triparro.app.core.LocResult
import com.triparro.app.core.LocationHelper
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.openLink
import com.triparro.app.openPdf
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
    val ctx = LocalContext.current
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
                    // "near me": send the phone's position when location is already allowed (never asks on its own here)
                    val wantsNear = Regex("\\b(near|nearby|close to me|around me|my area|my location)\\b", RegexOption.IGNORE_CASE).containsMatchIn(question)
                    val fix = if (wantsNear && LocationHelper.hasPermission(ctx)) (LocationHelper.lastFix ?: LocationHelper.current(ctx, 8_000) as? LocResult.Found) else null
                    val r = Api.post("pets/ai", mapOf("message" to question, "history" to history) + (fix?.let { mapOf("lat" to it.lat, "lng" to it.lng) } ?: emptyMap()))
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
        Column(Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Brand.Navy, Color(0xFF243C9A), Color(0xFF4B3FB0)))).padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.AutoAwesome, null, tint = Color.White) }
                Column(Modifier.padding(start = 10.dp)) {
                    Text("TripArro AI", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                    Text(if (mode == "pets") "Verified pet hosts only · not veterinary advice" else "Real listings at live prices", style = MaterialTheme.typography.bodySmall, color = Color(0xFFC9D8F2))
                }
            }
            Gap(12)
            Row(Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.14f)).padding(4.dp)) {
                listOf("travel" to "Stays & trips", "pets" to "Pet boarding").forEach { (k, l) ->
                    val on = mode == k
                    Text(l, style = MaterialTheme.typography.labelLarge, color = if (on) Brand.Blue else Color.White,
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(50)).background(if (on) Color.White else Color.Transparent).clickable { mode = k }.padding(vertical = 9.dp),
                        textAlign = TextAlign.Center)
                }
            }
        }
        LazyColumn(Modifier.weight(1f), state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (msgs.isEmpty()) item {
                val ideas = if (mode == "pets") listOf("Find dog boarding in Coimbatore", "Cat-friendly boarding with pickup", "Boarding for my Labrador under ₹800", "What should I pack for my dog?")
                            else listOf("A cottage in Ooty for 6 people this weekend", "How many guests can stay, and what do extra guests cost?", "Resorts in Munnar under ₹6,000", "Plan 3 days in Kodaikanal")
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(if (mode == "pets") "Ask about pet boarding" else "How can I help with your trip?", style = MaterialTheme.typography.titleLarge)
                    Text(if (mode == "pets") "Tell me the city, dates and your pet — I'll find verified hosts." else "Ask in your own words — places, dates, guests, budget.", style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft)
                    Gap(4)
                    ideas.forEach { idea ->
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(16.dp)).clickable { send(idea) }.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Icon(if (mode == "pets") Icons.Outlined.Pets else Icons.Outlined.TravelExplore, null, tint = Brand.Blue, modifier = Modifier.size(20.dp))
                            Text(idea, style = MaterialTheme.typography.bodyMedium, color = Brand.Ink, modifier = Modifier.weight(1f).padding(horizontal = 12.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Brand.Muted, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
            items(msgs) { m ->
                Column(Modifier.fillMaxWidth(), horizontalAlignment = if (m.user) Alignment.End else Alignment.Start) {
                    val shape = if (m.user) RoundedCornerShape(20.dp, 20.dp, 6.dp, 20.dp) else RoundedCornerShape(20.dp, 20.dp, 20.dp, 6.dp)
                    Text(m.text, color = if (m.user) Color.White else Brand.Ink, style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.widthIn(max = 320.dp).shadow(if (m.user) 0.dp else 1.dp, shape).background(if (m.user) Brand.Blue else Color.White, shape).padding(horizontal = 14.dp, vertical = 11.dp))
                    m.stays.take(5).forEach { s -> Column(Modifier.padding(top = 8.dp)) { PropertyCard(s) { nav.navigate("property/${s.text("kind", "stay")}/${s.int("id")}") } } }
                    m.pets.take(5).forEach { c -> Column(Modifier.padding(top = 8.dp)) { PetHostCard(c, compact = true) { nav.navigate("petlisting/${c.int("id")}") } } }
                    m.actions.forEach { a ->
                        val url = a.str("url")
                        if (url != null) OutlinedButton(onClick = { nav.openLink(url) }, modifier = Modifier.padding(top = 6.dp)) { Text(a.text("label", "Open")) }
                    }
                }
            }
            if (busy) item {
                Row(Modifier.clip(RoundedCornerShape(20.dp)).background(Color.White).padding(horizontal = 14.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp, color = Brand.Blue)
                    Text("  Thinking…", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        HorizontalDivider(color = Brand.Line, thickness = 0.5.dp)
        Row(Modifier.background(Color.White).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = text, onValueChange = { text = it }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), maxLines = 4,
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Brand.Line, focusedBorderColor = Brand.Blue, unfocusedContainerColor = Brand.Page, focusedContainerColor = Color.White),
                placeholder = { Text(if (mode == "pets") "e.g. Boarding for 2 cats in Ooty" else "Ask TripArro AI…") })
            FilledIconButton(onClick = { send(text) }, enabled = text.isNotBlank() && !busy, modifier = Modifier.padding(start = 8.dp).size(48.dp), colors = IconButtonDefaults.filledIconButtonColors(containerColor = Brand.CoralDark)) { Icon(Icons.AutoMirrored.Filled.Send, "Send") }
        }
    }
}
