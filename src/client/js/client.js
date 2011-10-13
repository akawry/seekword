var GRID_SIZE = 9,
	GAME_LENGTH,
	HIGHSCORE_LENGTH,
	BUFFER_LENGTH;

client = {
	init : function(args){
		console.log("starting web client...");
		
		console.log("handshaking ...")
		$.ajax({
			url: '/join?action=get_state&format=json',
			type: 'GET',
			success: function(res){
				
				console.log("received handshake");
				res = $.parseJSON(res).response;
				console.log(res);
				GAME_LENGTH = res.game_length;
				HIGHSCORE_LENGTH = res.highscore_length;
				BUFFER_LENGTH = res.buffer_length;
				console.log(GAME_LENGTH, BUFFER_LENGTH, HIGHSCORE_LENGTH);
				
				var state = res.state.toLowerCase();
				if (state == "game"){
					this.requestGame(res.remaining_time);
				} else if (state == "highscore"){
					this.requestHighscore(res.remaining_time);
				} else if (state == "buffer"){
					this.waitForOthers(res.remaining_time);
				}
			},
			context: this
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
				res = $.parseJSON(res).response;
				if (!res.error){
					console.log("successfully submitted...");
				} else {
					console.log("[ERROR]", res.error);
					alert("There was an error submitting ... please try again");
				}
			}
		});
	},
	
	requestGame : function(remaining_time){
		console.log("requesting game with "+remaining_time+" seconds left");
		this.setState("game");
		
		$.ajax({
			url: '/level?format=json',
			type: 'GET',
			context: this,
			success: this.handleReceiveGame
		});
		
		// start timer to receive submit game and highscore
		remaining_time = remaining_time || GAME_LENGTH;
		var me = this;
		setTimeout(function(){
			me.submitGame();
			me.waitForOthers();
		}, remaining_time * 1000);
	},
	
	requestHighscore: function(remaining_time){
		console.log("request highscores");
		this.setState("scores");
		
		$.ajax({
			url: '/score?format=json',
			type: 'GET',
			context: this,
			success: this.handleReceiveScores
		});
		
		remaining_time = remaining_time || HIGHSCORE_LENGTH;
		var me = this;
		setTimeout(function(){
			me.requestGame();
		}, remaining_time * 1000);
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
	},
	
	handleReceiveScores : function(res){
		res = $.parseJSON(res).response;
		console.log("received highscores... ", res);
		
		var list = "";
		$.each(res, function(idx, obj){
			list += obj.rank+") " + obj.user + " (" + obj.score +")<br/>"
		});
		
		$("#list").html(list);
	},
	
	waitForOthers : function(remaining_time){
		this.setState("buffer");
		remaining_time = remaining_time || BUFFER_LENGTH;
		var me = this;
		setTimeout(function(){
			me.requestHighscore();
		}, remaining_time * 1000);
	},
	
	setState : function(state){
		switch(state){
		case "game":
			$("#game").css({
				display: 'block'
			});
			$("#scores").css({
				display: 'none'
			});
			$("#waiting").css({
				display: 'none'
			});
			
			break;
			
		case "buffer":
			$("#game").css({
				display: 'none'
			});
			$("#scores").css({
				display: 'none'
			});
			$("#waiting").css({
				display: 'block'
			});
			
			break;
			
		case "scores":
			$("#game").css({
				display: 'none'
			});
			$("#scores").css({
				display: 'block'
			});
			$("#waiting").css({
				display: 'none'
			});
			
			break;
		}
	}
};