import countlyDashboards from '../store/index.js';

export default {
    methods: {
        addDashboard: function() {
            var empty = countlyDashboards.factory.dashboards.getEmpty();
            empty.__action = "create";
            this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
            this.openDrawer("dashboards", empty);
        }
    }
};
