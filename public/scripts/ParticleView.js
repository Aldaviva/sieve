(function(){
	
	var ParticleView = Backbone.View.extend({

		className: 'particle',

		initialize: function(){
			_.bindAll(this);
		},

		render: function(){
			if(this.$el.is(':empty')){
				this.$el
					.append($('<div>', { "class": "box" })
						.append($('<div>', { "class": "completion" }))
						.append($('<div>', { "class": "checkmark" })))
					.append($('<div>', { "class": "name" }));
			}

			this.$('.completion').css('height', this.model.get('completion')*100+'%');
			this.$('.checkmark').toggle(!!this.model.get('isAccepted'));
			this.$('.name').text(this.model.get('name'));

			return this.el;
		}

	});

	window.ParticleView = ParticleView;

})();