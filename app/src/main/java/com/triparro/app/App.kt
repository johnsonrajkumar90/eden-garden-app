package com.triparro.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.compose.foundation.layout.Column
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Luggage
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.Manifest
import android.content.Context
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.triparro.app.core.Notifier
import com.triparro.app.core.int
import com.triparro.app.screens.NotificationsScreen
import com.triparro.app.screens.AuthScreen
import com.triparro.app.screens.PageScreen
import com.triparro.app.screens.DeleteAccountScreen
import com.triparro.app.screens.BecomeHostScreen
import com.triparro.app.screens.BecomePetHostScreen
import com.triparro.app.screens.HostingScreen
import com.triparro.app.screens.OnlineCheckinScreen
import com.triparro.app.screens.ChatScreen
import com.triparro.app.screens.PdfScreen
import com.triparro.app.screens.PhotoScreen
import com.triparro.app.screens.VideoScreen
import com.triparro.app.screens.PetReceiptScreen
import kotlinx.coroutines.launch
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Luggage
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.material.icons.filled.Close
import androidx.compose.foundation.layout.size
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.clickable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.outlined.Groups
import dev.chrisbanes.haze.hazeSource
import com.triparro.app.ui.glass
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.triparro.app.core.Api
import com.triparro.app.screens.AccountScreen
import com.triparro.app.screens.AiScreen
import com.triparro.app.screens.BookingScreen
import com.triparro.app.screens.ExploreScreen
import com.triparro.app.screens.MyPetsScreen
import com.triparro.app.screens.PetBookingScreen
import com.triparro.app.screens.PetFormScreen
import com.triparro.app.screens.PetListingScreen
import com.triparro.app.screens.PetSearchScreen
import com.triparro.app.screens.ProfileScreen
import com.triparro.app.screens.PropertyScreen
import com.triparro.app.screens.ReserveScreen
import com.triparro.app.screens.SavedPetsScreen
import com.triparro.app.screens.TripsScreen
import com.triparro.app.ui.Brand
import com.triparro.app.ui.matte

private data class Tab(val route: String, val label: String, val icon: ImageVector, val selectedIcon: ImageVector = icon)

private val tabs = listOf(
    Tab("explore", "Explore", Icons.Outlined.Explore, Icons.Filled.Explore),
    Tab("pets", "Pets", Icons.Outlined.Pets, Icons.Filled.Pets),
    Tab("trips", "Trips", Icons.Outlined.Luggage, Icons.Filled.Luggage),
    Tab("ai", "AI", Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome),
    Tab("account", "Account", Icons.Outlined.AccountCircle, Icons.Filled.AccountCircle),
)

/** A PDF of this website (invoice, user manual) shown in the app. */
fun NavHostController.openPdf(link: String, title: String) = navigate("pdf?url=" + Uri.encode(link) + "&title=" + Uri.encode(title))

/**
 * Opens a link from the website (deep link, notification, AI answer) on the matching screen of the app.
 * Everything stays in the app: pages without an app screen open the nearest one (never a web page).
 */
