# Yusun App — PWA MVP starter

This is a starter project, not a production-ready public messaging service.

It includes:
- Uzbek/Russian interface toggle
- Firebase Phone Authentication UI
- User profile name
- User directory
- One-to-one text messages via Firestore
- Basic installable PWA shell

Not implemented yet: image/video/audio messages, groups, channels, calls, push notifications, username uniqueness, blocking/reporting, admin tools, production abuse protection, app-store packaging.

## A. Firebase setup

1. Open https://console.firebase.google.com/ and create a project named `Yusun App`.
2. Add a Web app in Project settings. Copy its `firebaseConfig`.
3. In Authentication → Sign-in method, enable Phone.
4. In Authentication → Settings, add your final website domain to Authorized domains.
5. Create a Firestore Database.
6. Open Firestore → Rules and paste the contents of `firestore.rules`, then Publish.
7. Edit `app.js` and replace all `PASTE_...` values in `firebaseConfig` with the real values from Firebase.
8. Test phone sign-in. Real SMS may have quotas, regional restrictions, or billing requirements.

## B. Publish with GitHub Pages

1. Create a public repository named `yusun-app`.
2. Upload the contents of this folder to the repository root. Keep `index.html`, `app.js`, `manifest.json`, `sw.js`, `firestore.rules`, and `assets/` at the root level.
3. Open repository Settings → Pages.
4. Choose Deploy from a branch, branch `main`, folder `/(root)`, then Save.
5. Wait for GitHub Pages to publish the site and open the HTTPS URL.
6. In Firebase Authentication → Settings → Authorized domains, add the hostname of your published site.
7. Test phone sign-in and messages using two different accounts.

## C. Install on Android / iPhone

- Android: open the HTTPS site in Chrome → browser menu → Install app or Add to Home screen.
- iPhone: open the HTTPS site in Safari → Share → Add to Home Screen.

This PWA is not a native APK/IPA and is not listed in Google Play or Apple's App Store.

## D. Important safety notes

- Do not publish Firebase service-account keys or private credentials.
- The web firebaseConfig is designed to be public; Firestore Security Rules protect data.
- Never disable Firestore rules for public access.
- Test that users cannot read chats they do not belong to.
- These rules are an MVP baseline, not a security audit.
- Add abuse protection, moderation, and further testing before public launch.
