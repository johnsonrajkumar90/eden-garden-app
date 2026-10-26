# TripArro — native Android app

Kotlin + Jetpack Compose. The app talks to the TripArro website's REST API (`/api/…`) with the website's own sign-in
(cookies kept on the phone), so there are no keys or secrets in the app.

Built by GitHub Actions on every push to this branch (`.github/workflows/build-native.yml`); the APK is saved on the
`native-builds` branch.
