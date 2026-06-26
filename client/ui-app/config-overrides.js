const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = function override(config, env) {
  // Enable gzip compression
  if (env === 'production') {
    config.plugins.push(
      new CompressionPlugin({
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8,
      })
    );
  }

  // Optimize bundle splitting
  config.optimization = {
    ...config.optimization,
    runtimeChunk: 'single',
    splitChunks: {
      // 'initial' means only eagerly-imported node_modules go into shared vendor
      // chunks. Lazily-imported packages (socket.io-client, firebase, etc.) stay
      // inside their own async chunk instead of being hoisted into the initial bundle.
      chunks: 'initial',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        mui: {
          test: /[\\/]node_modules[\\/](@mui)[\\/]/,
          name: 'mui-chunk',
          priority: 20,
          reuseExistingChunk: true,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-chunk',
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    },
  };

  return config;
};
