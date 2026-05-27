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
      chunks: 'all',
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
