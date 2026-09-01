const fs = require('fs');
const path = require('path');

function resolveModule(projectRoot, monorepoRoot, packageName) {
  const localModule = path.resolve(projectRoot, 'node_modules', packageName);
  if (fs.existsSync(localModule)) {
    return localModule;
  }

  return path.resolve(monorepoRoot, 'node_modules', packageName);
}

/**
 * Shared Metro settings for pnpm monorepos.
 * Forces a single copy of React Native / Expo native modules so Expo Go works.
 */
function applyMonorepoResolver(config, projectRoot, monorepoRoot) {
  const rootModules = path.resolve(monorepoRoot, 'node_modules');

  config.watchFolders = [monorepoRoot];
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    rootModules,
  ];
  config.resolver.disableHierarchicalLookup = true;

  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@clenzey/api-client': path.resolve(monorepoRoot, 'packages/api-client'),
    '@clenzey/types': path.resolve(monorepoRoot, 'packages/types'),
    '@clenzey/socket-client': path.resolve(monorepoRoot, 'packages/socket-client'),
    '@clenzey/design-system': path.resolve(monorepoRoot, 'packages/design-system'),
    react: path.resolve(rootModules, 'react'),
    'react-dom': path.resolve(rootModules, 'react-dom'),
    'react-native': path.resolve(rootModules, 'react-native'),
    expo: path.resolve(rootModules, 'expo'),
    'expo-font': path.resolve(rootModules, 'expo-font'),
    'expo-constants': path.resolve(rootModules, 'expo-constants'),
    'expo-modules-core': path.resolve(rootModules, 'expo-modules-core'),
    'react-native-paper': path.resolve(rootModules, 'react-native-paper'),
    'react-native-safe-area-context': path.resolve(
      rootModules,
      'react-native-safe-area-context',
    ),
    'react-native-worklets': resolveModule(projectRoot, monorepoRoot, 'react-native-worklets'),
    'react-native-reanimated': resolveModule(projectRoot, monorepoRoot, 'react-native-reanimated'),
  };
}

module.exports = { applyMonorepoResolver };
