#!/bin/bash
# Emulator test (build-native.yml): installs the APK, points it at a stand-in API with recorded test-site data,
# opens the main screens and takes screenshots.
set -x
PKG=in.edengardenshomestay.app
mkdir -p screens
(python3 tool/mock_server.py > screens/mock.log 2>&1 &)
sleep 2
adb install -r app.apk
adb shell am start -W -n $PKG/com.triparro.app.MainActivity; sleep 6
adb exec-out screencap -p > screens/00-live-site.png
adb shell am force-stop $PKG
adb root; sleep 4
U=$(adb shell stat -c %u /data/data/$PKG | tr -d '\r')
adb shell "mkdir -p /data/data/$PKG/shared_prefs && echo '<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?><map><string name=\"base_url\">http://10.0.2.2:8000</string></map>' > /data/data/$PKG/shared_prefs/triparro.xml && chown -R $U:$U /data/data/$PKG/shared_prefs && chmod 660 /data/data/$PKG/shared_prefs/triparro.xml"
adb logcat -c
shot() { sleep "${2:-5}"; adb exec-out screencap -p > "screens/$1.png"; }
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
up() { adb shell input swipe 540 1900 540 500 500; }
open() { adb shell am start -W -a android.intent.action.VIEW -d "https://edengardenshomestay.in$1" $PKG; }
adb shell am start -W -n $PKG/com.triparro.app.MainActivity
shot 01-explore 8
up; shot 02-explore-favourites 3
tap "Search"; shot 03-search-results 5
open /stays/1; shot 04-stay 6
up; shot 05-stay-details 3
up; up; shot 06-stay-rules 3
tap "Check availability"; shot 07-booking-panel 4
adb shell input keyevent 4; sleep 2
tap "Pets"; shot 08-pets 6
up; shot 09-pets-results 3
open /pet-boarding/12/happy-paws-home; shot 10-pet-host 6
up; shot 11-pet-host-details 3
up; up; shot 12-pet-host-booking 3
up; up; shot 13-pet-host-reviews 3
open /pet-booking/P1MX48HI; shot 14-pet-booking 6
up; shot 15-pet-diary 3
up; up; shot 16-pet-booking-price 3
adb shell input keyevent 4; sleep 2; adb shell input keyevent 4; sleep 2
tap "Trips"; shot 17-trips 5
tap "Completed"; shot 18-trips-completed 3
tap "AI"; shot 19-ai 3
tap "Pet boarding"; tap "Find dog boarding in Coimbatore"; shot 20-ai-pets 5
tap "Account"; shot 21-account 5
tap "My pets"; shot 22-my-pets 5
adb logcat -d -s AndroidRuntime:E > screens/crash-log.txt 2>&1 || true
ls -la screens
