/**
 * App-level configuration.
 * In a production build, replace these values via environment-specific builds
 * (e.g. react-native-config, build flavors, or CI injection).
 */
const Config = {
  /** Clerk publishable key — get from https://dashboard.clerk.com */
  CLERK_PUBLISHABLE_KEY: __DEV__
    ? 'pk_test_REPLACE_ME'
    : 'pk_live_REPLACE_ME',

  /** API base URL — use 10.0.2.2 for Android emulator pointing to localhost */
  API_URL: __DEV__ ? 'http://10.0.2.2:3001' : 'https://api.seedhape.in',
};

export default Config;
