var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var dactRegex = /\/[^\/]+(-dact-[0-9a-f]{32})(\.[^\/]*)?$/;
var realPaths = {};
var dactPaths = {};
var dactyloscope;

var extractRealPath = function(dactPath) {
	var match = dactPath.match(dactRegex);

	if (!match || match.length < 2) return null; // something is wrong...

	return dactPath.replace(match[1], '');
};
var createFingerprint = function(realPath, cb) {
	var hash = crypto.createHash('md5');

	var stream = fs.createReadStream(path.join(dactyloscope.rootPath, realPath));

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
var createFingerprintSync = function(realPath) {
	var hash = crypto.createHash('md5');
	var fileContents = fs.readFileSync(path.join(dactyloscope.rootPath, realPath));

	hash.update(fileContents);

	return hash.digest('hex');
};
var createFingerprintedPath = function(realPath, cb) {
	return createFingerprint(realPath, function(err, fingerprint) {
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
var createFingerprintedPathSync = function(realPath) {
	var fingerprint = createFingerprintSync(realPath);

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

function dactyloscope(req, res, next) {
	if (!req.dactify) {
		req.dactify = res.locals.dactify = function(realPath) {
			return dactyloscope.dactify(realPath);
		};
	}

	if (req.path.match(dactRegex)) {
		// it's for us! it has a dact fingerprint on it
		if (realPaths[req.path]) {
			// we've already verified is a real, valid, up-to-date file, so just send it over (with long cache expiration)
			req.url = realPaths[req.path];
			res.setHeader('Cache-Control', 'public, max-age=' + (dactyloscope.maxAge / 1000));
			return next();
		} else {
			// we don't know yet if this path actually exists. let's check!
			var realPath = extractRealPath(req.path);
			return fs.exists(path.join(dactyloscope.rootPath, realPath), function(exists) {
				if (exists) {
					// yep, it exists. let's create and store a fingerprint for it
					return createFingerprintedPath(realPath, function(err, dactPath) {
						if (err) return next();

						realPaths[dactPath] = realPath;
						dactPaths[realPath] = dactPath;

						if (req.path === dactPath) {
							req.url = realPath;
							res.setHeader('Cache-Control', 'public, max-age=' + (dactyloscope.maxAge / 1000));
							return next();
						} else {
							// they were trying to find a real file, but they were looking for an old version. not to be found...
							return next();
						}
					});
				} else {
					// nope, they're trying to find a non-existent file. carry on...
					return next();
				}
			});
		}
	} else {
		// not a fingerprinted path, continue
		return next();
	}
}

dactyloscope.prefix = '';
dactyloscope.rootPath = '';
dactyloscope.maxAge = 31556926000;

dactyloscope.dactify = function(realPath) {
	if (dactPaths[realPath]) {
		return dactPaths[realPath];
	}

	var dactPath = dactyloscope.prefix + createFingerprintedPathSync(realPath);

	realPaths[dactPath] = realPath;
	dactPaths[realPath] = dactPath;

	return dactPath;
};

dactyloscope.addDustHelper = function(dust) {
	dust.helpers.dactify = function(chunk, ctx, bodies, params) {
		var path = dust.helpers.tap(params.path, chunk, ctx);

		return chunk.write(dactyloscope.dactify(path));
	};
};

module.exports = exports = dactyloscope;
