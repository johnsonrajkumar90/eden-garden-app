#!/bin/bash
# Calls the live site's API from GitHub (the build machines can reach triparro.com) and prints what it answers.
B=https://triparro.com
for u in "api/chargers/meta" "api/chargers?lat=11.0168&lng=76.9558&distance=25" "api/chargers?lat=11.0168&lng=76.9558&distance=50&sort=power" "api/trip/destinations?q=ooty" "ev-charging" "app/web/" ; do
  echo "=================== GET $u"
  curl -s -m 60 -A "Mozilla/5.0 TripArro-check" -H "Accept: application/json" -w "\n--> HTTP %{http_code} in %{time_total}s\n" "$B/$u" | head -c 1800
  echo
done
echo "=================== EV page HTML: which build is served"
curl -s -m 30 "$B/ev-charging" | grep -o 'app/web/[^"]*\.js' | head -5
echo "=================== does the built JS contain the public chargers tab?"
for js in $(curl -s -m 30 "$B/ev-charging" | grep -o '/app/web/[^"]*\.js' | head -3); do echo "$js: $(curl -s -m 30 "$B$js" | grep -c 'All public chargers')"; done
