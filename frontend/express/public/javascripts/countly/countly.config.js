countlyCommon.DEBUG = false;
countlyCommon.API_URL = "";
countlyCommon.API_PARTS = {
    data:{
        "w":countlyCommon.API_URL + "/i",
        "r":countlyCommon.API_URL + "/o"
    },
    apps:{
        "w":countlyCommon.API_URL + "/i/apps",
        "r":countlyCommon.API_URL + "/o/apps"
    },
    users:{
        "w":countlyCommon.API_URL + "/i/users",
        "r":countlyCommon.API_URL + "/o/users"
    }
};
countlyCommon.DASHBOARD_REFRESH_MS = 10000;
countlyCommon.DASHBOARD_IDLE_MS = 3000000;
countlyCommon.GRAPH_COLORS = ["#88BBC8", "#ED8662", "#A0ED62", "#ed6262", "#edb762", "#ede262", "#62edb0", "#62beed", "#6279ed", "#c162ed", "#ed62c7", "#9A1B2F"];
countlyCommon.CITY_DATA = true;