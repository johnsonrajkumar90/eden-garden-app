package com.triparro.app.screens

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.triparro.app.core.Api
import com.triparro.app.core.priceLines
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.core.num
import com.triparro.app.core.int
import com.triparro.app.core.objs
import com.triparro.app.core.obj
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.ColorHeader
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.KeyValue
import com.triparro.app.ui.Loading
import com.triparro.app.ui.PriceTable
import com.triparro.app.ui.money
import com.triparro.app.ui.prettyDate
import com.triparro.app.ui.dateTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/** A PDF (invoice, user manual) shown in the app: downloaded with the signed-in session and drawn page by page. */
@Composable
fun PdfScreen(nav: NavHostController, link: String, title: String) {
    val ctx = LocalContext.current
    var pages by remember { mutableStateOf<List<Bitmap>?>(null) }
    var file by remember { mutableStateOf<File?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    var tick by remember { mutableStateOf(0) }
    LaunchedEffect(link, tick) {
        err = null
        try {
            val f = Api.download(link, "doc-${link.hashCode().toUInt()}.pdf", File(ctx.cacheDir, "docs"))
            file = f
            pages = withContext(Dispatchers.IO) {
                ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
                    PdfRenderer(fd).use { r ->
                        (0 until minOf(r.pageCount, 60)).map { i ->
                            r.openPage(i).use { p ->
                                val w = 1240; val h = (w.toFloat() * p.height / p.width).toInt()
                                Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also { bmp -> bmp.eraseColor(android.graphics.Color.WHITE); p.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY) }
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) { err = errorText(e) }
    }
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        ColorHeader(title, onBack = { nav.popBackStack() }) {
            file?.let { f ->
                IconButton(onClick = {
                    try {
                        val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".files", f)
                        ctx.startActivity(android.content.Intent.createChooser(android.content.Intent(android.content.Intent.ACTION_SEND).setType("application/pdf")
                            .putExtra(android.content.Intent.EXTRA_STREAM, uri).addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION), "Share or save"))
                    } catch (_: Exception) { }
                }) { Icon(Icons.Outlined.Share, "Share or save", tint = Color.White) }
            }
        }
        val p = pages
        when {
            err != null -> ErrorBox(err ?: "", { tick++ })
            p == null -> Loading()
            else -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(p) { bmp -> Image(bmp.asImageBitmap(), null, Modifier.fillMaxWidth().clip(RoundedCornerShape(6.dp)).background(Color.White), contentScale = ContentScale.FillWidth) }
            }
        }
    }
}

/** A photo full screen (Pet Stay Diary): pinch to zoom. */
@Composable
fun PhotoScreen(nav: NavHostController, url: String, title: String) {
    var scale by remember { mutableFloatStateOf(1f) }
    var ox by remember { mutableFloatStateOf(0f) }
    var oy by remember { mutableFloatStateOf(0f) }
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AsyncImage(model = Api.url(url), contentDescription = title, contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize().pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ -> scale = (scale * zoom).coerceIn(1f, 5f); if (scale > 1f) { ox += pan.x; oy += pan.y } else { ox = 0f; oy = 0f } }
            }.graphicsLayer(scaleX = scale, scaleY = scale, translationX = ox, translationY = oy))
        IconButton(onClick = { nav.popBackStack() }, modifier = Modifier.padding(8.dp).align(Alignment.TopStart)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
        if (title.isNotBlank()) Text(title, color = Color.White, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.align(Alignment.BottomCenter).padding(24.dp))
    }
}

/** A video from the Pet Stay Diary, played in the app (with the signed-in session, as diary media is private). */
@Composable
fun VideoScreen(nav: NavHostController, url: String) {
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(modifier = Modifier.fillMaxSize().align(Alignment.Center), factory = { ctx ->
            VideoView(ctx).apply {
                val mc = MediaController(ctx); mc.setAnchorView(this); setMediaController(mc)
                setVideoURI(Uri.parse(Api.url(url)), mapOf("Cookie" to Api.cookieHeader(url), "User-Agent" to Api.userAgent))
                setOnPreparedListener { it.isLooping = false; start() }
            }
        }, onRelease = { it.stopPlayback() })
        IconButton(onClick = { nav.popBackStack() }, modifier = Modifier.padding(8.dp).align(Alignment.TopStart)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
    }
}

/** The receipt of a pet boarding booking, made in the app from the booking. */
@Composable
fun PetReceiptScreen(nav: NavHostController, ref: String) {
    val l = rememberLoader(ref) { Api.get("pets/bookings/$ref") }
    val b = l.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        ColorHeader("Receipt", "Pet boarding · $ref", onBack = { nav.popBackStack() })
        when {
            b == null && l.loading.value -> Loading()
            b == null -> ErrorBox(l.error.value ?: "Could not load the receipt.", { l.reload() })
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                Card {
                    Text("TripArro", style = MaterialTheme.typography.titleLarge, color = Brand.Blue)
                    Text("Payment receipt", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                    Gap()
                    KeyValue("Booking", ref)
                    KeyValue("Pet host", b.obj("listing")?.text("title") ?: "")
                    KeyValue("Guest", b.text("guest_name"))
                    KeyValue("Pets", b.objs("pets").joinToString(", ") { it.text("name") })
                    KeyValue(if (b.text("booking_kind") == "daycare") "Day" else "Drop-off", prettyDate(b.str("check_in")))
                    KeyValue("Pick-up", prettyDate(b.str("check_out")))
                    b.str("created_at")?.let { KeyValue("Booked", dateTime(it)) }
                    KeyValue("Payment", b.text("payment_label"))
                    Gap()
                    PriceTable(b.priceLines(), b.num("total"), extra = listOf("Paid" to money(b.num("paid"))) + (if ((b.num("balance") ?: 0.0) > 0) listOf("Balance" to money(b.num("balance"))) else emptyList()))
                    Gap()
                    Text("Paid securely to TripArro. Keep this receipt for your records.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
                }
                Gap(24)
            }
        }
    }
}
