/* global app, CV, countlyCommon */

var MyTestPluginView = CV.views.create({
    template: CV.T('/my-test-plugin/templates/main.html'),
    mixins: [],
    data: () => ({
        appId: countlyCommon.ACTIVE_APP_ID
    })
});

app.route('/mytestplugin', 'mytestplugin', function() {
    this.renderWhenReady(new CV.views.BackboneWrapper({
        component: MyTestPluginView,
        vuex: []
    }));
});

$(document).ready(function() {
    app.addMenu('explore', {
        code: 'mytestplugin',
        url: '#/mytestplugin',
        text: "my-test-plugin.title",
        icon: '<div class="logo ion-pricetags"></div>',
        priority: 50
    });
});
