var exported = {},
    countlyConfig = require("../../../frontend/express/config");
(function(plugin) {
    plugin.init = function(app) {

        /**
         * Method that render ratings popup template
         * @param {*} req - Express request object
         * @param {*} res - Express response object
         */
        function renderPopup(req, res) {
            res.removeHeader('X-Frame-Options');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', {});
        }

        app.get(countlyConfig.path + '/feedback/rating', renderPopup);
        // keep this for backward compatability
        app.get(countlyConfig.path + '/feedback', renderPopup);
    };
}(exported));

module.exports = exported;