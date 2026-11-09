import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Release signing: key.properties in the project root (the GitHub workflow writes it from the repository secrets).
// Without it the release build is signed with the debug key — fine for testing, not for Google Play.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }

// The build number goes up on every GitHub build (BUILD_NUMBER), so each APK installs over the last one.
// the build number: BUILD_NUMBER (GitHub) or triparro.buildNumber in gradle.properties (Android Studio on a computer)
val buildNumber = (System.getenv("BUILD_NUMBER") ?: (project.findProperty("triparro.buildNumber") as String?) ?: "1").toInt()

android {
    namespace = "com.triparro.app"
    compileSdk = 36

    defaultConfig {
        // The app's permanent ID on Google Play
        applicationId = "triparro.com"
        minSdk = 24
        targetSdk = 36
        versionCode = 300 + buildNumber
        versionName = "2.0.$buildNumber"
        // The live website whose API the app uses (can be changed in the app: Account → About → Server)
        buildConfigField("String", "SITE_URL", "\"https://triparro.com\"")
        // Google Maps (trip map): an Android key restricted to this app, from the MAPS_API_KEY build secret — never kept in the code.
        // Without it the trip map uses OpenStreetMap.
        manifestPlaceholders["mapsApiKey"] = System.getenv("MAPS_API_KEY") ?: ""
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (keystorePropertiesFile.exists()) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
        // triparro.storeBuild=true (gradle.properties): Android Studio's plain "Build APK(s)" / "Build Bundle(s)" make a
        // store-ready build — not debuggable, signed with the upload key — without switching the build variant
        if (project.findProperty("triparro.storeBuild") == "true") getByName("debug") {
            isDebuggable = false
            isJniDebuggable = false
            if (keystorePropertiesFile.exists()) signingConfig = signingConfigs.getByName("release")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        // java.time (dates) on Android 7.x too
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.07.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.navigation:navigation-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.browser:browser:1.8.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt:coil-compose:2.7.0")
    // frosted-glass blur behind cards and bars (Android 12+; a clear tint on older phones)
    implementation("dev.chrisbanes.haze:haze:1.6.10")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("androidx.work:work-runtime-ktx:2.10.1")
    // reads the text on a photo (receipts, ID cards) on the phone itself — the model comes with Google Play services, nothing is sent to Google
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.1")
    // finds QR codes on ID cards so they can be blacked out (Aadhaar QR codes carry the full number)
    implementation("com.google.android.gms:play-services-mlkit-barcode-scanning:18.3.1")
    // the trip map: a native OpenStreetMap view with a pin for every place (no key needed)
    implementation("org.osmdroid:osmdroid-android:6.1.20")
    implementation("com.google.android.gms:play-services-maps:19.0.0")
    implementation("com.google.maps.android:maps-compose:6.4.1")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
