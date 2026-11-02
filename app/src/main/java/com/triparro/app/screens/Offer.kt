package com.triparro.app.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.triparro.app.ui.Brand
import com.triparro.app.ui.PrimaryButton
import com.triparro.app.ui.appear
import com.triparro.app.ui.pressable
import org.json.JSONObject

/** The offer popup: the admin's offer picture (tap it to open the offer), the coupon code to copy and a button. */
@Composable
fun OfferDialog(o: JSONObject, onClose: () -> Unit, onOpen: (String) -> Unit) {
    val ctx = LocalContext.current
    val link = o.optString("link").ifEmpty { "/search" }
    val coupon = o.optJSONObject("coupon")
    var copied by remember { mutableStateOf(false) }
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.padding(20.dp).widthIn(max = 420.dp).appear()) {
            Column(Modifier.fillMaxWidth().shadow(24.dp, RoundedCornerShape(28.dp), spotColor = Color(0x99500A14))
                .clip(RoundedCornerShape(28.dp)).background(Color.White.copy(alpha = 0.9f)).border(1.dp, Color.White, RoundedCornerShape(28.dp)).padding(8.dp)) {
                AsyncImage(model = o.optString("image"), contentDescription = o.optString("title").ifEmpty { "Special offer" }, contentScale = ContentScale.FillWidth,
                    modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp).clip(RoundedCornerShape(22.dp)).pressable({ onOpen(link) }, scaleTo = 0.98f))
                if (coupon != null || o.optString("button").isNotEmpty()) {
                    Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        coupon?.let { c ->
                            Row(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(Color(0xFFFFF6F3)).border(2.dp, Brand.Blue.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
                                .pressable({
                                    (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager)?.setPrimaryClip(ClipData.newPlainText("Coupon", c.optString("code")))
                                    copied = true
                                }).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(c.optString("label"), style = MaterialTheme.typography.labelSmall, color = Brand.Muted)
                                    Text(c.optString("code"), style = MaterialTheme.typography.titleMedium.copy(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.ExtraBold), color = Brand.Blue)
                                }
                                Icon(Icons.Outlined.ContentCopy, "Copy code", tint = if (copied) Brand.Teal else Brand.Blue, modifier = Modifier.size(18.dp))
                                Text(if (copied) " Copied" else " Copy", style = MaterialTheme.typography.labelMedium, color = if (copied) Brand.Teal else Brand.Blue)
                            }
                        }
                        val btn = o.optString("button")
                        if (btn.isNotEmpty()) PrimaryButton(btn, { onOpen(link) }, if (coupon != null) Modifier.widthIn(max = 150.dp) else Modifier)
                    }
                }
            }
            Box(Modifier.align(Alignment.TopEnd).padding(14.dp).size(40.dp).shadow(6.dp, CircleShape).clip(CircleShape).background(Color.White.copy(alpha = 0.92f))
                .pressable(onClose), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.Close, "Close", tint = Brand.Ink)
            }
        }
    }
}
