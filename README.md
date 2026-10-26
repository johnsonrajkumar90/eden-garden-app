# TripArro — native Android app (Kotlin + Jetpack Compose)

A fully native Android app for TripArro. It talks to the website's REST API (`/api/…`) with the website's own sign-in
(cookies kept on the phone, so people stay signed in) — there are no keys or secrets in the app.

| | |
|---|---|
| Package | `in.edengardenshomestay.app` (the same Play Store ID as the earlier app, so this one is an update) |
| Version | `2.0.<build>` — the build number goes up on every GitHub build |
| Android | 7.0 (API 24) and newer · targets Android 16 (API 36) |
| Website | `https://edengardenshomestay.in` (`app/build.gradle.kts` → `SITE_URL`; testers can change it in Account → Server) |

## What is native

| Tab | Screens |
|---|---|
| Explore | Search homestays, villas and resorts (place, dates, guests, kind), popular places, guest favourites, sponsored (labelled) · stay / resort page with photo gallery, facts, **guests included, extra guests and their charge**, amenities, rooms and price plans, rules, cancellation, reviews, directions · booking panel (dates, adults, children's ages, rooms, plan, food, coupon → live price) · confirm and pay, or a booking request with the ID photo |
| Pets | Pet boarding search (city or **near me**, dates, pet, number of pets, facilities, instant, daycare, sort) · pet host page (gallery, pets welcome, facilities, free places, rules, extras, deposit, coupon, live price, verified reviews, save) · book with your pets · pet booking with progress, **Pet Stay Diary** (photos, videos, notes), pay, cancel with the refund shown first, verified review with photos, receipt |
| Trips | Stays, resorts and pet boarding together: Upcoming, Staying now, Completed, Cancelled · booking details, pay the balance, invoice, directions, call the host, online check-in, messages, review, cancel |
| AI | TripArro AI for stays and trips (real listings at live prices, guest limits and extra-guest charges) and the pet boarding assistant (real verified hosts only) |
| Account | Sign in (email + password; one-time code / Google on the web page), profile and password, My pets (care notes, photo), saved pet hosts, **Open my dashboard** for hosts, resort owners, pet hosts, partners and the admin (the website's dashboard inside the app, already signed in), become a host / pet host, pet boarding manual, customer care, privacy, delete account, sign out |

Payments open the secure PayU / Razorpay page inside the app; when the gateway sends the guest back, the app shows
its own booking screen. UPI apps, phone, WhatsApp and Maps links open in their own apps. Links to the website
(`/stays/…`, `/resorts/…`, `/pet-boarding/…`, `/pet-booking/…`, `/booking/…`) open the matching app screen.

## Build

Every push to the `native-app` branch builds on GitHub (`.github/workflows/build-native.yml`), then installs the APK
on an Android emulator and takes screenshots of the main screens. The APK, the app bundle (`.aab`), the build log and
the screenshots are saved on the **`native-builds`** branch.

**Signing for Google Play:** add the 4 repository secrets from the signing-key zip (Settings → Secrets and variables
→ Actions): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Without them the build is signed with a test (debug) key — fine for installing on a phone, not for Google Play.

Locally (Android Studio, or JDK 17+ and the Android SDK): `gradle :app:assembleRelease`.

## The website must be up to date

The app needs the current TripArro website (the `/api/…` addresses, pet boarding, profile). Upload the latest
website package before testing; an older website answers "Not found" and the app says so.

## Code

```
app/src/main/java/com/triparro/app/
  MainActivity.kt   start, splash, deep links      App.kt     tabs and navigation
  Web.kt            in-app web pages, payments, downloads, uploads
  core/Api.kt       API client, sign-in, cookies shared with web pages     core/Json.kt  JSON helpers
  ui/               theme (TripArro colours), shared components, inputs (dates, steppers, choices)
  screens/          Explore, Property, Reserve, Trips/Booking, PetSearch, PetListing, PetBooking, Pets, Ai, Account
tool/screens.sh, tool/mock_server.py, tool/fixtures/   the emulator test (recorded test-site data)
```
