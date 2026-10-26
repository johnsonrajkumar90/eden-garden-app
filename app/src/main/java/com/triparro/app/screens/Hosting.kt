package com.triparro.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.core.Api
import com.triparro.app.core.int
import com.triparro.app.core.num
import com.triparro.app.core.obj
import com.triparro.app.core.objs
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.ColorHeader
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.Photo
import com.triparro.app.ui.Pill
import com.triparro.app.ui.SectionTitle
import com.triparro.app.ui.money
import com.triparro.app.ui.shortDate
import org.json.JSONObject

@Composable
private fun Stat(label: String, value: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.12f)).padding(14.dp)) {
        Text(value, style = MaterialTheme.typography.headlineSmall, color = Color.White)
        Text(label, style = MaterialTheme.typography.bodySmall, color = Color(0xFFC9D8F2))
    }
}

@Composable
private fun BookingRow(title: String, sub: String, right: String, tag: String?) {
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(sub, style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
            if (tag != null) Row(Modifier.padding(top = 4.dp)) { Pill(tag, "info") }
        }
        Text(right, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = Brand.BlueDark)
    }
}

/** My hosting: the summary for hosts, resort owners, pet hosts and booking partners — natively, in the app. */
@Composable
fun HostingScreen(nav: NavHostController) {
    val session by Api.session.collectAsState()
    val role = session?.user?.role ?: ""
    val l = rememberLoader(role) {
        when (role) {
            "host", "resort" -> Api.get("host/overview")
            "pethost" -> Api.get("pets/host/overview")
            "referral" -> Api.get("partner/overview")
            else -> JSONObject()
        }
    }
    val d = l.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page).verticalScroll(rememberScrollState())) {
        Column(Modifier.background(androidx.compose.ui.graphics.Brush.verticalGradient(listOf(Brand.Navy, Brand.Blue)))) {
            ColorHeader(when (role) { "referral" -> "Partner portal"; "admin" -> "Admin"; else -> "My hosting" }, session?.user?.name, onBack = { nav.popBackStack() })
            if (d != null && role in listOf("host", "resort", "pethost")) {
                val m = d.obj("month") ?: JSONObject()
                Row(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat("Your earnings · ${m.text("label")}", money(m.num("earnings")), Modifier.weight(1f))
                    Stat("Bookings this month", m.int("bookings").toString(), Modifier.width(130.dp))
                }
            }
            if (d != null && role == "referral") {
                val t = d.obj("totals") ?: JSONObject()
                Row(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat("Commission earned", money(t.num("earned")), Modifier.weight(1f))
                    Stat("Bookings", t.int("bookings").toString(), Modifier.width(120.dp))
                }
            }
        }
        Column(Modifier.padding(16.dp)) {
            when {
                role == "admin" -> Notice("Run TripArro from the admin dashboard on a computer. In the app you can book, chat and get every notification like everyone else.", "info")
                role !in listOf("host", "resort", "pethost", "referral") -> Notice("My hosting is for hosts, resort owners, pet hosts and booking partners.", "info")
                d == null && l.loading.value -> Loading()
                d == null -> ErrorBox(l.error.value ?: "Could not load your summary.", { l.reload() })
                role == "referral" -> {
                    SectionTitle("Recent bookings")
                    Card {
                        val bs = d.objs("bookings")
                        if (bs.isEmpty()) Text("No bookings yet.", color = Brand.InkSoft)
                        bs.forEachIndexed { i, b ->
                            if (i > 0) HorizontalDivider(color = Brand.Line)
                            BookingRow(b.text("listing"), "${b.text("guest")} · ${shortDate(b.text("check_in"))} → ${shortDate(b.text("check_out"))}", money(b.num("commission")), b.str("status_label"))
                        }
                    }
                    Gap()
                    Card { (d.optJSONArray("how_it_works")?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList()).forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.padding(vertical = 3.dp)) } }
                }
                else -> {
                    SectionTitle("Coming up", sub = "Guests arriving or staying now")
                    Card {
                        val up = d.objs("upcoming")
                        if (up.isEmpty()) Text("No upcoming stays.", color = Brand.InkSoft)
                        up.forEachIndexed { i, b ->
                            if (i > 0) HorizontalDivider(color = Brand.Line)
                            val who = if (role == "pethost") "${b.text("guest")} · ${b.int("pets")} pet${if (b.int("pets") == 1) "" else "s"}" else "${b.text("guest")} · ${b.int("guests")} guests"
                            BookingRow(b.text("listing"), "$who · ${shortDate(b.text("check_in"))} → ${shortDate(b.text("check_out"))}", money(b.num("payout")), b.str("status") ?: b.str("payment"))
                        }
                    }
                    Gap()
                    SectionTitle("Your listings")
                    d.objs("listings").forEach { ls ->
                        Card(padding = 12.dp) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Photo(ls.str("image"), Modifier.width(76.dp).aspectRatio(1f), corner = 14.dp)
                                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                                    Text(ls.text("title"), style = MaterialTheme.typography.titleMedium)
                                    Text(listOfNotNull(ls.str("city") ?: ls.str("location"), ls.num("price")?.let { money(it) + " / night" }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Brand.InkSoft)
                                    Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        ls.str("status")?.let { st -> Pill(mapOf("approved" to "Live", "pending" to "Being checked", "draft" to "Draft", "rejected" to "Not approved", "suspended" to "Paused")[st] ?: st, if (st == "approved") "ok" else "warn") }
                                        if (ls.has("active")) Pill(if (ls.optBoolean("active")) "Live" else "Paused", if (ls.optBoolean("active")) "ok" else "warn")
                                        if (ls.optBoolean("verified")) Pill("Verified", "info")
                                    }
                                }
                            }
                        }
                        Gap(8)
                    }
                    Gap()
                    Notice("Edit listings, prices, the calendar and payouts from your dashboard on triparro.com on a computer. Booking and check-in alerts reach you here as notifications.", "info")
                }
            }
            Gap(24)
        }
    }
}
