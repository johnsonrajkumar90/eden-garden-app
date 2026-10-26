package com.triparro.app.core

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.SystemClock
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.core.os.CancellationSignal
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.selects.select
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/** The result of asking for the phone's location. */
sealed interface LocResult {
    data class Found(val lat: Double, val lng: Double, val accuracyM: Float) : LocResult
    /** No location permission. */
    data object Denied : LocResult
    /** Location (GPS / network) is switched off in the phone's settings. */
    data object Off : LocResult
    /** Location is on, but no position came back in time (indoors, no signal…). */
    data object NotFound : LocResult
}

/**
 * Current location — a real, fresh fix, not only the last one the phone happened to remember:
 *  1. a last-known position from the past 2 minutes is used straight away;
 *  2. otherwise the network and GPS providers are asked for a new position at the same time and the first answer wins;
 *  3. if nothing comes back within [timeoutMs], the newest last-known position (up to a day old) is used.
 * The last good fix is kept in [lastFix] for screens that only want "near me" without asking again.
 */
object LocationHelper {
    @Volatile var lastFix: LocResult.Found? = null
        private set

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun isEnabled(context: Context): Boolean {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return LocationManagerCompat.isLocationEnabled(lm)
    }

    /** Opens the phone's location settings (to switch location on). */
    fun openLocationSettings(context: Context) {
        try { context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { openAppSettings(context) }
    }

    /** Opens this app's settings page (to allow a permission that was turned down for good). */
    fun openAppSettings(context: Context) {
        try {
            context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) { }
    }

    private fun Location.ageMs(): Long = (SystemClock.elapsedRealtimeNanos() - elapsedRealtimeNanos) / 1_000_000

    private fun found(l: Location) = LocResult.Found(l.latitude, l.longitude, l.accuracy).also { lastFix = it }

    @SuppressLint("MissingPermission")
    suspend fun current(context: Context, timeoutMs: Long = 15_000): LocResult {
        if (!hasPermission(context)) return LocResult.Denied
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        if (!LocationManagerCompat.isLocationEnabled(lm)) return LocResult.Off
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val providers = buildList {
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) add(LocationManager.NETWORK_PROVIDER)
            if (fine && lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) add(LocationManager.GPS_PROVIDER)
            if (isEmpty() && lm.allProviders.contains("fused") && lm.isProviderEnabled("fused")) add("fused")
        }
        val known = (providers + LocationManager.PASSIVE_PROVIDER).distinct()
            .mapNotNull { p -> try { lm.getLastKnownLocation(p) } catch (_: Exception) { null } }
            .minByOrNull { it.ageMs() }
        if (known != null && known.ageMs() < 2 * 60_000 && known.accuracy < 2_000) return found(known)
        if (providers.isEmpty()) return known?.takeIf { it.ageMs() < 24 * 3600_000L }?.let { found(it) } ?: LocResult.NotFound

        val signal = CancellationSignal()
        val fresh = withTimeoutOrNull(timeoutMs) {
            coroutineScope {
                val asks = providers.map { p ->
                    async(Dispatchers.Main) {
                        val d = CompletableDeferred<Location?>()
                        try {
                            LocationManagerCompat.getCurrentLocation(lm, p, signal, ContextCompat.getMainExecutor(context)) { d.complete(it) }
                        } catch (_: Exception) { d.complete(null) }
                        d.await()
                    }
                }
                // first provider that gives a position wins; if every provider answers "nothing", give up early
                var left = asks.toMutableList()
                var got: Location? = null
                while (got == null && left.isNotEmpty()) {
                    val (which, loc) = select<Pair<kotlinx.coroutines.Deferred<Location?>, Location?>> { left.forEach { a -> a.onAwait { a to it } } }
                    left = left.filter { it !== which }.toMutableList()
                    got = loc
                }
                left.forEach { it.cancel() }
                got
            }
        }
        signal.cancel()
        if (fresh != null) return found(fresh)
        return withContext(Dispatchers.Default) { known?.takeIf { it.ageMs() < 24 * 3600_000L } }?.let { found(it) } ?: LocResult.NotFound
    }
}
