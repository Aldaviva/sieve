var _          = require('lodash');
var cache      = require('../common/cache');
var jiraClient = require('./jiraClient');
var logger     = require('../common/logger')(module);
var Moment     = require('moment');
var Q          = require('q');
var request    = require('pr-request2');

module.exports.getRelease = getCachedRelease;

function getRelease(nameQuery){
	logger.info("getRelease(%s)", nameQuery);

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
				version = _.find(versions, { name: nameQuery });
			}
			if(version && version.name === '2.5') version.name = '2.5.0';
			return version && decorateVersion(version);
		})
		.then(function(results){
			logger.info("getReleases done");
			return results;
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
			var sprint = _.find(res.body.sprints, { name: version.name })
			if(sprint){
				return {
					name: version.name,
					sprintId: sprint.id,
					dates: {
						boulders : z2date.clone().subtract('weeks', 4),
						rocks    : z2date.clone().subtract('weeks', 3),
						pebbles  : z2date.clone().subtract('weeks', 2),
						a1       : z2date.clone().subtract('weeks', 2),
						z2       : z2date,
						z1       : z2date.clone().add('weeks', 2),
					}
				}
			} else {
				throw new Error("No PRD sprint found with name = "+version.name);
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