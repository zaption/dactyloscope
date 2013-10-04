# dactyloscope

Dead-simple asset fingerprinting middleware for Node.js (with included extensions for Express.js and Dust.js).

## Usage

Setting up the server:

```javascript
var dactyloscope = require('dactyloscope');
app.use(dactyloscope(path.join(__dirname, '/public'), '31556926000')); // 1 year (for fingerprinted assets)
app.use(express.static(path.join(__dirname, '/public'), { maxAge: '10800000' }))); // 3 hours (non-fingerprinted assets)
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

```
{@dactify path="/img/train.jpg"/}
```

It's lightweight and performant. Asset fingerprinting made easy.

## Credits

  - [Charlie Stigler](http://github.com/cstigler)

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2012-2013 Zaption, Inc. <[http://www.zaption.com/](http://www.zaption.com/)>
