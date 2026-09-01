const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { applyMonorepoResolver } = require('../../metro.shared');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

applyMonorepoResolver(config, projectRoot, monorepoRoot);

// Prevent Metro from bundling the other app's code
config.resolver.blockList = [/apps\/partner\/.*/];

const useNativeRazorpay = process.env.EXPO_USE_NATIVE_RAZORPAY === '1';
const razorpayStub = path.resolve(projectRoot, 'src/shims/react-native-razorpay.stub.ts');

const webShims = {
  'react-native-maps': path.resolve(projectRoot, 'src/shims/react-native-maps.web.ts'),
};

const nativeShims = useNativeRazorpay
  ? {}
  : {
      'react-native-razorpay': razorpayStub,
    };

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const webTarget = webShims[moduleName] ?? nativeShims[moduleName];
    if (webTarget) {
      return {
        filePath: webTarget,
        type: 'sourceFile',
      };
    }
  } else if (nativeShims[moduleName]) {
    return {
      filePath: nativeShims[moduleName],
      type: 'sourceFile',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
