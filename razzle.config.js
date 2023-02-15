const fs = require('node:fs')
const logger = require('razzle-dev-utils/logger')

const certError = (msg) => {
  throw new Error(`
    ${msg}

    You can create certs for local development using the following commands:
      brew install mkcert
      mkcert -install
      mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost
      cp .env.example .env
  `)
}

module.exports = {
  options: {
    buildType: 'spa'
  },

  modifyWebpackConfig({ env, webpackConfig }) {
    if (env.dev) {
      const { HTTPS_KEY, HTTPS_CERT } = process.env

      if (!HTTPS_KEY || !HTTPS_CERT) certError('https not configured')
      if (!fs.existsSync(HTTPS_KEY)) certError(`Cert file not found "${HTTPS_KEY}"`)
      if (!fs.existsSync(HTTPS_CERT)) certError(`Cert file not found "${HTTPS_CERT}"`)

      const publicPath = `https://localhost:${webpackConfig.devServer.port}`

      webpackConfig.output.publicPath = publicPath
      webpackConfig.devServer.publicPath = publicPath
      webpackConfig.devServer.allowedHosts = ['.safe.global']
      webpackConfig.devServer.headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }

      webpackConfig.devServer.https = {
        key: fs.readFileSync(process.env.HTTPS_KEY),
        cert: fs.readFileSync(process.env.HTTPS_CERT),
      }

      logger.start(`Running https server on: ${publicPath}`)
    }

    const _1MB = 1024 * 1000;
    webpackConfig.performance = {
      maxEntrypointSize: _1MB * 2,
      maxAssetSize: _1MB * 2,
    }

    return webpackConfig;
  },
};
