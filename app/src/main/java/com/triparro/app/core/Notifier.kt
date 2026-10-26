package com.triparro.app.core

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.triparro.app.MainActivity
import com.triparro.app.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Booking updates as phone notifications.
 * The website keeps every signed-in person's notifications (booking confirmed, payment link, check-in, Pet Stay Diary updates,
 * reminders…). The app checks for new ones in the background about every 15 minutes (Android's shortest background interval)
 * and when it opens, and shows each new one as a notification. Tapping it opens the booking in the app.
 * Instant push (seconds, even when the app has not run for days) needs Firebase Cloud Messaging — see README.
 */
object Notifier {
    const val CHANNEL = "updates"
    const val EXTRA_ID = "notification_id"
    private const val WORK = "triparro-notifications"
    private const val PREFS = "triparro_notify"

    private val _unread = MutableStateFlow(0)
    /** Unread count for the badge on the Account tab. */
    val unread: StateFlow<Int> = _unread
    fun setUnread(n: Int) { _unread.value = n }

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Booking updates", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Booking confirmations, payment links, check-in, Pet Stay Diary updates and reminders"
            })
        }
    }

    fun canPost(context: Context): Boolean =
        (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(context).areNotificationsEnabled()

    /** Background checks every 15 minutes (needs internet), plus one now. */
    fun schedule(context: Context) {
        val wm = WorkManager.getInstance(context)
        val net = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<NotificationsWorker>(15, TimeUnit.MINUTES).setConstraints(net).build())
        wm.enqueueUniqueWork("$WORK-now", ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<NotificationsWorker>().setConstraints(net).build())
    }

    /** After signing out: stop, and forget what was seen (the next account starts fresh). */
    fun reset(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
        NotificationManagerCompat.from(context).cancelAll()
        _unread.value = 0
    }

    /**
     * Fetch new notifications and show them. The first check after signing in only remembers where the list stands,
     * so old notifications don't all pop up at once (they are in Account → Notifications).
     */
    suspend fun check(context: Context, post: Boolean = true): Int {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val user = try { Api.session.value?.user ?: Api.refreshSession().user } catch (_: Exception) { null } ?: return 0
        val key = "last_${user.id}"
        val last = p.getLong(key, -1L)
        val j = Api.get("notifications", mapOf("after" to (if (last > 0) last else null), "limit" to 20))
        _unread.value = j.int("unread")
        val items = j.objs("items")
        val top = items.maxOfOrNull { it.int("id").toLong() } ?: last
        if (last < 0) { p.edit().putLong(key, maxOf(top, 0L)).apply(); return 0 }
        val fresh = items.filter { !it.bool("read") && it.int("id") > last }.sortedBy { it.int("id") }
        if (post && canPost(context)) fresh.takeLast(5).forEach { show(context, it) }
        if (top > last) p.edit().putLong(key, top).apply()
        return fresh.size
    }

    private fun show(context: Context, n: JSONObject) {
        createChannel(context)
        val id = n.int("id")
        val link = n.text("link")
        val open = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = if (link.startsWith("http")) Uri.parse(link) else Uri.parse("triparro-app://notifications")
            putExtra(EXTRA_ID, id)
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pi = PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val body = n.text("body")
        val notif = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setColor(0xFF0E3A7A.toInt())
            .setContentTitle(n.text("title"))
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .build()
        try { NotificationManagerCompat.from(context).notify(id, notif) } catch (_: SecurityException) { }
    }
}

class NotificationsWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        Api.init(applicationContext)
        return try { Notifier.check(applicationContext); Result.success() }
        catch (e: ApiException) { Result.success() }   // signed out, site not updated yet… try again next time
        catch (e: Exception) { Result.retry() }
    }
}
