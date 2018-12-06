//adapted from https://github.com/jettro/nodejs-photo-indexer
//usage:  node . --photodir /Volumes/Photos --hostandport es-instance:9200

'use strict';

var walk = require('walk');
var fs = require('fs')
var path = require('path');
var exif = require('exif2');
var readline = require('readline');
var elasticsearch = require('elasticsearch')
var argv = require('minimist')(process.argv.slice(2));
var mapping = require('./mapping.json');

var startDir = argv.photodir;
var esFlushBufferLength = 100;
var hostAndPort = argv.hostandport;
var indexName = 'photos';
var docType = 'photo';
var items = [];

// First create the Indices
var client = new elasticsearch.Client({
  host: hostAndPort
});

client.indices.create({
  index: indexName,
  body: {},
  ignore: [400] //This lets us ignore the error when the index already exists.
}).then(
  function (body) {
    mapping.index = indexName;
    mapping.type = docType;
    console.log("create index!");
    client.indices.putMapping(mapping).then(function (body) {
      console.log("Put mapping !");
    }, function (err) {
      console.log(err);
    });
  },
  function (err) {
    console.error(err);
  }
);

// Go through each directory and extract data
var walker = walk.walk(startDir);

walker.on('file', function (root, stat, next) {
  console.log("Walk " + stat.name);
  // Add this file to the list of files
  var name = stat.name.toLowerCase();
  if (name.indexOf('.jpg') > -1 || name.indexOf('.jpeg') > -1) {
    extractData(root + '/' + stat.name, next);
  } else {
    next();
  }
});

// prompt();

function prompt() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('***********************************************', function (answer) {
    console.log('', answer);
    rl.close();
    flushItems(items);
    console.log("We are done!");
  });
}

//Add a user input so that we wait for the extraction processes to finish
//before flushing into the index
walker.on('end', prompt);

/* This is the core work horse that calls the
functions to get the data from the images an add
it to a search object */
function extractData(file) {

  exif(file, function (err, obj) {
    if (err) {
      console.error(err);
    }
    else {
      //console.log(obj);
      var searchObj = {};
      searchObj.id = file;

      searchObj.tags = obj['subject'];
      searchObj.people = obj['region name'];
      searchObj.dateTaken = obj["create date"];
      searchObj.file_name = obj["file name"];
      searchObj.directory = obj["directory"];
      searchObj.path = obj["directory"] + '/' + obj["file name"];
      searchObj.file_size = obj["file size"];
      searchObj.make = obj["make"];
      searchObj.camera_model_name = obj["camera model name"];
      searchObj.orientation = obj["orientation"];
      searchObj.flash = obj["flash"];
      searchObj.lens = obj["lens"];
      searchObj.aperture = obj["aperture"];
      searchObj.megapixels = obj["megapixels"];
      searchObj.x_resolution = obj["x resolution"];
      searchObj.y_resolution = obj["y resolution"];
      searchObj.resolution_unit = obj["resolution unit"];
      searchObj.focal_length = obj["focal length"];
      searchObj.focus_position = obj["focus position"];
      searchObj.focus_distance = obj["focus distance"];
      searchObj.lens_f_stops = obj["lens f stops"];
      searchObj.shutter_speed = obj["shutter speed"];
      searchObj.depth_of_field = obj["depth of field"];
      searchObj.GPS_Altitude = obj["gps altitude"];
      searchObj.GPS_Date_Time = obj["gps date/time"];
      searchObj.GPS_Latitude = obj["gps latitude"];
      searchObj.GPS_Longitude = obj["gps longitude"];
      searchObj.gps_altitude = obj["gps altitude"];
      obj["gps position"] > "" ? searchObj.location = gpstodd(obj["gps position"]) : 1;

      sendToElasticsearch(searchObj);
    }
  });
};

// Convert from GPS Degrees in EXIF to Degree Decimal so the ES understands the GPS
function gpstodd(input) {
  input = input.replace(/\'/g, " min").replace(/\"/g, ' sec').replace(/\,/g, "").split(" ")

  var lat = (parseFloat(input[0]) + parseFloat(input[2] / 60) + parseFloat(input[4] / (60 * 60))) * (input[6] == "S" ? -1 : 1);
  var lng = (parseFloat(input[7]) + parseFloat(input[9] / 60) + parseFloat(input[11] / (60 * 60))) * (input[13] == "W" ? -1 : 1);
  //console.log(searchObj)
  return {
    "lat": lat,
    "lon": lng
  }
}

//Collect and Flsuh using the Bulk Index
function sendToElasticsearch(searchObj) {
  console.log("Sending to elastic");

  //We'll do an upsert here b/c we don't which feature will return first
  items.push({
    "update": {
      "_id": searchObj.id
    }
  }, {
      "doc": searchObj,
      "doc_as_upsert": true
    });

  //console.log(items);
  if (items.length >= 100) {
    var new_items = items
    flushItems(new_items);
    new_items = [];
    items = [];
  }
}

function flushItems(new_items) {
  console.log("Flushing items");
  client.bulk({
    index: indexName,
    type: docType,
    body: new_items
  }, function (err, response) {
    if (err) console.error(err);
    console.log(response);
  });
}
