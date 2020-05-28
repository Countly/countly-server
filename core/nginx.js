const demo = {};

module.exports = {
    read: function(log, config, app) {
        demo[app] = demo[app] || [];
        log.d(`Read nginx backends for ${app}: ${demo[app].join(', ')}`);
        return demo[app];
    },
    write: function(log, config, app, backends) {
        demo[app] = backends;
        log.d(`Written nginx backends for ${app}: ${backends.join(', ')}`);
        return backends;
    }
};