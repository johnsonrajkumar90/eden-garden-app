package com.triparro.app.screens

import android.content.Context
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.triparro.app.ui.Brand
import com.triparro.app.ui.PrimaryButton
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * "You got ₹200!" — shown once when a sign-up / booking / admin reward lands in the wallet:
 * a coin drops in, the amount counts up and confetti falls. The same reward is never shown twice.
 */
@Composable
fun RewardPopup(context: Context, reward: JSONObject?, openWallet: () -> Unit) {
    val prefs = remember { context.getSharedPreferences("triparro", Context.MODE_PRIVATE) }
    val id = reward?.optInt("id") ?: 0
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(id) {
        if (id <= 0 || prefs.getBoolean("reward_seen_$id", false)) return@LaunchedEffect
        prefs.edit().putBoolean("reward_seen_$id", true).apply()
        visible = true
    }
    if (!visible || reward == null) return
    val amount = reward.optDouble("amount", 0.0)
    val coin = remember { Animatable(0f) }
    val count = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        launch { coin.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)) }
        count.animateTo(amount.toFloat(), tween(1200, delayMillis = 350, easing = FastOutSlowInEasing))
    }
    val fall = rememberInfiniteTransition(label = "confetti").animateFloat(0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart), label = "fall")
    val bits = remember { List(36) { Triple(Random.nextFloat(), Random.nextFloat(), Random.nextInt(4)) } }
    val colors = listOf(Brand.Sun, Brand.Blue, Brand.Coral, Brand.Teal)
    Dialog(onDismissRequest = { visible = false }) {
        Box(Modifier.fillMaxWidth().shadow(18.dp, RoundedCornerShape(28.dp)).clip(RoundedCornerShape(28.dp)).background(Color.White)) {
            Canvas(Modifier.matchParentSize()) {
                bits.forEach { (x, start, c) ->
                    val y = ((start + fall.value) % 1f) * size.height
                    rotate(degrees = (start * 360f + fall.value * 540f), pivot = Offset(x * size.width, y)) {
                        drawRect(colors[c].copy(alpha = 0.85f), topLeft = Offset(x * size.width, y), size = Size(10f, 18f))
                    }
                }
            }
            Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.padding(top = 4.dp).size(112.dp).scale(coin.value).clip(CircleShape)
                    .background(Brush.radialGradient(listOf(Color(0xFFFFE27A), Brand.Sun, Brand.SunDark))), contentAlignment = Alignment.Center) {
                    Text("₹", fontSize = 56.sp, fontWeight = FontWeight.ExtraBold, color = Brand.SunInk)
                }
                Text("You got ₹${count.value.roundToInt()}!", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold), color = Brand.Ink,
                    modifier = Modifier.padding(top = 16.dp), textAlign = TextAlign.Center)
                Text(reward.optString("title").ifBlank { "Added to your TripArro wallet" }, style = MaterialTheme.typography.titleMedium, color = Brand.Blue, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
                Text(reward.optString("text").ifBlank { "Use it on your next stay — it is taken off the price when you book." }, style = MaterialTheme.typography.bodyMedium, color = Brand.Muted,
                    textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
                Box(Modifier.height(18.dp))
                PrimaryButton("See my wallet", { visible = false; openWallet() }, Modifier.fillMaxWidth(), coral = true)
                TextButton(onClick = { visible = false }) { Text("Later", color = Brand.InkSoft) }
            }
        }
    }
}
