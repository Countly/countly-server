var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
	path = require('path'),
	cp = require('child_process'),
	updates = {};

(function () {
	function updateFromGithub(update) {
		console.log(path.join(__dirname, '../../..'));
		cp.exec('sudo ./bin/upgrade/countly.github.update.sh > ./log/upgrade_github-' + update.id + '_' + (new Date()).toISOString() + '.log 2>&1', {cwd: path.join(__dirname, '../../..')}, function(error, stdout, stderr) {
			console.log('Done updating from github with %j / %j', error, stdout);
			
			if (error) {
				updates[update.key].error = error.toString();
				console.log('error: %j', error);
			} else if (stderr){
				updates[update.key].error = stderr.toString();
				console.log('stderr: %j', stderr);
			} else {
				console.log('updated to github ' + update.id);
				updates[update.key].success = true;
				setTimeout(function(){
					delete updates[update.key];
				}, 300000);
			}
		});
	}

	plugins.register('/o/updates', function(ob){
		if (ob.paths.length > 3 && ob.paths[3] === 'check') {
			if (ob.params.qstring.key in updates) {
	            common.returnOutput(ob.params, {status: updates[ob.params.qstring.key].error || 'pending' });
			} else {
	            common.returnOutput(ob.params, {status: 'success' });
			}
		} else {
		    common.returnOutput(ob.params, [
		    	{title: 'Latest version from Github', desc: 'Update Countly server to HEAD of Github repository. WARNING! This is not stable release!', type: 'github', id: 'HEAD'}
			]);
		}
    	return true;
	});

	plugins.register('/i/updates', function(ob){
		var argProps = {
		        'id':               { 'required': true,  'type': 'String'   },
		        'type':        		{ 'required': true,  'type': 'String'   },
		    },
		    update = {},
		    params = ob.params;

		if (!(update = common.validateArgs(params.qstring, argProps))) {
            common.returnOutput(params, {error: 'Not enough args'});
		    return false;
		}

		if (update.type === 'github') {
			if (update.id === 'HEAD') {
				update.key = Math.round(Math.random() * 100000000);
				updates[update.key] = update;
				common.returnOutput(params, update);
				setTimeout(updateFromGithub.bind(this, update), 500);
				return true;
			}
		}

        common.returnOutput(params, {error: 'Update type not supported yet'});
		return true;
	});
}(plugin));

module.exports = plugin;