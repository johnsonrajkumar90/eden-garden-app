# Eden Garden — Android app (Flutter)

The Android app for **https://edengardenshomestay.in**, ready for Google Play.

It is a hybrid app: a native Flutter shell around your Laravel website, so **everything on the website works in the
app** and every change you make to the website appears in the app straight away, with no app update. Guests, hosts,
the admin and referral partners all use the same app.

What the app adds on top of the website:

- **Bottom tabs**: Stays · Services · Buy (homes & plots) · Trips · Account. The Account tab opens each person's own
  home: the admin dashboard, the host dashboard, the referral dashboard, or *My trips* for guests.
- **Splash screen and app icon** (Android 12+ adaptive and themed icon).
- **Offline screen** with *Try again*, a loading bar, and pull-down-to-refresh.
- **Camera and gallery uploads**: guest ID scans at check-in, listing photos and the logo.
- **Downloads**: invoice PDFs and CSV exports are saved to *Downloads* and opened.
- **Links that belong to other apps open in those apps**: phone, email, WhatsApp, Google Maps, social media and **UPI
  apps during PayU payment** (PhonePe, GPay, Paytm…). PayU card and netbanking pages stay inside the app.
- **App Links**: links to edengardenshomestay.in (booking emails, payment links sent by referral partners) open in the
  app once it is installed.
- **Share a stay's photos**: in *New booking* (hosts, admin) and *Book for a guest* (referral partners), each stay's
  **Share → Send the photos** downloads up to 10 photos and opens **WhatsApp** (or the share sheet) with the photos
  and the stay's details: price, guests, check-in/out times and a link to all photos.
- **Stays logged in**: guests, hosts, admin and referral partners log in once. The app keeps them logged in, even
  after closing it or restarting the phone, until they tap *Log out*. It uses the website's secure "remember me"
  cookie; the password is never stored on the phone.
- **Back button** goes back through pages; press it twice on the home page to exit.
- Website pop-ups (*"Cancel this booking?"*) are shown as native dialogs.

| | |
|---|---|
| Package name (permanent) | `in.edengardenshomestay.app` |
| Version | `1.2.0` (in `pubspec.yaml`) — the build number goes up automatically on every GitHub build |
| Target | Android 16 (API 36), as Google Play requires; works on Android 7.0 and newer |
| Flutter | stable channel (3.47) |

---

## 1. Build the app

### Option A — on GitHub (recommended, nothing to install)

1. Create a **private** repository on github.com, e.g. `eden-garden-app`, and upload this folder's contents
   (*Add file → Upload files*, drag everything in, including the hidden `.github` folder), or use GitHub Desktop.
2. Add the 4 signing secrets listed in `SIGNING-KEY.txt` (in the separate *signing key* zip):
   *Settings → Secrets and variables → Actions → New repository secret*.
3. Open the **Actions** tab → **Build Android app** → **Run workflow**. It takes about 10–15 minutes.
4. On the finished run, download **eden-garden-android**. It contains:
   - `app-release.aab` — upload this to Google Play
   - `app-release.apk` — install this on your phone to try the app first

Every push to the repository builds a new version automatically.

### Option B — on your Mac

