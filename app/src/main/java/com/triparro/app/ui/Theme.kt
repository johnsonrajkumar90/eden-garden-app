package com.triparro.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** The TripArro colours (the same tokens as the website). */
object Brand {
    val Blue = Color(0xFF0E3A7A)
    val BlueDark = Color(0xFF0B2F63)
    val Navy = Color(0xFF082349)
    val Teal = Color(0xFF00796F)
    val TealDark = Color(0xFF0B6B5E)
    val TealSoft = Color(0xFFE6F8F6)
    val Coral = Color(0xFFFF5757)
    val CoralDark = Color(0xFFD23A35)
    val Page = Color(0xFFF4F8FF)
    val Sky = Color(0xFFEAF1FD)
    val Ink = Color(0xFF101820)
    val InkSoft = Color(0xFF4A5663)
    val Muted = Color(0xFF75808C)
    val Line = Color(0xFFDDE5F0)
    val Warn = Color(0xFFB45309)
    val WarnSoft = Color(0xFFFFF4E0)
    val Danger = Color(0xFFB42318)
    val DangerSoft = Color(0xFFFDECEA)
    val Star = Color(0xFFF5A623)
}

private val colors = lightColorScheme(
    primary = Brand.Blue, onPrimary = Color.White, primaryContainer = Brand.Sky, onPrimaryContainer = Brand.BlueDark,
    secondary = Brand.Teal, onSecondary = Color.White, secondaryContainer = Brand.TealSoft, onSecondaryContainer = Brand.TealDark,
    tertiary = Brand.CoralDark, onTertiary = Color.White,
    background = Brand.Page, onBackground = Brand.Ink, surface = Color.White, onSurface = Brand.Ink,
    surfaceVariant = Brand.Sky, onSurfaceVariant = Brand.InkSoft, outline = Brand.Line, outlineVariant = Brand.Line,
    error = Brand.Danger,
)

private val type = Typography(
    headlineMedium = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.Bold, lineHeight = 32.sp, color = Brand.Ink),
    headlineSmall = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold, lineHeight = 28.sp, color = Brand.Ink),
    titleLarge = TextStyle(fontSize = 19.sp, fontWeight = FontWeight.SemiBold, lineHeight = 25.sp),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold, lineHeight = 22.sp),
    titleSmall = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontSize = 12.5.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
)

@Composable
fun TripArroTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = type, content = content)
}
