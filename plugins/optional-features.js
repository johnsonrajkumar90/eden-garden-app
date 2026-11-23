// Google Play: hardware the app can work without is marked optional, so tablets, Chromebooks and
// other devices without it can still install TripArro. Play would otherwise treat these as required
// (portrait from the screen orientation, Wi-Fi from the network permissions, camera and GPS from their permissions).
const { withAndroidManifest } = require('@expo/config-plugins');

const OPTIONAL = [
  'android.hardware.screen.portrait',
  'android.hardware.screen.landscape',
  'android.hardware.wifi',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.camera.front',
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
  'android.hardware.microphone',
  'android.hardware.telephony',
  'android.hardware.touchscreen',
];

module.exports = function withOptionalFeatures(config) {
  return withAndroidManifest(config, (c) => {
    const m = c.modResults.manifest;
    m.$['xmlns:tools'] = m.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const list = (m['uses-feature'] = m['uses-feature'] || []);
    for (const name of OPTIONAL) {
      const f = list.find((x) => x.$ && x.$['android:name'] === name);
      if (f) { f.$['android:required'] = 'false'; f.$['tools:replace'] = 'android:required'; }
      else list.push({ $: { 'android:name': name, 'android:required': 'false', 'tools:replace': 'android:required' } });
    }
    return c;
  });
};
