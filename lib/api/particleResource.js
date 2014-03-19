var server = require('./server');
var jiraService = require('../remote/jiraService');

server.get({ path: '/cgi-bin/particles/:sprintId', name: 'getParticles' }, function(req, res, next){
	// var sprintId = req.params.sprintId;
	jiraService.getReleaseItems(req.params.sprintId)
		.then(function(particles){
			res.send(particles);
		})
		.done();
	/*res.send([
		{
			id: "PRD-1",
			name: "Large meetings",
			completion: 1,
			isAccepted: true,
			clastSize: "boulder"
		},{
			id: "PRD-2",
			name: "Larger meetings",
			completion: 0.8,
			isAccepted: false,
			clastSize: "boulder"
		},{
			id: "PRD-3",
			name: "Jumbo meetings",
			completion: 0.6,
			isAccepted: false,
			clastSize: "boulder"
		},{
			id: "PRD-4",
			name: "Mega meetings",
			completion: 0.4,
			isAccepted: false,
			clastSize: "boulder"
		},{
			id: "PRD-5",
			name: "Giga meetings",
			completion: 0.2,
			isAccepted: false,
			clastSize: "boulder"
		},{
			id: "PRD-6",
			name: "Ultra meetings",
			completion: 0,
			isAccepted: false,
			clastSize: "boulder"
		},{
			id: "PRD-7",
			name: "Rock 1",
			completion: 1,
			isAccepted: true,
			clastSize: "rock"
		},{
			id: "PRD-8",
			name: "Rock 2",
			completion: 0.8,
			isAccepted: false,
			clastSize: "rock"
		},{
			id: "PRD-9",
			name: "Rock 3",
			completion: 0.6,
			isAccepted: false,
			clastSize: "rock"
		},{
			id: "PRD-10",
			name: "Rock 4",
			completion: 0.5,
			isAccepted: false,
			clastSize: "rock"
		},{
			id: "PRD-11",
			name: "Rock 5",
			completion: 0.4,
			isAccepted: false,
			clastSize: "rock"
		},{
			id: "PRD-12",
			name: "Rock 6",
			completion: 0.2,
			isAccepted: false,
			clastSize: "rock"
		},{
			id: "PRD-13",
			name: "Rock 7",
			completion: 0,
			isAccepted: false,
			clastSize: "rock"
		},{
			id: "PRD-14",
			name: "Pebble 1",
			completion: 1,
			isAccepted: true,
			clastSize: "pebble"
		},{
			id: "PRD-15",
			name: "Pebble 2",
			completion: 0.9,
			isAccepted: false,
			clastSize: "pebble"
		},{
			id: "PRD-16",
			name: "Pebble 3",
			completion: 0.8,
			isAccepted: false,
			clastSize: "pebble"
		},{
			id: "PRD-17",
			name: "Pebble 4",
			completion: 0.7,
			isAccepted: false,
			clastSize: "pebble"
		},{
			id: "PRD-18",
			name: "Pebble 5",
			completion: 0.6,
			isAccepted: false,
			clastSize: "pebble"
		},{
			id: "PRD-19",
			name: "Pebble 6",
			completion: 0.5,
			isAccepted: false,
			clastSize: "pebble"
		},{
			id: "PRD-20",
			name: "Pebble 7",
			completion: 0.4,
			isAccepted: false,
			clastSize: "pebble"
		},{
			id: "PRD-21",
			name: "Pebble 8",
			completion: 0.3,
			isAccepted: false,
			clastSize: "pebble"
		}
	]);*/
});