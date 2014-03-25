(function(){
	
	var API_ROOT = "cgi-bin/";

	var ReleaseModel = Backbone.Model.extend({
		urlRoot: API_ROOT+'releases'
	});

	/**
	 * transient property 'completion': if completedTasks == 1 and totalTasks == 2, completion == 0.5
	 */
	var ParticleModel = Backbone.Model.extend({
		get: function(key){
			if(key === 'codeCompletion'){
				return this.get('codedTasks') / (this.get('totalTasks') || 1);
			} else if(key === 'testCompletion'){
				return this.get('testedTasks') / (this.get('totalTasks') || 1);
			} else {
				return Backbone.Model.prototype.get.apply(this, arguments);
			}
		}
	});

	var ParticleCollection = Backbone.Collection.extend({
		model: ParticleModel
		// url: function(){
		// 	return API_ROOT+'particles/'+this.options.release.get('sprintId')
		// }
	});

	window.ReleaseModel = ReleaseModel;
	window.ParticleModel = ParticleModel;
	window.ParticleCollection = ParticleCollection;

})();