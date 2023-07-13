var pluginManager = require('../../../../plugins/pluginManager.js');
pluginManager.dbConnection().then((countlyDb) => {
    /**
    * @name recoverWidget
    * @description helper method for creating feedback widget with provided _id and app_id values
    * @param {String} appId - application id
    * @param {String} widgetId - feedback widget id
    * @return {Promise} mongo db query promise
    */
    const recoverWidget = (appId, widgetId) => {
        return new Promise((resolve, reject) => {
            var widget = {};
            widget._id = countlyDb.ObjectID(widgetId);
            widget.app_id = appId;
            widget.popup_header_text = "What's your opinion about this page?";
            widget.popup_comment_callout = "Add comment";
            widget.popup_email_callout = "Contact me by e-mail";
            widget.popup_button_callout = "Send feedback";
            widget.popup_thanks_message = "Thanks!";
            widget.trigger_position = "bright";
            widget.trigger_bg_color = "#fff";
            widget.trigger_font_color = "#ddd";
            widget.trigger_button_text = "Feedback";
            widget.target_devices = { "phone": true, "tablet": true, "desktop": true };
            widget.target_page = "selected";
            widget.target_pages = ["/"];
            // we don't want to enable widget before user customize properties
            widget.is_active = "false";
            widget.hide_sticker = false;
            widget.type = "rating";
    
            countlyDb.collection("feedback_widgets").insert(widget, function(err) {
                if (!err) {
                    resolve(true);
                }
                else {
                    // for cases trying to insert widget that already exist
                    if (err.code === 11000) {
                        resolve(false);
                    }
                    reject(err.message);
                }
            });
        });
    };
    
    /**
    * @name getFeedbackCollectionList
    * @description helper method for returns list of feedback collections in countly db
    * @return {Promise} mongo db query promise
    */
    const getFeedbackCollectionList = () => {
        return new Promise((resolve, reject) => {
            countlyDb.collections(function(err, collectionList) {
                if (!err) {
                    let feedbackCollections = [];
                    collectionList.forEach(function(col) {
                        let c = col.collectionName;
                        if (c.substr(0, 8) === "feedback" && c !== "feedback_widgets") {
                            feedbackCollections.push(c);
                        }
                    });
                    resolve(feedbackCollections);
                }
                else {
                    reject(err);
                }
            });
        });
    };
    
    /**
    * @name extractWidgetIds
    * @description helper method for extracting widget_ids from existing feedback data
    * @param {String} collectionName - name of feedback collection for extract widget_id process
    * @returns {Promise} mongo db query promise
    */
    const extractWidgetIds = (collectionName) => {
        return new Promise((resolve, reject) => {
            let widgets = [];
            countlyDb.collection(collectionName).find({}).toArray(function(err, feedbacks) {
                if (!err) {
                    feedbacks.forEach(function(feedback) {
                        if (widgets.indexOf(feedback.widget_id) === -1) {
                            widgets.push(feedback.widget_id);
                        }
                    });
                    resolve(widgets);
                }
                else {
                    reject(err);
                }
            });
        });
    };
    
    /**
    * @name asyncForeach
    * @description async for each method
    * @param {Array} array - object array
    * @param {Function} fn - callback function for iteration
    * @param {Function} atEnd - callback function for end  
    */
    function asyncForeach(array, fn, atEnd) {
        var at = -1;
        /**
        * @name next
        * @description manual iteration method
        * @param {Boolean} shouldBreak - boolean flag
        */
        function next(shouldBreak) {
            if (shouldBreak || ++at === array.length) {
                if (atEnd) {
                    setTimeout(atEnd);
                }
            }
            else {
                setTimeout(fn, 0, array[at], next);
            }
        }
        next();
    }
    
    /**
    * @name fixWidgetDisappear
    * @description fix widget disappear problem
    * @param {Object} ob - http object provided by endpoint
    */
    const fixWidgetDisappear = async() => {
        try {
            // get collection list from countly db
            let feedbackCollections = await getFeedbackCollectionList();
            let widgets = [];
            // extract widget id's from current feedback data
            asyncForeach(feedbackCollections, async function(collection, done) {
                let extractedWidgetIds = await extractWidgetIds(collection);
                let appId = collection.substr(8);
                for (let i = 0; i < extractedWidgetIds.length; i++) {
                    widgets.push({ "app_id": appId, _id: extractedWidgetIds[i] });
                }
                done();
            }, function() {
                // recover widgets with extracted widget and app_id
                asyncForeach(widgets, async function(widget, _done) {
                    await recoverWidget(widget.app_id, widget._id);
                    console.log("Widget(" + widget._id + ") recovered for App(" + widget.app_id + ")");
                    _done();
                }, function() {
                    console.log("Recovered related widgets from feedback data.");
                });
            });
        }
        catch (e) {
            console.log(e);
        }
    };
    
    fixWidgetDisappear();
});