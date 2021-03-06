var _          = require('lodash');
var cache      = require('../common/cache');
var jiraClient = require('./jiraClient');
var logger     = require('../common/logger')(module);
var Q          = require('q');
var request    = require('pr-request2');

var CLAST_SIZES = ['boulder', 'rock', 'pebble'];
var DEFAULT_CLAST_SIZE = CLAST_SIZES[1];
var CUSTOM_FIELDS = {
	EPIC_LINK: 'customfield_10350',
	EPIC_NAME: 'customfield_10351'
};

module.exports.getParticles = getParticlesCached;

/**
 * For a given sprint, get the epics in that sprint, along with their completion percentage and accepted state
 */
function getParticles(release){
	logger.info({ release: release }, "getParticles");
	return getSprintPrds(release.sprintId)
		.then(function(sprintPrds){
			//group sprint prds into epics
			var prdsByEpic = _.groupBy(sprintPrds, 'epicKey');

			//recur through children, counting leaves and completed leaves
			var epicLeafCountPromises = _.map(prdsByEpic, function(prds, epicKey){
				return getEpic(epicKey, prds, release.name);
			});

			return Q.all(epicLeafCountPromises);
		})
		.then(function(results){
			logger.info({ release: release }, "getParticles done");
			logger.debug({ particles: results });
			return results;
		});
}

function getParticlesCached(release){
	return cache.wrapPromise("particleService.getParticles."+release.sprintId, _.partial(getParticles, release));
}

/**
 * For all PRDs in a given sprint for a given epic, aggregate child leaf counts and attach epic metadata to results
 */
