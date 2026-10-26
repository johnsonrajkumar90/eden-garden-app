package com.triparro.app.core

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.webkit.CookieManager
import com.triparro.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.FormBody
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

/** An error from the API, with the message the server wrote for people. */
class ApiException(val status: Int, override val message: String, val code: String? = null, val errors: Map<String, String> = emptyMap()) : Exception(message)

/** A file to upload in a multipart request. */
class Upload(val field: String, val file: File, val mime: String)

/** The signed-in person, from GET /api/session. */
data class User(val id: Int, val name: String, val email: String, val role: String, val initials: String, val dashboard: String?)

data class Session(
    val user: User?,
    val csrf: String,
    val brand: String,
    val supportPhone: String?,
    val supportWhatsapp: String?,
    val supportEmail: String?,
    val supportHours: String?,
    val ai: Boolean,
    val payments: Boolean,
    val loginToBook: Boolean,
    val links: JSONObject,
)

/**
 * Talks to the TripArro website's REST API (/api/…) with the website's own login session:
 * cookies are kept on the phone (so people stay signed in) and shared with the in-app web pages.
 * Every write carries the CSRF token from /api/session. Secrets never live in the app.
 */
object Api {
    private lateinit var prefs: SharedPreferences
    private lateinit var jar: PersistentCookieJar
    lateinit var http: OkHttpClient
        private set

    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session

    val userAgent: String get() = "TripArroApp/${BuildConfig.VERSION_NAME} (Android ${Build.VERSION.RELEASE}; native) EdenGardenApp/2.0"

    fun init(context: Context) {
        if (::http.isInitialized) return
        prefs = context.getSharedPreferences("triparro", Context.MODE_PRIVATE)
        jar = PersistentCookieJar(prefs)
        http = OkHttpClient.Builder()
            .cookieJar(jar)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .followRedirects(false)
            .addInterceptor { chain ->
                chain.proceed(chain.request().newBuilder().header("User-Agent", userAgent).build())
            }
            .build()
    }

    /** The website address (Account → About → Server can change it, e.g. for a test site). */
    var baseUrl: String
        get() = (prefs.getString("base_url", null) ?: BuildConfig.SITE_URL).trimEnd('/')
        set(v) {
            prefs.edit().putString("base_url", v.trim().trimEnd('/')).apply()
            jar.clear()
            _session.value = null
        }

    fun url(path: String): String = if (path.startsWith("http")) path else baseUrl + "/" + path.trimStart('/')

    /* ---------- Session ---------- */
    suspend fun refreshSession(): Session {
        val j = get("session")
        val u = j.obj("user")
        val s = j.obj("support") ?: JSONObject()
        val f = j.obj("features") ?: JSONObject()
        val session = Session(
            user = u?.let { User(it.int("id"), it.text("name"), it.text("email"), it.text("role", "guest"), it.text("initials", "?"), it.str("dashboard")) },
            csrf = j.text("csrf"),
            brand = j.obj("brand")?.text("name", "TripArro") ?: "TripArro",
            supportPhone = s.str("phone"), supportWhatsapp = s.str("whatsapp"), supportEmail = s.str("email"), supportHours = s.str("hours"),
            ai = f.bool("ai"), payments = f.bool("payments"), loginToBook = f.bool("login_to_book"),
            links = j.obj("links") ?: JSONObject(),
        )
        _session.value = session
        return session
    }

    private suspend fun csrf(): String = _session.value?.csrf?.takeIf { it.isNotEmpty() } ?: refreshSession().csrf

    /** Sign in with email and password (the website's own log-in form). */
    suspend fun login(email: String, password: String): User {
        val token = refreshSession().csrf
        withContext(Dispatchers.IO) {
            val body = FormBody.Builder()
                .add("_token", token).add("email", email.trim()).add("password", password)
                .add("remember_shown", "1").add("remember", "1")
                .build()
            http.newCall(Request.Builder().url(url("login?next=me")).post(body).header("Accept", "text/html").build()).execute().use { r ->
                if (r.code >= 500) throw ApiException(r.code, "The website could not sign you in right now. Please try again.")
                if (r.code == 200) {
                    val html = r.body?.string().orEmpty()
                    val msg = Regex("""class="alert alert-error"[^>]*>\s*([^<]{4,300})""").find(html)?.groupValues?.get(1)?.trim()
                    val confirm = html.contains("Confirm your email", ignoreCase = true)
                    throw ApiException(422, when {
                        confirm -> "Please confirm your email first — open the link we emailed you, then sign in."
                        msg != null -> android.text.Html.fromHtml(msg, 0).toString()
                        else -> "Incorrect email or password."
                    })
                }
            }
        }
        val s = refreshSession()
        return s.user ?: throw ApiException(401, "Incorrect email or password.")
    }

