/*
Versions listed below are common for Android and iOS;
2.0, 2.1, 2.2.1, 2.2.2, 2.2, 2.2.1, 3.0, 3.0, 3.1, 3.2.1, 3.2.2, 3.2.4, 3.2, 3.2, 4.0.1, 4.0.2, 4.0.3, 4.0.4, 4.1.1
*/

var iosVersions = ["1:2b1", "2:0b2", "2:0b3", "2:0b4", "2:0b5", "2:0b6", "2:0b7", "2:0b8", "2:0", "2:1:1", "2:1:2", "2:1:3", "2:1:4", "2:1", "2:2:1", "2:2:2", "2:2", "2:2:1", "3:0:1", "3:0:2", "3:0:3", "3:0:4", "3:0:5", "3:0", "3:0", "3:1:1", "3:1:2", "3:1:3", "3:1", "3:2:1", "3:2:2", "3:2:3", "3:2:4", "3:2:5", "3:2", "3:2", "4:0:1", "4:0:2", "4:0:3", "4:0:4", "4:0", "4:0", "4:1:1", "4:1:2", "4:1:3", "4:1", "4:2:1", "4:2:2", "4:2:3", "4:2", "4:2", "4:2", "4:3:1", "4:3:2", "4:3:3", "4:3", "4:3", "5:0:1", "5:0:2", "5:0:3", "5:0:4", "5:0:5", "5:0:6", "5:0:7", "5:0", "5:0", "5:0:1:1", "5:0:1", "5:1:1", "5:1:2", "5:1:3", "5:1", "6:0:1", "6:0:2", "6:0:3"],
	androidVersions = ["1:0", "1:1", "1:5", "1:6", "2:0", "2:0:1", "2:1", "2:2", "2:2:1", "2:2:2", "2:2:3", "2:3", "2:3:3", "2:3:4", "2:3:5", "2:3:6", "2:3:7", "3:0", "3:1", "3:2", "3:2:1", "3:2:2", "3:2:4", "3:2:6", "4:0:1", "4:0:2", "4:0:3", "4:0:4", "4:1:1"];

var fixVersions = {
	"iOS": {
		"array": iosVersions,
		"prefix": "i"
	},
	"Android": {
		"array": androidVersions,
		"prefix": "a"
	}
}

getDescendantProp = function(obj, desc) {
	desc = String(desc);
	
	if (desc.indexOf(".") === -1) {
		return obj[desc];
	}
	
	var arr = desc.split(".");
	while(arr.length && (obj = obj[arr.shift()]));

	return obj;
};

arrayUnique = function(arr) {
    var o = {}, 
		i, 
		l = arr.length, 
		r = [];
    
	for(i=0; i<l;i+=1) { 
		o[arr[i]] = arr[i];
	}
    
	for(i in o) { 
		r.push(o[i]);
	}
	
    return r;
};

addPlatformPrefix = function (x) {

	if (!x["os"] || !x["os_versions"]) {
		return true;
	} else {
		x["os"] = x["os"].sort();
	}

	for (var m=0; m < x["os"].length; m++) {
		var setThese = {},
			unsetThese = {},
			pullThese = [],
			pushThese = [],
			activeVersionArray = fixVersions[x["os"][m]].array,
			activePlatformPrefix = fixVersions[x["os"][m]].prefix;
	
		if (x["os"].length == 1) {
			activeVersionArray = [];
			
			for (var l=0; l < x["os_versions"].length; l++) {
				if (x["os_versions"][l].indexOf("i") == -1 && x["os_versions"][l].indexOf("a") == -1) {
					activeVersionArray[activeVersionArray.length] = x["os_versions"][l];
				}
			}
		
			activeVersionArray = activeVersionArray.join(',').replace(/\./g, ":").split(',');
		}
			
		for (var j=0; j < 55; j++) {
			for (var l=0; l < activeVersionArray.length; l++) {				
				var versionValue = getDescendantProp(x, ("w" + j + "." + activeVersionArray[l]));

				if (versionValue) {
					delete x["w" + j][activeVersionArray[l]];
					setThese["w" + j + "." + activePlatformPrefix + activeVersionArray[l]] = versionValue;
					unsetThese["w" + j + "." + activeVersionArray[l]] = 1;
					pullThese[pullThese.length] = activeVersionArray[l];
				}
			}
		}

		for (var i=2012; i < 2013; i++) {
			for (var k=1; k < 13; k++) {
				for (var j=1; j < 32; j++) {
					for (var l=0; l < activeVersionArray.length; l++) {									
						var versionValue = getDescendantProp(x, (i + "." + k + "." + j + "." + activeVersionArray[l]));

						if (versionValue) {
							delete x[i][k][j][activeVersionArray[l]];
							setThese[i + "." + k + "." + j + "." + activePlatformPrefix + activeVersionArray[l]] = versionValue;
							unsetThese[i + "." + k + "." + j + "." + activeVersionArray[l]] = 1;
							pullThese[pullThese.length] = activeVersionArray[l];
						}
					}
				}
			
				for (var l=0; l < activeVersionArray.length; l++) {
					var versionValue = getDescendantProp(x, (i + "." + k + "." + activeVersionArray[l]));
			
					if (versionValue) {
						delete x[i][k][activeVersionArray[l]];
						setThese[i + "." + k + "." + activePlatformPrefix + activeVersionArray[l]] = versionValue;
						unsetThese[i + "." + k + "." + activeVersionArray[l]] = 1;
						pullThese[pullThese.length] = activeVersionArray[l];
					}
				}
			}
			
			for (var l=0; l < activeVersionArray.length; l++) {
				var versionValue = getDescendantProp(x, (i + "." + activeVersionArray[l]));
			
				if (versionValue) {
					delete x[i][activeVersionArray[l]];
					setThese[i + "." + activePlatformPrefix + activeVersionArray[l]] = versionValue;
					unsetThese[i + "." + activeVersionArray[l]] = 1;
					pullThese[pullThese.length] = activeVersionArray[l];
				}
			}
		}
		
		for (var l=0; l < activeVersionArray.length; l++) {
			var versionValue = x[activeVersionArray[l]];
			
			if (versionValue) {
				delete x[activeVersionArray[l]];
				setThese[activePlatformPrefix + activeVersionArray[l]] = versionValue;
				unsetThese[activeVersionArray[l]] = 1;
				pullThese[pullThese.length] = activeVersionArray[l];
			}
		}
		
		pullThese = arrayUnique(pullThese);
		
		for (var i=0; i < pullThese.length; i++) {
			pushThese[i] = activePlatformPrefix + pullThese[i]
		}
		
		var pullTheseRep = pullThese.join(',').replace(/:/g, ".").split(',');
		pullThese = pullThese.concat(pullTheseRep);
	
		db.device_details.update({_id: x._id}, {$set: setThese, $unset: unsetThese, $pushAll: {'os_versions': pushThese}});
		db.device_details.update({_id: x._id}, {$pullAll: {'os_versions': pullThese}});
	}
}

db.device_details.find().forEach(addPlatformPrefix);
