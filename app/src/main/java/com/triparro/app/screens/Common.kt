package com.triparro.app.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import com.triparro.app.core.ApiException

/** Loading / error / data for one API call, reloaded with reload() or when the keys change. */
class Loader<T>(val data: MutableState<T?>, val error: MutableState<String?>, val loading: MutableState<Boolean>, private val tick: androidx.compose.runtime.MutableIntState) {
    fun reload() { tick.intValue++ }
}

@Composable
fun <T> rememberLoader(vararg keys: Any?, load: suspend () -> T): Loader<T> {
    val data = remember(*keys) { mutableStateOf<T?>(null) }
    val error = remember(*keys) { mutableStateOf<String?>(null) }
    val loading = remember(*keys) { mutableStateOf(true) }
    val tick = remember { mutableIntStateOf(0) }
    LaunchedEffect(*keys, tick.intValue) {
        loading.value = true
        error.value = null
        try { data.value = load() } catch (e: Exception) { error.value = errorText(e) }
        loading.value = false
    }
    return Loader(data, error, loading, tick)
}

fun errorText(e: Throwable): String {
    val m = (e as? ApiException)?.message ?: e.message ?: return "Something went wrong."
    // the website hasn't been updated with this feature yet
    return if (m == "Unknown API address.") "This part of TripArro isn't available yet — please try again later." else m
}
