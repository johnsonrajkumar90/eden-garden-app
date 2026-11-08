package com.triparro.app.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.triparro.app.R
import com.triparro.app.core.str
import com.triparro.app.core.objs
import com.triparro.app.core.text
import kotlinx.coroutines.delay
import org.json.JSONObject

private data class Slide(val title: String, val sub: String)

private val slides = listOf(
    Slide("Stays you'll love,\nchecked in person", "Homestays, villas and resorts — every one visited by our local team."),
    Slide("Plan your trip\nwith TripArro AI", "Ask in your own words. It finds stays, checks live dates and books when you say yes."),
    Slide("Travel together\nwith family & friends", "Make a group trip, share bookings and pick places on the map together."),
)

/**
 * The first screen when the app opens and nobody is signed in: a full-screen picture, three real stays,
 * a few words about TripArro, and Continue with Google / email — or look around first.
 */
@Composable
fun WelcomeScreen(welcome: JSONObject?, onEmail: () -> Unit, onExplore: () -> Unit, onPage: (String) -> Unit) {
    val ctx = LocalContext.current
    var page by remember { mutableIntStateOf(0) }
    var err by remember { mutableStateOf<String?>(null) }
    var progressValue by remember { mutableStateOf(0f) }
    LaunchedEffect(page) {   // each slide shows for 4.5 seconds, then the next one (timed by the clock, so it also works with animations switched off)
        val start = System.currentTimeMillis()
        while (true) {
            progressValue = ((System.currentTimeMillis() - start) / 4500f).coerceIn(0f, 1f)
            if (progressValue >= 1f) break
            delay(40)
        }
        page = (page + 1) % slides.size
    }
    val zoom by rememberInfiniteTransition(label = "bg").animateFloat(1f, 1.08f, infiniteRepeatable(tween(16000, easing = LinearEasing), RepeatMode.Reverse), label = "zoom")
    Dialog(onDismissRequest = onExplore, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xFF8FD3F4))) {
            // the picture: the admin's own photo, otherwise a drawn hill-country landscape
            val bg = welcome?.str("background")
            if (bg != null) AsyncImage(model = bg, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().scale(zoom))
            else HillCountry(Modifier.fillMaxSize().scale(zoom))
            // soft light at the top for the words, dark at the bottom for the buttons
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0xCCBFE6FA), 0.42f to Color(0x00FFFFFF), 0.62f to Color(0x00000000), 1f to Color(0xD9081A24))))

            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.statusBars).windowInsetsPadding(WindowInsets.navigationBars).padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally) {
                // slide progress
                Row(Modifier.padding(top = 14.dp).width(220.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    slides.indices.forEach { i ->
                        Box(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color(0x40102030)).clickable { page = i }) {
                            val f = if (i < page) 1f else if (i == page) progressValue else 0f
                            Box(Modifier.fillMaxWidth(f).height(4.dp).background(Color(0xFF14232E)))
                        }
                    }
                }
                Spacer(Modifier.height(30.dp))
                CardFan(welcome?.objs("cards") ?: emptyList())
                Spacer(Modifier.height(26.dp))
                AnimatedContent(page, transitionSpec = { fadeIn(tween(450)) togetherWith fadeOut(tween(300)) }, label = "slide") { p ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(slides[p].title, fontSize = 32.sp, lineHeight = 37.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF14232E), textAlign = TextAlign.Center)
                        Text(slides[p].sub, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF2B3D48), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 10.dp))
                    }
                }
                Spacer(Modifier.weight(1f))
                Image(painterResource(R.drawable.logo_white), "TripArro", Modifier.height(40.dp))
                Spacer(Modifier.height(22.dp))
                GoogleButton("Continue with Google") { err = startGoogleSignIn(ctx) }
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth().height(56.dp).clip(RoundedCornerShape(28.dp)).background(Color(0xFFD7192A)).clickable(onClick = onEmail),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                    Icon(Icons.Outlined.Mail, null, tint = Color.White)
                    Text("  Continue with email", style = MaterialTheme.typography.titleMedium, color = Color.White)
                }
                err?.let { Text(it, color = Color(0xFFFFD6D6), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
                Text("Look around first", color = Color.White, style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 14.dp).clip(RoundedCornerShape(12.dp)).clickable(onClick = onExplore).padding(horizontal = 16.dp, vertical = 8.dp))
                Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Lock, null, tint = Color(0xCCFFFFFF), modifier = Modifier.size(14.dp))
                    Text(" We never share your details", color = Color(0xCCFFFFFF), style = MaterialTheme.typography.labelMedium)
                }
                Row(Modifier.padding(top = 4.dp, bottom = 16.dp)) {
                    Text("Cancellation policy", color = Color(0xCCFFFFFF), style = MaterialTheme.typography.labelMedium, textDecoration = TextDecoration.Underline, modifier = Modifier.clickable { onPage("cancellation") })
                    Text(" & ", color = Color(0xCCFFFFFF), style = MaterialTheme.typography.labelMedium)
                    Text("Privacy policy", color = Color(0xCCFFFFFF), style = MaterialTheme.typography.labelMedium, textDecoration = TextDecoration.Underline, modifier = Modifier.clickable { onPage("privacy") })
                }
            }
        }
    }
}

