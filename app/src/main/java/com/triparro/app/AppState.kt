package com.triparro.app

import androidx.compose.runtime.mutableStateOf
import org.json.JSONObject

/** What one screen hands to the next (a booking being prepared, a payment form to open). */
object AppState {
    /** Bumped after a change elsewhere (e.g. a favourite place saved) so lists load again. */
    val refreshTick = mutableStateOf(0)

    /** Stay / resort booking being prepared: the listing, the quote and the chosen dates and guests. */
    var reserve = mutableStateOf<ReserveDraft?>(null)

    /** A payment form from the API ({ action, fields }) and where to go when the gateway sends the guest back. */
    var payment = mutableStateOf<PaymentForm?>(null)

    /** The AI tab: "travel" (stays, resorts, trips) or "pets" (pet boarding assistant). */
    var aiMode = mutableStateOf("travel")

    /** Google sign-in: a message for the sign-in screen when it did not work. */
    var authMessage = mutableStateOf<String?>(null)

    /** Bumped after a payment or a change, so lists reload. */
    var refreshTick = mutableStateOf(0)
}

data class ReserveDraft(
    val kind: String,
    val id: Int,
    val title: String,
    val image: String?,
    val checkIn: String,
    val checkOut: String,
    val adults: Int,
    val ages: List<Int>,
    val food: Boolean,
    val coupon: String,
    val roomId: Int?,
    val planId: Int?,
    val rooms: Int,
    val quote: JSONObject,
)

data class PaymentForm(val action: String, val fields: JSONObject, val title: String)
