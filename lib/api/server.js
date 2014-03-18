var _          = require('lodash');
var config     = require('../common/config');
var Q          = require('q');
var restify    = require('restify');
var rootLogger = require('../common/logger');

var logger     = rootLogger(module);

var restifyLogger = rootLogger().child({ module: 'restify' });
restifyLogger.level("warn");
var server = module.exports = restify.createServer({
	name: "sieve",
	log: restifyLogger
});

server.use(restify.queryParser({ mapParams: false }));

server.pre(function(req, res, next){
	panicDbg.set('sieve.api.last-request', {
		client  : req.connection.remoteAddress,
		time    : req.time(),
		method  : req.method,
		url     : req.url,
		headers : req.headers
	});
	if(req.url != '/ruok'){
		logger.trace({
			method: req.method
		}, req.url);
	}
	//TODO don't log requests for static resources because it clutters the log
	return next();
});

server.on('uncaughtException', function(req, res, route, err){
	logger.error("Uncaught exception: %s", err);
	logger.error({
		client  : req.connection.remoteAddress,
		time    : req.time(),
		method  : req.method,
		url     : req.url,
		headers : req.headers
	});
});

server.get({ path: 'ruok', name: 'heartbeat' }, function(req, res, next){
	Q().then(function(){
			res.send(204);
		});
});

server.start = function(){
	var port = config.httpServer.port;
	var deferred = Q.defer();
	var promise = deferred.promise;

	server.on('error', deferred.reject);

	server.listen(port, function(err){
		if(err != null){
			deferred.reject(err);
		} else {
			deferred.resolve();
		}
	});

	promise.then(
		function(){
			logger.info("Listening on %s", server.url);
		},
		function(err){ 
			if(err.code == 'EACCES'){
				logger.error("No access to port "+port);
			} else if(err.code == 'EADDRINUSE'){
				logger.error("Port "+port+" already in use.");
			} else {
				logger.error("Error starting server: "+err.message); 
			}
			throw err;
		}
	);

	return promise;
};

server.shutdown = function(){
	var deferred = Q.defer();
	try {
		server.close(function(err){
			if(err != null){
				logger.error("Unable to close: %s", err);
				deferred.reject(err);
			} else {
				logger.info("Shut down.");
				deferred.resolve();
			}
		});
	} catch (e){
		if(e == 'Error: Not running'){
			logger.info("Shut down.");
			deferred.resolve();
		} else {
			logger.error(e);
			deferred.reject(e);
		}
	}
	return deferred.promise;
};