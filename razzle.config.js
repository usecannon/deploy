const fs = require('node:fs')

module.exports = {
  options: {
    buildType: 'spa',
  },

  modifyWebpackConfig({ env, webpackConfig }) {
    if (env.dev) {
      const publicPath = `https://localhost:${webpackConfig.devServer.port}`

      webpackConfig.output.publicPath = publicPath
      webpackConfig.devServer.publicPath = publicPath

      webpackConfig.devServer.https = {
        key: fs.readFileSync('./certs/cert.key'),
        cert: fs.readFileSync('./certs/cert.crt'),
        ca: fs.readFileSync('./certs/ca.crt'),
      }

      webpackConfig.devServer.allowedHosts = ['all']
      webpackConfig.devServer.headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    }

    return webpackConfig;
  },
};
