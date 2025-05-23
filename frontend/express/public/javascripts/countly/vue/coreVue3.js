(function(countlyVue3) {

    var rootElements = {
        menus: [],
        routes: []
    };

    for (var key in rootElements) {
        countlyVue3[key] = rootElements[key];
    }

    countlyVue3.addRoute = function(route) {
        countlyVue3.routes.push(route);
    };

    countlyVue3.addMenu = function(menu) {
        countlyVue3.menus.push(menu);

        // update common state
        const menuData = localStorage.getItem("common_menu_storage");
        if (menuData) {
            const parsedMenuData = JSON.parse(menuData);
            if (parsedMenuData.categorizedMenus[menu.category] && !parsedMenuData.categorizedMenus[menu.category].some(m => m.name === menu.name)) {
                parsedMenuData.categorizedMenus[menu.category].push(menu);
                localStorage.setItem("common_menu_storage", JSON.stringify(parsedMenuData));
            }
        }
    };

    countlyVue3.getRoutes = function() {
        return countlyVue3.routes;
    };

    countlyVue3.getMenus = function() {
        return countlyVue3.menus;
    };

}(window.countlyVue3 = window.countlyVue3 || {}));