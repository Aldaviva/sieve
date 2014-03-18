var _      = require('lodash');
var logger = require('./logger')(module);

var userConfig;
try {
	userConfig = require('../../config');
} catch(err){
	if(err.code == 'MODULE_NOT_FOUND'){
		logger.warn("Missing config.json, using default configuration.");
		userConfig = {};
	} else {
		logger.error(err);
		throw err;
	}
}

var defaults = require('../../config.defaults');

module.exports = _.merge({}, defaults, userConfig);