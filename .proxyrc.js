const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'X-Requested-With, content-type, Authorization',
}

module.exports = function (app) {
  app.use(function (req, res, next) {
    console.log(req.url)

    for (const [key, val] of Object.entries(headers)) {
      res.setHeader(key, val)
    }

    next()
  })
}
