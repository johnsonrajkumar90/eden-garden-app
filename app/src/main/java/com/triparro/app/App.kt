package com.triparro.app

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

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("explore", "Explore", Icons.Outlined.Explore),
    Tab("pets", "Pets", Icons.Outlined.Pets),
    Tab("trips", "Trips", Icons.Outlined.Luggage),
    Tab("ai", "AI", Icons.Outlined.AutoAwesome),
    Tab("account", "Account", Icons.Outlined.AccountCircle),
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
        appRouteFor(link) != null -> navigate(appRouteFor(link)!!)
        else -> openWeb(u.path ?: "/")
    }
}

@Composable
fun TripArroApp(activity: MainActivity) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route ?: "explore"
    val link by activity.pendingLink

    LaunchedEffect(Unit) { try { Api.refreshSession() } catch (_: Exception) { } }
    LaunchedEffect(link) {
        val l = link
        if (l != null && l.startsWith("http")) { nav.openLink(l); activity.pendingLink.value = null }
    }

    Scaffold(
        containerColor = Brand.Page,
        bottomBar = {
            if (tabs.any { it.route == current }) {
                NavigationBar(containerColor = Color.White) {
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
                            icon = { Icon(t.icon, contentDescription = null) },
                            label = { Text(t.label) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Brand.Blue, selectedTextColor = Brand.Blue, indicatorColor = Brand.Sky),
                        )
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
