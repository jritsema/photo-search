var express = require('express');
var app = express();
var qt = require('quickthumb');

var path = '/Volumes/Photos';
if (process.argv.length > 2)
  path = process.argv[2];

app.use(path, qt.static(path, {
  cacheDir: __dirname + '/cache',
  type: 'resize'
}));

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('');
  console.log('Thumbnail server listening on port %s for photos %s', port, path);
});
