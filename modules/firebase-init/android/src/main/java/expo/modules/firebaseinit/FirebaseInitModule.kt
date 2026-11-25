package expo.modules.firebaseinit

import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Firebase is started from the app, with the public settings the website gives (Admin → Push notifications):
 * API key, Android app ID, project ID and sender ID. Then expo-notifications can get the phone's push token.
 */
class FirebaseInitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FirebaseInit")

    /** Stop a Force search ring that is still sounding (the app is open now and shows its own ringing screen). */
    Function("stopRing") {
      val ctx = appContext.reactContext ?: return@Function false
      Ringer.stop(ctx.applicationContext)
      true
    }

    Function("isReady") {
      val ctx = appContext.reactContext ?: return@Function false
      FirebaseApp.getApps(ctx).isNotEmpty()
    }

    Function("initialize") { apiKey: String, appId: String, projectId: String, senderId: String ->
      val ctx = appContext.reactContext ?: return@Function false
      // kept, so Firebase starts by itself next time — even when Android wakes the closed app for a push
      FirebaseInitStore.save(ctx.applicationContext, apiKey, appId, projectId, senderId)
      if (FirebaseApp.getApps(ctx).isNotEmpty()) return@Function true
      val options = FirebaseOptions.Builder()
        .setApiKey(apiKey)
        .setApplicationId(appId)
        .setProjectId(projectId)
        .setGcmSenderId(senderId)
        .build()
      FirebaseApp.initializeApp(ctx, options)
      true
    }
  }
}
