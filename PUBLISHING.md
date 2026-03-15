# Publishing Guide

Internal guide for releasing npm packages and shipping the Android app.

---

## Publishing npm Packages

Both `@seedhape/sdk` and `@seedhape/react` are built with tsup and published as dual ESM/CJS packages with TypeScript declarations.

### Prerequisites

1. Create an npm account at **npmjs.com** if you don't have one.
2. Run `npm login` and authenticate.
3. Ensure you have publish access to the `@seedhape` npm org.

### 1. Bump the version

Update the `version` field in both package files. Use semver: patch for bug fixes, minor for new features, major for breaking changes.

```json
// packages/sdk/package.json  &  packages/react/package.json
{
  "name": "@seedhape/sdk",
  "version": "0.2.0",   // bump this
  ...
}
```

### 2. Build both packages

`@seedhape/shared` is `"private": true` — it's an internal monorepo package, never published. Build only the two public packages:

```bash
pnpm --filter @seedhape/sdk build
pnpm --filter @seedhape/react build

# Verify dist/ exists in each package
ls packages/sdk/dist
ls packages/react/dist
```

### 3. Dry-run to preview what will be published

```bash
cd packages/sdk && npm pack --dry-run
cd ../react && npm pack --dry-run
```

> The `files` field in each package.json is set to `["dist"]` — only compiled output is published.

### 4. Publish with pnpm (recommended)

The `@seedhape` org has 2FA enabled. Use an **automation token** — it bypasses the 2FA requirement for publishing.

**One-time setup:**
1. npmjs.com → avatar → Access Tokens → Generate New Token → Granular Access Token → set `@seedhape` org scope with Read and Write permission. Copy the token.
2. Add it to your `~/.npmrc` (npm reads auth from here, not env vars):

```bash
echo "//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxx" >> ~/.npmrc
```

Then publish:

```bash
# Publish SDK first (react depends on it)
pnpm --filter @seedhape/sdk publish --access public --no-git-checks

# Then publish the React package
pnpm --filter @seedhape/react publish --access public --no-git-checks
```

### 5. Tag the release in git

```bash
git add packages/sdk/package.json packages/react/package.json
git commit -m "chore: release @seedhape/sdk@0.2.0 @seedhape/react@0.2.0"
git tag sdk-v0.2.0
git tag react-v0.2.0
git push origin main --tags
```

After publishing, test from a fresh project: `npm install @seedhape/sdk@0.2.0`. Confirm types resolve correctly in both ESM and CJS environments.

---

## Publishing the Android App to Play Store

The SeedhaPe merchant app is a React Native 0.84 app. It must be built as a signed AAB before uploading.

> **Important:** The app requires Notification Listener permission which Google reviews manually. Allow 1–3 extra days for first submissions. In your Play Console listing, clearly describe why notification access is needed (UPI payment verification).

### Prerequisites

1. Java 17+ and Android SDK installed (via Android Studio or sdkman).
2. A Google Play Developer account at [play.google.com/console](https://play.google.com/console).
3. Create the app in Play Console first to get your package name.

### 1. Confirm application ID

The `applicationId` is already set to `com.seedhape.merchant` in `build.gradle`. Create your app in Play Console using this exact package name before your first upload — it can never be changed.

### 2. Generate a signing keystore (first-time only)

Run this from `apps/mobileapp/android/`:

```bash
keytool -genkey -v \
  -keystore seedhape-release.keystore \
  -alias seedhape \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> **Warning:** Store the keystore file and passwords safely — losing them means you can never update the app. Back up to a password manager. The `.gitignore` already excludes `*.keystore`.

### 3. Configure signing credentials

Copy the example file and fill in your values:

```bash
cp android/keystore.properties.example android/keystore.properties
```

```properties
# android/keystore.properties  (never commit this file)
storeFile=seedhape-release.keystore
storePassword=your_store_password
keyAlias=seedhape
keyPassword=your_key_password
```

The `build.gradle` already reads this file automatically — no other changes needed.

### 4. Set the production API URL

```env
# apps/mobileapp/.env
SEEDHAPE_API_URL=https://api.seedhape.com
```

### 5. Build the release AAB

```bash
cd apps/mobileapp/android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 6. Test the release build locally (optional)

```bash
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

### 7. Upload to Play Console

1. Open [Google Play Console](https://play.google.com/console) and select your app.
2. Go to **Release → Production** (or Internal Testing for first upload).
3. Click **Create new release** and upload the `.aab` file.
4. Fill in the release notes.
5. Click **Review release** then **Start rollout**.

> Start with **Internal Testing** for your first build to verify the full Play Store install flow before promoting to production.

### 8. Play Store listing requirements

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, no rounded corners |
| Feature graphic | 1024×500 PNG or JPG |
| Screenshots | At least 2 for phone, 1080×1920 recommended |
| Short description | Max 80 characters |
| Full description | Max 4000 characters — explain UPI notification usage clearly |
| Privacy policy URL | Required for notification listener permission |
| Permissions justification | Explain why notification listener is needed for UPI verification |

### 9. Subsequent releases — version bump

```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 2          // ← increment by 1 each release (never reuse)
    versionName "1.1.0"   // ← human-readable semver
}
```

Every Play Store upload requires a higher `versionCode` than the previous release.


cd /home/jjhbk/seedhape
pnpm --filter @seedhape/sdk build
pnpm --filter @seedhape/sdk publish --access public --no-git-checks

pnpm --filter @seedhape/react build
pnpm --filter @seedhape/react publish --access public --no-git-checks
