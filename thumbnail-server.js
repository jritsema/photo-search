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

app.listen(3000, function () {
  console.log('Thumbnail server listening on port 3000!');
});