1. Install Flutter (https://docs.flutter.dev/get-started/install/macos/mobile-android) and Android Studio, then run
   `flutter doctor` until the Android lines show ✓.
2. Put `upload-keystore.jks` and `key.properties` from the signing-key zip into this project's `android/` folder.
3. In this folder:
   ```bash
   flutter pub get
   flutter build appbundle --release      # → build/app/outputs/bundle/release/app-release.aab
   flutter build apk --release            # → build/app/outputs/flutter-apk/app-release.apk
   ```
   Increase the number after `+` in `pubspec.yaml` (`1.0.0+2`, `1.0.1+3` …) before each new upload.
   (GitHub builds do this for you.)

To try it on a phone connected by USB: `flutter run`.

---

## 2. Before publishing: website settings

Upload the new website zip (`eden-garden-laravel.zip`). It adds the pages Google Play asks for:

- `https://edengardenshomestay.in/privacy-policy`: the privacy policy (Play Console needs this link)
- `https://edengardenshomestay.in/delete-account`: guests can delete their account (Google requires this both in the
  app and on the web). It is also in the website menu and footer.
- `https://edengardenshomestay.in/me`: the app's Account tab
- `https://edengardenshomestay.in/.well-known/assetlinks.json`: makes website links open the app

After your first upload to Play Console, go to **Test and release → Setup → App signing**, copy the
**App signing key certificate SHA-256 fingerprint**, and put it in the website's `.env`:

```
ANDROID_PACKAGE=in.edengardenshomestay.app
ANDROID_SHA256=AA:BB:…(Google's app-signing fingerprint),43:2C:44:C9:29:CB:64:EC:18:97:E6:15:86:41:6A:D1:BC:16:01:F4:C4:27:D9:86:A2:6E:4A:46:D6:48:B4:A7
```

(The second fingerprint is your upload key's, so APKs you install yourself open links too.)

---

## 3. Publish on Google Play — step by step

1. **Developer account**: https://play.google.com/console, a one-time $25 fee. An *Organization* account needs a
   D-U-N-S number. A *Personal* account is quicker, but see step 7.
2. **Create app**: name **Eden Garden Home Stay**, default language English (India), *App*, *Free*.
3. **App content** (Policy → App content):
   - *Privacy policy*: `https://edengardenshomestay.in/privacy-policy`
   - *App access*: "All or some functionality is restricted" → give a **test guest login** (create one on the website)
     so the reviewer can see *My trips*.
   - *Ads*: No ads.
   - *Content rating*: fill in the questionnaire (category *Travel*). No violence etc. → rated for everyone.
   - *Target audience*: 18 and over.
   - *Data safety*: see the answers below.
   - *Account deletion*: `https://edengardenshomestay.in/delete-account`
   - *Government apps*: No. *Financial features*: No (payments are processed by PayU).
4. **Store listing** (Grow users → Store presence → Main store listing):
   - App icon: `store/play-icon-512.png`
   - Feature graphic: `store/feature-graphic-1024x500.png`
   - Phone screenshots: at least 2 (take them on your phone from the test APK: home, a stay page, booking,
     My trips).
   - Category: **Travel & Local**. Contact email, phone and website.
   - Texts: see below.
5. **Upload**: Test and release → *Testing → Internal testing* (or *Closed testing*) → Create release → upload
   `app-release.aab` → accept **Play App Signing** → Save → Review → Roll out.
6. Install from the test link and check: login, booking, payment (use PayU test mode first), invoice download,
   check-in photo upload, WhatsApp/phone links.
7. **Production**:
   - **New personal developer accounts** must first run a **closed test with at least 12 testers for 14 days**
     (add their Gmail addresses to a closed-testing track). After that, *Apply for production* appears on the
     Dashboard.
   - Organization accounts can go straight to *Production → Create release*.
   - Review usually takes 1–7 days.

### Store listing texts

**Short description (80 characters max)**
> Book cottages, villas & houseboats across India. Local services, homes & plots.

**Full description**
> Eden Garden Home Stay — hand-picked stays across India, booked in minutes.
>
> • Cottages, villas, houseboats, treehouses and homestays with real photos and honest prices
> • See free dates on the calendar and book instantly
> • Pay securely with UPI, cards or netbanking (PayU)
> • Your bookings, invoices and receipts in one place — download invoices as PDF
> • Local services: cabs, cooks, guides and more
> • Homes and plots for sale, with enquiries straight to the owner
> • Chat with us on WhatsApp or call in one tap
>
> For hosts: manage your calendar, check guests in with ID scans, see payouts and invoices.
> For partners: book stays for your guests and track your commission.

### Data safety answers

| Question | Answer |
|---|---|
| Does the app collect or share user data? | **Yes, collects** — not shared with third parties for their own use (PayU processes payments on your behalf) |
| Encrypted in transit? | **Yes** (HTTPS only) |
| Can users request deletion? | **Yes** — in the app (Account → Delete my account) and at /delete-account |
| Personal info | Name, Email address, Phone number — *collected*, required, for **App functionality** and **Account management** |
| Financial info | *Purchase history* (bookings) — App functionality. Card/UPI details are entered on PayU's page, not stored by you |
| Photos | *Photos* — optional, App functionality (ID scans at check-in by hosts, listing photos) |
| App activity / analytics | Only if you turned on Google Analytics / Meta Pixel in Admin → Marketing & SEO: then also *App interactions* for **Analytics** |

---

## 4. Changing things

| What | Where |
|---|---|
| Website address, app name, brand colours, which sites open outside the app, phone number on the offline screen | `lib/config.dart` |
| Bottom tabs (names, icons, pages) | `lib/tabs.dart` |
| Everything else in the app | `lib/web_shell.dart` |
| App name under the icon | `android/app/src/main/AndroidManifest.xml` (`android:label`) |
| Version | `pubspec.yaml` (`version: 1.0.0+1`) |
| Icons and splash images | `android/app/src/main/res/` (mipmap-*, drawable-*) |

The website can tell it is running in the app: the user agent contains `EdenGardenApp`, and the page gets the class
`in-app` on `<html>`, so you can style it with `.in-app …` in `style.css`.

## 5. Project files

```
lib/main.dart           app start, theme
lib/web_shell.dart      web view, tabs, uploads, downloads, links, offline/splash screens
lib/tabs.dart           bottom tabs
lib/page_scripts.dart   pull-to-refresh and download helpers run inside the pages
lib/config.dart         settings
android/                Android project (package in.edengardenshomestay.app)
.github/workflows/      the GitHub build
store/                  Play Store icon (512×512) and feature graphic (1024×500)
tool/create_keystore.sh makes a new upload key (only if you don't use the one provided)
```
