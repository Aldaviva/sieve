var cache           = require('../common/cache');
var particleService = require('../remote/particleService');
var server          = require('./server');

server.get({ path: '/cgi-bin/particles/:sprintId', name: 'getParticles' }, function(req, res, next){
	particleService.getParticles(req.params.sprintId)
		.then(function(particles){
			res.send(particles);
		})
		.done();
});