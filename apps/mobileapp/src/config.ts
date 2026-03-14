import GeneratedConfig from './config.generated';

/**
 * App-level configuration.
 * Values come from apps/mobileapp/.env via scripts/generate-config.js.
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

const rawApiUrl = __DEV__
  ? (GeneratedConfig.SEEDHAPE_API_TARGET === 'emulator'
    ? GeneratedConfig.SEEDHAPE_API_URL_ANDROID_EMULATOR
    : GeneratedConfig.SEEDHAPE_API_URL_ANDROID_DEVICE)
  : GeneratedConfig.SEEDHAPE_API_URL_PROD;

const Config = {
  CLERK_PUBLISHABLE_KEY: GeneratedConfig.SEEDHAPE_CLERK_PUBLISHABLE_KEY,
  API_URL: normalizeBaseUrl(rawApiUrl),
};

export default Config;
