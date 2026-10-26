# TripArro — native Android app (Kotlin + Jetpack Compose)

A fully native Android app for TripArro. It talks to the website's REST API (`/api/…`) with the website's own sign-in
(cookies kept on the phone, so people stay signed in) — there are no keys or secrets in the app.

| | |
|---|---|
| Package | `triparro.com` (the Google Play ID — permanent once the app is published) |
| Version | `2.0.<build>` — the build number goes up on every GitHub build |
| Android | 7.0 (API 24) and newer · targets Android 16 (API 36) |
| Website | `https://triparro.com` (`app/build.gradle.kts` → `SITE_URL`; testers can change it in Account → Server) |

## What is native

| Tab | Screens |
|---|---|
| Explore | Search homestays, villas and resorts (place, dates, guests, kind), popular places, guest favourites, sponsored (labelled) · stay / resort page with photo gallery, facts, **guests included, extra guests and their charge**, amenities, rooms and price plans, rules, cancellation, reviews, directions · booking panel (dates, adults, children's ages, rooms, plan, food, coupon → live price) · confirm and pay, or a booking request with the ID photo |
| Pets | Pet boarding search (city or **near me**, dates, pet, number of pets, facilities, instant, daycare, sort) · pet host page (gallery, pets welcome, facilities, free places, rules, extras, deposit, coupon, live price, verified reviews, save) · book with your pets · pet booking with progress, **Pet Stay Diary** (photos, videos, notes), pay, cancel with the refund shown first, verified review with photos, receipt |
| Trips | Stays, resorts and pet boarding together: Upcoming, Staying now, Completed, Cancelled · booking details, pay the balance, invoice, directions, call the host, online check-in, messages, review, cancel |
| AI | TripArro AI for stays and trips (real listings at live prices, guest limits and extra-guest charges) and the pet boarding assistant (real verified hosts only) |
| Account | Sign in (email + password; one-time code / Google on the web page), **Notifications** (unread badge on the tab), profile and password, My pets (care notes, photo), saved pet hosts, **Open my dashboard** for hosts, resort owners, pet hosts, partners and the admin (the website's dashboard inside the app, already signed in), become a host / pet host, pet boarding manual, customer care, privacy, delete account, sign out |

Payments open the secure PayU / Razorpay page inside the app; when the gateway sends the guest back, the app shows
its own booking screen. UPI apps, phone, WhatsApp and Maps links open in their own apps. Links to the website
(`/stays/…`, `/resorts/…`, `/pet-boarding/…`, `/pet-booking/…`, `/booking/…`, `/pay/…`, `/resort-booking/…`) open the matching app screen;
private booking links from emails (`?t=…`) work in the app even when signed out.

## Notifications

Booking confirmations, payment links, check-in / check-out, **Pet Stay Diary** updates and reminders come from the
website (`GET /api/notifications`). The app checks for new ones when it opens and in the background about every
15 minutes (WorkManager — Android's shortest background interval; Android may delay it to save battery) and shows each
new one as a phone notification in the **Booking updates** channel; tapping it opens the booking. Android 13+ asks
once for permission after sign-in; Account → Notifications has a *Turn on notifications* button if it was refused.
Hosts and admins get their own dashboard notifications the same way.

**Instant push** (within seconds, even if the app hasn't run for days) needs Firebase Cloud Messaging: a Firebase
project, its `google-services.json` in `app/`, and the server key on the website. That is not set up yet — the
15-minute check works without it.

## Location

*Use my location* on Pet boarding asks for permission, checks that location is switched on (with a *Turn on location*
button to the phone's settings if it is off, or *Open app settings* if permission was refused for good), then gets a
**fresh** position — network and GPS together, first answer wins, up to 15 seconds — and falls back to the last known
position only if no new one comes. In the AI's pet mode, "near me" questions send the position when location is
already allowed.

## Icon, splash and logo

The launcher icon is the TripArro app icon (`tool/icon/triparro-icon-original.png`). `python3 tool/icon/make_icons.py`
rebuilds every size from it: adaptive icon (gradient background + white "Triparro" foreground, so it fits round,
squircle and square launchers), themed/monochrome icon (Android 13+), legacy icons for Android 7, and
`tool/icon/play-store-icon-512.png` for the Play Console. The splash screen uses the same red with the white wordmark.
Main screens (Explore, Pets, Trips, AI, Account) have a full-colour header that runs behind the status bar, with the
white TripArro logo (`res/drawable-nodpi/logo_white.png`).

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
  core/Notifier.kt  notifications (background check, phone notifications, badge)   core/Location.kt  current location
  ui/               theme (TripArro colours), shared components, inputs (dates, steppers, choices)
  screens/          Explore, Property, Reserve, Trips/Booking, PetSearch, PetListing, PetBooking, Pets, Ai, Account, Notifications
tool/screens.sh, tool/mock_server.py, tool/fixtures/   the emulator test (recorded test-site data)
```
