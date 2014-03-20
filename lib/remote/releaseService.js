var _          = require('lodash');
var cache      = require('../common/cache');
var jiraClient = require('./jiraClient');
var logger     = require('../common/logger')(module);
var Moment     = require('moment');
var Q          = require('q');
var request    = require('pr-request2');

module.exports.getRelease = getCachedRelease;

function getRelease(nameQuery){
	logger.info("releaseService.getRelease(%s)", nameQuery);
	return getUnreleasedVersions()
		.then(function(versions){
			var version;
			if(nameQuery === 'current'){
				version = _(versions)
					.filter(function(version){
						return version.releaseDate.isAfter();
					})
					.first();
			} else {
				version = _.find(version, { name: nameQuery });
			}
			return version && decorateVersion(version);
		});
}

function getCachedRelease(nameQuery){
	return cache.wrapPromise("releaseService.getRelease."+nameQuery, _.partial(getRelease, nameQuery));
}

function decorateVersion(version){
	return request(jiraClient.createJiraRequest({
			url: 'greenhopper/1.0/sprintquery/6?includeFutureSprints=true'
		}))
		.then(function(res){
			var z2date = version.releaseDate;
			var sprintId = _.find(res.body.sprints, { name: version.name }).id;
			return {
				name: version.name,
				sprintId: sprintId,
				dates: {
					boulders : z2date.clone().subtract('weeks', 4),
					rocks    : z2date.clone().subtract('weeks', 3),
					pebbles  : z2date.clone().subtract('weeks', 2),
					a1       : z2date.clone().subtract('weeks', 2),
					z2       : z2date,
					z1       : z2date.clone().add('weeks', 2),
				}
			}
		});
}

/**
 * Get all versions of the PRD project that have not been released yet, sorted by ascending release date.
 * Release dates are returned as moment objects.
 */
function getUnreleasedVersions(){
	return request(jiraClient.createJiraRequest({
			url: 'api/2/project/PRD/versions'
		}))
		.then(function(res){
			return _(res.body)
				.filter({ released: false })
				.map(function(version){
					version.releaseDate = new Moment(version.releaseDate, 'YYYY-MM-DD');
					return version;
				})
				.sortBy('releaseDate')
				.value();
		});
}