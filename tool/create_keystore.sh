#!/bin/bash
# Creates a NEW upload key for Google Play (only if you don't use the one that came with the project).
# Needs Java (keytool). Run from the project folder:  bash tool/create_keystore.sh
set -e
cd "$(dirname "$0")/.."
KS=android/upload-keystore.jks
[ -f "$KS" ] && { echo "$KS already exists — not overwriting it."; exit 1; }
read -s -p "Choose a keystore password (at least 8 characters): " PW; echo
keytool -genkeypair -v -keystore "$KS" -storetype PKCS12 -alias upload -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$PW" -keypass "$PW" -dname "CN=Eden Garden Home Stay, O=Eden Garden Home Stay, C=IN"
printf 'storeFile=../upload-keystore.jks\nstorePassword=%s\nkeyAlias=upload\nkeyPassword=%s\n' "$PW" "$PW" > android/key.properties
base64 < "$KS" | tr -d '\n' > upload-keystore.base64.txt
echo; echo "Created $KS and android/key.properties. Back both up somewhere safe — never commit them to GitHub."
keytool -list -v -keystore "$KS" -storepass "$PW" -alias upload | grep -i "SHA256:"
