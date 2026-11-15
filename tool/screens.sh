#!/bin/bash
# Emulator check: installs the APK, opens the app and a few screens (against the live site), takes screenshots
# and keeps any JavaScript crash from the log.
set -x
PKG=triparro.com
adb install -r app.apk
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS || true
adb shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION || true
adb shell settings put secure location_mode 3 || true
adb emu geo fix 76.9558 11.0168 || true
adb logcat -c
shot() { sleep "${2:-8}"; adb exec-out screencap -p > "screens/$1.png"; }
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1; shot 01-start 20
adb shell input keyevent KEYCODE_BACK; shot 02-after-back 6
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1; shot 03-reopen 8
for r in login signup notifications hosting groups messages page/privacy become-host; do
  adb shell am start -W -a android.intent.action.VIEW -d "triparro-app://$r" $PKG >/dev/null 2>&1; shot "10-${r//\//-}" 7
done
adb shell am start -W -a android.intent.action.VIEW -d "https://triparro.com/stays/" $PKG; shot 20-stays-link 10
adb logcat -d -s ReactNativeJS:V ReactNative:V AndroidRuntime:E '*:F' > screens/logcat.txt
grep -E "FATAL|Error|TypeError|ReferenceError|Invariant" screens/logcat.txt | head -100 > screens/js-errors.txt || true
adb shell pidof $PKG > screens/alive.txt || echo "not running" > screens/alive.txt
