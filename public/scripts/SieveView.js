(function(){
	
	var PLURAL_CLASTSIZES = {
		pebble: 'pebbles',
		rock: 'rocks',
		boulder: 'boulders'
	};

	var SieveView = Backbone.View.extend({

		initialize: function(){
			_.bindAll(this);

			this.model.on('change', this.renderReleaseName);
			this.collection.on('reset', this.renderParticles);
		},

		render: function(){
			if(this.$el.is(':empty')){
				this.$el.append($('<div>', { "class": "release" }).append(
					$('<span>', { "class": "name" })));
			}
			
			this.renderParticles();
			this.renderReleaseName();

			return this.el;
		},

		renderReleaseName: function(){
			this.$('.release .name').text(this.model.get('name'));
		},

		renderParticles: function(){
			this.$('section').remove();
			var clastGroups = this.collection.groupBy('clastSize');
			var sectionEls = _.map(['boulder', 'rock', 'pebble'], function(clastSize){
				var pluralClastSize = PLURAL_CLASTSIZES[clastSize];

				var particles = _.sortBy(clastGroups[clastSize], function(particle){
					//isAccepted desc, completion desc, name asc
					return '' + Number(!particle.get('isAccepted')) + ((1-particle.get('completion'))/10).toFixed(2) + particle.get('name');
				});

				if(particles.length){
					var particleEls = _.map(particles, function(particle){
						return new ParticleView({ model: particle }).render();
					});

					var sectionEl = $('<section>', { "class": pluralClastSize });

					var dueDate = new moment(this.model.get('dates')[pluralClastSize]);
					var formattedDueDate = dueDate.format("M/D");
					sectionEl
						.append($('<header>')
							.append($("<h1>").text(pluralClastSize))
							.append($("<div>", { "class": "dueDate" }).text("Due "+formattedDueDate)))
						.append($('<div>', { "class": "particles" }))

					sectionEl.find('.particles').append(particleEls);

					return sectionEl;
				} else {
					return null;
				}
			}, this);

			this.$el.prepend(sectionEls);
		}
	});

	window.SieveView = SieveView;

})();