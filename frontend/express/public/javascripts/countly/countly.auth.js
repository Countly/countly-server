(function(countlyAuth) {

	function validateWrite(accessType, member, app_id, feature) {
		if (member.locked) {
            return false;
        }

		if (!member.global_admin) {
            if (feature.substr(0, 7) === 'global_') {
                feature = feature.split('_')[1];
                if (!((member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType].global === "object") && (member.permission[accessType].global.all || member.permission[accessType].global.allowed[feature]))) {
                    return false;
                }
            }
            else if (!((member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType][app_id] === "object") && (member.permission[accessType][app_id].all || member.permission[accessType][app_id].allowed[feature]))) {
                return false;    
            }
            else {
            	return true;
            }
        }
        else {
        	return true;
        }
	};

	countlyAuth.validateCreate = function(member, app_id, feature) {
		return validateWrite('c', member, app_id, feature);
	};

	countlyAuth.validateRead = function(member, app_id, feature) {
		if (member.locked) {
			return false;
		}

		if (!member.global_admin) {
            if (feature.substr(0, 7) === 'global_') {
                feature = feature.split('_')[1];
                if (!((member.permission && typeof member.permission.r === "object" && typeof member.permission.r.global === "object") && (member.permission.r.global.all || member.permission.r.global.allowed[feature]))) {
                    return false;
                }
            }
            else if (!((member.permission && typeof member.permission.r === "object" && typeof member.permission.r[app_id] === "object") && (member.permission.r[app_id].all || member.permission.r[app_id].allowed[feature]))) {
                return false;
            }
            else {
            	return true;
            }
        }
        else {
        	return true;
        }
	};

	countlyAuth.validateUpdate = function(member, app_id, feature) {
		return validateWrite('u', member, app_id, feature);
	};

	countlyAuth.validateDelete = function(member, app_id, feature) {
		return validateWrite('d', member, app_id, feature);
	};
    
})(window.countlyAuth = window.countlyAuth || {});