var usersWithoutAppId = [],
	allAppIds = [],
	globalCounter = 0,
	numberOfUsers = db.app_users.count();

seperateUsers = function (x) {
	var userAppId = x.app_id;
	delete x["app_id"];

	if (allAppIds.indexOf(userAppId) == -1) {
		allAppIds[allAppIds.length] = userAppId;
	}
	
	if (x.last_seen || x.last_seen === 0) {
		x["ls"] = parseInt(x.last_seen);
		delete x.last_seen;
	}
	
	if (x.session_count || x.session_count === 0) {
		x["sc"] = parseInt(x.session_count);
		delete x.session_count;
	}
	
	if (x.session_duration || x.session_duration === 0) {
		x["sd"] = parseInt(x.session_duration);
		delete x.session_duration;
	}
	
	if (!userAppId) {
		usersWithoutAppId[usersWithoutAppId.length] = x;
	} else {
		db["app_users" + userAppId].save(x);
	}
	
	globalCounter++;
	
	if (globalCounter == numberOfUsers) {
		completeUpdate();
	}
};

completeUpdate = function () {
	for (var i = 0; i < usersWithoutAppId.length; i++) {
		for (var j = 0; j < allAppIds.length; j++) {
			db["app_users" + allAppIds[j]].save(usersWithoutAppId[i]);
		}
	}
}

db.app_users.find().forEach(seperateUsers);