fun NavHostController.openLink(link: String) {
    val u = Uri.parse(link)
    val seg = u.pathSegments ?: emptyList()
    val first = seg.firstOrNull() ?: ""
    when {
        seg.size >= 2 && first == "stays" && seg[1].toIntOrNull() != null -> navigate("property/stay/${seg[1]}")
        seg.size >= 2 && first == "resorts" && seg[1].toIntOrNull() != null -> navigate("property/resort/${seg[1]}")
        !u.getQueryParameter("chat").isNullOrEmpty() && (first == "stays" || first == "resorts") -> navigate("chatt/${u.getQueryParameter("chat")}")
        first in listOf("host", "owner") && seg.getOrNull(1) == "chats" && u.getQueryParameter("thread")?.toIntOrNull() != null -> navigate("hostchat/${u.getQueryParameter("thread")}")
        seg.size >= 2 && (first == "places" || first == "place") && seg[1].toIntOrNull() != null -> navigate("place/${seg[1]}")
        seg.size >= 2 && first == "pet-boarding" && seg[1].toIntOrNull() != null -> navigate("petlisting/${seg[1]}")
        seg.size == 3 && first == "pet-booking" && seg[2] == "receipt" -> navigate("petreceipt/${seg[1]}")
        seg.size == 2 && first == "pet-booking" -> navigate("petbooking/${seg[1]}")
        seg.size == 2 && first in listOf("booking", "pay", "resort-booking", "resort-pay") -> navigate("booking/${seg[1]}")
        seg.size == 2 && first == "checkin" -> navigate("checkin?url=" + Uri.encode(link))
        first == "invoices" && (u.path ?: "").endsWith("/pdf") -> openPdf(link, "Invoice")
        (u.path ?: "").endsWith(".pdf") -> openPdf(link, "Document")
        first == "pet-boarding" || first == "pets" -> navigate("pets")
        first in listOf("trips", "my-bookings", "find-booking", "me") -> navigate("trips")
        first == "privacy-policy" -> navigate("page/privacy")
        first == "cancellation-policy" -> navigate("page/cancellation")
        first == "host-terms" -> navigate("page/host-terms")
        first == "become-a-host" -> navigate("become-host")
        first == "become-a-pet-host" -> navigate("become-pet-host")
        first == "delete-account" -> navigate("delete-account")
        first == "login" -> navigate("login")
        first == "signup" -> navigate("signup")
        first in listOf("host", "owner", "pet-host", "referral", "lister", "admin") -> navigate("hosting")
        first == "ai" -> navigate("ai")
        seg.size == 2 && first == "trip-group" -> navigate("groupjoin/${seg[1].uppercase()}")
        else -> navigate("explore") { launchSingleTop = true }
    }
}

