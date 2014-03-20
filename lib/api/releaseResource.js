var _              = require('lodash');
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