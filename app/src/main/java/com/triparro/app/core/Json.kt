package com.triparro.app.core

import org.json.JSONArray
import org.json.JSONObject

/** Small helpers so screens can read the API's JSON safely (missing or null values never crash). */
fun JSONObject.str(key: String): String? = if (has(key) && !isNull(key)) optString(key).takeIf { it.isNotEmpty() } else null
fun JSONObject.text(key: String, fallback: String = ""): String = str(key) ?: fallback
fun JSONObject.num(key: String): Double? = if (has(key) && !isNull(key)) optDouble(key).takeIf { !it.isNaN() } else null
fun JSONObject.int(key: String, fallback: Int = 0): Int = if (has(key) && !isNull(key)) optInt(key, fallback) else fallback
fun JSONObject.intOrNull(key: String): Int? = if (has(key) && !isNull(key)) optInt(key) else null
fun JSONObject.bool(key: String): Boolean = has(key) && !isNull(key) && optBoolean(key, false)
fun JSONObject.obj(key: String): JSONObject? = if (has(key) && !isNull(key)) optJSONObject(key) else null
fun JSONObject.arr(key: String): JSONArray? = if (has(key) && !isNull(key)) optJSONArray(key) else null
fun JSONObject.objs(key: String): List<JSONObject> = arr(key)?.objects() ?: emptyList()
fun JSONObject.strings(key: String): List<String> = arr(key)?.strings() ?: emptyList()

fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }
fun JSONArray.strings(): List<String> = (0 until length()).mapNotNull { i -> if (isNull(i)) null else optString(i).takeIf { it.isNotEmpty() } }

/** Price lines come either as [label, amount] pairs (pet boarding) or as { label, amount } objects (stays). */
data class PriceLine(val label: String, val amount: Double, val note: String? = null)

fun JSONObject.priceLines(key: String = "lines"): List<PriceLine> {
    val a = arr(key) ?: return emptyList()
    return (0 until a.length()).mapNotNull { i ->
        val o = a.opt(i)
        when (o) {
            is JSONArray -> PriceLine(o.optString(0), o.optDouble(1, 0.0))
            is JSONObject -> PriceLine(o.text("label"), o.num("amount") ?: 0.0, o.str("note"))
            else -> null
        }
    }
}
