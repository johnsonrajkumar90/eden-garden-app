package com.triparro.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeEffect

/*
 * Glass look: the whole app sits on a soft, slowly moving colour backdrop; cards, bars and sheets are frosted glass
 * over it — the backdrop is blurred behind them (Android 12+; older phones get a clear frosted tint instead).
 */

/** The backdrop every glass surface blurs (set once at the top of the app). */
val LocalHaze = staticCompositionLocalOf<HazeState?> { null }

/** Page background: almost clear, so the colour backdrop shows through the glass. */
val PageGlass = Color(0x26FFFFFF)

private fun glassStyle(tint: Color, blur: Dp) = HazeStyle(
    backgroundColor = Brand.Page,
    tints = listOf(HazeTint(tint)),
    blurRadius = blur,
    noiseFactor = 0.06f,
    fallbackTint = HazeTint(tint.copy(alpha = (tint.alpha + 0.25f).coerceAtMost(0.94f))),
)

/**
 * A frosted-glass surface: blurred backdrop, a milky white tint, a bright rim on top and a soft edge.
 * [strength] 0 = clearest, 1 = most milky (for text-heavy cards).
 */
fun Modifier.glass(shape: Shape, strength: Float = 0.6f, blur: Dp = 22.dp): Modifier = composed {
    val haze = LocalHaze.current
    val tint = Color.White.copy(alpha = 0.42f + 0.38f * strength.coerceIn(0f, 1f))
    this.clip(shape)
        .let { if (haze != null) it.hazeEffect(haze, glassStyle(tint, blur)) else it.background(tint) }
        .background(Brush.verticalGradient(listOf(Color(0x40FFFFFF), Color(0x08FFFFFF))))
        .border(1.dp, Brush.verticalGradient(listOf(Color(0xCCFFFFFF), Color(0x33FFFFFF))), shape)
}

/** The colour backdrop: warm cream with soft red, sun-yellow and sky blobs drifting slowly. */
@Composable
fun GlassBackdrop(modifier: Modifier) {
    val t = rememberInfiniteTransition(label = "backdrop")
    val a by t.animateFloat(0f, 1f, infiniteRepeatable(tween(18000, easing = LinearEasing), RepeatMode.Reverse), label = "a")
    val b by t.animateFloat(0f, 1f, infiniteRepeatable(tween(24000, easing = LinearEasing), RepeatMode.Reverse), label = "b")
    Canvas(modifier) {
        val w = size.width; val h = size.height
        drawRect(Brush.verticalGradient(listOf(Color(0xFFFFF4EE), Color(0xFFFDF1E4), Color(0xFFF2F4FA))))
        fun blob(cx: Float, cy: Float, r: Float, c: Color) = drawCircle(Brush.radialGradient(listOf(c, c.copy(alpha = 0f)), center = Offset(cx, cy), radius = r), radius = r, center = Offset(cx, cy))
        blob(w * (0.15f + 0.25f * a), h * (0.12f + 0.08f * b), w * 0.75f, Color(0x66FF6A5C))
        blob(w * (0.95f - 0.3f * b), h * (0.30f + 0.10f * a), w * 0.70f, Color(0x55FFC72C))
        blob(w * (0.25f + 0.2f * b), h * (0.62f - 0.08f * a), w * 0.80f, Color(0x4D7CC8F0))
        blob(w * (0.85f - 0.2f * a), h * (0.88f - 0.05f * b), w * 0.70f, Color(0x4DD7192A))
    }
}
