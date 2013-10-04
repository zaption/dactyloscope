module.exports = exports = dactyloscope;

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var dactRegex = /\/[^\/]+(-dact-[0-9a-f]{32})(\.[^\/]*)?$/;
var extractRealPath = function(dactPath) {
	var match = dactPath.match(dactRegex);

	if (!match || match.length < 2) return null; // something is wrong...

	return dactPath.replace(match[1], '');
};
var createFingerprint = function(fullPath, cb) {
	var hash = crypto.createHash('md5');

	var stream = fs.createReadStream(fullPath);

	stream.on('data', function(chunk) {
		hash.update(chunk);
	});
	stream.on('close', function() {
		return cb(null, hash.digest('hex'));
	});
	stream.on('error', function(err) {
		return cb(err);
	});
};
var createFingerprintSync = function(fullPath) {
	var hash = crypto.createHash('md5');
	var fileContents = fs.readFileSync(fullPath);

	hash.update(fileContents);

	return hash.digest('hex');
};
var createFingerprintedPath = function(rootPath, realPath, cb) {
	return createFingerprint(path.join(rootPath, realPath), function(err, fingerprint) {
		if (err) return cb(err);

		var lastSlash = realPath.lastIndexOf('/');
		var nextPeriod = realPath.indexOf('.', lastSlash);

		var dactStr = '-dact-' + fingerprint;

		if (nextPeriod === -1) {
			// doesn't end with a file extension
			return cb(null, realPath + dactStr);
		} else {
			// ends with one or more file extensions
			return cb(null, realPath.substring(0, nextPeriod) + dactStr + realPath.substring(nextPeriod));
		}
	});
};
var createFingerprintedPathSync = function(rootPath, realPath) {
	var fingerprint = createFingerprintSync(path.join(rootPath, realPath));

	if (!fingerprint) return null;

	var lastSlash = realPath.lastIndexOf('/');
	var nextPeriod = realPath.indexOf('.', lastSlash);

	var dactStr = '-dact-' + fingerprint;

	if (nextPeriod === -1) {
		// doesn't end with a file extension
		return realPath + dactStr;
	} else {
		// ends with one or more file extensions
		return realPath.substring(0, nextPeriod) + dactStr + realPath.substring(nextPeriod);
	}
};

var realPaths = {};
var dactPaths = {};

function dactyloscope(rootPath, maxAge) {
	var self = this;

	maxAge = maxAge || 31556926000; // 1 year default

	self.dactify = function(realPath) {
		if (dactPaths[realPath]) {
			console.log('Already dactified ' + realPath);
			return dactPaths[realPath];
		}

		var dactPath = createFingerprintedPathSync(rootPath, realPath);

		realPaths[dactPath] = realPath;
		dactPaths[realPath] = dactPath;

		console.log('*** Created fingerprint for ' + realPath + ': ' + dactPath);
		return dactPath;
	};

	return function(req, res, next) {
		// If req.assetFingerprint is already there, do nothing.
		if (!req.dactify) {
			// Create req.assetFingerprint
			req.dactify = res.locals.dactify = function(realPath) {
				return self.dactify(realPath);
			};
		}
		if (req.path.match(dactRegex)) {
			// it's for us! it has a dact fingerprint on it
			if (realPaths[req.path]) {
				// we've already verified is a real, valid, up-to-date file, so just send it over (with long cache expiration)
				console.log('File already mapped. Set LONG expiration on ' + realPaths[req.path]);
				req.url = realPaths[req.path];
				res.setHeader('Cache-Control', 'public, max-age=' + (maxAge / 1000))
				return next();
			} else {
				// we don't know yet if this path actually exists. let's check!
				var realPath = extractRealPath(req.path);
				return fs.exists(path.join(rootPath, realPath), function(exists) {
					if (exists) {
						// yep, it exists. let's create and store a fingerprint for it
						return createFingerprintedPath(rootPath, realPath, function(err, dactPath) {
							if (err) return next();

							realPaths[dactPath] = realPath;
							dactPaths[realPath] = dactPath;

							if (req.path === dactPath) {
								console.log('*** File fingerprinted! Set LONG expiration on ' + realPath);
								req.url = realPath;
								res.setHeader('Cache-Control', 'public, max-age=' + (maxAge / 1000));
								return next();
							} else {
								// they were trying to find a real file, but they were looking for an old version. not to be found...
								console.log(req.path + ' is out of date, next()');
								return next();
							}
						});
					} else {
						// nope, they're trying to find a non-existent file. carry on...
						console.log(req.path + ' does not exist, next()');
						return next();
					}
				});
			}
		} else {
			console.log(req.path + ' is not a fingerprinted path, next()');
			// not a fingerprinted path, continue
			return next();
		}
	};
};