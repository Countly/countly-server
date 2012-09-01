constructDbVars = function (x, collection) {
	var setThese = {},
		unsetThese = {};

	for (var i = 0; i < 55; i++) {
		if (x["w" + i]) {
			setThese["2012.w" + i] = x["w" + i];
			unsetThese["w" + i] = 1;
		}
	}

	if (collection != "sessions") {
		for (var i = 2012; i < 2013; i++) {
			for (var j = 1; j < 13; j++) {
				for (var k = 1; k < 32; k++) {
					for (var l = 0; l < 25; l++) {
						if (x[i] && x[i][j] && x[i][j][k] && x[i][j][k][l]) {
							unsetThese[i + "." + j + "." + k + "." + l] = 1;
						}
					}
				}
			}
		}
	}

	var meta = [
		"f-ranges",
		"l-ranges",
		"d-ranges",
		"countries",
		"carriers",
		"devices",
		"platforms",
		"os",
		"os_versions",
		"resolutions",
		"app_versions"
	];

	for (var i = 0; i < meta.length; i++) {
		if (x[meta[i]]) {
			setThese["meta." + meta[i]] = x[meta[i]];
			unsetThese[meta[i]] = 1;
		}
	}
	
	return {"setThese": setThese, "unsetThese": unsetThese};
};

updateSessions = function(x) {
	var dbVars = constructDbVars(x, "sessions");
	db.sessions.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

updateUsers = function(x) {
	var dbVars = constructDbVars(x);
	db.users.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

updateLocations = function(x) {
	var dbVars = constructDbVars(x);
	db.locations.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

updateDevices = function(x) {
	var dbVars = constructDbVars(x);
	db.devices.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

updateDeviceDetails = function(x) {
	var dbVars = constructDbVars(x);
	db.device_details.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

updateCarriers = function(x) {
	var dbVars = constructDbVars(x);
	db.carriers.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

updateAppVersions = function(x) {
	var dbVars = constructDbVars(x);
	db.app_versions.update({_id: x._id}, {$set: dbVars.setThese, $unset: dbVars.unsetThese});
}

db.sessions.find().forEach(updateSessions);
db.users.find().forEach(updateUsers);
db.locations.find().forEach(updateLocations);
db.devices.find().forEach(updateDevices);
db.device_details.find().forEach(updateDeviceDetails);
db.carriers.find().forEach(updateCarriers);
db.app_versions.find().forEach(updateAppVersions);