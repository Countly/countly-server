/**
 * Dialog component mixins
 */

export const hasFormDialogsMixin = function(names) {
    if (!Array.isArray(names)) {
        names = [names];
    }

    return {
        data: function() {
            return {
                formDialogs: names.reduce(function(acc, val) {
                    acc[val] = {
                        name: val,
                        isOpened: false,
                        initialEditedObject: {},
                    };

                    acc[val].closeFn = function() {
                        acc[val].isOpened = false;
                    };

                    return acc;
                }, {})
            };
        },
        methods: {
            openFormDialog: function(name, initialEditedObject) {
                if (this.formDialogs[name].isOpened) {
                    return;
                }
                this.loadFormDialog(name, initialEditedObject);
                this.formDialogs[name].isOpened = true;
            },
            loadFormDialog: function(name, initialEditedObject) {
                this.formDialogs[name].initialEditedObject = initialEditedObject || {};
            },
            closeFormDialog: function(name) {
                this.formDialogs[name].isOpened = false;
            }
        }
    };
};
