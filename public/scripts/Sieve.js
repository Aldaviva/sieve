(function(){
	/**
	 * @param opts - object with properties:
	 *		- el : DOM element or jQuery element to use with root view
	 */
	var Sieve = function(opts){
		var releaseId              = getQueryValue("version") || "current";
		var release                = new ReleaseModel({ id: releaseId });
		var particleCollection     = new ParticleCollection([]);
		particleCollection.options = { release: release };
		var sieveView              = new SieveView({ el: opts.el, model: release, collection: particleCollection });

		sieveView.render();

		var fetchRelease = function(){
			release.fetch({
				success: function(model, res, opts){
					particleCollection.reset(model.get('particles'));
				}
			});
		};
		window.setInterval(fetchRelease, 5*60*1000);
		fetchRelease();
	};

	/**
	 * Query string parsing - variant
	 * @author grantjbutler
	 * https://gist.github.com/grantjbutler/987036
	 */
	function getQueryValue(key,b,c){
		if(getQueryValue.a==[]._)for(b=/\??([^=]+)=([^&]+)&?/g,getQueryValue.a={};c=b.exec(location.search);getQueryValue.a[c[1]]=c[2]);return getQueryValue.a[key];
	}

	window.Sieve = Sieve;

})();