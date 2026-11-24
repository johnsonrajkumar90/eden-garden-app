import type { ExpoConfig } from 'expo/config';

// Build number from the GitHub build (BUILD_NUMBER); the app keeps the same Android ID as the native app, so it installs as an update.
const build = Number(process.env.BUILD_NUMBER || 1);

// R8 keep rules: classes the app finds by name at run time must not be renamed or removed.
// React Native, Hermes, Reanimated, Screens and Firebase ship their own rules inside their libraries.
const PROGUARD = `
-keep class com.rnmaps.** { *; }
-keep class com.google.android.gms.maps.** { *; }
-keep class com.reactnativecommunity.** { *; }
-keep class com.reactcommunity.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keep class com.reactnativepagerview.** { *; }
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }
-keep class triparro.com.** { *; }
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class androidx.work.** { *; }
-keep class androidx.startup.** { *; }
-keep class * implements androidx.startup.Initializer { <init>(); }
-keep class * extends androidx.work.ListenableWorker { <init>(...); }
-keep class * extends android.app.Application { <init>(); }
-keep class * extends android.content.ContentProvider { <init>(); }
-keep class * extends android.content.BroadcastReceiver { <init>(); }
-keep class * extends android.app.Service { <init>(); }
-keep class com.google.android.gms.** { *; }
-keep class com.google.android.play.core.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keepclasseswithmembernames,includedescriptorclasses class * { native <methods>; }
-keep class * implements com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.bridge.BaseJavaModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule { *; }
-keep class com.rnmlkit.** { *; }
-keep class com.google.mlkit.** { *; }
-keep class com.shopify.** { *; }
-keep class com.reactnativemlkit.** { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; @com.facebook.proguard.annotations.DoNotStrip *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-dontwarn com.facebook.**
-dontwarn expo.modules.**
-dontwarn com.google.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
`;

const config: ExpoConfig = {
  name: 'TripArro',
  slug: 'triparro',
  scheme: 'triparro-app',
  version: `3.0.${build}`,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#C41E2E',
  ios: {
    bundleIdentifier: 'com.triparro.app',
    buildNumber: String(build),
    supportsTablet: false,
    config: { googleMapsApiKey: process.env.MAPS_API_KEY_IOS || process.env.MAPS_API_KEY || '' },
    associatedDomains: ['applinks:triparro.com'],
    infoPlist: {
      NSCameraUsageDescription: 'TripArro uses the camera for trip photos, receipts and guest ID scans.',
      NSPhotoLibraryUsageDescription: 'TripArro lets you choose photos for trips, posts and favourites.',
      NSLocationWhenInUseUsageDescription: 'TripArro uses your location to name the place you are at and to find chargers near you.',
    },
  },
  android: {
    package: 'triparro.com',
    versionCode: 1000 + build,   // above every native app version (2.0.x used 300+), so phones update to this one
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-foreground.png',
      backgroundImage: './assets/adaptive-background.png',
      monochromeImage: './assets/adaptive-monochrome.png',
    },
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS', 'CAMERA'],
    config: { googleMaps: { apiKey: process.env.MAPS_API_KEY || '' } },
    intentFilters: [
      {
        action: 'VIEW', autoVerify: true, category: ['BROWSABLE', 'DEFAULT'],
        data: ['/stays/', '/resorts/', '/pet-boarding', '/pet-booking/', '/booking/', '/pay/', '/resort-booking/', '/trip-group/']
          .flatMap((p) => [{ scheme: 'https', host: 'triparro.com', pathPrefix: p }, { scheme: 'https', host: 'www.triparro.com', pathPrefix: p }]),
      },
    ],
  },
  plugins: [
    ['expo-build-properties', { android: { minSdkVersion: 24, targetSdkVersion: 36, useLegacyPackaging: true, enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: false, extraProguardRules: PROGUARD } }],   // R8: smaller, faster code (Google Play's DEX optimization)   // compressed native libraries: a much smaller APK
    ['expo-splash-screen', { image: './assets/splash-logo.png', imageWidth: 220, backgroundColor: '#C41E2E' }],
    ['expo-notifications', { color: '#D7192A', sounds: ['./assets/force_ring.wav', './assets/force_ring_long.wav'] }],   // Force search: the host's phone rings with this tune
    ['expo-audio', { recordAudioAndroid: false, microphonePermission: false, enableBackgroundPlayback: false }],   // only the short message sound: no microphone, no background audio
    ['expo-location', { locationWhenInUsePermission: 'TripArro uses your location to name the place you are at and to find chargers near you.' }],
    ['expo-image-picker', { photosPermission: 'TripArro lets you choose photos for trips, posts and favourites.', cameraPermission: 'TripArro uses the camera for trip photos, receipts and guest ID scans.' }],
    ['expo-font', { fonts: ['./assets/fonts/poppins_medium.ttf', './assets/fonts/poppins_semibold.ttf', './assets/fonts/poppins_bold.ttf', './assets/fonts/inter_regular.ttf', './assets/fonts/inter_medium.ttf', './assets/fonts/inter_semibold.ttf', './assets/fonts/inter_bold.ttf'] }],
    'expo-web-browser',
    'expo-background-task',
    'expo-sharing',
    'expo-image',
    '@react-native-community/datetimepicker',
    './plugins/optional-features',   // Google Play: portrait screen, Wi-Fi, camera, GPS are not required to install
  ],
  // hasMapsKey: only whether a key was built in (never the key itself)
  extra: { siteUrl: 'https://triparro.com', hasMapsKey: !!(process.env.MAPS_API_KEY || '').trim() },
};

export default config;
