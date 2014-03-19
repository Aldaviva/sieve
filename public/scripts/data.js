(function(){
	
	var API_ROOT = "/cgi-bin/";

	var ReleaseModel = Backbone.Model.extend({
		urlRoot: API_ROOT+'releases'
	});

	var ParticleModel = Backbone.Model.extend({

	});

	var ParticleCollection = Backbone.Collection.extend({
		model: ParticleModel,
		url: function(){
			return API_ROOT+'particles/'+this.options.release.get('sprintId')
		}
	});

	window.ReleaseModel = ReleaseModel;
	window.ParticleModel = ParticleModel;
	window.ParticleCollection = ParticleCollection;

})();