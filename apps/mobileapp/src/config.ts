import GeneratedConfig from './config.generated';

/**
 * App-level configuration.
 * Values come from apps/mobileapp/.env via scripts/generate-config.js.
 */
const Config = {
  CLERK_PUBLISHABLE_KEY: GeneratedConfig.SEEDHAPE_CLERK_PUBLISHABLE_KEY,
  API_URL: __DEV__
    ? (GeneratedConfig.SEEDHAPE_API_TARGET === 'emulator'
      ? GeneratedConfig.SEEDHAPE_API_URL_ANDROID_EMULATOR
      : GeneratedConfig.SEEDHAPE_API_URL_ANDROID_DEVICE)
    : GeneratedConfig.SEEDHAPE_API_URL_PROD,
};

export default Config;
