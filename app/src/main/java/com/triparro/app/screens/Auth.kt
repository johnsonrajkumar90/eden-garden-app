package com.triparro.app.screens

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MarkEmailRead
import androidx.compose.material.icons.outlined.Password
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.triparro.app.R
import com.triparro.app.core.Api
import com.triparro.app.core.ApiException
import com.triparro.app.core.bool
import com.triparro.app.core.str
import com.triparro.app.core.text
import com.triparro.app.openWeb
import com.triparro.app.ui.Brand
import com.triparro.app.ui.Gap
import com.triparro.app.ui.Notice
import com.triparro.app.ui.PrimaryButton
import kotlinx.coroutines.launch

/** What the sign-in screen is showing. */
private enum class Step { SignIn, SignUp, Code, AskCode, CheckEmail, Forgot, ForgotSent }

/**
 * Sign in and sign up inside the app (no web pages): email + password, a 6-digit code by email (or SMS),
 * new accounts with the emailed confirmation code, and "forgot password". Google sign-in uses the website's Google page.
 */
@Composable
fun AuthScreen(nav: NavHostController, startSignUp: Boolean = false) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var step by rememberSaveable { mutableStateOf(if (startSignUp) Step.SignUp else Step.SignIn) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var codeTarget by rememberSaveable { mutableStateOf("") }      // the email / phone the code went to
    var codeShown by rememberSaveable { mutableStateOf("") }
    var codePurpose by rememberSaveable { mutableStateOf("login") }
    var code by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var fieldErr by remember { mutableStateOf<Map<String, String>>(emptyMap()) }

    fun go(s: Step) { step = s; err = null; info = null; fieldErr = emptyMap() }
    fun done() { nav.popBackStack() }
    /** An older website without the app sign-in answers: use its web pages instead. */
    fun webFallback(e: ApiException, path: String, title: String): Boolean {
        if (e.code == "not_json" || e.code == "login_required" || e.status == 404 || e.status == 405) { nav.openWeb(path, title); return true }
        return false
    }
    fun run(block: suspend () -> Unit) {
        busy = true; err = null; info = null
        scope.launch {
            try { block() } catch (e: ApiException) { err = e.message; fieldErr = e.errors } catch (e: Exception) { err = errorText(e) }
            busy = false
        }
    }
    fun sendCode(target: String, then: Step = Step.Code) = run {
        try {
            val r = Api.postSite("login/code", mapOf("id" to target.trim()))
            codeTarget = r.text("target", target.trim()); codeShown = r.text("shown", target.trim()); codePurpose = "login"; code = ""
            go(then); info = "We sent a 6-digit code to $codeShown."
        } catch (e: ApiException) { if (!webFallback(e, "/login", "Sign in")) throw e }
    }
    fun signIn() = run {
        try { Api.signIn(email, password); done() } catch (e: ApiException) {
            if (e.code == "unconfirmed") {   // signed up but not confirmed yet: confirm with a code instead
                val r = Api.postSite("login/code", mapOf("id" to email.trim()))
                codeTarget = r.text("target", email.trim()); codeShown = r.text("shown", email.trim()); codePurpose = "login"; code = ""
                go(Step.Code); info = "Please confirm your email first — we sent a 6-digit code to $codeShown."
            } else throw e
        }
    }
    fun signUp() = run {
        try {
            val r = Api.postSite("signup", mapOf("name" to name.trim(), "email" to email.trim(), "phone" to phone.trim(), "password" to password))
            when {
                r.has("user") -> { Api.refreshSession(); done() }
                r.text("verify") == "code" -> {
                    codeTarget = r.text("email", email.trim()); codeShown = r.text("shown", email.trim()); codePurpose = "signup"; code = ""
                    go(Step.Code); info = "Account created. Enter the 6-digit code we sent to $codeShown" + (r.str("phone_shown")?.let { " and $it" } ?: "") + "."
                }
                else -> go(Step.CheckEmail)
            }
        } catch (e: ApiException) { if (!webFallback(e, "/signup", "Sign up")) throw e }
    }
    fun verify() = run {
        Api.postSite("login/code/verify", mapOf("purpose" to codePurpose, "target" to codeTarget, "code" to code))
        Api.refreshSession(); done()
    }
    fun forgot() = run {
        try {
            val r = Api.postSite("forgot-password", mapOf("email" to email.trim()))
            go(Step.ForgotSent); info = r.text("message")
        } catch (e: ApiException) { if (!webFallback(e, "/forgot-password", "Forgot password")) throw e }
    }

    BackHandler(enabled = step !in listOf(Step.SignIn, Step.SignUp)) { go(if (step == Step.ForgotSent || step == Step.Forgot || step == Step.AskCode) Step.SignIn else Step.SignIn) }

    val (title, sub) = when (step) {
        Step.SignIn -> "Welcome back" to "Sign in to book, see your trips and look after your pets' stays."
        Step.SignUp -> "Create your account" to "Book verified stays, resorts and pet boarding — in a minute."
        Step.Code -> "Enter your code" to "Check your email (and SMS) for a 6-digit code."
        Step.AskCode -> "Sign in with a code" to "No password needed — we'll send you a one-time code."
        Step.CheckEmail -> "Confirm your email" to "One last step to switch your account on."
        Step.Forgot, Step.ForgotSent -> "Forgot your password?" to "We'll email you a link to choose a new one."
    }

    Column(Modifier.fillMaxSize().background(Brand.Page).imePadding().verticalScroll(rememberScrollState())) {
        // full-colour header
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp))
            .background(Brush.verticalGradient(listOf(Brand.Navy, Brand.Blue, Color(0xFF1C5BB0)))).padding(start = 8.dp, end = 20.dp, top = 4.dp, bottom = 64.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (step in listOf(Step.SignIn, Step.SignUp)) nav.popBackStack() else go(Step.SignIn) }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
                }
                Spacer(Modifier.weight(1f))
                Image(painterResource(R.drawable.logo_white), "TripArro", Modifier.height(30.dp))
            }
            Column(Modifier.padding(start = 12.dp, top = 18.dp)) {
                Text(title, style = MaterialTheme.typography.headlineMedium, color = Color.White)
                Text(sub, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFC9D8F2), modifier = Modifier.padding(top = 6.dp))
            }
        }
        // the form card, overlapping the header
        Column(Modifier.offset(y = (-40).dp).padding(horizontal = 16.dp).fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(24.dp), ambientColor = Brand.Navy.copy(alpha = 0.18f), spotColor = Brand.Navy.copy(alpha = 0.18f))
            .clip(RoundedCornerShape(24.dp)).background(Color.White).padding(20.dp)) {
            if (step == Step.SignIn || step == Step.SignUp) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Brand.Sky).padding(4.dp)) {
                    listOf(Step.SignIn to "Sign in", Step.SignUp to "Create account").forEach { (s, l) ->
                        val on = step == s
                        Text(l, style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else Brand.InkSoft, textAlign = TextAlign.Center,
                            modifier = Modifier.weight(1f).clip(RoundedCornerShape(50)).background(if (on) Brand.Blue else Color.Transparent).clickable { go(s) }.padding(vertical = 11.dp))
                    }
                }
                Gap(18)
            }
            info?.let { Notice(it, "ok"); Gap(12) }
            err?.let { Notice(it, "bad"); Gap(12) }
            when (step) {
                Step.SignIn -> {
                    AuthField("Email", email, { email = it }, Icons.Outlined.Email, KeyboardType.Email, error = fieldErr["email"])
                    Gap(12)
                    AuthField("Password", password, { password = it }, Icons.Outlined.Lock, KeyboardType.Password, password = true, done = { if (email.contains("@") && password.isNotEmpty()) signIn() })
                    Text("Forgot password?", style = MaterialTheme.typography.titleSmall, color = Brand.Blue,
                        modifier = Modifier.align(Alignment.End).padding(top = 8.dp).clip(RoundedCornerShape(8.dp)).clickable { go(Step.Forgot) }.padding(6.dp))
                    Gap(8)
                    PrimaryButton("Sign in", { signIn() }, coral = true, enabled = email.contains("@") && password.isNotEmpty(), loading = busy)
                    OrDivider()
                    OutlinedButton(onClick = { go(Step.AskCode) }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp)) {
                        Icon(Icons.Outlined.Password, null, Modifier.size(18.dp)); Spacer(Modifier.size(8.dp)); Text("Sign in with a one-time code")
                    }
                    Gap(10)
                    OutlinedButton(onClick = { nav.openWeb("/auth/google", "Continue with Google") }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp)) {
                        Text("G", fontWeight = FontWeight.Bold, color = Color(0xFF4285F4)); Spacer(Modifier.size(10.dp)); Text("Continue with Google")
                    }
                    Gap(14)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        Text("New to TripArro? ", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
                        Text("Create an account", color = Brand.Blue, style = MaterialTheme.typography.titleSmall, modifier = Modifier.clickable { go(Step.SignUp) })
                    }
                }
                Step.SignUp -> {
                    AuthField("Full name", name, { name = it }, Icons.Outlined.Person, KeyboardType.Text, error = fieldErr["name"])
                    Gap(12)
                    AuthField("Email", email, { email = it }, Icons.Outlined.Email, KeyboardType.Email, error = fieldErr["email"])
                    Gap(12)
                    AuthField("Mobile number (optional)", phone, { phone = it }, Icons.Outlined.Phone, KeyboardType.Phone, error = fieldErr["phone"])
                    Gap(12)
                    AuthField("Password", password, { password = it }, Icons.Outlined.Lock, KeyboardType.Password, password = true,
                        error = fieldErr["password"], hint = "At least 8 characters", done = { signUp() })
                    Gap(16)
                    PrimaryButton("Create account", { signUp() }, coral = true, enabled = name.isNotBlank() && email.contains("@") && password.length >= 8, loading = busy)
                    Gap(12)
                    Text("By creating an account you agree to TripArro's privacy and cancellation policies.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        TextButton(onClick = { nav.openWeb("/privacy-policy", "Privacy policy") }) { Text("Privacy policy") }
                        TextButton(onClick = { nav.openWeb("/cancellation-policy", "Cancellation policy") }) { Text("Cancellation policy") }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        Text("Already have an account? ", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
                        Text("Sign in", color = Brand.Blue, style = MaterialTheme.typography.titleSmall, modifier = Modifier.clickable { go(Step.SignIn) })
                    }
                }
                Step.AskCode -> {
                    AuthField("Email or mobile number", email, { email = it }, Icons.Outlined.Badge, KeyboardType.Email, done = { if (email.isNotBlank()) sendCode(email) })
                    Gap(16)
                    PrimaryButton("Send my code", { sendCode(email) }, coral = true, enabled = email.isNotBlank(), loading = busy)
                    Gap(6)
                    TextButton(onClick = { go(Step.SignIn) }, modifier = Modifier.fillMaxWidth()) { Text("Use my password instead") }
                }
                Step.Code -> {
                    CodeBoxes(code) { code = it.filter(Char::isDigit).take(6); if (code.length == 6 && !busy) verify() }
                    Gap(18)
                    PrimaryButton(if (codePurpose == "signup") "Confirm and continue" else "Sign in", { verify() }, coral = true, enabled = code.length == 6, loading = busy)
                    Gap(6)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Text("Didn't get it? ", color = Brand.InkSoft, style = MaterialTheme.typography.bodyMedium)
                        TextButton(onClick = { sendCode(codeTarget) }, enabled = !busy) { Text("Send a new code") }
                    }
                    Text("Codes work for 10 minutes. Check your spam folder too.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
                Step.CheckEmail -> {
                    Box(Modifier.size(64.dp).clip(CircleShape).background(Brand.Sky).align(Alignment.CenterHorizontally), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.MarkEmailRead, null, tint = Brand.Blue, modifier = Modifier.size(30.dp))
                    }
                    Gap(12)
                    Text("We emailed a link to ${email.trim()}. Open it to switch your account on, then sign in here.", textAlign = TextAlign.Center, color = Brand.InkSoft, modifier = Modifier.fillMaxWidth())
                    Gap(16)
                    PrimaryButton("Open my email app", {
                        try { ctx.startActivity(Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_EMAIL).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { }
                    })
                    Gap(8)
                    OutlinedButton(onClick = { go(Step.SignIn) }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp)) { Text("I've confirmed — sign in") }
                }
                Step.Forgot -> {
                    AuthField("Email", email, { email = it }, Icons.Outlined.Email, KeyboardType.Email, done = { if (email.contains("@")) forgot() })
                    Gap(16)
                    PrimaryButton("Email me a reset link", { forgot() }, coral = true, enabled = email.contains("@"), loading = busy)
                    Gap(6)
                    TextButton(onClick = { go(Step.SignIn) }, modifier = Modifier.fillMaxWidth()) { Text("Back to sign in") }
                }
                Step.ForgotSent -> {
                    Text("Open the link in the email to choose a new password, then sign in here with it.", color = Brand.InkSoft)
                    Gap(16)
                    PrimaryButton("Back to sign in", { go(Step.SignIn) })
                }
            }
        }
        Text("Guests, hosts, resort owners, pet hosts and partners use the same sign-in.", style = MaterialTheme.typography.bodySmall, color = Brand.Muted,
            textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().offset(y = (-24).dp).padding(horizontal = 24.dp))
    }
}

