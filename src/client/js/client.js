var GRID_SIZE = 9;

client = {
	init : function(args){
		console.log("starting web client...");
		
		console.log("handshaking ...")
		$.ajax({
			url: '/join?format=json',
			type: 'GET',
			success: function(res){
				
				console.log("received handshake");
				res = $.parseJSON(res);
				console.log(res);
				
				var state = res.response.state.toLowerCase();
				if (state == "game"){
					this.requestGame();
				} else if (state == "highscore"){
					this.requestHighscore();
				}
			},
			context: this
		});
		
		var me = this;
		$("#submit_game").mouseup(function(){
			me.submitGame();
		});
			
	},
	
	submitGame: function(){
		var user = $('input').val(),
		words = $('textarea').val();
		words = words.replace(" ", "");
		
		$.ajax({
			url: '/level',
			type: 'POST',
			context: this,
			data : {
				user: user,
				"words_found" : words,
				"level_id" : this.level_id
			},
			success: function(res){
				console.log("successfully submitted...");
				console.log(res);
			}
		});
	},
	
	requestGame : function(){
		console.log("requesting game");
		$.ajax({
			url: '/level?format=json',
			type: 'GET',
			context: this,
			success: this.handleReceiveGame
		});
	},
	
	requestHighscore: function(){
		console.log("request highscores");
	},
	
	handleReceiveGame: function(res){
		console.log("received game info ... ")
		res = $.parseJSON(res).response;
		console.log(res);
		
		this.level_id = res.level_id;
		var game_grid = "";
		var rows = res.grid.length / GRID_SIZE;
		for (var i = 0; i < rows; i++){
			game_grid += res.grid.substring(i * GRID_SIZE, (i + 1) * GRID_SIZE) + "<br>";
		}
		$("#grid").html(game_grid);
		$("#wordbank").html(res.word_bank.join(", "));
	}
};