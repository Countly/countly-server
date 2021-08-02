var pluginManager = require("../../../../plugins/pluginManager.js");
const fs = require('fs');
var path = require('path');
var Promise = require("bluebird");

console.log("Loading city coordinates into db");
console.log("Process might take few minutes");
pluginManager.dbConnection().then((db) => {
	const cities = require('all-the-cities');
	
	for(var p=0; p<cities.length; p++){
		cities[p]._id = cities[p].cityId;
	}
	db.collection("cityCoordinates").insertMany(cities,function(err,res){
		if(err){
			console.log(err);
		}
		console.log("Cities loded in db");
		db.close();
	});
});
