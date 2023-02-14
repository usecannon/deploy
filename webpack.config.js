const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

// For depcheck to be happy
require.resolve('webpack-dev-server')

const isProd = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const htmlPlugin = new HtmlWebpackPlugin({
  template: './public/index.html',
  favicon: path.join(__dirname, 'public', 'favicon.ico'),
  manifest: path.join(__dirname, 'public', 'manifest.json'),
  scriptLoading: 'defer',
  minify: false,
  hash: false,
  xhtml: true,
})

const babelRule = {
  test: /\.(ts|tsx|js|jsx)$/,
  include: [
    // Need to list all the folders in v3 and outside (if used)
    /src/,
  ],
  resolve: {
    fullySpecified: false,
  },
  use: {
    loader: require.resolve('babel-loader'),
    options: {
      configFile: path.resolve(__dirname, 'babel.config.js'),
    },
  },
}

const imgRule = {
  test: /\.(png|jpg|ico|gif|woff|woff2|ttf|eot|doc|pdf|zip|wav|avi|txt|webp|svg)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 4 * 1024, // 4kb
    },
  },
}

const cssRule = {
  test: /\.css$/,
  include: [new RegExp('./src')],
  exclude: [],
  use: [
    {
      loader: require.resolve('style-loader'),
    },
    {
      loader: require.resolve('css-loader'),
    },
  ],
}

const devServer = {
  port: '3000',
  https: true,

  hot: !isTest,
  liveReload: false,

  historyApiFallback: true,

  devMiddleware: {
    writeToDisk: !isTest,
    publicPath: '/',
  },

  client: {
    logging: 'log',
    overlay: false,
    progress: false,
  },

  static: './public',

  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
  },
  allowedHosts: 'all',
  open: false,
  compress: false,
}

module.exports = {
  //  devtool: isProd ? 'source-map' : isTest ? false : 'eval',
  devtool: isTest ? false : 'source-map',
  devServer,
  mode: isProd ? 'production' : 'development',
  entry: './src/index.tsx',

  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].js',
    chunkFilename: isProd ? 'chunk/[name].[contenthash:8].js' : '[name].js',
    assetModuleFilename: '[name].[contenthash:8][ext]',
    clean: true,
  },

  // possibly remove
  // optimization: {
  //   runtimeChunk: false,
  //   splitChunks: {
  //     chunks: 'async',
  //     maxAsyncRequests: 10,
  //     maxInitialRequests: 10,
  //     hidePathInfo: true,
  //     automaticNameDelimiter: '--',
  //     name: false,
  //   },
  //   moduleIds: isProd ? 'deterministic' : 'named',
  //   chunkIds: isProd ? 'deterministic' : 'named',
  //   minimize: isProd,
  //   minimizer: [new TerserPlugin()],
  //   innerGraph: true,
  //   emitOnErrors: false,
  // },

  plugins: [htmlPlugin]
    .concat([new webpack.NormalModuleReplacementPlugin(/^bn.js$/, require.resolve('bn.js'))])
    .concat(isProd ? [] : isTest ? [] : [new ReactRefreshWebpackPlugin({ overlay: false })]),

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
  },

  module: {
    rules: [babelRule, imgRule, cssRule],
  },
}
