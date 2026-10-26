#!/bin/bash
# Opens the app's main screens on the emulator and takes screenshots (run by test-native.yml).
set -x
PKG=in.edengardenshomestay.app
mkdir -p screens
adb install -r app.apk
adb logcat -c
shot() { sleep "${2:-6}"; adb exec-out screencap -p > "screens/$1.png"; }
# tap the first element whose text (or content-desc) is $1
tap() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
  b=$(python3 - "$1" <<'PY'
import re,sys
x=open('/tmp/ui.xml',encoding='utf-8').read(); t=sys.argv[1]
for m in re.finditer(r'<node [^>]*>', x):
    n=m.group(0)
    if f'text="{t}"' in n or f'content-desc="{t}"' in n:
        a=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        if a: x1,y1,x2,y2=map(int,a.groups()); print((x1+x2)//2,(y1+y2)//2); break
PY
)
  [ -n "$b" ] && adb shell input tap $b
}
adb shell am start -W -n $PKG/com.triparro.app.MainActivity
shot 01-explore 12
adb shell input swipe 540 1800 540 600 400; shot 02-explore-scrolled 3
adb shell am start -W -a android.intent.action.VIEW -d "https://edengardenshomestay.in/stays/1" $PKG
shot 03-stay 10
adb shell input swipe 540 1800 540 500 400; shot 04-stay-details 3
tap "Check availability"; shot 05-booking-panel 4
adb shell input keyevent 4; sleep 2
adb shell am start -W -a android.intent.action.VIEW -d "https://edengardenshomestay.in/pet-boarding" $PKG
shot 06-pets 10
tap "AI"; shot 07-ai 5
tap "Trips"; shot 08-trips 5
tap "Account"; shot 09-account 6
tap "Sign in"; shot 10-sign-in 4
adb logcat -d -s AndroidRuntime:E > screens/crash-log.txt 2>&1 || true
adb logcat -d | grep -iE "FATAL|Exception" | head -100 > screens/errors.txt 2>&1 || true
ls -la screens
