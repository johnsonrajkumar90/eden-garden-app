@file:OptIn(ExperimentalLayoutApi::class)

package com.triparro.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.triparro.app.core.PriceLine
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/* ---------- Formatting ---------- */
private val inr: NumberFormat = NumberFormat.getNumberInstance(Locale("en", "IN")).apply { maximumFractionDigits = 0 }

fun money(v: Double?): String = if (v == null) "—" else "₹" + inr.format(Math.round(v))
fun signedMoney(v: Double): String = if (v < 0) "− " + money(-v) else money(v)
fun plural(n: Int, word: String): String = "$n $word" + if (n == 1) "" else "s"

fun prettyDate(iso: String?): String = try {
    if (iso.isNullOrBlank()) "—" else LocalDate.parse(iso.take(10)).format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH))
} catch (_: Exception) { iso ?: "—" }

fun shortDate(iso: String?): String = try {
    if (iso.isNullOrBlank()) "—" else LocalDate.parse(iso.take(10)).format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH))
} catch (_: Exception) { iso ?: "—" }

fun dateTime(iso: String?): String = try {
    if (iso.isNullOrBlank()) "" else java.time.LocalDateTime.parse(iso.replace(' ', 'T').take(19))
        .format(DateTimeFormatter.ofPattern("EEE d MMM, h:mm a", Locale.ENGLISH))
} catch (_: Exception) { iso ?: "" }

/* ---------- Layout pieces ---------- */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BackBar(title: String, onBack: () -> Unit, actions: @Composable () -> Unit = {}) {
    TopAppBar(
        title = { Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium) },
        navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
        actions = { actions() },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
        // the app's Scaffold already keeps content below the status bar — don't add that gap twice
        windowInsets = WindowInsets(0.dp),
    )
}

@Composable
fun Loading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Brand.Blue) }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Outlined.CloudOff, null, tint = Brand.Muted, modifier = Modifier.size(40.dp))
        Spacer(Modifier.height(10.dp))
        Text(message, textAlign = TextAlign.Center, color = Brand.InkSoft)
        if (onRetry != null) {
            Spacer(Modifier.height(14.dp))
            OutlinedButton(onClick = onRetry) { Text("Try again") }
        }
    }
}

@Composable
fun EmptyBox(title: String, text: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(text, color = Brand.InkSoft, textAlign = TextAlign.Center)
        if (action != null && onAction != null) {
            Spacer(Modifier.height(14.dp))
            Button(onClick = onAction) { Text(action) }
        }
    }
}

@Composable
fun Card(modifier: Modifier = Modifier, padding: Dp = 16.dp, onClick: (() -> Unit)? = null, content: @Composable () -> Unit) {
    val m = modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White)
        .let { if (onClick != null) it.clickable(onClick = onClick) else it }
    Box(m.padding(padding)) { Column { content() } }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.titleLarge, modifier = modifier.padding(top = 4.dp, bottom = 8.dp))
}

@Composable
fun Pill(text: String, tone: String = "muted") {
    val (bg, fg) = when (tone) {
        "ok", "success" -> Brand.TealSoft to Brand.TealDark
        "warn", "warning" -> Brand.WarnSoft to Brand.Warn
        "bad", "danger" -> Brand.DangerSoft to Brand.Danger
        "info" -> Brand.Sky to Brand.Blue
        else -> Color(0xFFEEF1F5) to Brand.InkSoft
    }
    Text(text, color = fg, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
        modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 4.dp))
}

@Composable
fun Chips(items: List<String>) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEach {
            Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(Brand.Sky).padding(horizontal = 10.dp, vertical = 5.dp))
        }
    }
}

@Composable
fun Stars(rating: Double?, count: Int? = null) {
    if (rating == null || rating <= 0) return
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.Star, null, tint = Brand.Star, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(3.dp))
        Text(String.format(Locale.ENGLISH, "%.1f", rating), style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold))
        if (count != null && count > 0) Text(" ($count)", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
    }
}

@Composable
fun StarPicker(label: String, value: Int, onChange: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
        (1..5).forEach { n ->
            IconButton(onClick = { onChange(n) }, modifier = Modifier.size(38.dp)) {
                Icon(if (n <= value) Icons.Filled.Star else Icons.Filled.StarBorder, contentDescription = "$n stars",
                    tint = if (n <= value) Brand.Star else Brand.Muted)
            }
        }
    }
}

@Composable
fun PriceTable(lines: List<PriceLine>, total: Double?, totalLabel: String = "Total", extra: List<Pair<String, String>> = emptyList()) {
    Column(Modifier.fillMaxWidth()) {
        lines.forEach { l ->
            Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(l.label, style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft)
                    if (!l.note.isNullOrBlank()) Text(l.note, style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                }
                Text(signedMoney(l.amount), style = MaterialTheme.typography.bodyMedium, color = if (l.amount < 0) Brand.TealDark else Brand.Ink)
            }
        }
        if (total != null) {
            HorizontalDivider(Modifier.padding(vertical = 6.dp), color = Brand.Line)
            Row(Modifier.fillMaxWidth()) {
                Text(totalLabel, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Text(money(total), style = MaterialTheme.typography.titleMedium)
            }
        }
        extra.forEach { (k, v) ->
            Row(Modifier.fillMaxWidth().padding(top = 3.dp)) {
                Text(k, style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.weight(1f))
                Text(v, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
fun Photo(url: String?, modifier: Modifier = Modifier, corner: Dp = 14.dp, description: String? = null) {
    if (url.isNullOrBlank()) {
        Box(modifier.clip(RoundedCornerShape(corner)).background(Brand.Sky), contentAlignment = Alignment.Center) {
            Text("TripArro", color = Brand.Muted, style = MaterialTheme.typography.bodySmall)
        }
    } else {
        AsyncImage(model = url, contentDescription = description, contentScale = ContentScale.Crop,
            modifier = modifier.clip(RoundedCornerShape(corner)).background(Brand.Sky))
    }
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, loading: Boolean = false, coral: Boolean = false, icon: ImageVector? = null) {
    Button(
        onClick = onClick, enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().heightIn(min = 50.dp),
        shape = RoundedCornerShape(14.dp),
        colors = if (coral) ButtonDefaults.buttonColors(containerColor = Brand.CoralDark) else ButtonDefaults.buttonColors(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        else {
            if (icon != null) { Icon(icon, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)) }
            Text(text)
        }
    }
}

@Composable
fun Notice(text: String, tone: String = "info", modifier: Modifier = Modifier) {
    val (bg, fg) = when (tone) {
        "ok" -> Brand.TealSoft to Brand.TealDark
        "warn" -> Brand.WarnSoft to Brand.Warn
        "bad" -> Brand.DangerSoft to Brand.Danger
        else -> Brand.Sky to Brand.BlueDark
    }
    Text(text, color = fg, style = MaterialTheme.typography.bodyMedium,
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(bg).padding(12.dp))
}

@Composable
fun KeyValue(key: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(key, color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(120.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}

@Composable
fun Avatar(initials: String, size: Dp = 44.dp) {
    Box(Modifier.size(size).clip(CircleShape).background(Brand.Blue), contentAlignment = Alignment.Center) {
        Text(initials.take(2).uppercase(), color = Color.White, style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
fun Bordered(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(modifier = modifier.fillMaxWidth().border(1.dp, Brand.Line, RoundedCornerShape(14.dp)), shape = RoundedCornerShape(14.dp), color = Color.White) {
        Box(Modifier.padding(12.dp)) { content() }
    }
}
