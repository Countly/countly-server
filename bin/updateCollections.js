function forceLogoutAllUsers() {
	db['sessions_'].remove({});
}

function cleanupDurations(obj) {
	if (obj.hasOwnProperty('ds')) {
		delete obj['ds']['undefined'];
	}
	if (obj.hasOwnProperty('d') && obj['d'] < 1) {
		obj['d'] = 1;
	}
	for (var property in obj) {
		if (obj.hasOwnProperty(property) && typeof obj[property] === "object") {
			cleanupDurations(obj[property]);
		}
	}
}

function cleanupSessionDurationData() {
	// in 'sessions' collection:
	//	 for each app id
	db['sessions'].find().forEach( function (sessionObj) {
		// delete 'null' from meta.d-ranges
		sessionObj['meta']['d-ranges'] = sessionObj['meta']['d-ranges'].filter(function(val){ return val !== null });
		// delete "undefined" from *.ds values and fix durations less than 1
		cleanupDurations(sessionObj);
		db['sessions'].update({_id: sessionObj._id}, sessionObj);
	});
}

forceLogoutAllUsers();

// In v13.10 and earlier, some session duration data may be bad due to the following known issues:
//   https://github.com/Countly/countly-server/issues/98
//   https://github.com/Countly/countly-sdk-android/issues/27
//   https://github.com/Countly/countly-sdk-android/issues/28
// The call below to cleanupSessionDurationData will delete some invalid session duration
// range data caused by previous bugs and will also set any session durations that are
// currently less than 1 second to 1 second.
// 
// IMPORTANT!!!!! THIS IS A DESTRUCTIVE OPERATION AND CANNOT BE UNDONE. BE SURE TO BACKUP
// YOUR MONGO DATABASE BEFORE DOING THIS IN CASE YOU WANT TO REVERT!!!!!
//cleanupSessionDurationData();
