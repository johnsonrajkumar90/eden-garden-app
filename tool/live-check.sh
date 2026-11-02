#!/bin/bash
# Probes the OpenStreetMap place servers (Overpass) the way the website calls them.
Q='[out:json][timeout:20];nwr(around:3000,11.0168,76.9558)["amenity"~"^(cafe|fuel|charging_station)$"];out center 5;'
UA='TripArro travel planner (https://triparro.com)'
for url in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://overpass.kumi.systems/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter; do
  echo "== $url (form POST, our UA)"
  curl -s -m 40 -A "$UA" -H "Accept: application/json" --data-urlencode "data=$Q" -w "\n--> HTTP %{http_code} %{time_total}s\n" "$url" | head -c 400; echo
  echo "== $url (GET, our UA)"
  curl -s -m 40 -A "$UA" -G --data-urlencode "data=$Q" -o /dev/null -w "--> HTTP %{http_code} %{time_total}s\n" "$url"
done
echo "== OSRM"; curl -s -m 20 -A "$UA" "https://router.project-osrm.org/route/v1/driving/76.9558,11.0168;76.695,11.4102?overview=false" | head -c 300; echo
