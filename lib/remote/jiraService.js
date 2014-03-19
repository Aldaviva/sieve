var _       = require('lodash');
var config  = require('../common/config');
var Q       = require('q');
var request = require('pr-request2');
var logger  = require('../common/logger')(module);

var getReleaseItems = module.exports.getReleaseItems = function(sprintId){
	return getSprintPrds(sprintId)
		.then(function(sprintPrds){
			//group sprint prds into epics
			var prdsByEpic = _.groupBy(sprintPrds, 'epicKey');

			//recur through children, counting leaves and completed leaves
			var epicLeafCountPromises = _.map(prdsByEpic, function(prds, epicKey){
				return getEpic(epicKey, prds);
			});

			return Q.all(epicLeafCountPromises);
		});
};

function getEpic(epicKey, prds){
	var epicChildIds = _(prds).pluck('childIds').flatten().value();

	return Q.all(_.map(epicChildIds, getLeafCounts))
		.then(function(leafCounts){ //array of leaf counts, one per child of epic
			var leafCounts = _.reduce(leafCounts, function(prev, curr){
				return {
					total: prev.total + curr.total,
					completed: prev.completed + curr.completed
				};
			}, { total: 0, completed: 0 });

			var particle = {
				id: epicKey, 
				isAccepted: _(prds).pluck('statusName').all(function(statusName){
					return statusName == 'Resolved' || statusName == 'Closed';
				})
			};
			particle.completion = (particle.isAccepted) ? 1 : (leafCounts.completed / leafCounts.total);

			return particle;
		})
		.then(function(particle){
			return getEpicMetadata(particle.id)
				.then(function(metadata){
					_.extend(particle, metadata);
					return particle;
				});
		});
}

function createJiraRequest(opts){
	return _.extend({
		url: config.remote.jira.baseUrl+'rest/'+opts.url,
		auth: {
			username: config.remote.jira.username,
			password: config.remote.jira.password
		},
		json: true
	}, _.omit(opts, 'url'));
}

function getLeafCounts(issueId){
	return Q.resolve({ completed: 1, total: 2 }); //TODO implement
}

function getEpicMetadata(epicKey){
	return request(null, createJiraRequest({
			url: 'api/2/search?maxResults=1000&jql=key='+epicKey+'&fields=key,summary,customfield_10351'
		}))
		.then(function(res){
			var fields = res.body.issues[0].fields;
			var longName = fields.summary;
			var shortName = fields.customfield_10351;
			var labels = fields.labels;

			var clastSize = _.intersection(['Boulder', 'Rock', 'Pebble'], labels)[0];
			if(!clastSize){ //TODO assign randomly if missing for testing purposes. remove once labels are used.
				clastSize = ['boulder', 'rock', 'pebble'][Math.floor(Math.random()*3)];
			}

			return {
				name: shortName || longName,
				clastSize: clastSize.toLowerCase()
			};
		});
}

function getSprintPrds(sprintId){
	return request(null, createJiraRequest({
		url: 'api/2/search?maxResults=1000&jql=Project=PRD%20AND%20Sprint='+sprintId+'+order+by+rank&fields=key,summary,issuelinks,status,customfield_10350',
	})).then(function(res){
		return _.map(res.body.issues, function(issue){
			return {
				id: issue.id,
				key: issue.key,
				name: issue.fields.summary,
				epicKey: issue.fields.customfield_10350 || issue.key,
				statusName: issue.fields.status.name,
				childIds: _(issue.fields.issuelinks).map(function(issuelink){
					if(issuelink.type.inward === 'fulfilled by' && issuelink.inwardIssue){
						return issuelink.inwardIssue.id;
					}
				}).compact().value()
			};
		});
	});
}