package com.triparro.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import coil.Coil
import coil.ImageLoader
import com.triparro.app.core.Api
import com.triparro.app.ui.TripArroTheme

class MainActivity : ComponentActivity() {
    /** A website link the app was opened with (https://…/stays/12, /pet-booking/P7K2M9QX …). */
    val pendingLink = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Api.init(applicationContext)
        // Photos (including private Pet Stay Diary photos) load with the signed-in session
        Coil.setImageLoader(ImageLoader.Builder(this).okHttpClient(Api.http.newBuilder().followRedirects(true).build()).crossfade(true).build())
        pendingLink.value = intent?.dataString
        setContent { TripArroTheme { TripArroApp(this) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.dataString?.let { pendingLink.value = it }
    }
}
