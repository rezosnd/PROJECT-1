// metro.config.js — SDK 58 / React Native 0.88
// Fixes: engine.io-client using Node.js-only modules (ws, EventEmitter, process.nextTick)
// by redirecting .node.js transport files to browser-safe equivalents
// and shimming the Node.js 'ws' package with RN's native WebSocket.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Limit worker threads to prevent IPC DataCloneError / out of memory spikes on Node 22 / Windows
config.maxWorkers = 2;

const eioBase = path.resolve(__dirname, 'node_modules/engine.io-client/build/cjs');

config.resolver = config.resolver || {};

// Shim the Node.js 'ws' package → our React Native WebSocket wrapper
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ws: path.resolve(__dirname, 'shims/ws.js'),
};

// Redirect engine.io-client Node.js-only files to their browser-safe counterparts
// and safely shim expo-crypto to avoid missing native module crashes
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-crypto') {
    return { filePath: path.resolve(__dirname, 'shims/expo-crypto.js'), type: 'sourceFile' };
  }
  if (moduleName.includes('engine.io-client')) {
    if (moduleName.endsWith('globals.node.js')) {
      return { filePath: path.join(eioBase, 'globals.js'), type: 'sourceFile' };
    }
    if (moduleName.endsWith('polling-xhr.node.js')) {
      return { filePath: path.join(eioBase, 'transports/polling-xhr.js'), type: 'sourceFile' };
    }
    if (moduleName.endsWith('websocket.node.js')) {
      return { filePath: path.join(eioBase, 'transports/websocket.js'), type: 'sourceFile' };
    }
  }

  // Fallback to default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
