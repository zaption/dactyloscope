# dactyloscope

Dead-simple asset fingerprinting middleware for Node.js (with included extensions for Express.js and Dust.js).

## Usage

Setting up the server:

```javascript
var dactyloscope = require('dactyloscope');
dactyloscope.rootPath = path.join(__dirname, '/public');
app.use(dactyloscope); // by default will cache fingerprinted assets for 1 year (for fingerprinted assets)
app.use(express.static(path.join(__dirname, '/public'), { maxAge: '10800000' }))); // cache non-fingerprinted assets for 3 hours
```

And now a request for ```/css/combined-dact-c047a63c37ee54d33a2b491dad32bd53.css``` will be given the longer cache timeout (1 year) and passed through to the rest of your middleware stack as ```/css/combined.css```. A request for ```/css/combined.css``` will be passed through normally and given your normal cache timeout.

Grabbing a fingerprinted path from JavaScript:

```javascript
var fingerprintedPath = require('dactyloscope').dactify('/css/combined.css'); // or...

app.get('/myPage', function(req, res) {
	var fingerprintedPath = req.dactify('/css/combined.css'); // or...
	var fingerprintedPath = res.locals.dactify('/css/combined.css');
});
```

or from a Dust.js template:

```javascript
require('dactyloscope').addDustHelper(require('dustjs-linkedin'));
```

...followed by:

```
{@dactify path="/img/train.jpg"/}
```

Need to change some more settings?

```javascript
dactyloscope.maxAge = 86400000; // Make the cache timeout 1 day for fingerprinted assets

if (process.env.NODE_ENV === 'production') {
	dactyloscope.prefix = '//dx2c9hfvahhhy.cloudfront.net'; // on production, point all fingerprinted URLs to a CloudFront CDN distribution
}
```

It's lightweight and performant. Asset fingerprinting made easy.

## Credits

  - [Charlie Stigler](http://github.com/cstigler)

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2012-2013 Zaption, Inc. <[http://www.zaption.com/](http://www.zaption.com/)>
