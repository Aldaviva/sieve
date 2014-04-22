var _      = require('lodash');
var config = require('../common/config');
var logger = require('../common/logger')(module);

/**
 * HTTP request helper
 * @return options suitable for passing to request(options)
 *
 * We can't replace this with request.default because it doesn't help us build the URL from a base and suffix,
 * and passing around the baseURL to each invocation seems dumb.
 *
 * usage:
 * 		var request = require('request');
 *		var jiraClient = require('./jiraClient');
 *		request(createJiraRequest({ url: 'api/2/...' }))
 *			.then(..)
 */
function createJiraRequest(opts){
	logger.trace({ url: opts.url }, "jira request");
	
	return _.extend({
		url: config.remote.jira.baseUrl+'rest/'+opts.url,
		auth: {
			username : config.remote.jira.username,
			password : config.remote.jira.password
		},
		json: true
	}, _.omit(opts, 'url'));
}

module.exports.createJiraRequest = createJiraRequest;