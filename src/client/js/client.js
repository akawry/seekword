var GRID_WIDTH = 9,
	GRID_HEIGHT = 10,
	GRID_SIZE = '60px',
	GAME_LENGTH,
	HIGHSCORE_LENGTH,
	BUFFER_LENGTH;

var colors = {
	mouseover: "#DEDEDE",
	mousedown: "#CDCDCD",
	mouseout: "#FFFFFF"
};

client = {
	init : function(args){
		console.log("starting web client...");
		
		this.setupGrid(GRID_WIDTH, GRID_HEIGHT);
		
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
	
	setupGrid : function(width, height){
		for (var i = 0; i < height; i++){
			for (var j = 0; j < width; j++){
				$("#grid").append(
					"<div id='grid" + i + "" + j + 
						"' style='width: " + GRID_SIZE + "; height: " + GRID_SIZE+ ";" +
						"text-align: center; display: inline-block;'>"+
					"</div>");
				$("#grid"+i+j).mouseenter(function(){
					if (!$("#grid").attr('gridX'))
						$(this).css({
							'background-color' : colors.mouseover
						});
				}).mouseleave(function(){
					$(this).css({
						'background-color' : colors.mouseout
					});
				}).mousedown(function(){
					$(this).css({
						'background-color' : colors.mousedown
					});
					
					$("#grid").attr('gridX', $(this).attr('id').charAt('grid'.length + 1)).attr('gridY', $(this).attr('id').charAt('grid'.length));
				});
			}
			$("#grid").append("<br/>");
		}
		
		var deselectAll = function(){
			for (var i = 0; i < height; i++){
				for (var j = 0; j < width; j++){
					$("#grid"+i+j).css({
						'background-color' : colors.mouseout
					});
				}
			}
		};
		
		var me = this;
		$("#grid").mousemove(function(evt){
			
			var x = $(this).attr('gridX'),
				y = $(this).attr('gridY'),
				newX = $(evt.target).attr('id').charAt('grid'.length + 1),
				newY = $(evt.target).attr('id').charAt('grid'.length);
			
			if (x && y){
				if (x == newX && y != newY){
					deselectAll();
					for (var i = 0; i <= Math.abs(newY - y); i++){
						$("#grid" + (Math.min(newY, y) + i) + x).css({
							'background-color' : colors.mousedown
						});
					}
				} else if (y == newY && x != newX){
					deselectAll();
					for (var i = 0; i <= Math.abs(newX - x); i++){
						$("#grid" + y + (Math.min(newX, x) + i)).css({
							'background-color' : colors.mousedown
						});
					}
				} else if (Math.abs(newX - x) == Math.abs(newY - y)){
					deselectAll();
					for (var i = 0; i <= Math.abs(newX - x); i++){
						
						if (newX < x && newY > y){
							$("#grid" + (newY - i) + (Number(newX) + i)).css({
								'background-color' : colors.mousedown
							});
						} else if (newX > x && newY < y){
							$("#grid" + (Number(y) - i) + (Number(x) + i)).css({
								'background-color' : colors.mousedown
							});
						} else {
							$("#grid" + (Math.min(newY, y) + i) + (Math.min(newX, x) + i)).css({
								'background-color' : colors.mousedown
							});
						}
					}
				}
			}
		}).mouseup(function(evt){
			
			var x = $(this).attr('gridX'),
				y = $(this).attr('gridY'),
				newX = $(evt.target).attr('id').charAt('grid'.length + 1),
				newY = $(evt.target).attr('id').charAt('grid'.length),
				word = "",
				selectedColor = $(evt.target).css('background-color');
			
			$.each($("#grid > div").filter(function(){
				return $(this).css('background-color') == selectedColor;
			}), function(i, el){
				word += $(el).html();
			});
			
			if ((newX < x || newY < y) && !(newX < x && newY > y)){
				var buff = "";
				for (var i = word.length - 1; i >= 0; i--)
					buff += word.charAt(i);
				word = buff;
			}
			me.checkWord(word);
			
			deselectAll();
			$(this).attr('gridX', null).attr('gridY', null);
		}).bind('dragstart', function(evt){
			evt.preventDefault();
		}).bind('selectstart', function(evt){
			evt.preventDefault();
		});
	},
	
	fillGrid : function(width, height, grid){
		for (var i = 0; i < GRID_HEIGHT; i++){
			for (var j = 0; j < GRID_WIDTH; j++){
				$("#grid"+i+j).html(grid.charAt(i * GRID_WIDTH + j));
			}
		}
	},
	
	checkWord: function(word){
		
		console.log("checking word " + word);
		
		$.each($("#wordbank > span"), function(i, el){
			if ($(el).html() == word){
				$(el).css({
					'text-decoration' : 'line-through'
				});
			}
		});
	},
	
	submitGame: function(){
		var user = $('input').val(),
			words = "",
			found = $("#wordbank > span").filter(function(){
				return $(this).css("text-decoration") == "line-through";
			});
		
		$.each(found, function(i, el){
			words += $(el).html() + (i < found.length - 1 ? "," : "");
		});
		
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
		this.fillGrid(GRID_WIDTH, GRID_HEIGHT, res.grid);
		$.each(res.word_bank, function(i, word){
			$("#wordbank").append("<span style='padding-right: 5px'>" + word + "</span>");
		});
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