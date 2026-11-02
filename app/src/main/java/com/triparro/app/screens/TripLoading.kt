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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.outlined.EvStation
import androidx.compose.material.icons.outlined.LocalCafe
import androidx.compose.material.icons.outlined.LocalGasStation
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.triparro.app.R
import com.triparro.app.ui.Brand
import kotlinx.coroutines.delay

private val Steps = listOf(
    Icons.Outlined.Restaurant to "Finding restaurants on your way…",
    Icons.Outlined.LocalCafe to "Looking for coffee shops…",
    Icons.Outlined.LocalGasStation to "Checking petrol pumps…",
    Icons.Outlined.EvStation to "Checking EV chargers…",
)

/**
 * The Travel planner's loading screen in TripArro colours: the logo, a road from where you start to where you are going
 * with the car driving along it, and what is being looked up right now.
 */
@Composable
fun TripLoading(from: String?, to: String?, modifier: Modifier = Modifier, title: String = "Planning your trip") {
    val t = rememberInfiniteTransition(label = "trip")
    val drive by t.animateFloat(0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart), label = "drive")
    val dash by t.animateFloat(0f, 40f, infiniteRepeatable(tween(700, easing = LinearEasing)), label = "dash")
    val bounce by t.animateFloat(0f, -6f, infiniteRepeatable(tween(420), RepeatMode.Reverse), label = "bounce")
    val pulse by t.animateFloat(0.85f, 1.15f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse")
    var step by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { while (true) { delay(1500); step = (step + 1) % Steps.size } }

    Box(modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF8E0F1D), Color(0xFFD7192A), Color(0xFFFF6A3D)))), contentAlignment = Alignment.Center) {
        Column(Modifier.fillMaxWidth().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.logo_white), contentDescription = "TripArro", modifier = Modifier.height(40.dp).graphicsLayer { scaleX = pulse * 0.1f + 0.9f; scaleY = pulse * 0.1f + 0.9f })
            Text(title, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 22.dp))
            // the road, the pins and the car
            BoxWithConstraints(Modifier.fillMaxWidth().padding(top = 26.dp).height(86.dp)) {
                val w = maxWidth
                Canvas(Modifier.fillMaxSize()) {
                    val y = size.height * 0.62f
                    drawLine(Color(0x55FFFFFF), Offset(18f, y), Offset(size.width - 18f, y), strokeWidth = 16.dp.toPx(), cap = StrokeCap.Round)
                    drawLine(Color.White, Offset(30f, y), Offset(size.width - 30f, y), strokeWidth = 2.5.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(20f, 20f), -dash))
                }
                Icon(Icons.Filled.Place, null, tint = Brand.Sun, modifier = Modifier.size(28.dp).align(Alignment.TopStart).offset(y = 8.dp))
                Icon(Icons.Filled.Place, null, tint = Color.White, modifier = Modifier.size(32.dp).align(Alignment.TopEnd).offset(y = 4.dp).graphicsLayer { scaleX = pulse; scaleY = pulse })
                Box(Modifier.offset(x = (w - 44.dp) * drive, y = 30.dp + bounce.dp).size(44.dp).clip(CircleShape).background(Brand.Sun), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.DirectionsCar, null, tint = Brand.SunInk, modifier = Modifier.size(26.dp))
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(from ?: "You", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                Text(to ?: "", color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.End, modifier = Modifier.weight(1f))
            }
            AnimatedContent(step, transitionSpec = { fadeIn(tween(300)) togetherWith fadeOut(tween(300)) }, label = "step", modifier = Modifier.padding(top = 26.dp)) { i ->
                val (ic, txt) = Steps[i]
                Row(Modifier.clip(CircleShape).background(Color(0x33FFFFFF)).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic, null, tint = Brand.Sun, modifier = Modifier.size(20.dp))
                    Text("  $txt", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
            Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Steps.indices.forEach { i -> Box(Modifier.size(if (i == step) 18.dp else 7.dp, 7.dp).clip(CircleShape).background(if (i == step) Brand.Sun else Color(0x66FFFFFF))) }
            }
            Text("TripArro AI is reading the real places along your route — this takes a few seconds.", color = Color(0xFFFFE3DE), style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center, modifier = Modifier.padding(top = 22.dp))
        }
    }
}

/** A smaller version for screens that load a saved trip. */
@Composable
fun TripLoadingSmall(text: String = "Loading your trip…") {
    TripLoading(null, null, title = text)
}

