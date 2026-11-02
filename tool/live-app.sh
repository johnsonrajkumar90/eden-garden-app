#!/bin/bash
# Runs the real app against the live site (triparro.com): EV chargers and the Travel planner. Screenshots in live/.
PKG=triparro.com
mkdir -p live
adb install -r app.apk
adb root; sleep 4
adb shell pm disable-user --user 0 com.google.android.apps.nexuslauncher || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS || true
adb shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION || true
adb shell pm grant $PKG android.permission.ACCESS_COARSE_LOCATION || true
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS || true
adb shell settings put secure location_mode 3 || true
adb emu geo fix 76.9558 11.0168 || true
adb logcat -c
shot() { sleep "${2:-5}"; adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1; adb exec-out screencap -p > "live/$1.png"; }
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
  if [ -n "$b" ]; then adb shell input tap $b; echo "tapped $1 at $b"; return 0; else echo "NOT FOUND: $1"; return 1; fi
}
texts() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]\+"' | head -60 | tr '\n' ' '; echo; }
adb shell am start -W -n $PKG/com.triparro.app.MainActivity; sleep 12
adb geo fix 76.9558 11.0168 2>/dev/null; adb emu geo fix 76.9558 11.0168 || true
shot 00-home 2
# the shortcuts row scrolls sideways: find "EV chargers"
for i in 1 2 3; do tap "EV chargers" && break; adb shell input swipe 900 1525 150 1525 400; sleep 1; done
shot 01-ev 20
echo "EV screen: $(texts)"
adb shell input swipe 540 1900 540 700 500; shot 02-ev-list 3
echo "EV list: $(texts)"
adb shell input tap 540 1300; shot 03-ev-sheet 8
echo "EV sheet: $(texts)"
adb shell input keyevent 4; sleep 2; adb shell input keyevent 4; sleep 3
for i in 1 2 3; do tap "Trip planner" && break; adb shell input swipe 150 1525 900 1525 400; sleep 1; done
shot 04-planner 10
echo "Planner: $(texts)"
tap "Where are you going?" || adb shell input tap 540 1150; sleep 1; adb shell input text "Ooty"; sleep 6
shot 05-planner-search 2
echo "Search: $(texts)"
tap "Government Botanical Garden, Ooty" || tap "Ooty Lake"; sleep 2
sleep 1
tap "Plan my trip"; shot 06-plan 45
echo "Plan: $(texts)"
adb shell input swipe 540 1900 540 600 500; shot 07-plan-more 3
adb shell input swipe 540 1900 540 600 500; shot 08-plan-more 3
echo "Plan more: $(texts)"
adb shell input keyevent 4; sleep 3
tap "My places"; shot 09-myplaces 8
echo "My places: $(texts)"
adb logcat -d | grep -iE "AndroidRuntime|FATAL|triparro" | tail -60 > live/logcat.txt
