const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { applyMonorepoResolver } = require('../../metro.shared');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

applyMonorepoResolver(config, projectRoot, monorepoRoot);

// Prevent Metro from bundling the other app's code
config.resolver.blockList = [/apps\/consumer\/.*/];

const webShims = {
  'react-native-maps': path.resolve(projectRoot, 'src/shims/react-native-maps.web.ts'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return {
      filePath: webShims[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
