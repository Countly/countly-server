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

/*
SUMMARY:
In v13.10 and earlier, some session duration data may be bad due to the following known
issues:
  https://github.com/Countly/countly-server/issues/98
  https://github.com/Countly/countly-sdk-android/issues/27
  https://github.com/Countly/countly-sdk-android/issues/28
The call below to cleanupSessionDurationData will delete some invalid session duration
range data caused by previous bugs and will also set any session durations that are
currently less than 1 second to 1 second.

DETAILS:
In v13.10 and earlier, the Countly Community Edition server accepted negative session
durations from clients and added that value to the cumulative session durations it keeps
track of (yearly/monthly/weekly/daily/hourly).  Due to some bugs in the Countly
client SDKs, sometimes negative values could be sent.  The Community Edition server has
been fixed in 14.07 to discard session durations sent from the client that are less than
1 second long.  The Android SDK has been fixed in 14.07 to no longer send negative session
durations.  Countly SDKs on other platforms may still be sending negative session durations.

The cleanupSessionDurationData function will look for any cumulative session duration
values that are less than 1 second and will set them to 1 second.  This isn't the most
ideal solution, but since bad data may have been stored on the server, this is one way to
clean it up.

The cleanupSessionDurationData function does not necessarily cleanup *all* negative
session duration data that was sent to the server in the past, because it only looks for
cumulative session durations that are negative *right now*.  It is possible that negative
session durations were sent from a client and added to a cumulative session duration, but
not did not make the cumulative number go negative.  We took the approach of only
resetting negative data (vs. deleting all cumulative session durations) to minimize the
impact on existing data, even if that data may be incorrect.

USE:
The call to cleanupSessionDuration below is commented out by default, since it is a
non-reversible destructive operation.  Uncomment the call below to clean up some of the
bad session duration data that may be in the Countly Mongo database.

WARNING:
IMPORTANT!!!!! THIS IS A DESTRUCTIVE OPERATION AND CANNOT BE UNDONE. BE SURE TO BACKUP
YOUR MONGO DATABASE BEFORE DOING THIS IN CASE YOU WANT TO REVERT!!!!!
*/
//cleanupSessionDurationData();
