var GRID_WIDTH = 9,
	GRID_HEIGHT = 10,
	GAME_LENGTH,
	HIGHSCORE_LENGTH,
	BUFFER_LENGTH;

client = {
	init : function(args){
		console.log("starting web client...");
		
		$("#game").bind('dragstart', function(evt){
			evt.preventDefault();
		}).bind('selectstart', function(evt){
			evt.preventDefault();
		});
		
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
					"<div id='grid"+i+j+"' class='tile'>"+
						"<span class='tile-title'></span>"+
					"</div>");
				$("#grid"+i+j).bind('vmousedown', function(){
					$(this).addClass("selected");
					$("#grid").attr('gridX', $(this).attr('id').charAt('grid'.length + 1)).attr('gridY', $(this).attr('id').charAt('grid'.length));
				});
			}
			$("#grid").append("<br/>");
		}
		
		var deselectAll = function(){
			for (var i = 0; i < height; i++){
				for (var j = 0; j < width; j++){
					$("#grid"+i+j).removeClass("selected");
				}
			}
		};
		
		var me = this;
		$("#grid").bind('vmousemove', function(evt){
			
			var x = $(this).attr('gridX'),
				y = $(this).attr('gridY'),
				id = $(evt.target).closest('div').attr('id');
			
			if (id && x && y){
				var newX = id.charAt('grid'.length + 1),
					newY = id.charAt('grid'.length);

				if (x == newX && y != newY){
					deselectAll();
					for (var i = 0; i <= Math.abs(newY - y); i++){
						$("#grid" + (Math.min(newY, y) + i) + x).addClass("selected");
					}
				} else if (y == newY && x != newX){
					deselectAll();
					for (var i = 0; i <= Math.abs(newX - x); i++){
						$("#grid" + y + (Math.min(newX, x) + i)).addClass("selected");
					}
				} else if (Math.abs(newX - x) == Math.abs(newY - y)){
					deselectAll();
					for (var i = 0; i <= Math.abs(newX - x); i++){
						
						if (newX < x && newY > y){
							$("#grid" + (newY - i) + (Number(newX) + i)).addClass("selected");
						} else if (newX > x && newY < y){
							$("#grid" + (Number(y) - i) + (Number(x) + i)).addClass("selected");
						} else {
							$("#grid" + (Math.min(newY, y) + i) + (Math.min(newX, x) + i)).addClass("selected");
						}
					}
				}
			}
		}).bind('vmouseup', function(evt){
			
			var x = $(this).attr('gridX'),
				y = $(this).attr('gridY'),
				id = $(evt.target).closest('div').attr('id');
			if (id){
				var newX = id.charAt('grid'.length + 1),
					newY = id.charAt('grid'.length),
					word = "",
					selectedColor = $(evt.target).closest('div').css('background-color');
				
				$.each($("#grid > div").filter(function(){
					return $(this).css('background-color') == selectedColor;
				}), function(i, el){
					word += $(el).text();
				});
				
				if ((newX < x || newY < y) && !(newX < x && newY > y)){
					var buff = "";
					for (var i = word.length - 1; i >= 0; i--)
						buff += word.charAt(i);
					word = buff;
				}
				me.checkWord(word);
			}
				
			deselectAll();
			$(this).attr('gridX', null).attr('gridY', null);
		});
	},
	
	fillGrid : function(width, height, grid){
		for (var i = 0; i < GRID_HEIGHT; i++){
			for (var j = 0; j < GRID_WIDTH; j++){
				$("#grid"+i+j).find('.tile-title').html(grid.charAt(i * GRID_WIDTH + j).toUpperCase());
			}
		}
	},
	
	checkWord: function(word){
		
		console.log("checking word " + word);
		
		$.each($("#wordbank > span"), function(i, el){
			if ($(el).text() == word){
				$(el).addClass("found");
				Cufon.refresh();
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
		$.mobile.changePage("#game");
		
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
		$.mobile.changePage($("#scores"));
		
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
			$("#wordbank").append("<span style='padding-right: 5px'>" + word.toUpperCase() + "</span>");
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
		$.mobile.changePage($("#waiting"));
		remaining_time = remaining_time || BUFFER_LENGTH;
		var me = this;
		setTimeout(function(){
			me.requestHighscore();
		}, remaining_time * 1000);
	}
};