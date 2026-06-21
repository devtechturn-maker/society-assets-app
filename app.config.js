/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const STAGING_API_URL = 'http://187.127.180.221:8080';

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE || '';
  const storeBuild =
    profile === 'preview' || profile === 'preview-apk' || profile === 'production';

  let plugins = appJson.expo.plugins || [];
  if (storeBuild) {
    plugins = plugins.filter((entry) => {
      const name = typeof entry === 'string' ? entry : entry[0];
      return name !== 'expo-dev-client';
    });
  }

  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    appJson.expo.extra?.apiBaseUrl?.trim() ||
    STAGING_API_URL;

  const webPortalUrl =
    process.env.EXPO_PUBLIC_WEB_URL?.trim() ||
    appJson.expo.extra?.webPortalUrl?.trim() ||
    '';

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      ...config?.expo,
      plugins,
      extra: {
        ...appJson.expo.extra,
        ...config?.expo?.extra,
        apiBaseUrl,
        webPortalUrl,
      },
    },
  };
};
