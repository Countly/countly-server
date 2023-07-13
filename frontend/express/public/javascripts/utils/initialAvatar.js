/*************************************************************
 * This script is developed by Arturs Sosins aka ar2rsawseen, http://webcodingeasy.com
 * Feel free to distribute and modify code, but keep reference to its creator
 *
 * White board class provides a way to draw on website. It is possible to set width and color of drawing line.
 * Main reason for this package is to save some notes on different pages of website, 
 * or share drawings with others using import/export function, for example, 
 * with webdesigners, to direct them to flaws, bugs or changes in design.
 *
 * For more information, examples and online documentation visit: 
 * http://webcodingeasy.com/JS-classes/Drawing-on-websites
**************************************************************/
var initialAvatar = function(name, config){
	
	var conf = {
		textColor: null,
		backgroundColor: null,
		font: "Arial", 
		width: 150,
		height: 150
	};
	
	var canvas;
	var ctx;
	var ob = this;
	this.name = name;
	
	this.construct = function(){
		//copying configuration
		for(var opt in config){
			conf[opt] = config[opt];
		}

		if(document.getElementById("ia_canvas"))
		{
			canvas = document.getElementById("ia_canvas");
			ctx = canvas.getContext("2d");
		}
		else
		{
			//create canvas for drawing
			canvas = document.createElement("canvas");
			canvas.style.position = "absolute";
			canvas.style.top = "0px";
			canvas.style.left = "0px";
			canvas.style.display = "none";
			canvas.id = "ia_canvas";
			ctx = canvas.getContext("2d");
			document.body.appendChild(canvas);
		}
	};
	
	this.draw = function(){
		canvas.setAttribute("width", conf.width + "px");
		canvas.setAttribute("height", conf.height + "px");
		
		var color = getColor(this.name);
		ctx.fillStyle = conf.backgroundColor || "#"+color;
		ctx.fillRect(0,0,conf.width,conf.height);
		
		var arr = this.name.split(" ");
		for(var i = 0, l = arr.length; i < l; i++){
			arr[i] = arr[i].charAt(0);
		}
		
		ctx.fillStyle = conf.textColor || "#"+('000000' + (('0xffffff' ^ '0x'+color).toString(16))).slice(-6);
		ctx.font = (conf.width/arr.length) + "px "+conf.font;
		ctx.textBaseline = 'middle';
		
		var str = arr.join("").toUpperCase();
		var dim = ctx.measureText(str);
		ctx.fillText(str, (conf.width-dim.width)/2, conf.height/2);
	};
	
	this.getData = function(){
		this.draw();
		return canvas.toDataURL();
	};
	
	this.applyToImage = function(id){
		this.draw();
		var elem = (typeof id == "string") ? document.getElementById(id) : id;
		elem.src = this.getData();
	};
	
	this.getImage = function(){
		this.draw();
		var elem = document.createElement("img");
		elem.src = this.getData();
		return elem;
	};
	
	var getColor = function(str){
		var stringHexNumber = (                       // 1
			parseInt(                                 // 2
				parseInt(str, 36)  // 3
					.toExponential()                  // 4
					.slice(2,-5)                      // 5
			, 10) & 0xFFFFFF                          // 6
		).toString(16).toUpperCase();
		return ('000000' + stringHexNumber).slice(-6);
	};
	
	this.construct();
}