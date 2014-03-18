var server      = require('./server');
var lessMiddleware = require('less-middleware');
var restify        = require('restify');

var publicDir = 'public';

server.use(lessMiddleware({
	src: publicDir,
	force: true,
	debug: false
	//TODO disable force and debug for production deployment
}));

server.get(/\//, restify.serveStatic({
	directory: publicDir,
	maxAge: 3600,
	default: 'index.html'
}));