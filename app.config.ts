import type { ExpoConfig } from 'expo/config';

// Build number from the GitHub build (BUILD_NUMBER); the app keeps the same Android ID as the native app, so it installs as an update.
const build = Number(process.env.BUILD_NUMBER || 1);

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
    ['expo-build-properties', { android: { minSdkVersion: 24, targetSdkVersion: 36 } }],
    ['expo-splash-screen', { image: './assets/splash-logo.png', imageWidth: 220, backgroundColor: '#C41E2E' }],
    ['expo-notifications', { color: '#D7192A' }],
    ['expo-location', { locationWhenInUsePermission: 'TripArro uses your location to name the place you are at and to find chargers near you.' }],
    ['expo-image-picker', { photosPermission: 'TripArro lets you choose photos for trips, posts and favourites.', cameraPermission: 'TripArro uses the camera for trip photos, receipts and guest ID scans.' }],
    ['expo-font', { fonts: ['./assets/fonts/poppins_medium.ttf', './assets/fonts/poppins_semibold.ttf', './assets/fonts/poppins_bold.ttf', './assets/fonts/inter_regular.ttf', './assets/fonts/inter_medium.ttf', './assets/fonts/inter_semibold.ttf', './assets/fonts/inter_bold.ttf'] }],
    'expo-web-browser',
    'expo-background-task',
    'expo-sharing',
    'expo-image',
    '@react-native-community/datetimepicker',
  ],
  // hasMapsKey: only whether a key was built in (never the key itself)
  extra: { siteUrl: 'https://triparro.com', hasMapsKey: !!(process.env.MAPS_API_KEY || '').trim() },
};

export default config;
