/*global app, countlyAuth, countlyVue, CV, $, countlyDataManager, countlyCommon, moment, countlyPlugins, countlyGlobal */

(function() {

    var FEATURE_NAME = "data_manager";

    var EXTENDED_VIEWS = countlyDataManager.extended && countlyDataManager.extended.views || {};
    var COMPONENTS = EXTENDED_VIEWS.components || {};
    var defaultTemplates = EXTENDED_VIEWS.defaultTemplates || [
        "/data-manager/templates/create-event-drawer-components.html",
        "/data-manager/templates/manage-category-components.html"
    ];

    //This is a redundant function in both the versions
    var statusClassObject = function(status) {
        if (!status) {
            status = "unplanned";
        }
        var classObject = {};
        classObject['tag--' + status] = true;
        return classObject;
    };

    var ManageCategoryInput = countlyVue.views.create({
        template: "#data-manager-manage-category-input",
        props: {
            value: {
                type: Object
            },
            label: {
                type: String
            },
            removable: {
                type: Boolean,
                default: true
            },
            categoryIndex: {
                type: Number,
                default: -1
            }
        },
        data: function() {
            return {
                editing: false,
                editedCategoryName: null
            };
        },
        computed: {
            category: function() {
                return this.value;
            },
            categoryName: {
                get: function() {
                    return (this.editedCategoryName === null) ? this.category.name : this.editedCategoryName;
                },
                set: function(val) {
                    this.editedCategoryName = val;
                },
                cache: false
            }
        },
        methods: {
            removeCategory: function() {
                this.$emit("remove-me");
            },
            editCategory: function() {
                this.editing = true;
            },
            saveCategory: function() {
                if (this.editedCategoryName) {
                    this.category.name = this.editedCategoryName;
                    this.category.edited = true;
                    this.editing = false;
                    this.editedCategoryName = null;
                }
            },
            cancelEdit: function() {
                this.editedCategoryName = null;
                this.editing = false;
            }
        }
    });

    var ManageCategory = countlyVue.views.create({
        template: "#data-manager-manage-category",
        data: function() {
            return {
                newCategoryName: null
            };
        },
        props: {
            value: {
                type: Array
            },
            deletedCategories: {
                type: Array
            },
            maxCategories: {
                type: Number,
                default: 10
            },
            focusedItemIdentifier: {
                type: [String, Number],
                default: ''
            }
        },
        components: {
            "data-manager-manage-category-input": ManageCategoryInput
        },
        methods: {
            addNewCategory: function() {
                if (this.newCategoryAllowed && this.newCategoryName) {
                    this.categories.push({name: this.newCategoryName});
                    this.newCategoryName = null;
                }
            },
            removeCategoryAtIndex: function(index) {
                // this.categories[index].isDeleted = true;
                if (this.categories[index]._id) {
                    this.deletedCategories.push(this.categories[index]);
                }
                this.$delete(this.categories, index);
            }
        },
        computed: {
            newCategoryAllowed: function() {
                return this.categories.length < this.maxCategories;
            },
            categories: {
                get: function() {
                    return this.value;
                },
                set: function(value) {
                    this.$emit("input", value);
                }
            }
        }
    });

    var EventsDrawer = countlyVue.views.create({
        template: CV.T('/data-manager/templates/create-events-drawer.html'),
        components: {
            'data-manager-create-segment': COMPONENTS.CreateSegment
        },
        data: function() {
            return {
                isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
                isOpened: false,
                saveButtonLabel: CV.i18n("common.save"),
                constants: {
                    "visibilityOptions": [
                        { label: CV.i18n("data-manager.global"), value: "global", description: CV.i18n("data-manager.global-description") },
                        { label: CV.i18n("data-manager.global"), value: "private", description: CV.i18n("data-manager.private-description") }
                    ]
                },
                selectX: {
                    currentVal: null,
                    mode: 'single-list',
                },
                autoCommitDisabled: false,
                allOptionsTabHidden: true,
                categoryList: [{
                    label: CV.i18n("data-manager.uncategorized"),
                    value: '1'
                }],
                statusList: [
                    {
                        label: CV.i18n("data-manager.created"),
                        value: 'created'
                    },
                    {
                        label: CV.i18n("data-manager.approved"),
                        value: 'approved'
                    },
                    {
                        label: CV.i18n("data-manager.live"),
                        value: 'live'
                    },
                    {
                        label: CV.i18n("data-manager.blocked"),
                        value: 'blocked'
                    }
                ]
            };
        },
        computed: {
            omitList: {
                get: function() {
                    if (this.$refs.eventDrawer && this.$refs.eventDrawer.editedObject && this.$refs.eventDrawer.editedObject.omit_list) {
                        return this.$refs.eventDrawer.editedObject.omit_list;
                    }
                    else if (this.controls && this.controls.initialEditedObject && this.controls.initialEditedObject.omit_list) {
                        return this.controls.initialEditedObject.omit_list;
                    }
                    else {
                        return [];
                    }
                },
                set: function(list) {
                    var segments = this.controls.initialEditedObject.segments;
                    if (list.length > this.$refs.eventDrawer.editedObject.omit_list) {
                        segments = this.$refs.eventDrawer.editedObject.segments;
                    }
                    this.$refs.eventDrawer.editedObject.segments = segments.filter(function(sg) {
                        if (list.indexOf(sg.name) > -1) {
                            return false;
                        }
                        else {
                            return true;
                        }
                    });
                    this.$refs.eventDrawer.editedObject.omit_list = list;
                }
            },
            title: function() {
                if (this.controls && this.controls.initialEditedObject && this.controls.initialEditedObject.isEditMode) {
                    return CV.i18n("data-manager.edit-event");
                }
                else {
                    return CV.i18n("data-manager.create-new-event");
                }
            },
            categories: function() {
                var cats = this.$store.getters["countlyDataManager/categories"] || [];
                return [{ label: CV.i18n('data-manager.uncategorized'), value: null }].concat(cats.map(function(ev) {
                    return {
                        label: ev.name,
                        value: ev._id
                    };
                }));
            },
        },
        props: {
            controls: {
                type: Object
            }
        },
        methods: {
            onClose: function(event) {
                this.$emit("close", event);
            },
            onSubmit: function(doc) {
                if (doc.isEditMode) {
                    this.$store.dispatch('countlyDataManager/editEvent', doc);
                }
                else {
                    this.$store.dispatch('countlyDataManager/saveEvent', doc);
                }
            },
        }
    });

    var EventGroupDrawer = countlyVue.views.create({
        template: CV.T('/data-manager/templates/event-group-drawer.html'),
        data: function() {
            return {
                saveButtonLabel: CV.i18n('common.save'),
            };
        },
        computed: {
            title: function() {
                if (this.controls && this.controls.initialEditedObject && this.controls.initialEditedObject.isEditMode) {
                    return CV.i18n('data-manager.edit-event-group');
                }
                else {
                    return CV.i18n('data-manager.create-new-event-group');
                }
            },
            eventList: function() {
                var events = this.$store.getters["countlyDataManager/events"] || [];
                return events.map(function(ev) {
                    return {
                        label: ev.name || ev.key || ev.e,
                        value: ev.key || ev.e
                    };
                });
            },
        },
        props: {
            controls: {
                type: Object
            }
        },
        methods: {
            onClose: function(event) {
                this.$emit("close", event);
            },
            onSubmit: function(doc) {
                if (doc.isEditMode) {
                    doc.app_id = countlyCommon.ACTIVE_APP_ID;
                    this.$store.dispatch('countlyDataManager/editEventGroups', doc);
                }
                else {
                    doc.app_id = countlyCommon.ACTIVE_APP_ID;
                    this.$store.dispatch('countlyDataManager/saveEventGroups', doc);
                }
            },
            onCopy: function() {
            },
        }
    });

    var EventGroupDetailView = countlyVue.views.create({
        template: CV.T('/data-manager/templates/event-group-detail.html'),
        mixins: [
            countlyVue.mixins.hasDrawers(["eventgroup"])
        ],
        components: {
            'event-group-drawer': EventGroupDrawer,
        },
        data: function() {
            return {
                eventGroupId: this.$route.params.eventGroupId,
                showDeleteDialog: false,
                deleteElement: null,
            };
        },
        computed: {
            eventGroup: function() {
                var self = this;
                var eventGroup = {};
                var eventGroups = this.$store.getters["countlyDataManager/eventGroups"];
                eventGroups.forEach(function(eg) {
                    if (eg._id === self.eventGroupId) {
                        eventGroup = eg;
                    }
                });
                return eventGroup;
            },
        },
        methods: {
            initialize: function() {
                this.$store.dispatch('countlyDataManager/loadEventGroups');
            },
            handleEdit: function() {
                this.openDrawer('eventgroup', this.eventGroup);
            },
            handleCommand: function(ev, eventGroup) {
                if (ev === 'delete') {
                    this.deleteElement = eventGroup;
                    this.showDeleteDialog = true;
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                this.$store.dispatch("countlyDataManager/deleteEventGroups", [this.deleteElement._id]);
                this.showDeleteDialog = false;
                app.navigate("#/manage/data-manager/events/event-groups", true);
            },
            statusClassObject: statusClassObject
        },
        created: function() {
            this.initialize();
        }
    });

    var EventsDefaultTabView = countlyVue.views.create({
        template: CV.T('/data-manager/templates/events-default.html'),
        components: {
            'data-manager-manage-category': ManageCategory
        },
        data: function() {
            return {
                isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
                eventsTablePersistKey: "dm_events_table_" + countlyCommon.ACTIVE_APP_ID,
                trackedFields: ['isSelected'],
                filter: {
                    category: "all",
                    status: "all",
                    visibility: "all",
                },
                categoryDialogVisible: false,
                showDeleteDialog: false,
                deleteQueue: null,
                deletedCategories: [],
                baseColumns: [
                    {
                        label: 'Event key',
                        value: 'e',
                    },
                ]
            };
        },
        computed: {
            dynamicEventCols: function() {
                var cols = this.baseColumns;
                var colMap = {};
                this.events.forEach(function(ev) {
                    for (var key in ev) {
                        if (key.indexOf('[CLY_input]_') === 0) {
                            var col = key.substr(12);
                            if (!colMap[key]) {
                                colMap[key] = true;
                                cols.push(
                                    {
                                        label: col,
                                        value: key,
                                        default: false
                                    });
                            }
                        }
                    }
                });
                return cols;
            },
            categories: function() {
                return this.$store.getters["countlyDataManager/categories"];
            },
            categoriesMap: function() {
                return this.$store.getters["countlyDataManager/categoriesMap"];
            },
            events: function() {
                var self = this;
                return this.$store.getters["countlyDataManager/events"]
                    .filter(function(e) {
                        var isCategoryFilter = true;
                        var isStatusFilter = true;
                        var isVisiblityFilter = true;
                        var defaultUnexpectedFilter = true;
                        if (self.filter.category !== "all") {
                            isCategoryFilter = self.categoriesMap[e.category] === self.filter.category;
                        }
                        if (self.filter.status !== "all") {
                            isStatusFilter = e.status === self.filter.status;
                        }
                        if (self.filter.visibility !== "all") {
                            var visibility = self.filter.visibility === 'true';
                            var currentVisibility = e.is_visible !== false;
                            isVisiblityFilter = currentVisibility === visibility;
                        }
                        if (!e.status) {
                            var config = countlyPlugins.getConfigsData()['data-manager'] || {};
                            if (config.allowUnexpectedEvents || !self.isDrill) {
                                defaultUnexpectedFilter = true;
                            }
                            else {
                                defaultUnexpectedFilter = false;
                            }
                        }
                        return defaultUnexpectedFilter && isCategoryFilter && isStatusFilter && isVisiblityFilter;
                    })
                    .map(function(e) {
                        if (e.isSelected === undefined) {
                            e.isSelected = false;
                        }
                        e.categoryName = self.categoriesMap[e.category] || 'Uncategorized';
                        e.lastModifiedts = e.audit && e.audit.ts ? e.audit.ts * 1000 : null;
                        e.lastModifiedDate = e.audit && e.audit.ts ? moment(e.audit.ts * 1000).format("MMM DD,YYYY") : null;
                        e.lastModifiedTime = e.audit && e.audit.ts ? moment(e.audit.ts * 1000).format("H:mm:ss") : null;
                        if (!e.e) {
                            e.e = e.key;
                        }
                        return e;
                    });
            },
            filterFields: function() {
                if (this.isDrill) {
                    return [{
                        label: "Category",
                        key: "category",
                        options: [
                            {value: "all", label: "All Categories"},
                        ].concat(this.categories.map(function(c) {
                            return {value: c.name, label: c.name};
                        })),
                        default: "all",
                        action: true
                    },
                    {
                        label: "Status",
                        key: "status",
                        options: [
                            {value: "all", label: "All Statuses"},
                            {value: "unplanned", label: "Unplanned"},
                            {
                                label: CV.i18n("data-manager.created"),
                                value: 'created'
                            },
                            {
                                label: CV.i18n("data-manager.approved"),
                                value: 'approved'
                            },
                            {
                                label: CV.i18n("data-manager.live"),
                                value: 'live'
                            },
                            {
                                label: CV.i18n("data-manager.blocked"),
                                value: 'blocked'
                            }
                        ],
                        default: "all",
                        action: false
                    },
                    {
                        label: "Visibility",
                        key: "visibility",
                        options: [
                            {value: "all", label: "All Visibilities"},
                            {value: "true", label: "Visible"},
                            {value: "false", label: "Hidden"},
                        ],
                        default: "all",
                        action: false
                    }];
                }
                else {
                    return [{
                        label: "Category",
                        key: "category",
                        options: [
                            {value: "all", label: "All Categories"},
                        ].concat(this.categories.map(function(c) {
                            return {value: c.name, label: c.name};
                        })),
                        default: "all",
                        action: true
                    }, {
                        label: "Visibility",
                        key: "visibility",
                        options: [
                            {value: "all", label: "All Visibilities"},
                            {value: "true", label: "Visible"},
                            {value: "false", label: "Hidden"},
                        ],
                        default: "all",
                        action: false
                    }];
                }
            }
        },
        methods: {
            handleCommand: function(event, scope, row) {
                if (event === 'edit') {
                    this.$root.$emit('dm-open-edit-event-drawer', row);
                }
                else if (event === 'delete') {
                    this.handleDelete([row]);
                }
            },
            handleCurrentChange: function(selection, row) {
                var self = this;
                if (Array.isArray(selection)) {
                    var isSelected = selection.filter(function(e) {
                        if (e.e === row.e) {
                            return true;
                        }
                    }).length;
                    self.$refs.eventsDefaultTable.patch(row, { isSelected: !!isSelected });
                }
            },
            handleChangeCategory: function(cat, rows) {
                this.$store.dispatch("countlyDataManager/changeCategory", {
                    category: cat,
                    events: rows.map(function(ev) {
                        return ev.key;
                    })
                });
            },
            handleAllChange: function(selection) {
                var self = this;
                if (selection.length) {
                    selection.forEach(function(row) {
                        self.$refs.eventsDefaultTable.patch(row, { isSelected: true });
                    });
                }
                else {
                    this.events.forEach(function(row) {
                        self.$refs.eventsDefaultTable.patch(row, { isSelected: false });
                    });
                }
            },
            handleChangeVisibility: function(command, rows) {
                var isVisible = command === 'visible';
                var events = [];
                rows.forEach(function(row) {
                    events.push(row.key);
                });
                this.$store.dispatch('countlyDataManager/changeVisibility', { events: events, isVisible: isVisible });
            },
            handleChangeStatus: function(command, rows) {
                var events = [];
                rows.forEach(function(row) {
                    events.push(row.key);
                });
                this.$store.dispatch('countlyDataManager/updateEventStatus', { events: events, status: command });
            },
            onRowClick: function(params) {
                app.navigate("#/manage/data-manager/events/events/" + params.key, true);
            },
            manageCategories: function() {
                this.$refs.eventCategoryFilters.close(true);
                this.categoryDialogVisible = true;
            },
            onSaveCategories: function() {
                var editedCategories = this.categories.filter(function(e) {
                    return (e.edited && e._id);
                });
                var newCatgories = this.categories.filter(function(e) {
                    return !e._id;
                }).map(function(e) {
                    return e.name;
                });
                if (newCatgories.length) {
                    this.$store.dispatch('countlyDataManager/saveCategories', newCatgories);
                }
                if (editedCategories.length) {
                    var self = this;
                    this.$store
                        .dispatch('countlyDataManager/editCategories', editedCategories)
                        .then(function(res) {
                            if (res === 'Error') {
                                self.$notify.error({
                                    title: CV.i18n("common.error"),
                                    message: 'Categories Update Failed'
                                });
                            }
                            else {
                                self.$notify.success({
                                    title: CV.i18n("common.success"),
                                    message: 'Categories updated!'
                                });
                            }
                        });
                }
                if (this.deletedCategories && this.deletedCategories.length) {
                    this.$store.dispatch('countlyDataManager/deleteCategories', this.deletedCategories.map(function(cat) {
                        return cat._id;
                    }));
                }
            },
            onCloseCategories: function() {
                if (this.categoryDialogVisible) {
                    this.$store.dispatch('countlyDataManager/loadCategories');
                    this.deletedCategories = [];
                    this.categoryDialogVisible = false;
                }
            },
            handleDelete: function(rows) {
                this.deleteQueue = rows;
                this.showDeleteDialog = true;
            },
            closeDeleteForm: function() {
                this.deleteQueue = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                var rows = this.deleteQueue;
                var events = [];
                rows.forEach(function(row) {
                    events.push(row.key);
                });
                this.$store.dispatch('countlyDataManager/deleteEvents', events);
                this.showDeleteDialog = false;
            },
            statusClassObject: statusClassObject
        },
    });

    var EventsGroupsTabView = countlyVue.views.create({
        template: CV.T('/data-manager/templates/event-groups.html'),
        data: function() {
            return {
                eventsGroupTablePersistKey: "dm_event_groups_table_" + countlyCommon.ACTIVE_APP_ID,
                selectedFilter: 'all',
                trackedFields: ['isSelected'],
                eventGroupFilters: [
                    {value: 'all', label: 'All Event Groups'},
                    {value: true, label: 'Visible'},
                    {value: false, label: 'Hidden'},
                ],
                showDeleteDialog: false,
                deleteElement: null,
            };
        },
        computed: {
            eventGroups: function() {
                var self = this;
                var eventGroup = this.$store.getters["countlyDataManager/eventGroups"];
                if (Array.isArray(eventGroup)) {
                    return eventGroup
                        .filter(function(m) {
                            if (self.selectedFilter !== 'all') {
                                return m.status === self.selectedFilter;
                            }
                            else {
                                return true;
                            }
                        })
                        .map(function(m) {
                            m.isSelected = false;
                            return m;
                        });
                }
                else {
                    return [];
                }
            },
        },
        methods: {
            onRowClick: function(params) {
                app.navigate("#/manage/data-manager/events/event-groups/" + params._id, true);
            },
            handleCurrentChange: function(selection, row) {
                var self = this;
                if (Array.isArray(selection)) {
                    var isSelected = selection.filter(function(e) {
                        if (e.e === row.e) {
                            return true;
                        }
                    }).length;
                    self.$refs.eventGroupsTable.patch(row, { isSelected: !!isSelected });
                }
            },
            handleAllChange: function(selection) {
                var self = this;
                if (selection.length) {
                    selection.forEach(function(row) {
                        self.$refs.eventGroupsTable.patch(row, { isSelected: true });
                    });
                }
                else {
                    this.eventGroups.forEach(function(row) {
                        self.$refs.eventGroupsTable.patch(row, { isSelected: false });
                    });
                }
            },
            handleCommand: function(ev, eventGroup) {
                eventGroup.isEditMode = true;
                if (ev === 'edit') {
                    this.$root.$emit('dm-open-edit-event-group-drawer', eventGroup);
                }
                else if (ev === 'delete') {
                    this.deleteElement = eventGroup;
                    this.showDeleteDialog = true;
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                this.$store.dispatch("countlyDataManager/deleteEventGroups", [this.deleteElement._id]);
                this.showDeleteDialog = false;
                this.deleteElement = null;
                app.navigate("#/manage/data-manager/events/event-groups", true);
            },
            handleChangeVisibility: function(command, rows) {
                var isVisible = command === 'visible';
                var events = [];
                rows.forEach(function(row) {
                    events.push(row.key);
                });
                this.$store.dispatch('countlyDataManager/changeEventGroupsVisibility', { events: events, isVisible: isVisible });
            },
            handleDelete: function(rows) {
                this.deleteQueue = rows;
                this.showDeleteDialog = true;
                var events = [];
                rows.forEach(function(row) {
                    events.push(row.key);
                });
                this.$store.dispatch('countlyDataManager/deleteEventGroups', events);
            },
        }
    });

    var EventsView = countlyVue.views.create({
        template: CV.T('/data-manager/templates/events.html'),
        mixins: [
            countlyVue.mixins.hasDrawers(["events", "transform", "segments", "eventgroup", "regenerate"]),
            countlyVue.container.tabsMixin({
                "externalTabs": "/manage/data-manager/events"
            })
        ],
        data: function() {
            return {
                isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
                currentSecondaryTab: (this.$route.params && this.$route.params.secondaryTab) || "events",
                importDialogVisible: false,
                dropzoneOptions: {
                    url: '/',
                    autoProcessQueue: false,
                    addRemoveLinks: true,
                    acceptedFiles: 'text/csv',
                    dictDefaultMessage: 'a<br/> b',
                    maxFiles: 1,
                    dictRemoveFile: this.i18n('surveys.generic.remove-file')
                },
                localTabs: [
                    {
                        title: this.i18n('data-manager.events'),
                        priority: 1,
                        name: "events",
                        component: EventsDefaultTabView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/data-manager/events/events"
                    },
                    {
                        priority: 3,
                        title: CV.i18n('data-manager.event-groups'),
                        name: "event-groups",
                        component: EventsGroupsTabView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/data-manager/events/event-groups"
                    }
                ]
            };
        },
        computed: {
            secondaryTabs: function() {
                var allTabs = this.localTabs.concat(this.externalTabs);

                allTabs.sort(function(a, b) {
                    return a.priority - b.priority;
                });

                return allTabs;
            }
        },
        components: {
            'events-drawer': EventsDrawer,
            'transform-drawer': COMPONENTS.TransformDrawer,
            'segments-drawer': COMPONENTS.SegmentsDrawer,
            'event-group-drawer': EventGroupDrawer,
            'regenerate-drawer': COMPONENTS.RegenerateDrawer
        },
        methods: {
            initialize: function() {
                this.$store.dispatch('countlyDataManager/loadEventsData');
                this.$store.dispatch('countlyDataManager/loadEventGroups');
                this.$store.dispatch('countlyDataManager/loadCategories');
                if (this.isDrill) {
                    this.$store.dispatch('countlyDataManager/loadTransformations');
                    this.$store.dispatch('countlyDataManager/loadSegmentsMap');
                    this.$store.dispatch('countlyDataManager/loadValidations');

                }
            },
            handleCreateCommand: function(event, tab) {
                if (event === 'create-transform') {
                    var transformType = tab;
                    var actionType = 'merge';
                    if (tab === 'events') {
                        transformType = 'event';
                    }
                    if (tab === 'segmentation') {
                        transformType = 'segment';
                        actionType = 'rename';
                    }
                    this.openDrawer("transform", { tab: tab, transformType: transformType, actionType: actionType });
                }
                else if (event === 'create-event') {
                    this.openDrawer("events", { segments: [], isEditMode: false });
                }
                else if (event === 'create-event-group') {
                    this.openDrawer("eventgroup", { isEditMode: false, display_map: {}, status: true });
                }
                else if (event === 'create-event-transform') {
                    this.openDrawer("transform", { tab: tab, transformType: 'event', actionType: 'merge' });
                }
                else if (event === 'create-segment-transform') {
                    this.openDrawer("transform", { tab: tab, transformType: 'segment', actionType: 'merge' });
                }
            },
            handleMetaCommands: function(event) {
                if (event === 'regnerate') {
                    this.openDrawer("regenerate", {});
                }
                else if (event === 'export-schema') {
                    this.$store.dispatch('countlyDataManager/exportSchema');
                }
                else if (event === 'import-schema') {
                    this.importDialogVisible = true;
                }
            },
            onSaveImport: function() {
                var self = this;
                var dropzone = this.$refs.importSchemaDropzone;
                var files = dropzone.getAcceptedFiles();
                this.$store.dispatch('countlyDataManager/importSchema', files[0])
                    .then(function() {
                        self.initialize();
                    });
            },
            onCloseImport: function() {
                this.importDialogVisible = false;
                this.$refs.importSchemaDropzone.removeAllFiles();
            },
            onFileAdded: function() {
                // this.importDisabled = false;
                // this.$refs.importDropzone.disable();


            },
            onFileRemoved: function() {
                // this.importDisabled = true;
                // this.$refs.importDropzone.enable();
            }
        },
        created: function() {
            this.initialize();
        },
        mounted: function() {
            var self = this;
            this.$root.$on('dm-open-edit-segmentation-drawer', function(data) {
                self.openDrawer("segments", data);
            });
            this.$root.$on('dm-open-edit-event-drawer', function(data) {
                data = JSON.parse(JSON.stringify(data));
                if (self.isDrill) {
                    var segments = [];
                    if (data.segments) {
                        data.segments
                            .forEach(function(segment) {
                                if (segment) {
                                    var sg = data.sg[segment];
                                    sg.name = segment;
                                    segments.push(sg);
                                }
                            });
                    }
                    data.segments = segments;
                }
                else {
                    data.segments = data.segments.map(function(seg) {
                        return {
                            name: seg
                        };
                    });
                }
                data.isEditMode = true;
                data.is_visible = data.is_visible === undefined ? true : data.is_visible;
                self.openDrawer("events", data);
            });
            this.$root.$on('dm-open-edit-transform-drawer', function(doc) {
                doc = JSON.parse(JSON.stringify(doc));
                // doc.transformType = doc.actionType.split('_')[0] === 'EVENT' ? 'event' : 'segment';
                doc.transformType = doc.actionType.split('_')[0].toLowerCase();
                if (doc.actionType.split('_')[1] !== "MERGE") {
                    doc.transformTarget = doc.transformTarget[0];
                }
                if (doc.actionType === 'EVENT_MERGE' && doc.isRegex === true) {
                    doc.actionType = 'merge-regex';
                }
                else {
                    doc.actionType = doc.actionType.split('_')[1].toLowerCase();
                }
                doc.isExistingEvent = 'true';
                // doc.tab;
                // delete doc.transformType;
                doc.isEditMode = true;
                self.openDrawer("transform", doc);
            });
            this.$root.$on('dm-open-edit-event-group-drawer', function(data) {
                if (!data.display_map) {
                    data.display_map = {};
                }
                if (data.status === undefined) {
                    data.status = true;
                }
                self.openDrawer("eventgroup", data);
            });
        },
        destroyed: function() {
            this.$root.$off('dm-open-edit-segmentation-drawer');
            this.$root.$off('dm-open-edit-event-drawer');
            this.$root.$off('dm-open-edit-transform-drawer');
            this.$root.$off('dm-open-edit-event-group-drawer');
        }
    });

    var MainView = countlyVue.views.create({
        template: CV.T('/data-manager/templates/main.html'),
        mixins: [
            countlyVue.container.mixins(["/manage/data-manager"]),
            countlyVue.container.tabsMixin({
                "externalTabs": "/manage/data-manager"
            })
        ],
        data: function() {
            return {
                currentPrimaryTab: (this.$route.params && this.$route.params.primaryTab) || "events",
                localTabs: [
                    {
                        priority: 1,
                        title: this.i18n('data-manager.events'),
                        name: "events",
                        component: EventsView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/data-manager/events",
                    }
                ]
            };
        },
        computed: {
            primaryTabs: function() {
                return this.localTabs.concat(this.externalTabs);
            }
        }
    });

    var EventDetailView = countlyVue.views.create({
        template: CV.T('/data-manager/templates/event-detail.html'),
        mixins: [
            countlyVue.mixins.hasDrawers(["events", "segments"])
        ],
        components: {
            'events-drawer': EventsDrawer,
            'segments-drawer': COMPONENTS.SegmentsDrawer
        },
        data: function() {
            return {
                isDrill: countlyGlobal.plugins.indexOf("drill") > -1,
                eventId: this.$route.params.eventId,
                showDeleteDialog: false,
                deleteElement: null,
            };
        },
        computed: {
            event: function() {
                var eventId = this.eventId;
                var event = {};
                var events = this.$store.getters["countlyDataManager/events"];
                if (!(events && events.length)) {
                    return [];
                }
                events.forEach(function(ev) {
                    var key = ev.key || ev.e;
                    if (key === eventId) {
                        event = ev;
                    }
                });
                if (event.is_visible !== false) {
                    event.is_visible = true;
                }
                if (!event.status) {
                    event.status = 'unplanned';
                }
                return event;
            },
            segments: function() {
                var self = this;
                var segments = [];
                var segmentsMap = this.$store.getters["countlyDataManager/segmentsMap"];
                if (segmentsMap) {
                    segmentsMap.forEach(function(sgMap) {
                        if (sgMap._id === self.event.key) {
                            return segments = sgMap.sg;
                        }
                    });
                }
                return segments.map(function(seg) {
                    if (!seg.status) {
                        seg.status = 'unplanned';
                    }
                    return seg;
                });
            },
            categoriesMap: function() {
                return this.$store.getters["countlyDataManager/categoriesMap"];
            },
        },
        methods: {
            handleCommand: function(ev, event) {
                if (ev === 'delete') {
                    this.deleteElement = event;
                    this.showDeleteDialog = true;
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                this.$store.dispatch('countlyDataManager/deleteEvents', [this.deleteElement]);
                this.showDeleteDialog = false;
                app.navigate("#/manage/data-manager/events/events", true);
            },
            initialize: function() {
                this.$store.dispatch('countlyDataManager/loadCategories');
                this.$store.dispatch('countlyDataManager/loadEventsData');
                if (this.isDrill) {
                    this.$store.dispatch('countlyDataManager/loadTransformations');
                    this.$store.dispatch('countlyDataManager/loadSegmentsMap');
                }
                // this.$store.dispatch('countlyDataManager/loadEventGroups');
                // this.$store.dispatch('countlyDataManager/loadValidations');
            },
            handleEdit: function() {
                var event = JSON.parse(JSON.stringify(this.event));
                event.segments = this.segments;
                event.isEditMode = true;
                this.openDrawer("events", event);
            },
            handleEditSegment: function(seg) {
                this.openDrawer("segments", seg);
            },
            statusClassObject: statusClassObject
        },
        created: function() {
            this.initialize();
        }
    });

    var vuex = [{
        clyModel: countlyDataManager
    }];

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: MainView,
            vuex: vuex,
            templates: defaultTemplates,
        });
    };

    var getEventDetailView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: EventDetailView,
            vuex: vuex,
            templates: [
                "/data-manager/templates/create-event-drawer-components.html"
            ],
        });
    };

    var getEventGroupDetailView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: EventGroupDetailView,
            vuex: vuex
        });
    };

    if (countlyAuth.validateRead(FEATURE_NAME)) {

        app.route("/manage/data-manager/:primaryTab", 'data-manager', function(primaryTab) {
            var mainView = getMainView();
            mainView.params = {
                primaryTab: primaryTab
            };
            this.renderWhenReady(mainView);
        });

        app.route("/manage/data-manager/:primaryTab/:secondaryTab", 'data-manager', function(primaryTab, secondaryTab) {
            var mainView = getMainView();
            mainView.params = {
                primaryTab: primaryTab,
                secondaryTab: secondaryTab
            };
            this.renderWhenReady(mainView);
        });

        app.route("/manage/data-manager/events/events/:eventId", 'data-manager-event-detail', function(eventId) {
            var detailView = getEventDetailView();
            detailView.params = {
                eventId: eventId
            };
            this.renderWhenReady(detailView);
        });

        app.route("/manage/data-manager/events/event-groups/:eventGroupId", 'data-manager-event-group-detail', function(eventGroupId) {
            var detailView = getEventGroupDetailView();
            detailView.params = {
                eventGroupId: eventGroupId
            };
            this.renderWhenReady(detailView);
        });

        $(document).ready(function() {
            app.addSubMenu("management", { code: "data-manager", url: "#/manage/data-manager/", text: "data-manager.plugin-title", priority: 30 });
        });
    }

})();