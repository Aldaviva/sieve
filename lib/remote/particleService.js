var _          = require('lodash');
var jiraClient = require('./jiraClient');
var logger     = require('../common/logger')(module);
var Q          = require('q');
var request    = require('pr-request2');

var CLAST_SIZES = ['boulder', 'rock', 'pebble'];
var DEFAULT_CLAST_SIZE = "rock";
var CUSTOM_FIELDS = {
	EPIC_LINK: 'customfield_10350',
	EPIC_NAME: 'customfield_10351'
};

/**
 * For a given sprint, get the epics in that sprint, along with their completion percentage and accepted state
 */
function getParticles(sprintId){
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
module.exports.getParticles = getParticles;

/**
 * For all PRDs in a given sprint for a given epic, aggregate child leaf counts and attach epic metadata to results
 */
function getEpic(epicKey, prds){
	var epicChildIds = _(prds).pluck('childIds').flatten().value();
	var epicClastSize = _(prds).pluck('clastSize')
		.compact()
		.sortBy(function(item){
			return _.indexOf(CLAST_SIZES, item);
		})
		.value()[0] || DEFAULT_CLAST_SIZE;
	var epic;

	return Q.all(_.map(epicChildIds, getLeafCounts))
		.then(function(leafCounts){ //array of leaf counts, one per child of epic
			var leafCounts = sumLeafCounts(leafCounts);

			var isEpicAccepted = _(prds)
				.pluck('statusName')
				.all(getIsClosedOrResolved);

			epic = {
				id         : epicKey, 
				isAccepted : isEpicAccepted,
				clastSize  : epicClastSize,
				completion : isEpicAccepted ? 1 : (leafCounts.completed / (leafCounts.total || 1))
			};

			return getEpicMetadata(epic.id);
		})
		.then(function(metadata){
			_.extend(epic, metadata);
			return epic;
		});
}

/**
 * For a given issue, recursively get the number of childless issues, as well as the count of those issues that are resolved/closed
 */
function getLeafCounts(issueId){
	var isClosedOrResolved;
	logger.debug({ issueId: issueId }, "getLeafCounts");
	return request(jiraClient.createJiraRequest({
			url: 'api/2/issue/'+issueId+'?fields=key,summary,status,issuelinks,issuetype'
		}))
		.then(function(res){
			var fields = res.body.fields;
			isClosedOrResolved = getIsClosedOrResolved(fields.status.name);
			return getChildIds(res.body.id, fields.issuetype.name, fields.issuelinks);
		})
		.then(function(childIds){
			if(childIds.length){
				return Q.all(_.map(childIds, getLeafCounts))
					.then(sumLeafCounts)
					.then(function(leafCount){
						if(isClosedOrResolved){
							leafCount.completed = leafCount.total;
						}
						return leafCount;
					});
			} else {
				return {
					completed: +isClosedOrResolved,
					total: 1
				};
			}
		});
}

/**
 * For a given parent, get the IDs of all children.
 * Parent can be an epic or a normal issue (including PRDs).
 * @return a promise for an array of JIRA issue IDs.
 */
function getChildIds(parentId, parentTypeName, parentIssueLinks){
	if(parentTypeName == 'Epic'){
		logger.debug({ epicId: parentId }, "getChildIds for epic");
		return request(jiraClient.createJiraRequest({
				url: 'api/2/search?maxResults=1000&jql="Epic%20Link"='+parentId+'&fields=id'
			}))
			.then(function(res){
				return _.pluck(res.body.issues, 'id');
			});
	} else {
		return Q(_(parentIssueLinks)
			.filter(function(issuelink){
				return (issuelink.type.inward === 'fulfilled by') && (issuelink.inwardIssue);
			})
			.map(function(issuelink){
				return issuelink.inwardIssue.id;
			})
			.value());
	}
}

/**
 * For a given epic, get some metadata, like the short name (shown color-coded in lists) and long name
 */
function getEpicMetadata(epicKey){
	logger.debug({ epicKey: epicKey }, "getEpicMetadata");
	return request(jiraClient.createJiraRequest({
			url: 'api/2/issue/'+epicKey+'?fields=key,summary,'+CUSTOM_FIELDS.EPIC_NAME
		}))
		.then(function(res){
			var fields    = res.body.fields;
			var longName  = fields.summary;
			var shortName = fields[CUSTOM_FIELDS.EPIC_NAME];

			return {
				name: shortName || longName
			};
		});
}

/**
 * For a given sprint, get all PRDs in the sprint, with some derived metadata
 */
function getSprintPrds(sprintId){
	logger.debug({ sprintId: sprintId }, "getSprintPrds");
	return request(jiraClient.createJiraRequest({
		url: 'api/2/search?maxResults=1000&jql=Project=PRD%20AND%20Sprint='+sprintId+'+order+by+rank&fields=key,summary,issuelinks,status,labels,'+CUSTOM_FIELDS.EPIC_LINK,
		}))
		.then(function(res){
			return _.map(res.body.issues, function(issue){
				var childIds = _(issue.fields.issuelinks)
					.map(function(issuelink){
						if(issuelink.type.inward === 'fulfilled by' && issuelink.inwardIssue){
							return issuelink.inwardIssue.id;
						}
					})
					.compact()
					.value();

				var clastSize = _(issue.fields.labels)
					.invoke('toLowerCase')
					.intersection(CLAST_SIZES)
					.value()[0];

				return {
					id         : issue.id,
					key        : issue.key,
					name       : issue.fields.summary,
					epicKey    : issue.fields[CUSTOM_FIELDS.EPIC_LINK] || issue.key,
					statusName : issue.fields.status.name,
					labels     : issue.fields.labels,
					clastSize  : clastSize,
					childIds   : childIds
				};
			});
		});
}

function getIsClosedOrResolved(statusName){
	return (statusName == 'Resolved') || (statusName == 'Closed');
}

function sumLeafCounts(leafCounts){
	return _.reduce(leafCounts, function(prev, curr){
		return {
			total     : prev.total + curr.total,
			completed : prev.completed + curr.completed
		};
	}, { total: 0, completed: 0 });
}