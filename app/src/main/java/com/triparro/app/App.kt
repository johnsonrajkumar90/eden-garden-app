package com.triparro.app

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
import androidx.compose.ui.Modifier
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
import com.triparro.app.screens.LoginScreen
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

private data class Tab(val route: String, val label: String, val icon: ImageVector, val selectedIcon: ImageVector = icon)

private val tabs = listOf(
    Tab("explore", "Explore", Icons.Outlined.Explore, Icons.Filled.Explore),
    Tab("pets", "Pets", Icons.Outlined.Pets, Icons.Filled.Pets),
    Tab("trips", "Trips", Icons.Outlined.Luggage, Icons.Filled.Luggage),
    Tab("ai", "AI", Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome),
    Tab("account", "Account", Icons.Outlined.AccountCircle, Icons.Filled.AccountCircle),
)

/** Opens a website page inside the app. */
fun NavHostController.openWeb(path: String, title: String = "TripArro") = navigate("web?url=" + Uri.encode(path) + "&title=" + Uri.encode(title))

/** Opens a link from the website (deep link) on the matching native screen, or as a web page. */
fun NavHostController.openLink(link: String) {
    val u = Uri.parse(link)
    val seg = u.pathSegments ?: emptyList()
    when {
        seg.size >= 2 && seg[0] == "stays" && seg[1].toIntOrNull() != null -> navigate("property/stay/${seg[1]}")
        seg.size >= 2 && seg[0] == "resorts" && seg[1].toIntOrNull() != null -> navigate("property/resort/${seg[1]}")
        seg.size >= 2 && seg[0] == "pet-boarding" && seg[1].toIntOrNull() != null -> navigate("petlisting/${seg[1]}")
        seg.size == 1 && seg[0] == "pet-boarding" -> navigate("pets")
        seg.size == 2 && seg[0] == "pet-booking" -> navigate("petbooking/${seg[1]}")
        seg.size == 2 && seg[0] in listOf("booking", "pay", "resort-booking", "resort-pay") -> navigate("booking/${seg[1]}")
        else -> openWeb(u.path ?: "/")
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
            l == "triparro-app://notifications" -> { activity.pendingLink.value = null; nav.navigate("notifications") }
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

    Scaffold(
        containerColor = Brand.Page,
        bottomBar = {
            if (tabs.any { it.route == current }) {
                Column {
                HorizontalDivider(color = Brand.Line, thickness = 0.5.dp)
                NavigationBar(containerColor = Color.White, tonalElevation = 0.dp) {
                    tabs.forEach { t ->
                        NavigationBarItem(
                            selected = current == t.route,
                            onClick = {
                                nav.navigate(t.route) {
                                    popUpTo("explore") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                val ic = if (current == t.route) t.selectedIcon else t.icon
                                if (t.route == "account" && unread > 0) BadgedBox(badge = { Badge(containerColor = Brand.Coral) { Text(if (unread > 99) "99+" else unread.toString()) } }) { Icon(ic, contentDescription = "$unread new notifications") }
                                else Icon(ic, contentDescription = null)
                            },
                            label = { Text(t.label, style = MaterialTheme.typography.labelMedium.copy(fontWeight = if (current == t.route) FontWeight.SemiBold else FontWeight.Medium)) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Brand.Blue, selectedTextColor = Brand.Blue, indicatorColor = Brand.Sky,
                                unselectedIconColor = Brand.Muted, unselectedTextColor = Brand.Muted),
                        )
                    }
                }
                }
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(pad)) {
            NavHost(nav, startDestination = "explore") {
                composable("explore") { ExploreScreen(nav) }
                composable("pets") { PetSearchScreen(nav) }
                composable("trips") { TripsScreen(nav) }
                composable("ai") { AiScreen(nav) }
                composable("account") { AccountScreen(nav) }
                composable("login") { LoginScreen(nav) }
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
                composable("web?url={url}&title={title}", arguments = listOf(
                    navArgument("url") { defaultValue = "/" }, navArgument("title") { defaultValue = "TripArro" },
                )) { e ->
                    WebScreen(e.arguments?.getString("url"), e.arguments?.getString("title") ?: "TripArro", onBack = { nav.popBackStack() },
                        onAppRoute = { r -> nav.popBackStack(); nav.navigate(r) })
                }
                composable("pay") {
                    val form = AppState.payment.value
                    WebScreen(null, form?.title ?: "Payment", payment = form, onBack = { nav.popBackStack() },
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

private fun notice(paid: String?, failed: String?, refund: String?): String? = when {
    !paid.isNullOrEmpty() -> "paid"
    !failed.isNullOrEmpty() -> "failed"
    !refund.isNullOrEmpty() -> "refund"
    else -> null
}