@Composable
fun TripArroApp(activity: MainActivity) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route ?: "explore"
    val link by activity.pendingLink
    val scope = rememberCoroutineScope()

    val session by Api.session.collectAsState()
    val unread by Notifier.unread.collectAsState()
    val readId by activity.pendingRead
    val askNotify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    LaunchedEffect(Unit) { try { Api.refreshSession() } catch (_: Exception) { } }
    LaunchedEffect(link) {
        val l = link
        when {
            l == null -> {}
            l.startsWith("http") -> { activity.pendingLink.value = null; Api.primeLink(l); nav.openLink(l) }
            l.startsWith("triparro-app://auth") -> {   // back from Google sign-in in the browser
                activity.pendingLink.value = null
                val u = Uri.parse(l)
                val code = u.getQueryParameter("code")
                if (code.isNullOrEmpty()) { AppState.authMessage.value = u.getQueryParameter("error") ?: "Google sign-in did not work — please try again."; nav.navigate("login") { launchSingleTop = true } }
                else scope.launch {
                    try {
                        Api.post("app-login", mapOf("code" to code))
                        Api.refreshSession()
                        nav.navigate("account") { popUpTo("explore"); launchSingleTop = true }
                    } catch (e: Exception) {
                        AppState.authMessage.value = com.triparro.app.screens.errorText(e)
                        nav.navigate("login") { launchSingleTop = true }
                    }
                }
            }
            l.startsWith("triparro-app://tickets") -> {   // back from Gmail: what was found (or why not)
                activity.pendingLink.value = null
                val u = Uri.parse(l)
                val n = u.getQueryParameter("found")?.toIntOrNull()
                val msg = u.getQueryParameter("error") ?: when (n) { null -> ""; 0 -> "No new tickets found in your Gmail. Gmail access has been given back."; 1 -> "Found 1 ticket — keep it if it's yours. Gmail access has been given back."; else -> "Found $n tickets — keep the ones that are yours. Gmail access has been given back." }
                AppState.refreshTick.value++
                nav.navigate("tickets?msg=" + Uri.encode(msg)) { launchSingleTop = true }
            }
            l.startsWith("triparro-app://") -> {   // the app's own links (notifications, sign in, sign up)
                activity.pendingLink.value = null
                val r = l.removePrefix("triparro-app://")
                if (listOf("notifications", "login", "signup", "page/", "site?", "become-host", "become-pet-host", "hosting", "delete-account", "chat/", "chatt/", "hostchat/", "messages", "place/", "checkin", "petreceipt/").any { r.startsWith(it) }) nav.navigate(r)
            }
        }
    }
    LaunchedEffect(readId) {
        if (readId > 0) { try { Notifier.setUnread(Api.post("notifications/read", mapOf("id" to readId)).int("unread")) } catch (_: Exception) { }; activity.pendingRead.value = 0 }
    }
    // Signed in: check for updates now (badge), and ask once for permission to show phone notifications (Android 13+)
    LaunchedEffect(session?.user?.id) {
        if (session?.user == null) return@LaunchedEffect
        try { Notifier.check(activity, post = false) } catch (_: Exception) { }
        val p = activity.getSharedPreferences("triparro", Context.MODE_PRIVATE)
        if (Build.VERSION.SDK_INT >= 33 && !Notifier.canPost(activity) && !p.getBoolean("asked_notify", false)) {
            p.edit().putBoolean("asked_notify", true).apply()
            askNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    // Back in the app: refresh the badge
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        if (Api.session.value?.user != null) scope.launch { try { Notifier.check(activity) } catch (_: Exception) { } }
    }

    // Glass look: a soft colour backdrop under the whole app; cards and bars are frosted glass over it
    val appHaze = dev.chrisbanes.haze.rememberHazeState()
    Box(Modifier.fillMaxSize()) {
    com.triparro.app.ui.GlassBackdrop(Modifier.fillMaxSize().then(Modifier.hazeSourceCompat(appHaze)))
    androidx.compose.runtime.CompositionLocalProvider(com.triparro.app.ui.LocalHaze provides appHaze) {
    Scaffold(
        containerColor = Color.Transparent,
        // Group trips, one tap away from the main screens
        floatingActionButton = {
            if (current in listOf("explore", "pets", "account")) androidx.compose.material3.ExtendedFloatingActionButton(
                onClick = { nav.navigate("groups") { launchSingleTop = true } },
                icon = { Icon(Icons.Outlined.Groups, null) }, text = { Text("Group trips", fontWeight = FontWeight.SemiBold) },
                containerColor = Brand.Matte, contentColor = Color.White, shape = androidx.compose.foundation.shape.RoundedCornerShape(28.dp),
                modifier = Modifier.padding(bottom = 4.dp),
            )
        },
        bottomBar = {
            if (tabs.any { it.route == current }) {
                Column {
                HorizontalDivider(color = Brand.Line, thickness = 0.5.dp)
                NavigationBar(containerColor = Color.Transparent, tonalElevation = 0.dp, modifier = Modifier.glass(androidx.compose.ui.graphics.RectangleShape, strength = 0.7f)) {
                    tabs.forEach { t ->
                        NavigationBarItem(
                            selected = current == t.route,
                            onClick = {
                                // Explore is the home tab: go back to it (it's always at the bottom of the stack);
                                // other tabs keep their place when you come back to them
                                if (t.route == "explore") {
                                    if (!nav.popBackStack("explore", inclusive = false)) nav.navigate("explore") { launchSingleTop = true }
                                } else nav.navigate(t.route) {
                                    popUpTo("explore") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                val ic = if (current == t.route) t.selectedIcon else t.icon
                                if (t.route == "account" && unread > 0) BadgedBox(badge = { Badge(containerColor = Brand.Coral, contentColor = Color.White) { Text(if (unread > 99) "99+" else unread.toString()) } }) { Icon(ic, contentDescription = "$unread new notifications") }
                                else Icon(ic, contentDescription = null)
                            },
                            label = { Text(t.label, style = MaterialTheme.typography.labelMedium.copy(fontWeight = if (current == t.route) FontWeight.SemiBold else FontWeight.Medium)) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Brand.SunInk, selectedTextColor = Brand.Blue, indicatorColor = Brand.Sun,
                                unselectedIconColor = Brand.Muted, unselectedTextColor = Brand.Muted),
                        )
                    }
                }
                }
            }
        },
    ) { pad ->
        // Full colour at the top: the status bar takes the colour of the screen's header
        val topColor = when {
            current in listOf("explore", "trips", "ai", "account", "login", "signup", "delete-account", "become-host", "become-pet-host", "hosting", "notifications", "messages", "hostchats") || current.startsWith("page/") || current.startsWith("checkin") || current.startsWith("chat") || current.startsWith("hostchat") || current.startsWith("pdf") || current.startsWith("petreceipt") -> Brand.Matte
            current.startsWith("photo") || current.startsWith("video") -> Color.Black
            current.startsWith("group/") -> Color(0xFF15161C)
            current == "pets" -> Brand.Matte
            current.startsWith("property/") || current.startsWith("petlisting/") || current.startsWith("place/") -> Color.Black
            else -> Brand.Matte   // every other screen: red at the top, like the headers
        }
        val view = LocalView.current
        SideEffect {
            WindowCompat.getInsetsController(activity.window, view).isAppearanceLightStatusBars = topColor == Color.White
        }
        Box(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(topColor))
        // Not signed in: the welcome screen when the app opens (Google / email, or look around first)
        var welcomeDone by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(false) }
        val s = session
        if (!welcomeDone && s != null && s.user == null && link == null && current == "explore") {
            com.triparro.app.screens.WelcomeScreen(s.welcome,
                onEmail = { welcomeDone = true; nav.navigate("login") { launchSingleTop = true } },
                onExplore = { welcomeDone = true },
                onPage = { slug -> welcomeDone = true; nav.navigate("page/$slug") })
        }
        OfferPopup(activity, if (session?.user != null || welcomeDone) session?.offerPopup else null) { link -> nav.openLink(if (link.startsWith("/")) Api.url(link) else link) }
        com.triparro.app.screens.RewardPopup(activity, session?.user?.reward) { nav.navigate("wallet") }
        Box(Modifier.fillMaxSize().padding(pad)) {
            NavHost(nav, startDestination = "explore",
                // every screen slides in softly and fades; going back slides the other way
                // Web pages (payment, website pages) appear at once: a WebView created during a fade or slide can stay blank
                enterTransition = { if (isWebRoute(targetState.destination.route)) androidx.compose.animation.EnterTransition.None else androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(260)) + androidx.compose.animation.slideInHorizontally(androidx.compose.animation.core.tween(320)) { it / 10 } },
                exitTransition = { if (isWebRoute(targetState.destination.route) || isWebRoute(initialState.destination.route)) androidx.compose.animation.ExitTransition.None else androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(180)) },
                popEnterTransition = { if (isWebRoute(targetState.destination.route) || isWebRoute(initialState.destination.route)) androidx.compose.animation.EnterTransition.None else androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(260)) + androidx.compose.animation.slideInHorizontally(androidx.compose.animation.core.tween(320)) { -it / 10 } },
                popExitTransition = { if (isWebRoute(initialState.destination.route)) androidx.compose.animation.ExitTransition.None else androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(180)) + androidx.compose.animation.slideOutHorizontally(androidx.compose.animation.core.tween(260)) { it / 10 } },
            ) {
                composable("explore") { ExploreScreen(nav) }
                composable("pets") { PetSearchScreen(nav) }
                composable("chargers") { com.triparro.app.screens.ChargersScreen(nav) }
                composable("planner") { com.triparro.app.screens.PlannerScreen(nav) }
                composable("tripplans") { com.triparro.app.screens.SavedPlansScreen(nav) }
                composable("groups") { com.triparro.app.screens.GroupsHub(nav) }
                composable("group/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.GroupTripScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("tickets?msg={msg}", arguments = listOf(navArgument("msg") { defaultValue = "" })) { e -> com.triparro.app.screens.TicketsScreen(nav, e.arguments?.getString("msg")?.takeIf { it.isNotBlank() }) }
                composable("groupjoin/{code}") { e -> com.triparro.app.screens.GroupJoinScreen(nav, e.arguments?.getString("code") ?: "") }
                composable("tripplan/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.SavedPlanScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("wallet") { com.triparro.app.screens.WalletScreen(nav) }
                composable("notifyprefs") { com.triparro.app.screens.NotifyPrefsScreen(nav) }
                composable("triprun/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.TripRunScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("myplaces") { com.triparro.app.screens.MyPlacesScreen(nav) }
                composable("placeedit/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.PlaceEditScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("trips") { TripsScreen(nav) }
                composable("ai") { AiScreen(nav) }
                composable("account") { AccountScreen(nav) }
                composable("login") { AuthScreen(nav) }
                composable("signup") { AuthScreen(nav, startSignUp = true) }
                composable("profile") { ProfileScreen(nav) }
                composable("notifications") { NotificationsScreen(nav) }
                composable("mypets") { MyPetsScreen(nav) }
                composable("saved") { SavedPetsScreen(nav) }
                composable("reserve") { ReserveScreen(nav) }
                composable("property/{kind}/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e ->
                    PropertyScreen(nav, e.arguments?.getString("kind") ?: "stay", e.arguments?.getInt("id") ?: 0)
                }
                composable("booking/{ref}?paid={paid}&failed={failed}&refund={refund}", arguments = listOf(
                    navArgument("paid") { defaultValue = ""; nullable = true }, navArgument("failed") { defaultValue = ""; nullable = true },
                    navArgument("refund") { defaultValue = ""; nullable = true },
                )) { e ->
                    BookingScreen(nav, e.arguments?.getString("ref") ?: "", notice(e.arguments?.getString("paid"), e.arguments?.getString("failed"), e.arguments?.getString("refund")))
                }
                composable("petlisting/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e ->
                    PetListingScreen(nav, e.arguments?.getInt("id") ?: 0)
                }
                composable("petbooking/{ref}?paid={paid}&failed={failed}&refund={refund}", arguments = listOf(
                    navArgument("paid") { defaultValue = ""; nullable = true }, navArgument("failed") { defaultValue = ""; nullable = true },
                    navArgument("refund") { defaultValue = ""; nullable = true },
                )) { e ->
                    PetBookingScreen(nav, e.arguments?.getString("ref") ?: "", notice(e.arguments?.getString("paid"), e.arguments?.getString("failed"), e.arguments?.getString("refund")))
                }
                composable("petform/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e ->
                    PetFormScreen(nav, e.arguments?.getInt("id") ?: 0)
                }
                composable("page/{slug}") { e -> PageScreen(nav, e.arguments?.getString("slug") ?: "privacy") }
                composable("delete-account") { DeleteAccountScreen(nav) }
                composable("become-host") { BecomeHostScreen(nav) }
                composable("become-pet-host") { BecomePetHostScreen(nav) }
                composable("hosting") { HostingScreen(nav) }
                composable("site?path={path}&title={title}", arguments = listOf(navArgument("path") { defaultValue = "/" }, navArgument("title") { defaultValue = "TripArro" })) { e ->
                    WebScreen(e.arguments?.getString("path") ?: "/", e.arguments?.getString("title") ?: "TripArro", onBack = { nav.popBackStack() }, onAppRoute = { r -> nav.navigate(r) })
                }
                composable("hostcheckin/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.HostCheckinScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("hostchats") { com.triparro.app.screens.HostChatsScreen(nav) }
                composable("hostchat/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.HostChatScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("messages") { com.triparro.app.screens.MessagesScreen(nav) }
                composable("chatt/{token}") { e -> com.triparro.app.screens.ChatTokenScreen(nav, e.arguments?.getString("token") ?: "") }
                composable("place/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e -> com.triparro.app.screens.PlaceScreen(nav, e.arguments?.getInt("id") ?: 0) }
                composable("checkin?url={url}", arguments = listOf(navArgument("url") { defaultValue = "" })) { e -> OnlineCheckinScreen(nav, e.arguments?.getString("url") ?: "") }
                composable("chat/{kind}/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType })) { e ->
                    ChatScreen(nav, e.arguments?.getString("kind") ?: "stay", e.arguments?.getInt("id") ?: 0)
                }
                composable("pdf?url={url}&title={title}", arguments = listOf(navArgument("url") { defaultValue = "" }, navArgument("title") { defaultValue = "Document" })) { e ->
                    PdfScreen(nav, e.arguments?.getString("url") ?: "", e.arguments?.getString("title") ?: "Document")
                }
                composable("photo?url={url}&title={title}", arguments = listOf(navArgument("url") { defaultValue = "" }, navArgument("title") { defaultValue = "" })) { e ->
                    PhotoScreen(nav, e.arguments?.getString("url") ?: "", e.arguments?.getString("title") ?: "")
                }
                composable("video?url={url}", arguments = listOf(navArgument("url") { defaultValue = "" })) { e -> VideoScreen(nav, e.arguments?.getString("url") ?: "") }
                composable("petreceipt/{ref}") { e -> PetReceiptScreen(nav, e.arguments?.getString("ref") ?: "") }
                composable("pay") {
                    val form = AppState.payment.value
                    WebScreen(null, form?.title ?: "Payment", payment = form, onBack = {
                            // left the payment page without paying: close the attempt so the wallet money comes back at once
                            form?.fields?.optString("txnid")?.takeIf { it.isNotBlank() }?.let { t -> scope.launch { try { Api.post("payments/abandon", mapOf("txnid" to t)) } catch (_: Exception) { }; AppState.refreshTick.value++ } }
                            AppState.payment.value = null
                            nav.popBackStack()
                        },
                        onAppRoute = { r ->
                            AppState.payment.value = null
                            AppState.refreshTick.value++
                            nav.popBackStack()
                            nav.navigate(r) { launchSingleTop = true }
                        })
                }
            }
        }
    }
    }
    }
}

private fun notice(paid: String?, failed: String?, refund: String?): String? = when {
    !paid.isNullOrEmpty() -> "paid"
    !failed.isNullOrEmpty() -> "failed"
    !refund.isNullOrEmpty() -> "refund"
    else -> null
}

/**
 * The offer picture the admin set (Admin → Home page & menu → Offer popup), shown once when the app opens
 * and again only after the admin's number of days (or when the admin changes the picture).
 */
@Composable
private fun OfferPopup(activity: MainActivity, offer: org.json.JSONObject?, open: (String) -> Unit) {
    val prefs = remember { activity.getSharedPreferences("triparro", Context.MODE_PRIVATE) }
    var shownThisRun by remember { androidx.compose.runtime.mutableStateOf(false) }
    var visible by remember { androidx.compose.runtime.mutableStateOf(false) }
    val id = offer?.optString("id").orEmpty()
    LaunchedEffect(id) {
        if (offer == null || id.isEmpty() || shownThisRun) return@LaunchedEffect
        val key = "offer_seen_$id"
        val last = prefs.getLong(key, 0L)
        val days = offer.optInt("days", 1)
        if (last > 0 && days > 0 && System.currentTimeMillis() - last < days * 86_400_000L) return@LaunchedEffect
        // load the picture first: the popup opens complete, and a picture that can't load never leaves an empty dialog
        // (nor is it counted as seen, so it is tried again next time)
        val ok = try {
            coil.Coil.imageLoader(activity).execute(coil.request.ImageRequest.Builder(activity).data(offer.optString("image")).build()) is coil.request.SuccessResult
        } catch (e: Exception) { false }
        if (!ok) return@LaunchedEffect
        kotlinx.coroutines.delay(600)
        shownThisRun = true
        visible = true
        prefs.edit().putLong(key, System.currentTimeMillis()).apply()
    }
    if (!visible || offer == null) return
    val close = { visible = false }
    androidx.compose.ui.window.Dialog(onDismissRequest = close, properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = androidx.compose.ui.Alignment.Center) {
            val link = offer.optString("link").takeIf { it.isNotEmpty() && it != "null" }
            coil.compose.AsyncImage(model = offer.optString("image"), contentDescription = "Offer", contentScale = androidx.compose.ui.layout.ContentScale.FillWidth,
                modifier = Modifier.fillMaxWidth().clip(androidx.compose.foundation.shape.RoundedCornerShape(26.dp))
                    .let { m -> if (link != null) m.clickable { visible = false; open(link) } else m })
            Box(Modifier.align(androidx.compose.ui.Alignment.TopEnd).padding(8.dp).size(40.dp).clip(androidx.compose.foundation.shape.CircleShape)
                .background(Color.White.copy(alpha = 0.85f)).clickable { visible = false }, contentAlignment = androidx.compose.ui.Alignment.Center) {
                Icon(androidx.compose.material.icons.Icons.Filled.Close, "Close", tint = Brand.Ink)
            }
        }
    }
}


/** The app's colour backdrop is what every glass surface blurs. */
private fun Modifier.hazeSourceCompat(state: dev.chrisbanes.haze.HazeState): Modifier = this.then(Modifier.hazeSource(state))


/** Screens that show a web page (payment, website pages, PDFs): no slide or fade for them. */
private fun isWebRoute(route: String?): Boolean = route != null && (route == "pay" || route.startsWith("site?") || route.startsWith("pdf?"))
