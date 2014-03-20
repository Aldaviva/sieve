(function(){
	/**
	 * @param opts - object with properties:
	 *		- el : DOM element or jQuery element to use with root view
	 */
	var Sieve = function(opts){
		var currentRelease     = new ReleaseModel({ id: 'current' });
		var particleCollection = new ParticleCollection([]);
		particleCollection.options = { release: currentRelease };
		var sieveView          = new SieveView({ el: opts.el, model: currentRelease, collection: particleCollection });

		currentRelease.on('change', function(){
			particleCollection.fetch({ reset: true });
		});

		sieveView.render();
		currentRelease.fetch();

		window.setInterval(window.location.refresh, 5*60*1000);
	};

	window.Sieve = Sieve;

})();