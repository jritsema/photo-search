### photo-search

An experimental project for creating a powerful search engine for a personal photo collection.

Most of the cloud providers are starting to provide these types of features, but, hey if you prefer to keep things local...plus [Kibana](https://www.elastic.co/products/kibana) is awesome.

**Features**

- fast search (Elasticsearch + Kibana)
- advanced search by tag (e.g., Disney+AnimalKingdom, Birthday+John)
- search by people's faces in photos (assuming photos are properly tagged)
- display image thumbnails in search results (Kibana)
- search/display on map
- statistics on camera usage

**Usage**

First, index your photo collection by uploading the metadata into Elasticsearch.

```bash
$ node . --photodir /path/to/photos --hostandport es-instance:9200
```

Run a web server that can generate image thumbnails.

```bash
$ node thumbnail-server.js /path/to/photos
```

Now, in Kibana, you can configure the 'path' field in the photo index to be formatted as a URL using the Image type with the following Url Template.

```
http://ip-of-thumbnail-server:3000{{rawValue}}?dim=200x115
```

Note that it's possible to run elasticsearch/kibana on a raspberry pi using the included docker-compose.yml file...

```bash
$ docker-compose --file rpi-docker-compose.yml up
```
