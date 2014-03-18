var startTime = new Date();

var fs       = require('fs');
var panic    = require('panic');
var Q        = require('q');
fs.writeFile(".pid", process.pid);

var logger   = require('./common/logger')(module);
var config   = require('./common/config');

var panicLogger = require('./common/logger')().child({ module: "PANIC" });
panic.enablePanicOnCrash();
process.on('uncaughtException', function(err){
	panicLogger.fatal(err.stack ? err.stack : err);
});

var server = require('./api/server');
require('./api/particleResource');
require('./api/releaseResource');
require('./api/staticServer');
var serverStartPromise = server.start();

/**
 * Shutdown
 */
var shutdownPromise;
var shutdown = module.exports.shutdown = function(){
	if(!shutdownPromise){
		shutdownPromise = startedPromise
			.finally(function(){
				logger.info("Shutting down...");
				return Q()
					.then(server.shutdown())
					.fail(function(err){
						logger.error(err);
						throw err;
					})
					.then(function(){
						fs.unlinkSync(".pid");
						logger.info("Shut down.");
						process.exit(0);
					})
					.done();
			});
	}
	return shutdownPromise;
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Startup
 */
var startedPromise = module.exports.startedPromise = Q.all([ serverStartPromise ])
	.then(function(){
		logger.info("Startup complete in %d ms.", (new Date() - startTime));
	})
	.fail(function(err){
		logger.error("Failed to start: %s", err);
		shutdown();
		throw err;
	});
	
startedPromise.done();