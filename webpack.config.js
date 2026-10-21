const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = (argv && argv.mode) === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',
    entry: {
      content: './src/content.ts',
      background: './src/bg.ts',
      offscreen: './src/offscreen.ts',
      popup: './src/popup.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '.' },
          { from: 'public', to: '.' },
        ],
      }),
    ],
  };
};