@Composable
private fun AuthField(label: String, value: String, onChange: (String) -> Unit, icon: ImageVector, keyboard: KeyboardType, password: Boolean = false,
                      error: String? = null, hint: String? = null, done: (() -> Unit)? = null) {
    var show by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
        leadingIcon = { Icon(icon, null, tint = Brand.Blue) },
        trailingIcon = if (password) ({ IconButton(onClick = { show = !show }) { Icon(if (show) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, if (show) "Hide password" else "Show password", tint = Brand.Muted) } }) else null,
        visualTransformation = if (password && !show) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard, imeAction = if (done != null) ImeAction.Done else ImeAction.Next),
        keyboardActions = KeyboardActions(onDone = { done?.invoke() }),
        isError = error != null, supportingText = (error ?: hint)?.let { { Text(it) } },
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Brand.Line, focusedBorderColor = Brand.Blue, unfocusedContainerColor = Brand.Page, focusedContainerColor = Color.White),
    )
}

@Composable
private fun OrDivider() {
    Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(Modifier.weight(1f), color = Brand.Line)
        Text("  or  ", style = MaterialTheme.typography.bodySmall, color = Brand.Muted)
        HorizontalDivider(Modifier.weight(1f), color = Brand.Line)
    }
}

/** Six boxes for the one-time code (one hidden text field underneath). */
@Composable
private fun CodeBoxes(code: String, onChange: (String) -> Unit) {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { try { focus.requestFocus() } catch (_: Exception) { } }
    BasicTextField(value = code, onValueChange = onChange, modifier = Modifier.focusRequester(focus),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
        decorationBox = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(6) { i ->
                    val ch = code.getOrNull(i)?.toString() ?: ""
                    val active = i == code.length
                    Box(Modifier.weight(1f).height(56.dp).clip(RoundedCornerShape(14.dp)).background(if (ch.isEmpty()) Brand.Page else Brand.Sky)
                        .border(if (active) 2.dp else 1.dp, if (active) Brand.Blue else Brand.Line, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                        Text(ch, style = MaterialTheme.typography.headlineSmall, color = Brand.Ink)
                    }
                }
            }
        })
}
