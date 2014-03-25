var _               = require('lodash');
var logger          = require('../common/logger')(module);
var Moment          = require('moment');
var particleService = require('../remote/particleService');
var releaseService  = require('../remote/releaseService');
var server          = require('./server');

server.get({ path: '/cgi-bin/releases/:name', name: 'getRelease' }, function(req, res, next){
	var release;

	releaseService.getRelease(req.params.name)
		.then(function(release_){
			release = release_;
			release.dates = _.mapValues(release.dates, function(date){
				return date.valueOf();
			});
			return particleService.getParticles(release);
		})
		.then(function(particles){
			release.particles = particles;
			res.send(release);
		})
		.done();
});