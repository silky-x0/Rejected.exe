const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

// `webpack --env browser=firefox` builds the Firefox variant: Firefox has no
// extension service workers, so its manifest uses a background event page
// (`background.scripts`) instead of `background.service_worker`.
module.exports = (env = {}, argv = {}) => {
  const isFirefox = env.browser === 'firefox';
  const isProduction = argv.mode === 'production';
  const outputDir = isFirefox ? 'dist-firefox' : 'dist';

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
      path: path.resolve(__dirname, outputDir),
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
          {
            // Firefox gets its own manifest (event page instead of a service
            // worker); both are written out as manifest.json.
            from: isFirefox ? 'manifest.firefox.json' : 'manifest.json',
            to: 'manifest.json',
          },
          { from: 'public', to: '.' },
        ],
      }),
    ],
  };
};
