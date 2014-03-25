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
						.append($('<div>', { "class": "completion code" }))
						.append($('<div>', { "class": "completion test" }))
						.append($('<div>', { "class": "checkmark" })))
					.append($('<div>', { "class": "name" }));
			}

			this.$('.completion.code').css('height', this.model.get('codeCompletion')*100+'%');
			this.$('.completion.test').css('height', this.model.get('testCompletion')*100+'%');
			this.$el.toggleClass('accepted', !!this.model.get('isAccepted'));
			this.$('.name').text(this.model.get('name'));
			this.$el.attr('title', this.model.get('name')+'\n'+this.model.get('codedTasks')+'/'+this.model.get('totalTasks')+' coded\n'+this.model.get('testedTasks')+'/'+this.model.get('totalTasks')+' tested' + (this.model.get('isAccepted') ? '\nAccepted' : ''));

			return this.el;
		}

	});

	window.ParticleView = ParticleView;

})();