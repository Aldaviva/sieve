var _              = require('lodash');
var cache          = require('../common/cache');
var logger         = require('../common/logger')(module);
var Moment         = require('moment');
var releaseService = require('../remote/releaseService');
var server         = require('./server');

server.get({ path: '/cgi-bin/releases/:name', name: 'getRelease' }, function(req, res, next){
	releaseService.getRelease(req.params.name)
		.then(function(release){
			release.dates = _.mapValues(release.dates, function(date){
				return date.valueOf();
			});
			res.send(release);
		})
		.done();
});

// server.get({ path: '/cgi-bin/releases/:name', name: 'getRelease' }, function(req, res, next){
// 	cache.wrap(req.url, function(cache_cb){
// 			releaseService.getRelease(req.params.name)
// 				.then(function(release){
// 					release.dates = _.mapValues(release.dates, function(date){
// 						return date.valueOf();
// 					});
// 					return release;
// 				})
// 				.nodeify(cache_cb);
// 		}, function(err, release){
// 			res.send(release);
// 		});
// });