    suspend fun logout() {
        try {
            withContext(Dispatchers.IO) { http.newCall(Request.Builder().url(url("logout")).get().build()).execute().close() }
        } catch (_: Exception) { }
        jar.clear()
        withContext(Dispatchers.Main) { CookieManager.getInstance().removeAllCookies(null) }
        try { refreshSession() } catch (_: Exception) { _session.value = null }
    }

    /**
     * A private booking link from an email or notification (…/booking/REF?t=…): opening it once lets this app's session
     * see that booking, the same as on the website. Only for links to this website.
     */
    suspend fun primeLink(link: String) {
        val u = link.toHttpUrlOrNull() ?: return
        val base = baseUrl.toHttpUrlOrNull() ?: return
        if (u.host != base.host || u.queryParameter("t").isNullOrEmpty()) return
        try {
            withContext(Dispatchers.IO) { http.newCall(Request.Builder().url(u).get().header("Accept", "text/html").build()).execute().close() }
        } catch (_: Exception) { }
    }

    /* ---------- Requests ---------- */
    suspend fun get(path: String, query: Map<String, Any?> = emptyMap()): JSONObject {
        val b = url("api/" + path).toHttpUrl().newBuilder()
        query.forEach { (k, v) ->
            when (v) {
                null -> {}
                is Collection<*> -> v.forEach { b.addQueryParameter("$k[]", it.toString()) }
                is Boolean -> if (v) b.addQueryParameter(k, "1")
                else -> if (v.toString().isNotEmpty()) b.addQueryParameter(k, v.toString())
            }
        }
        return send(Request.Builder().url(b.build()).get())
    }

    suspend fun post(path: String, body: Map<String, Any?> = emptyMap()): JSONObject {
        val json = JSONObject()
        body.forEach { (k, v) ->
            when (v) {
                null -> {}
                is Collection<*> -> json.put(k, JSONArray(v.toList()))
                is Map<*, *> -> json.put(k, JSONObject(v))
                else -> json.put(k, v)
            }
        }
        return sendWithCsrf { Request.Builder().url(url("api/" + path)).post(json.toString().toRequestBody("application/json".toMediaType())) }
    }

    /** POST to a website address (not under /api/) that answers JSON to the app: sign-in, sign-up, codes, password reset. */
    suspend fun postSite(path: String, body: Map<String, Any?>): JSONObject {
        val json = JSONObject()
        body.forEach { (k, v) -> if (v != null) json.put(k, v) }
        return sendWithCsrf { Request.Builder().url(url(path)).post(json.toString().toRequestBody("application/json".toMediaType())) }
    }

    /** Sign in from the app's own screen. Falls back to the website's form on an older website. */
    suspend fun signIn(email: String, password: String): User {
        try {
            postSite("login", mapOf("email" to email.trim(), "password" to password, "remember" to 1))
        } catch (e: ApiException) {
            if (e.code == "not_json" || e.code == "login_required") return login(email, password)
            throw e
        }
        return refreshSession().user ?: throw ApiException(401, "Incorrect email or password.")
    }

    suspend fun postMultipart(path: String, fields: List<Pair<String, String>>, files: List<Upload>): JSONObject {
        return sendWithCsrf {
            val mb = MultipartBody.Builder().setType(MultipartBody.FORM)
            fields.forEach { (k, v) -> mb.addFormDataPart(k, v) }
            files.forEach { u -> mb.addFormDataPart(u.field, u.file.name, u.file.readBytes().toRequestBody(u.mime.toMediaType())) }
            Request.Builder().url(url("api/" + path)).post(mb.build())
        }
    }