/** Three real stays as tilted photo cards, each with its place name. */
@Composable
private fun CardFan(cards: List<JSONObject>) {
    if (cards.isEmpty()) { Spacer(Modifier.height(150.dp)); return }
    val angles = listOf(-10f, 0f, 10f)
    val shifts = listOf(-96, 0, 96)
    Box(Modifier.fillMaxWidth().height(170.dp), contentAlignment = Alignment.Center) {
        listOf(0, 2, 1).filter { it < cards.size }.forEach { i ->
            val c = cards[i]
            Box(Modifier.offset(x = shifts[i].dp, y = if (i == 1) (-6).dp else 8.dp).rotate(angles[i])
                .shadow(14.dp, RoundedCornerShape(22.dp)).clip(RoundedCornerShape(22.dp)).background(Color.White).padding(5.dp)) {
                AsyncImage(model = c.text("image"), contentDescription = c.text("label"), contentScale = ContentScale.Crop,
                    modifier = Modifier.width(112.dp).height(146.dp).clip(RoundedCornerShape(18.dp)).background(Color(0xFFDDEFF7)))
                if (c.text("label").isNotBlank()) Text(c.text("label"), style = MaterialTheme.typography.labelMedium, color = Color(0xFF14232E), maxLines = 1,
                    modifier = Modifier.align(Alignment.BottomStart).padding(7.dp).clip(RoundedCornerShape(50)).background(Color(0xF2FFFFFF))
                        .border(1.dp, Color(0x14000000), RoundedCornerShape(50)).padding(horizontal = 9.dp, vertical = 3.dp))
            }
        }
    }
}

/** A drawn hill-country view (sky, misty blue hills, tea-green slopes, a lake) — used until the admin sets a photo. */
@Composable
private fun HillCountry(modifier: Modifier) {
    Canvas(modifier) {
        val w = size.width; val h = size.height
        drawRect(Brush.verticalGradient(listOf(Color(0xFF7CC8F0), Color(0xFFBFE6FA), Color(0xFFF3E9D2)), endY = h * 0.62f))
        drawCircle(Color(0x66FFF6D8), radius = w * 0.22f, center = Offset(w * 0.78f, h * 0.30f))
        drawCircle(Color(0xFFFFF3C8), radius = w * 0.09f, center = Offset(w * 0.78f, h * 0.30f))
        fun ridge(base: Float, amp: Float, color: Color, seed: Float) {
            val p = Path(); p.moveTo(0f, h)
            p.lineTo(0f, h * base)
            var x = 0f
            while (x <= w + 20f) {
                val y = h * base - amp * h * (0.55f + 0.45f * kotlin.math.sin(x / w * 6.3f + seed) * kotlin.math.cos(x / w * 2.1f + seed * 1.7f))
                p.lineTo(x, y); x += w / 40f
            }
            p.lineTo(w, h); p.close(); drawPath(p, color)
        }
        ridge(0.56f, 0.10f, Color(0xFF9DBFD6), 0.6f)
        ridge(0.62f, 0.09f, Color(0xFF6E9FB8), 2.1f)
        drawRect(Brush.verticalGradient(listOf(Color(0x00FFFFFF), Color(0x55FFFFFF), Color(0x00FFFFFF)), startY = h * 0.52f, endY = h * 0.66f))
        ridge(0.70f, 0.08f, Color(0xFF3F8F5F), 4.0f)
        ridge(0.76f, 0.06f, Color(0xFF2F7A4C), 5.3f)
        // tea rows on the near slope
        for (i in 0 until 9) {
            val y = h * (0.74f + i * 0.012f)
            drawLine(Color(0x2AFFFFFF), Offset(w * (0.05f + i * 0.02f), y), Offset(w * (0.55f - i * 0.015f), y + h * 0.01f), strokeWidth = 3f)
        }
        // the lake
        drawRect(Brush.verticalGradient(listOf(Color(0xFF3FA7B5), Color(0xFF1C6F80), Color(0xFF0E3F4C)), startY = h * 0.80f, endY = h), topLeft = Offset(0f, h * 0.80f))
        for (i in 0 until 7) {
            val y = h * (0.83f + i * 0.022f)
            drawLine(Color(0x33FFFFFF), Offset(w * (0.2f + (i % 3) * 0.12f), y), Offset(w * (0.42f + (i % 3) * 0.12f), y), strokeWidth = 2.5f)
        }
        // trees at the edges
        fun pine(cx: Float, base: Float, s: Float) {
            val p = Path(); p.moveTo(cx, base - s * 2.6f); p.lineTo(cx - s * 0.75f, base); p.lineTo(cx + s * 0.75f, base); p.close()
            drawPath(p, Color(0xFF1D5A3A))
        }
        listOf(0.04f to 46f, 0.11f to 34f, 0.17f to 40f, 0.86f to 44f, 0.93f to 52f).forEach { (x, s) -> pine(w * x, h * 0.80f, s) }
    }
}
