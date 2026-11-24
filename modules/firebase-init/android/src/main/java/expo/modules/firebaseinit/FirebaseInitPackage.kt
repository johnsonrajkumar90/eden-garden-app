package expo.modules.firebaseinit

import android.app.Application
import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

/**
 * Start Firebase as soon as the app's process starts — also when Android wakes the app only to deliver a push while
 * the app is closed (Force search ringing a host, new bookings). The settings were saved the first time the app
 * started Firebase with the website's public settings (FirebaseInitModule.initialize).
 */
class FirebaseInitPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context?): List<ApplicationLifecycleListener> =
    listOf(object : ApplicationLifecycleListener {
      override fun onCreate(application: Application) { FirebaseInitStore.start(application) }
    })
}

object FirebaseInitStore {
  private const val PREFS = "triparro_firebase"

  fun save(ctx: Context, apiKey: String, appId: String, projectId: String, senderId: String) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString("api_key", apiKey).putString("app_id", appId).putString("project_id", projectId).putString("sender_id", senderId).apply()
  }

  /** Firebase with the saved settings (nothing saved yet, or already started: nothing to do). */
  fun start(ctx: Context): Boolean {
    return try {
      if (FirebaseApp.getApps(ctx).isNotEmpty()) return true
      val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val apiKey = p.getString("api_key", null) ?: return false
      val appId = p.getString("app_id", null) ?: return false
      val projectId = p.getString("project_id", null) ?: return false
      val senderId = p.getString("sender_id", null) ?: return false
      FirebaseApp.initializeApp(ctx, FirebaseOptions.Builder().setApiKey(apiKey).setApplicationId(appId).setProjectId(projectId).setGcmSenderId(senderId).build())
      true
    } catch (e: Exception) { false }
  }
}
