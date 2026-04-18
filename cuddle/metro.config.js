const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Garante que react-native-svg seja resolvido corretamente na web
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
