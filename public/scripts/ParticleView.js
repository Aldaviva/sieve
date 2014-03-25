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
			this.$el.attr('title', this.model.get('name')+'\n'+this.model.get('completedTasks')+'/'+this.model.get('totalTasks')+' resolved or closed' + (this.model.get('isAccepted') ? '\nAccepted' : ''));

			return this.el;
		}

	});

	window.ParticleView = ParticleView;

})();