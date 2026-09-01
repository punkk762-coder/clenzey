/** @type {import('expo/config').ExpoConfig} */
const fs = require('fs');
const path = require('path');
const appJson = require('./app.json');

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.clenzey.com';
const usesHttp = apiUrl.startsWith('http://');

const googleServicesPath = path.join(__dirname, 'google-services.json');
const hasGoogleServices = fs.existsSync(googleServicesPath);

/** Skip FCM/Firebase native init when google-services.json is absent (dev APK). */
const plugins = (appJson.expo.plugins ?? []).filter((plugin) => {
  if (hasGoogleServices) return true;
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return name !== 'expo-notifications';
});

module.exports = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    // Allow HTTP calls to a local dev backend (e.g. http://192.168.x.x:3001)
    usesCleartextTraffic: usesHttp,
    ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
  },
  plugins: [
    ...plugins,
  ],
  extra: {
    ...appJson.expo.extra,
    apiUrl,
    pushNotificationsEnabled: hasGoogleServices,
  },
};
