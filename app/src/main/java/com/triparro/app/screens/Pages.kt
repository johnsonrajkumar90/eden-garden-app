package com.triparro.app.screens

import android.graphics.Typeface
import android.text.method.LinkMovementMethod
import android.util.TypedValue
import android.widget.TextView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.text.HtmlCompat
import androidx.navigation.NavHostController
import com.triparro.app.R
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.Notifier
import com.triparro.app.core.text
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Card
import com.triparro.app.ui.CheckRow
import com.triparro.app.ui.ColorHeader
import com.triparro.app.ui.ErrorBox
import com.triparro.app.ui.Field
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Loading
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import kotlinx.coroutines.launch

/** Text from the website shown natively (policies, terms): headings, lists, bold, email/phone links. */
@Composable
fun HtmlText(html: String, modifier: Modifier = Modifier) {
    val ink = Brand.Ink.toArgb(); val link = Brand.Blue.toArgb()
    AndroidView(modifier = modifier, factory = { ctx ->
        TextView(ctx).apply {
            setTextColor(ink); setLinkTextColor(link)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f); setLineSpacing(0f, 1.25f)
            typeface = try { androidx.core.content.res.ResourcesCompat.getFont(ctx, R.font.inter_regular) } catch (_: Exception) { Typeface.DEFAULT }
            movementMethod = LinkMovementMethod.getInstance()
        }
    }, update = { tv ->
        tv.text = HtmlCompat.fromHtml(html.replace("<li>", "<li>&nbsp;"), HtmlCompat.FROM_HTML_MODE_COMPACT or HtmlCompat.FROM_HTML_SEPARATOR_LINE_BREAK_PARAGRAPH).trim()
    })
}

/** Privacy policy, cancellation policy, host terms — in the app. */
@Composable
fun PageScreen(nav: NavHostController, slug: String) {
    val l = rememberLoader(slug) { Api.get("pages/$slug") }
    val d = l.data.value
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        ColorHeader(d?.text("title") ?: when (slug) { "privacy" -> "Privacy policy"; "cancellation" -> "Cancellation policy"; else -> "Host terms" }, onBack = { nav.popBackStack() })
        when {
            d == null && l.loading.value -> Loading()
            d == null -> ErrorBox(l.error.value ?: "Could not load this page.", { l.reload() })
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                Card { HtmlText(d.text("html"), Modifier.fillMaxWidth()) }
                Gap(24)
            }
        }
    }
}

/** Delete my account — in the app (Google Play requires it). Guests only; host and partner accounts are closed by the team. */
@Composable
fun DeleteAccountScreen(nav: NavHostController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val session by Api.session.collectAsState()
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf<String?>(null) }
    val u = session?.user
    Column(Modifier.fillMaxSize().background(Brand.Page)) {
        ColorHeader("Delete my account", "This can't be undone.", onBack = { nav.popBackStack() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
            when {
                done != null -> { Notice(done!!, "ok"); Gap(); PrimaryButton("Back to TripArro", { nav.navigate("explore") { popUpTo(0) } }) }
                u == null -> Notice("Sign in to delete your account.", "info")
                u.role != "guest" -> Notice("Host, resort owner, pet host, partner and admin accounts are closed by the TripArro team so your listings, bookings and payouts are handled properly. Please contact customer care from the Account menu.", "warn")
                else -> Card {
                    Text("What happens", style = MaterialTheme.typography.titleMedium)
                    Text("• Your account, profile and saved pets are deleted and you are signed out.\n• Bookings and invoices stay with the host and TripArro for tax and accounting records, without a login.\n• Upcoming bookings are not cancelled — cancel them first from Trips if you need to.",
                        style = MaterialTheme.typography.bodyMedium, color = Brand.InkSoft, modifier = Modifier.padding(top = 6.dp))
                    Gap()
                    Field("Your password", password, { password = it }, password = true, keyboard = KeyboardType.Password)
                    CheckRow("I understand my account will be deleted", confirm, { confirm = it })
                    err?.let { Gap(8); Notice(it, "bad") }
                    Gap()
                    PrimaryButton("Delete my account", {
                        busy = true; err = null
                        scope.launch {
                            try {
                                val r = Api.post("account/delete", mapOf("password" to password, "confirm" to confirm))
                                done = r.text("message", "Your account has been deleted.")
                                Notifier.reset(ctx); try { Api.refreshSession() } catch (_: Exception) { }
                            } catch (e: ApiException) { err = e.message } catch (e: Exception) { err = errorText(e) }
                            busy = false
                        }
                    }, coral = true, enabled = password.isNotEmpty() && confirm, loading = busy)
                }
            }
        }
    }
}
