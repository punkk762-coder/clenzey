const {
  withProjectBuildGradle,
  withGradleProperties,
  withAndroidManifest,
} = require('@expo/config-plugins');

function setGradleProperty(properties, key, value) {
  const index = properties.findIndex(
    (item) => item.type === 'property' && item.key === key,
  );
  const entry = { type: 'property', key, value };

  if (index >= 0) {
    properties[index] = entry;
  } else {
    properties.push(entry);
  }
}

/**
 * Razorpay checkout pulls `standard-core:LATEST`, which Gradle may resolve via
 * JitPack and fail. Force a Maven Central version and exclude Razorpay from JitPack.
 *
 * Also applies release fixes for OEM devices (Vivo etc.):
 * - Legacy JNI packaging (native libs load reliably)
 * - Cleartext HTTP for local dev backend
 * - arm64 + armeabi-v7a architectures
 */
function withAndroidRazorpayFix(config) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.clenzey.com';
  const usesHttp = apiUrl.startsWith('http://');

  config = withGradleProperties(config, (gradleConfig) => {
    setGradleProperty(gradleConfig.modResults, 'expo.useLegacyPackaging', 'true');
    setGradleProperty(
      gradleConfig.modResults,
      'reactNativeArchitectures',
      'armeabi-v7a,arm64-v8a',
    );
    return gradleConfig;
  });

  if (usesHttp) {
    config = withAndroidManifest(config, (manifestConfig) => {
      const application = manifestConfig.modResults.manifest.application?.[0];
      if (application?.$) {
        application.$['android:usesCleartextTraffic'] = 'true';
      }
      return manifestConfig;
    });
  }

  config = withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      return gradleConfig;
    }

    let contents = gradleConfig.modResults.contents;

    if (!contents.includes("excludeGroup 'com.razorpay'")) {
      contents = contents.replace(
        "maven { url 'https://www.jitpack.io' }",
        `maven {
      url 'https://www.jitpack.io'
      content {
        excludeGroup 'com.razorpay'
      }
    }`,
      );
    }

    if (!contents.includes("force 'com.razorpay:standard-core:")) {
      contents = contents.replace(
        /allprojects \{\s*\n\s*repositories \{/,
        `allprojects {
  configurations.all {
    resolutionStrategy {
      force 'com.razorpay:standard-core:1.7.14'
    }
  }
  repositories {`,
      );
    }

    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });

  return config;
}

module.exports = withAndroidRazorpayFix;