function getEpic(epicKey, prds, releaseName){
	var epicChildIds = _(prds).pluck('childIds').flatten().value();
	var epicClastSize = _(prds).pluck('clastSize')
		.compact()
		.sortBy(function(item){
			return _.indexOf(CLAST_SIZES, item);
		})
		.value()[0] || DEFAULT_CLAST_SIZE;
	var epic;

	return Q.all(_.map(epicChildIds, _.partial(getLeafCounts, releaseName, {})))
		.then(function(leafCounts){ //array of leaf counts, one per child of epic
			// if(_.any(leafCounts, 'cycleChildKey')){
			// 	logger.warn({ parent: { key: epicKey }, child: { key: _.find(leafCounts, 'cycleChildKey').cycleChildKey }}, "Cycle in Jira.")
			// }

			var leafCounts = sumLeafCounts(leafCounts);

			var isEpicAccepted = _(prds)
				.pluck('statusName')
				.all(function(prd){
					return getIsTested(prd) || getIsCoded(prd);
				});

			epic = {
				id          : epicKey, 
				isAccepted  : isEpicAccepted,
				clastSize   : epicClastSize,
				totalTasks  : leafCounts.total,
				codedTasks  : isEpicAccepted ? leafCounts.total : leafCounts.coded,
				testedTasks : isEpicAccepted ? leafCounts.total : leafCounts.tested,
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
function getLeafCounts(releaseName, visitedIssueIds, issueId){
	var isCoded;
	var isTested;
	var fixVersion;
	logger.debug({ issueId: issueId }, "getLeafCounts");
	// if(issueId == "38768"){
	// 	logger.warn("getLeafCounts for RVT-8163");
	// }

	return request(jiraClient.createJiraRequest({
			url: 'api/2/issue/'+issueId+'?fields=key,summary,status,issuelinks,issuetype,fixVersions'
		}))
		.then(function(res){
			var fields = res.body.fields;
			isCoded    = getIsCoded(fields.status.name);
			isTested   = getIsTested(fields.status.name);
			
			fixVersion = (fields.fixVersions.length) ? fields.fixVersions[0].name : null;
			if(fixVersion === '2.5') fixVersion = '2.5.0';
			if(fixVersion === '2.6') fixVersion = '2.6.0'; //fuck you seam

			insertVisitedIssue(visitedIssueIds, issueId);
			if(isIssueScanCountAboveThreshold(visitedIssueIds, issueId)){
				logger.warn({
					issue: {
						key     : res.body.key,
						name    : fields.summary,
						release : releaseName,
						id      : issueId
					}
				}, "Cycle in Jira: %s has already been scanned too many times.", res.body.key);

				return Q({
					coded: 0,
					tested: 0,
					total: 0,
					cycleChildKey: res.body.key
				});
			} else {
				return getChildIds(res.body.id, fields.issuetype.name, fields.issuelinks)
					.then(function(childIds){
						if(childIds.length){ //we have children, recur
							// var idToKey = {
							// 	"38768": "RVT-8163",
							// 	"40327": "PRD-1584",
							// 	"39977": "RVT-8424"
							// }
							// var intersection = _.intersection(childIds, _.keys(idToKey));
							// if(intersection.length){
							// 	logger.warn("%s found child with key = %s", res.body.key, idToKey[intersection[0]]);
							// }
							return Q.all(_.map(childIds, _.partial(getLeafCounts, releaseName, visitedIssueIds)))
								.then(function(leafCounts){
									if(_.any(leafCounts, 'cycleChildKey')){
										logger.warn({
											parent: {
												id: res.body.key
											},
											child: {
												key: _.find(leafCounts, 'cycleChildKey').cycleChildKey
											}
										}, "Cycle in Jira");
									}
									return leafCounts;
								})
								.then(sumLeafCounts)
								.then(function(leafCount){
									if(isTested){
										leafCount.coded = leafCount.total;
										leafCount.tested = leafCount.total;
									}
									return leafCount;
								});
						} else /*if(fixVersion === null || fixVersion === releaseName)*/ { //temporarily including all children regardless of fixVersion
							return {
								coded: +isCoded,
								tested: +isTested,
								total: 1
							};
						// } else { //wrong fix version, ignore
						// 	logger.debug({ issueId: issueId }, "fix version %s does not match %s, ignoring", fixVersion, releaseName);
						// 	return {
						// 		coded: 0,
						// 		tested: 0,
						// 		total: 0
						// 	};
						}
					});
			}
		})

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
		var PRD_KEY_PATTERN = /^PRD-/;
		return Q(_(parentIssueLinks)
			.filter(function(issuelink){
				return (issuelink.type.inward === 'fulfilled by') && (issuelink.inwardIssue) && (!PRD_KEY_PATTERN.test(issuelink.inwardIssue.key));
			})
			// .tap(function(issueLinks){
			// 	logger.info({ issueLinks: issueLinks }, "getChildIds issueLinks (how to exclude PRDs?)");
			// })
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
			url: 'api/2/issue/'+epicKey+'?fields=key,summary,labels,'+CUSTOM_FIELDS.EPIC_NAME
		}))
		.then(function(res){
			var fields    = res.body.fields;
			var longName  = fields.summary;
			var shortName = fields[CUSTOM_FIELDS.EPIC_NAME];

			return {
				name: shortName || longName,
				isMvp: !_.contains(fields.labels, 'notmvp')
			};
		});
}

/**
 * For a given sprint, get all PRDs in the sprint, with some derived metadata
 * If a child is part of a PRD epic with the 'notmvp' label, report each PRD child as an individual epic
 */
function getSprintPrds(sprintId){
	logger.debug({ sprintId: sprintId }, "getSprintPrds");
	return request(jiraClient.createJiraRequest({
		url: 'api/2/search?maxResults=1000&jql=Project=PRD%20AND%20Sprint='+sprintId+'+order+by+rank&fields=key,summary,issuelinks,status,labels,'+CUSTOM_FIELDS.EPIC_LINK,
		}))
		.then(function(res){
			return Q.all(_.map(res.body.issues, function(issue){
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

				var sprintPrd = {
					id         : issue.id,
					key        : issue.key,
					name       : issue.fields.summary,
					// epicKey    : issue.fields[CUSTOM_FIELDS.EPIC_LINK] || issue.key,
					statusName : issue.fields.status.name,
					labels     : issue.fields.labels,
					clastSize  : clastSize,
					childIds   : childIds
				};

				var epicLink = issue.fields[CUSTOM_FIELDS.EPIC_LINK]
				if(epicLink){
					return getEpicMetadata(epicLink)
						.then(function(metadata){
							sprintPrd.epicKey = (metadata.isMvp ? epicLink : issue.key);
							return sprintPrd;
						});
				} else {
					sprintPrd.epicKey = issue.key;
					return Q(sprintPrd);
				}
			}));
		});
}

function getIsCoded(statusName){
	return (statusName == 'Resolved') || (statusName == 'QA In Progress') || getIsTested(statusName);
}

function getIsTested(statusName){
	return (statusName == 'Closed');
}

function sumLeafCounts(leafCounts){
	return _.reduce(leafCounts, function(prev, curr){
		return {
			coded  : prev.coded + curr.coded,
			tested : prev.tested + curr.tested,
			total  : prev.total + curr.total
		};
	}, { total: 0, coded: 0, tested: 0 });
}

function insertVisitedIssue(visitedIssueIds, issueId){
	visitedIssueIds[issueId] = (visitedIssueIds[issueId] || 0) + 1;
	// var newIndex = _.sortedIndex(visitedIssueIds, issueId);
	// visitedIssueIds.splice(newIndex, 0, issueId);
}

function isIssueScanCountAboveThreshold(visitedIssueIds, issueId){
	return visitedIssueIds[issueId] >= 8;
	//_.indexOf(visitedIssueIds, issueId, true) != -1
}