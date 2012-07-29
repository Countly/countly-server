getDescendantProp = function(obj, desc) {
	desc = String(desc);
	
	if (desc.indexOf(".") === -1) {
		return obj[desc];
	}
	
	var arr = desc.split(".");
	while(arr.length && (obj = obj[arr.shift()]));

	return obj;
};

removeEscaped = function (x) {

	if (!x["devices"] && !x["carriers"]) {
		return true;
	}
	
	var tmpValueSet = (x["devices"])? x["devices"] : x["carriers"],
		valueSet = [];

	for (var i=0; i < tmpValueSet.length; i++) {
		if (tmpValueSet[i].indexOf("'") != -1) {
			valueSet[valueSet.length] = tmpValueSet[i];
		}
	}
	
	if (!valueSet.length) {
		return true;
	}
	
	var setThese = {},
		unsetThese = {},
		oldValueSet = valueSet.join(",").replace(/\'/mg,"\\'").split(",");
	
	for (var j=0; j < 55; j++) {
		for (var l=0; l < valueSet.length; l++) {				
			var versionValue = getDescendantProp(x, ("w" + j + "." + oldValueSet[l]));

			if (versionValue) {
				delete x["w" + j][valueSet[l]];
				setThese["w" + j + "." + valueSet[l]] = versionValue;
				unsetThese["w" + j + "." + oldValueSet[l]] = 1;
			}
		}
	}

	for (var i=2012; i < 2013; i++) {
		for (var k=1; k < 13; k++) {
			for (var j=1; j < 32; j++) {
				for (var l=0; l < valueSet.length; l++) {									
					var versionValue = getDescendantProp(x, (i + "." + k + "." + j + "." + oldValueSet[l]));

					if (versionValue) {
						delete x[i][k][j][valueSet[l]];
						setThese[i + "." + k + "." + j + "." + valueSet[l]] = versionValue;
						unsetThese[i + "." + k + "." + j + "." + oldValueSet[l]] = 1;
					}
				}
			}
		
			for (var l=0; l < valueSet.length; l++) {
				var versionValue = getDescendantProp(x, (i + "." + k + "." + oldValueSet[l]));
		
				if (versionValue) {
					delete x[i][k][valueSet[l]];
					setThese[i + "." + k + "." + valueSet[l]] = versionValue;
					unsetThese[i + "." + k + "." + oldValueSet[l]] = 1;
				}
			}
		}
		
		for (var l=0; l < valueSet.length; l++) {
			var versionValue = getDescendantProp(x, (i + "." + oldValueSet[l]));
		
			if (versionValue) {
				delete x[i][valueSet[l]];
				setThese[i + "." + valueSet[l]] = versionValue;
				unsetThese[i + "." + oldValueSet[l]] = 1;
			}
		}
	}
	
	for (var l=0; l < valueSet.length; l++) {
		var versionValue = x[oldValueSet[l]];
		
		if (versionValue) {
			delete x[valueSet[l]];
			setThese[valueSet[l]] = versionValue;
			unsetThese[oldValueSet[l]] = 1;
		}
	}
	
	if (x["devices"]) {
		db.devices.update({_id: x._id}, {$set: setThese, $unset: unsetThese});
	} else {
		db.carriers.update({_id: x._id}, {$set: setThese, $unset: unsetThese});
	}
}

db.carriers.find().forEach(removeEscaped);
db.devices.find().forEach(removeEscaped);