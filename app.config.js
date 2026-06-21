/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const STAGING_API_URL = 'http://187.127.180.221:8080';

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
              usesCleartextTraffic: true,
              enableMinifyInReleaseBuilds: false,
              enableShrinkResourcesInReleaseBuilds: false,
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
