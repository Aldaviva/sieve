var server = require('./server');
var moment = require('moment');

server.get({ path: '/cgi-bin/releases/current', name: 'getCurrentRelease' }, function(req, res, next){
	res.send({
		name: "2.6.0",
		sprintId: 252,
		dates: {
			boulders: 1394179200000,
			rocks: 1394780400000,
			pebbles: 1395385200000,
			z2: 1396767600000
		}
	});
	return next();
});