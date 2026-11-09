/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const STAGING_API_URL = 'https://society-assets-backend.onrender.com';

function pluginName(entry) {
  return typeof entry === 'string' ? entry : entry[0];
}

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE || '';
  const storeBuild =
    profile === 'preview' || profile === 'preview-apk' || profile === 'production';

  let plugins = appJson.expo.plugins || [];
  if (storeBuild) {
    plugins = plugins
      .filter((entry) => pluginName(entry) !== 'expo-dev-client')
      .map((entry) => {
        if (pluginName(entry) !== 'expo-build-properties') return entry;
        const options = typeof entry === 'string' ? {} : { ...entry[1] };
        return [
          'expo-build-properties',
          {
            ...options,
            android: {
              ...(options.android ?? {}),
              // Production talks only to https://societyassets.in; test builds may still use http://IP:8080.
              usesCleartextTraffic: profile !== 'production',
              // R8 shrinks and optimises the release code (Play Console "DEX code optimization" warning).
              // Only for the store (production) build; preview/test builds stay unminified for easy debugging.
              enableMinifyInReleaseBuilds: profile === 'production',
              enableShrinkResourcesInReleaseBuilds: profile === 'production',
            },
          },
        ];
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
      ...(storeBuild
        ? {
            autolinking: {
              exclude: ['expo-dev-client'],
            },
          }
        : {}),
      extra: {
        ...appJson.expo.extra,
        ...config?.expo?.extra,
        apiBaseUrl,
        webPortalUrl,
      },
    },
  };
};
