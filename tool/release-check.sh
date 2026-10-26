#!/bin/bash
# Emulator test, part 2: if a release-signed APK is waiting on the "release-check" branch, remove the test install,
# install the release APK (signed with the upload key), open it and record which certificate Android sees.
PKG=triparro.com
[ -f release.apk ] || { echo "no release APK to check" > screens/release-check.txt; exit 0; }
{
  echo "== uninstall test build"; adb uninstall $PKG
  echo "== install release APK"; adb install release.apk
  echo "== signing certificate Android sees"; adb shell dumpsys package $PKG | grep -iE "signatures|versionName|versionCode|pkgFlags" | head -8
  echo "== launch"; adb shell am start -W -n $PKG/com.triparro.app.MainActivity
} > screens/release-check.txt 2>&1
sleep 8; adb exec-out screencap -p > screens/30-release-app.png
adb logcat -d -s AndroidRuntime:E >> screens/release-check.txt 2>&1 || true