    private suspend fun sendWithCsrf(make: () -> Request.Builder): JSONObject {
        return try {
            send(make().header("X-CSRF-TOKEN", csrf()))
        } catch (e: ApiException) {
            if (e.status != 419) throw e
            refreshSession()   // the session expired: new token, try once more
            send(make().header("X-CSRF-TOKEN", csrf()))
        }
    }

    private suspend fun send(rb: Request.Builder): JSONObject = withContext(Dispatchers.IO) {
        val req = rb.header("Accept", "application/json").header("X-Requested-With", "XMLHttpRequest").build()
        val r = try { http.newCall(req).execute() } catch (e: java.io.IOException) {
            throw ApiException(0, "No connection. Check your internet and try again.", "offline")
        }
        r.use {
            val raw = it.body?.string().orEmpty()
            val j = try { if (raw.trimStart().startsWith("{")) JSONObject(raw) else null } catch (_: Exception) { null }
            if (it.code in 200..299 && j != null) return@withContext j
            // a page instead of JSON: this website is older than the app (sign-in / sign-up then open as web pages)
            if (it.code in 200..299) throw ApiException(it.code, "This needs the latest TripArro website.", "not_json")
            if (it.code in 300..399) throw ApiException(401, "Please sign in first.", "login_required")
            val errs = mutableMapOf<String, String>()
            j?.obj("errors")?.let { e -> e.keys().forEach { k -> errs[k] = e.optString(k) } }
            val msg = j?.str("message") ?: when (it.code) {
                401 -> "Please sign in first."
                403 -> "This is not available for your account."
                404 -> "Not found."
                419 -> "Your session expired."
                429 -> "Too many tries — please wait a minute."
                else -> "Something went wrong (${it.code}). Please try again."
            }
            throw ApiException(it.code, msg, j?.str("code"), errs)
        }
    }

    /* ---------- Cookies shared with the in-app web pages ---------- */
    fun pushCookiesToWebView() {
        val cm = CookieManager.getInstance()
        cm.setAcceptCookie(true)
        val u = baseUrl.toHttpUrl()
        jar.loadForRequest(u).forEach { c -> cm.setCookie(baseUrl, c.toString()) }
        cm.flush()
    }

    fun pullCookiesFromWebView() {
        val cm = CookieManager.getInstance()
        val raw = cm.getCookie(baseUrl) ?: return
        val u = baseUrl.toHttpUrl()
        val list = raw.split(";").mapNotNull { part ->
            val p = part.trim()
            val i = p.indexOf('=')
            if (i <= 0) null else {
                val b = Cookie.Builder().domain(u.host).path("/").name(p.substring(0, i)).value(p.substring(i + 1))
                    .expiresAt(System.currentTimeMillis() + 400L * 24 * 3600 * 1000).httpOnly()
                if (u.isHttps) b.secure()
                b.build()
            }
        }
        jar.saveFromResponse(u, list)
    }
}

/** Keeps the website's cookies (session, remember-me) on the phone, so people stay signed in. */
class PersistentCookieJar(private val prefs: SharedPreferences) : CookieJar {
    private val cookies = mutableMapOf<String, Cookie>()

    init {
        prefs.getStringSet("cookies", emptySet())?.forEach { line ->
            val parts = line.split("\u0001")
            if (parts.size == 2) {
                val u = parts[0].toHttpUrlOrNull()
                val c = u?.let { Cookie.parse(it, parts[1]) }
                if (c != null && c.expiresAt > System.currentTimeMillis()) cookies[key(c)] = c
            }
        }
    }

    private fun String.toHttpUrlOrNull(): HttpUrl? = try { this.toHttpUrl() } catch (_: Exception) { null }
    private fun key(c: Cookie) = c.domain + "|" + c.path + "|" + c.name

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cookies.forEach { c ->
            if (c.expiresAt < System.currentTimeMillis()) this.cookies.remove(key(c)) else this.cookies[key(c)] = c
        }
        persist()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        cookies.values.removeAll { it.expiresAt < now }
        return cookies.values.filter { it.matches(url) }
    }

    @Synchronized
    fun clear() { cookies.clear(); persist() }

    private fun persist() {
        val set = cookies.values.map { c -> "https://" + c.domain + c.path + "\u0001" + c.toString() }.toSet()
        prefs.edit().putStringSet("cookies", set).apply()
    }
}
