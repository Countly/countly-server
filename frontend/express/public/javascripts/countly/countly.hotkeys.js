(function() {
    var hotkeys = {},
        path = function(hash, app_id) {
            window.location.hash = '#/' + app_id + '/' + hash;
        };
    var addHotKey = window.addHotKey = function(key, handler) {
        if (typeof handler === 'string') {
            hotkeys[key] = path.bind(null, handler);
        }
        else if (typeof handler === 'function') {
            hotkeys[key] = handler;
        }
    };

    document.body.addEventListener('keyup', function(ev) {
        ev.target.tagName === 'BODY' && ev.key && hotkeys[ev.key] && hotkeys[ev.key](window.countlyCommon.ACTIVE_APP_ID);
    });

    // standard CE handlers
    addHotKey('h', '');
    addHotKey('a', 'analytics/users');
    addHotKey('e', 'analytics/events/overview');
    addHotKey('p', 'messaging');
    addHotKey('A', 'manage/apps');
    addHotKey('U', 'manage/users');
    addHotKey('D', 'manage/db');
    addHotKey('S', 'manage/configurations');
    addHotKey('L', 'manage/logs/errorlogs');
    addHotKey('J', 'manage/jobs');
})();
