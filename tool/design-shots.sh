#!/bin/bash
# Design screenshots: closes the welcome screen and the offer popup first, then visits every main screen.
set -x
PKG=triparro.com
mkdir -p screens
adb install -r app.apk
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS || true
adb shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION || true
adb shell settings put secure location_mode 3 || true
adb emu geo fix 76.9558 11.0168 || true
n=0
shot() { sleep "${2:-6}"; n=$((n+1)); adb exec-out screencap -p > "screens/$(printf '%02d' $n)-$1.png"; }
tap() {   # tap the element whose text or accessibility label is $1
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
  [ -n "$b" ] && adb shell input tap $b && return 0; return 1
}
closepopup() { for i in 1 2 3; do sleep 2; tap "Close" && sleep 1; done; }
up() { adb shell input swipe 540 1800 540 600 600; }
link() { adb shell am start -W -a android.intent.action.VIEW -d "$1" $PKG >/dev/null 2>&1; }
# ids of a real stay, resort and pet host from the live site
read STAY RESORT PET <<<$(python3 - <<'PY'
import json,urllib.request
def get(u):
    try: return json.load(urllib.request.urlopen(u, timeout=20))
    except Exception: return {}
items=get('https://triparro.com/api/properties?per_page=30').get('items',[])
stay=next((i['id'] for i in items if i.get('kind')=='stay'),0); resort=next((i['id'] for i in items if i.get('kind')=='resort'),0)
p=get('https://triparro.com/api/pets/search'); pl=p.get('items') or p.get('hosts') or p.get('listings') or []
print(stay, resort, pl[0]['id'] if pl else 0)
PY
)
echo "stay=$STAY resort=$RESORT pet=$PET"

adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1; shot welcome 18
tap "Look around first"; closepopup; shot explore 5
up; shot explore-2 3; up; shot explore-3 3; up; shot explore-4 3
tap "Pets"; closepopup; shot pets 6; up; shot pets-2 3
tap "Trips"; shot trips 5
tap "AI"; shot ai 5
tap "Account"; shot account 5; up; shot account-2 3
[ "$STAY" != 0 ] && { link "https://triparro.com/stays/$STAY"; shot stay 10; up; shot stay-2 3; up; shot stay-3 3; up; shot stay-4 3; adb shell input keyevent KEYCODE_BACK; }
[ "$RESORT" != 0 ] && { link "https://triparro.com/resorts/$RESORT"; shot resort 10; adb shell input keyevent KEYCODE_BACK; }
[ "$PET" != 0 ] && { link "https://triparro.com/pet-boarding/$PET"; shot pet-host 10; up; shot pet-host-2 3; adb shell input keyevent KEYCODE_BACK; }
for r in groups login signup become-host hosting notifications messages page/privacy; do link "triparro-app://$r"; shot "${r//\//-}" 6; done
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1; sleep 3
link "triparro-app://login"; sleep 4; adb shell input keyevent KEYCODE_BACK
adb logcat -d -s ReactNativeJS:V AndroidRuntime:E > screens/logcat.txt
