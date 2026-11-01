package com.triparro.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.foundation.background
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.triparro.app.R
import androidx.compose.ui.unit.sp

/** The TripArro colours (the same tokens as the website): red for actions and the brand, sunflower yellow for highlights. */
object Brand {
    val Blue = Color(0xFFD7192A)        // primary red (name kept from the first design)
    val BlueDark = Color(0xFFA70F1E)
    val Navy = Color(0xFF6A1019)        // deep matte red
    val Matte = Color(0xFFB81D2B)       // matte red for headers and menus
    val Sun = Color(0xFFFFC72C)
    val SunDark = Color(0xFFE0A800)
    val SunSoft = Color(0xFFFFF6D6)
    val SunInk = Color(0xFF4A3400)
    val Teal = Color(0xFF00875A)        // "ok" / verified green
    val TealDark = Color(0xFF00704A)
    val TealSoft = Color(0xFFE5F6EE)
    val Coral = Color(0xFFFF5757)       // the logo's dome
    val CoralDark = Color(0xFFB81D2B)
    val Page = Color(0xFFF7F5F2)
    val Sky = Color(0xFFFFF0EF)         // soft red
    val Ink = Color(0xFF1D1B1A)
    val InkSoft = Color(0xFF3D3936)
    val Muted = Color(0xFF6B6560)
    val Line = Color(0xFFEBE5DF)
    val Warn = Color(0xFFA35C00)
    val WarnSoft = Color(0xFFFFF3DF)
    val Danger = Color(0xFFC62828)
    val DangerSoft = Color(0xFFFDECEC)
    val Star = Color(0xFFE0A800)
}

/** A fine grain, drawn once and tiled: the matte finish of headers, menus and the bottom bar. */
private val grain: androidx.compose.ui.graphics.ImageBitmap by lazy {
    val n = 96
    val bmp = android.graphics.Bitmap.createBitmap(n, n, android.graphics.Bitmap.Config.ARGB_8888)
    val r = java.util.Random(7)
    for (x in 0 until n) for (y in 0 until n) {
        val v = r.nextInt(100)
        bmp.setPixel(x, y, when { v < 9 -> android.graphics.Color.argb(26, 0, 0, 0); v < 15 -> android.graphics.Color.argb(18, 255, 255, 255); else -> 0 })
    }
    bmp.asImageBitmap()
}
private val grainBrush by lazy { androidx.compose.ui.graphics.ShaderBrush(androidx.compose.ui.graphics.ImageShader(grain, androidx.compose.ui.graphics.TileMode.Repeated, androidx.compose.ui.graphics.TileMode.Repeated)) }

/** Matte finish: a flat colour with a fine grain — no gradient, no shine. */
fun androidx.compose.ui.Modifier.matte(color: Color = Brand.Matte): androidx.compose.ui.Modifier =
    this.background(color).drawBehind { drawRect(grainBrush) }

private val colors = lightColorScheme(
    primary = Brand.Blue, onPrimary = Color.White, primaryContainer = Brand.Sky, onPrimaryContainer = Brand.BlueDark,
    secondary = Brand.Sun, onSecondary = Brand.SunInk, secondaryContainer = Brand.SunSoft, onSecondaryContainer = Brand.SunInk,
    tertiary = Brand.CoralDark, onTertiary = Color.White,
    background = Brand.Page, onBackground = Brand.Ink, surface = Color.White, onSurface = Brand.Ink,
    surfaceVariant = Brand.Sky, onSurfaceVariant = Brand.InkSoft, outline = Brand.Line, outlineVariant = Brand.Line,
    error = Brand.Danger,
)

/** Poppins for headings and Inter for text — the same fonts as the website. */
val Display = FontFamily(
    Font(R.font.poppins_medium, FontWeight.Medium),
    Font(R.font.poppins_semibold, FontWeight.SemiBold),
    Font(R.font.poppins_bold, FontWeight.Bold),
)
val Body = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
)

private val type = Typography(
    displaySmall = TextStyle(fontFamily = Display, fontSize = 30.sp, fontWeight = FontWeight.Bold, lineHeight = 36.sp, letterSpacing = (-0.3).sp),
    headlineMedium = TextStyle(fontFamily = Display, fontSize = 26.sp, fontWeight = FontWeight.Bold, lineHeight = 32.sp, letterSpacing = (-0.2).sp),
    headlineSmall = TextStyle(fontFamily = Display, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 28.sp, letterSpacing = (-0.1).sp),
    titleLarge = TextStyle(fontFamily = Display, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, lineHeight = 24.sp),
    titleMedium = TextStyle(fontFamily = Body, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, lineHeight = 22.sp),
    titleSmall = TextStyle(fontFamily = Body, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Body, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Body, fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Body, fontSize = 12.5.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Body, fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
    labelMedium = TextStyle(fontFamily = Body, fontSize = 12.sp, fontWeight = FontWeight.Medium, lineHeight = 16.sp),
    labelSmall = TextStyle(fontFamily = Body, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, lineHeight = 14.sp),
)

@Composable
fun TripArroTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = type, content = content)
}
