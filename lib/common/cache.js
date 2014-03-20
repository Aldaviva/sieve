var cache_manager = require('cache-manager');
var Q             = require('q');

var TTL = 5*60*1000; //millis

var cache = module.exports = cache_manager.caching({
	store: 'memory',
	max: 32,
	ttl: TTL/1000
});

cache.ttl = TTL;

module.exports.wrapPromise = function(key, promiseReturningFunc){
	var deferred = Q.defer();

	cache.wrap(key, function(cb){
		Q(promiseReturningFunc()).nodeify(cb);
	}, deferred.makeNodeResolver());

	return deferred.promise;
};