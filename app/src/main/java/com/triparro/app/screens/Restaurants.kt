package com.triparro.app.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.triparro.app.core.Api
import com.triparro.app.core.bool
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.appear
import com.triparro.app.ui.pressable
import com.triparro.app.ui.shimmer
import org.json.JSONObject

/**
 * Restaurants and cafés near a place, from Google: photo cards with rating, reviews, price, open now and distance.
 * Tap a card for Google Maps; [onSave] (group trips) adds it to the trip's favourites.
 */
@Composable
fun RestaurantsRow(lat: Double, lng: Double, title: String = "Restaurants nearby", onSave: ((JSONObject) -> Unit)? = null) {
    val ctx = LocalContext.current
    var kind by rememberSaveable { mutableStateOf("restaurant") }
    val l = rememberLoader(lat, lng, kind) { Api.get("places/restaurants", mapOf("lat" to lat, "lng" to lng, "kind" to kind, "radius" to 4000)) }
    val d = l.data.value
    if (d != null && !d.bool("google") && !l.loading.value) return   // Google isn't set up on this website: nothing to show
    if (d == null && !l.loading.value) return                          // signed out, or the website could not answer
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Restaurant, null, tint = Brand.Blue, modifier = Modifier.size(20.dp))
            Text("  $title", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        }
        Row(Modifier.padding(top = 8.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("restaurant" to "Restaurants", "veg" to "Pure veg", "cafe" to "Cafés & bakeries").forEach { (v, t) ->
                val on = kind == v
                Text(t, style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else Brand.InkSoft,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Brand.Sky).clickable { kind = v }.padding(horizontal = 14.dp, vertical = 7.dp))
            }
        }
        Row(Modifier.padding(top = 10.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            when {
                d == null || l.loading.value -> repeat(3) { Box(Modifier.width(220.dp).height(250.dp).clip(RoundedCornerShape(22.dp)).background(Color(0xFFEDE6E2)).shimmer()) }
                d.objs("items").isEmpty() -> Text(d.str("error") ?: "Nothing found close by.", color = Brand.Muted, style = MaterialTheme.typography.bodySmall)
                else -> d.objs("items").take(12).forEachIndexed { i, r -> RestaurantCard(r, ctx, i, onSave) }
            }
        }
        if (d != null && d.objs("items").isNotEmpty()) Text("Results, ratings and photos from Google", style = MaterialTheme.typography.labelSmall, color = Brand.Muted, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
private fun RestaurantCard(r: JSONObject, ctx: Context, index: Int, onSave: ((JSONObject) -> Unit)?) {
    var saved by remember { mutableStateOf(false) }
    Column(Modifier.width(220.dp).appear(index).shadow(4.dp, RoundedCornerShape(22.dp), ambientColor = Color(0x1A000000), spotColor = Color(0x22B81D2B))
        .clip(RoundedCornerShape(22.dp)).background(Color.White).border(1.dp, Brand.Line, RoundedCornerShape(22.dp))
        .pressable({ r.str("maps_url")?.let { try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { } } })) {
        Box(Modifier.fillMaxWidth().height(140.dp).background(Brand.Sky)) {
            r.str("photo_url")?.let { AsyncImage(model = it, contentDescription = r.text("name"), contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                ?: Icon(Icons.Outlined.Restaurant, null, tint = Brand.Coral, modifier = Modifier.align(Alignment.Center).size(40.dp))
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x00000000), Color(0x00000000), Color(0x88000000)))))
            if (r.has("open_now") && !r.isNull("open_now")) {
                val open = r.bool("open_now")
                Text(if (open) "Open now" else "Closed now", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.TopStart).padding(8.dp).clip(RoundedCornerShape(50)).background(if (open) Color(0xE6008A5A) else Color(0xCC5B5B5B)).padding(horizontal = 8.dp, vertical = 3.dp))
            }
            if (onSave != null) Box(Modifier.align(Alignment.TopEnd).padding(6.dp).size(34.dp).clip(CircleShape).background(if (saved) Brand.Coral else Color(0xE6FFFFFF))
                .clickable { if (!saved) { saved = true; onSave(r) } }, contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Favorite, if (saved) "Saved" else "Save to favourites", tint = if (saved) Color.White else Brand.Coral, modifier = Modifier.size(18.dp))
            }
            r.str("km")?.let { Text("$it km", color = Color.White, style = MaterialTheme.typography.labelSmall, modifier = Modifier.align(Alignment.BottomEnd).padding(8.dp)) }
            if (r.text("photo_credit").isNotBlank()) Text(r.text("photo_credit"), color = Color(0xCCFFFFFF), fontSize = 9.sp, maxLines = 1, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp).width(130.dp), overflow = TextOverflow.Ellipsis)
        }
        Column(Modifier.padding(12.dp)) {
            Text(r.text("name"), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                if (r.has("rating") && !r.isNull("rating")) {
                    Icon(Icons.Outlined.Star, null, tint = Color(0xFFF2B01E), modifier = Modifier.size(15.dp))
                    Text(" " + r.optDouble("rating") + (if (r.int("reviews") > 0) " (" + compact(r.int("reviews")) + ")" else ""), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                }
                if (r.has("price") && !r.isNull("price") && r.int("price") > 0) Text("  ·  " + "₹".repeat(r.int("price")), style = MaterialTheme.typography.labelMedium, color = Brand.InkSoft)
            }
            Text(r.text("type"), style = MaterialTheme.typography.labelSmall, color = Brand.Blue, maxLines = 1)
            Text(r.text("address"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

private fun compact(n: Int): String = if (n >= 1000) String.format("%.1fk", n / 1000.0).replace(".0k", "k") else n.toString()
