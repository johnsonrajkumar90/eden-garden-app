package com.triparro.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.intOrNull
import com.triparro.app.core.num
import com.triparro.app.core.str
import com.triparro.app.core.strings
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.Stars
import com.triparro.app.ui.money
import com.triparro.app.ui.plural
import org.json.JSONObject

val petEmoji = mapOf("dog" to "🐕", "cat" to "🐈", "bird" to "🦜", "rabbit" to "🐇", "small" to "🐹", "other" to "🐾")
val petTypes = listOf("" to "Any pet", "dog" to "Dog", "cat" to "Cat", "bird" to "Bird", "rabbit" to "Rabbit", "small" to "Small pet", "other" to "Other")
val petSizes = listOf("small" to "Small (up to 10 kg)", "medium" to "Medium (10–25 kg)", "large" to "Large (25–40 kg)", "giant" to "Giant (40 kg +)")

/** A verified pet host in a list: photo, area, rating, facilities and the real price per night. */
@Composable
fun PetHostCard(c: JSONObject, compact: Boolean = false, onClick: () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).clickable(onClick = onClick)) {
        if (!compact) Photo(c.str("image"), Modifier.fillMaxWidth().aspectRatio(1.7f), corner = 0.dp, description = c.text("title"))
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            if (compact) Photo(c.str("image"), Modifier.width(72.dp).aspectRatio(1f))
            Column(Modifier.weight(1f).padding(start = if (compact) 12.dp else 0.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(c.text("location"), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Stars(c.num("rating"), c.int("reviews"))
                }
                Text(c.text("title"), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(c.strings("pet_types").joinToString(" ") { petEmoji[it] ?: "🐾" } + "  · up to ${plural(c.int("capacity"), "pet")}", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                if (!compact && c.strings("facilities").isNotEmpty()) Text(c.strings("facilities").take(4).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft, modifier = Modifier.padding(top = 2.dp))
                Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(money(c.num("price")), style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = Brand.BlueDark)
                    Text("/ night", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    if (c.bool("verified")) Pill("Verified", "ok")
                    if (c.bool("featured")) Pill("Featured", "info")
                    if (c.bool("instant")) Pill("Instant", "info")
                }
                c.intOrNull("free")?.let { Text(if (it > 0) "${plural(it, "place")} free for your dates" else "Full for your dates", style = MaterialTheme.typography.bodySmall, color = if (it > 0) Brand.TealDark else Brand.Warn) }
            }
        }
    }
}
