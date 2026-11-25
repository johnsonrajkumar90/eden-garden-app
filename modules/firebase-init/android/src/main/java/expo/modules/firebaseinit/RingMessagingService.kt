package expo.modules.firebaseinit

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

/**
 * Force search: a guest needs a stay now, so the host's phone rings like a call — also when the app is closed.
 * The website sends these as data messages with high priority, so Android wakes the app and this code runs;
 * the tune repeats (FLAG_INSISTENT) until the host taps or swipes it, for at most two minutes.
 * Every other message goes to expo-notifications as before.
 */
class RingMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val d = remoteMessage.data
    if (d["kind"] == "force_search" && d["ring"] == "1" && d["for"] == "host") {
      try { Ringer.ring(applicationContext, d["title"] ?: "A guest needs a stay now", d["message"] ?: "Open TripArro to accept."); return }
      catch (e: Exception) { /* fall back to the normal notification below */ }
    }
    super.onMessageReceived(remoteMessage)
  }
}

object Ringer {
  const val CHANNEL = "force_search_call"
  private const val TAG = "force_search_ring"
  private const val ID = 7301

  private fun channel(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL) != null) return
    val ch = NotificationChannel(CHANNEL, "Force search calls", NotificationManager.IMPORTANCE_HIGH)
    ch.description = "Rings like a call when a guest near your stay needs a room now"
    ch.setSound(sound(ctx), AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
    ch.enableVibration(true)
    ch.vibrationPattern = longArrayOf(0, 700, 400, 700, 400, 700, 400, 700)
    ch.enableLights(true); ch.lightColor = Color.parseColor("#D7192A")
    ch.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    nm.createNotificationChannel(ch)
  }

  private fun sound(ctx: Context): Uri {
    val id = ctx.resources.getIdentifier("force_ring_long", "raw", ctx.packageName)
    return if (id != 0) Uri.parse("android.resource://${ctx.packageName}/$id") else android.provider.Settings.System.DEFAULT_RINGTONE_URI
  }

  fun ring(ctx: Context, title: String, text: String) {
    channel(ctx)
    val open = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
      data = Uri.parse("triparro-app://force")
    } ?: return
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)
    val tap = PendingIntent.getActivity(ctx, ID, open, flags)
    val icon = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName).takeIf { it != 0 } ?: R.drawable.triparro_ring_icon
    val n = NotificationCompat.Builder(ctx, CHANNEL)
      .setSmallIcon(icon)
      .setColor(Color.parseColor("#D7192A"))
      .setContentTitle(title)
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setSound(sound(ctx))
      .setVibrate(longArrayOf(0, 700, 400, 700, 400, 700, 400, 700))
      .setContentIntent(tap)
      .addAction(0, "Open TripArro", tap)
      .setAutoCancel(true)
      .setTimeoutAfter(120_000)
      .build()
    n.flags = n.flags or Notification.FLAG_INSISTENT   // the tune repeats until the host acts
    NotificationManagerCompat.from(ctx).notify(TAG, ID, n)
  }

  fun stop(ctx: Context) { NotificationManagerCompat.from(ctx).cancel(TAG, ID) }
}
