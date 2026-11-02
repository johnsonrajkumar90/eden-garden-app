package com.triparro.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

/** The sunflower-yellow gradient of buttons (the brand's "do this" colour). */
val SunBrush = Brush.linearGradient(listOf(Color(0xFFFFD54A), Color(0xFFFFC22E), Color(0xFFFFA81F)))
/** The red header gradient (deep matte red to brand red to warm orange). */
val RedBrush = Brush.linearGradient(listOf(Color(0xFF6A1019), Color(0xFFB81D2B), Color(0xFFE0182D), Color(0xFFFF6A3D)), start = Offset.Zero, end = Offset(1400f, 700f))

/** Click with a soft, springy press (cards and buttons shrink a little while pressed). */
fun Modifier.pressable(onClick: () -> Unit, enabled: Boolean = true, scaleTo: Float = 0.965f): Modifier = composed {
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) scaleTo else 1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium), label = "press")
    this.graphicsLayer { scaleX = s; scaleY = s }.clickable(interactionSource = src, indication = androidx.compose.material3.ripple(), enabled = enabled, onClick = onClick)
}

/**
 * Appears with a short fade and rise the first time it is shown; [index] staggers items in a list
 * (only the first few wait, so long lists never feel slow).
 */
fun Modifier.appear(index: Int = 0): Modifier = composed {
    val a = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay((index.coerceAtMost(6) * 55).toLong())
        a.animateTo(1f, tween(420, easing = FastOutSlowInEasing))
    }
    this.graphicsLayer { alpha = a.value; translationY = (1f - a.value) * 36f }
}

/** A gentle, endless float (icons and badges that should catch the eye). */
fun Modifier.floaty(distance: Float = 6f, millis: Int = 1800): Modifier = composed {
    val t = rememberInfiniteTransition(label = "float")
    val y by t.animateFloat(-distance, distance, infiniteRepeatable(tween(millis, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "y")
    this.graphicsLayer { translationY = y }
}

/** A soft pulse (unread dots, "new" badges). */
fun Modifier.pulse(): Modifier = composed {
    val t = rememberInfiniteTransition(label = "pulse")
    val s by t.animateFloat(1f, 1.18f, infiniteRepeatable(tween(700, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "s")
    this.graphicsLayer { scaleX = s; scaleY = s }
}

/** Moving light over a placeholder while content loads. */
fun Modifier.shimmer(): Modifier = composed {
    val t = rememberInfiniteTransition(label = "shimmer")
    val x by t.animateFloat(-600f, 1400f, infiniteRepeatable(tween(1300, easing = LinearEasing)), label = "x")
    this.background(Brush.linearGradient(listOf(Color(0xFFF2ECE7), Color(0xFFFFFAF6), Color(0xFFF2ECE7)), start = Offset(x, 0f), end = Offset(x + 500f, 260f)))
}

/** Placeholder cards while a list loads (two columns). */
@Composable
fun SkeletonGrid(rows: Int = 2) {
    Column(Modifier.padding(horizontal = 16.dp)) {
        repeat(rows) {
            androidx.compose.foundation.layout.Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(12.dp)) {
                repeat(2) {
                    Column(Modifier.weight(1f)) {
                        Box(Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(20.dp)).shimmer())
                        Box(Modifier.padding(top = 10.dp).fillMaxWidth(0.8f).height(14.dp).clip(RoundedCornerShape(7.dp)).shimmer())
                        Box(Modifier.padding(top = 6.dp).fillMaxWidth(0.5f).height(12.dp).clip(RoundedCornerShape(6.dp)).shimmer())
                    }
                }
            }
        }
    }
}
