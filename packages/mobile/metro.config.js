const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving workspace packages
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  require('path').resolve(__dirname, '../../node_modules'),
];

module.exports = config;
