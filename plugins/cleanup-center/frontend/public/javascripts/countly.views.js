/* global countlyVue, CV, countlyCommon, CountlyHelpers, app, countlyCleanupCenter, $ */

(function() {
    const FEATURE_NAME = 'cleanup_center';
    const ALLOWED_DASHBOARD_TYPES = ['dashboard', 'cohort', 'funnel', 'formula'];

    // Main Cleanup Center View - V2 Production Design
    const CleanupCenterView = countlyVue.views.create({
        template: CV.T('/cleanup-center/templates/cleanup-center-simple.html'),
        mixins: [
            countlyVue.mixins.auth(FEATURE_NAME),
            countlyVue.mixins.i18n,
            countlyVue.mixins.hasDrawers('entityDetailsDrawer')
        ],
        data: function() {
            return {
                isLoading: false,
                isLoadingAudit: false,
                activeView: 'data',
                drawerSize: '640px',
                selectedApp: countlyCommon.ACTIVE_APP_ID,
                selectedEnvironment: 'prod',
                apps: [],
                showOverviewRail: false,
                showAdvancedFilters: [],
                allEntities: [],
                selectedEntityIds: [],
                searchQuery: '',
                currentFilter: {
                    app: null,
                    types: ALLOWED_DASHBOARD_TYPES.slice(),
                    entity: ''
                },
                sortBy: 'lastSeen',
                density: 'comfortable',
                currentPage: 1,
                pageSize: 50,
                pageSizes: [25, 50, 100, 200],
                selectedEntity: null,
                entityAuditHistory: [],
                showDeleteModal: false,
                entityToDelete: null,
                deleteConfirmText: '',
                auditLogs: [],
                auditTotal: 0,
                auditCurrentPage: 1,
                auditPageSize: 50,
                historyDateRange: null,
                historyActorFilter: '',
                historyActionFilter: '',
                historyEntityTypeFilter: '',
                historySearchQuery: '',
                entityTrend: 0,
                recentChangesCount: 0,
                entityTypes: [
                    { value: 'event', label: 'Event', icon: 'ion-flash' },
                    { value: 'event_property', label: 'Property', icon: 'ion-ios-pulse' },
                    { value: 'user_property', label: 'User Prop', icon: 'ion-person' },
                    { value: 'view', label: 'View', icon: 'ion-eye' },
                    { value: 'error', label: 'Error', icon: 'ion-alert-circled' },
                    { value: 'feature_flag', label: 'Flag', icon: 'ion-flag' },
                    { value: 'cohort', label: 'Cohort', icon: 'ion-person-stalker' },
                    { value: 'dashboard', label: 'Dashboard', icon: 'ion-stats-bars' },
                    { value: 'funnel', label: 'Funnel', icon: 'ion-funnel' },
                    { value: 'report', label: 'Report', icon: 'ion-document-text' },
                    { value: 'alert', label: 'Alert', icon: 'ion-alert' },
                    { value: 'campaign', label: 'Campaign', icon: 'ion-paper-airplane' },
                    { value: 'ab_test', label: 'A/B Test', icon: 'ion-shuffle' },
                    { value: 'api_key', label: 'API Key', icon: 'ion-key' },
                    { value: 'app', label: 'App', icon: 'ion-ios-box' },
                    { value: 'member', label: 'Member', icon: 'ion-person' },
                    { value: 'user_group', label: 'User Group', icon: 'ion-person-stalker' },
                    { value: 'widget', label: 'Widget', icon: 'ion-ios-box-outline' },
                    { value: 'survey', label: 'Survey', icon: 'ion-ios-list-outline' },
                    { value: 'nps', label: 'NPS', icon: 'ion-ios-chatbubble-outline' },
                    { value: 'flow', label: 'Flow', icon: 'ion-arrow-graph-up-right' },
                    { value: 'hook', label: 'Hook', icon: 'ion-ios-gear' },
                    { value: 'note', label: 'Note', icon: 'ion-ios-paper' },
                    { value: 'remote_config_condition', label: 'RC Condition', icon: 'ion-ios-toggle' },
                    { value: 'attribution_campaign', label: 'Attribution', icon: 'ion-link' },
                    { value: 'drill_bookmark', label: 'Bookmark', icon: 'ion-bookmark' },
                    { value: 'event_group', label: 'Event Group', icon: 'ion-ios-folder' },
                    { value: 'event_category', label: 'Event Category', icon: 'ion-ios-pricetags' },
                    { value: 'formula', label: 'Formula', icon: 'ion-calculator' },
                    { value: 'star_rating_widget', label: 'Star Rating', icon: 'ion-star' },
                    { value: 'blocking_rule', label: 'Block Rule', icon: 'ion-ios-close-outline' },
                    { value: 'date_preset', label: 'Date Preset', icon: 'ion-calendar' },
                    { value: 'journey_definition', label: 'Journey', icon: 'ion-map' },
                    { value: 'journey_version', label: 'Journey Ver', icon: 'ion-ios-list' },
                    { value: 'content_block', label: 'Content Block', icon: 'ion-ios-box' },
                    { value: 'data_transformation', label: 'Transform', icon: 'ion-shuffle' },
                    { value: 'crash_symbol', label: 'Crash Symbol', icon: 'ion-code' },
                    { value: 'crash_group', label: 'Crash Group', icon: 'ion-bug' },
                    { value: 'geo_location', label: 'Geo Location', icon: 'ion-location' },
                    { value: 'online_user_alert', label: 'Online Alert', icon: 'ion-person' },
                    { value: 'auth_token', label: 'Auth Token', icon: 'ion-key' },
                    { value: 'long_task', label: 'Long Task', icon: 'ion-load-a' },
                    { value: 'populator_template', label: 'Pop. Template', icon: 'ion-ios-paper-outline' },
                    { value: 'populator_environment', label: 'Pop. Environment', icon: 'ion-ios-world-outline' }
                ]
            };
        },
        computed: {
            sortedEntityTypes: function() {
                return this.entityTypes.slice().sort(function(a, b) {
                    return a.label.localeCompare(b.label);
                });
            },
            allowedTypeOptions: function() {
                return this.sortedEntityTypes.filter(function(t) {
                    return ALLOWED_DASHBOARD_TYPES.includes(t.value);
                });
            },
            totalEntities: function() {
                return this.allEntities.length;
            },
            unusedEventsCount: function() {
                const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
                return this.allEntities.filter(e => {
                    if (e.type !== 'event') {
                        return false;
                    }
                    const lastSeen = new Date(e.lastSeen).getTime();
                    return isNaN(lastSeen) || lastSeen < ninetyDaysAgo;
                }).length;
            },
            blockedCount: function() {
                return this.allEntities.filter(e => e.blocked).length;
            },
            activeFiltersCount: function() {
                let count = 0;
                if (this.currentFilter.app) {
                    count++;
                }
                if (this.currentFilter.entity) {
                    count++;
                }
                if (this.currentFilter.types && this.currentFilter.types.length > 0) {
                    const isDefaultTypes = this.currentFilter.types.length === ALLOWED_DASHBOARD_TYPES.length &&
                        this.currentFilter.types.every(function(t) {
                            return ALLOWED_DASHBOARD_TYPES.includes(t);
                        });
                    if (!isDefaultTypes) {
                        count++;
                    }
                }
                return count;
            },
            filteredEntities: function() {
                let entities = this.allEntities;

                // Apply filter dropdown filters
                // If app filter is set (not null), filter by app
                // If null, show all apps (no filtering)
                if (this.currentFilter.app !== null && this.currentFilter.app !== undefined) {
                    entities = entities.filter(e => {
                        const appId = this.getEntityAppId(e);
                        return appId === this.currentFilter.app;
                    });
                }

                // Apply type filter (works for both tabs - Dashboards tab has type=['dashboard'] set in background)
                if (this.currentFilter.types && Array.isArray(this.currentFilter.types) && this.currentFilter.types.length > 0) {
                    entities = entities.filter(e => e.type && this.currentFilter.types.includes(e.type));
                }

                if (this.currentFilter.entity) {
                    const entityQuery = this.currentFilter.entity.toLowerCase();
                    entities = entities.filter(e =>
                        (e.key && e.key.toLowerCase().includes(entityQuery)) ||
                        (e.displayName && e.displayName.toLowerCase().includes(entityQuery))
                    );
                }

                // Apply search query
                if (this.searchQuery) {
                    const query = this.searchQuery.toLowerCase();
                    entities = entities.filter(e =>
                        e.key.toLowerCase().includes(query) ||
                        (e.displayName && e.displayName.toLowerCase().includes(query))
                    );
                }

                entities = this.sortEntities(entities);

                return entities;
            },
            filterSummary: function() {
                const summary = [];

                if (this.currentFilter.app) {
                    const app = this.apps.find(a => a._id === this.currentFilter.app);
                    summary.push(app ? app.name : this.i18n('cleanup-center.app'));
                }
                else {
                    summary.push(this.i18n('cleanup-center.all-apps'));
                }

                if (this.currentFilter.types && this.currentFilter.types.length > 0) {
                    const labels = this.currentFilter.types.map(t => {
                        const match = this.entityTypes.find(et => et.value === t);
                        return match ? match.label : t;
                    });
                    summary.push(labels.join(', '));
                }
                else {
                    summary.push(this.i18n('cleanup-center.all-types'));
                }

                if (this.currentFilter.entity) {
                    summary.push(this.currentFilter.entity);
                }
                else {
                    summary.push(this.i18n('cleanup-center.all-entities'));
                }

                return summary.join(', ');
            },
            totalPages: function() {
                return Math.ceil(this.filteredEntities.length / this.pageSize) || 1;
            },
            availablePages: function() {
                const pages = [];
                for (let i = 1; i <= Math.min(this.totalPages, 200); i++) {
                    pages.push(i);
                }
                return pages;
            },
            prevAvailable: function() {
                return this.currentPage > 1;
            },
            nextAvailable: function() {
                return this.currentPage < this.totalPages;
            },
            paginationInfo: function() {
                const total = this.filteredEntities.length;
                if (!total) {
                    return '0 items';
                }
                const start = ((this.currentPage - 1) * this.pageSize) + 1;
                const end = Math.min(total, this.currentPage * this.pageSize);
                return start + '-' + end + ' of ' + total;
            },
            paginatedEntities: function() {
                const start = (this.currentPage - 1) * this.pageSize;
                const end = start + this.pageSize;
                return this.filteredEntities.slice(start, end);
            },
            paginationSummary: function() {
                const total = this.filteredEntities.length;
                if (!total) {
                    return {
                        start: 0,
                        end: 0,
                        total: 0
                    };
                }
                const start = ((this.currentPage - 1) * this.pageSize) + 1;
                const end = Math.min(total, this.currentPage * this.pageSize);
                return {
                    start: start,
                    end: end,
                    total: total
                };
            },
            currentAppName: function() {
                const app = this.apps.find(a => a._id === this.selectedApp);
                if (app) {
                    return app.name;
                }
                return '';
            },
            uniqueActors: function() {
                const actors = new Set();
                this.auditLogs.forEach(log => {
                    if (log.actorName) {
                        actors.add(log.actorName);
                    }
                });
                return Array.from(actors).sort();
            }
        },
        mounted: function() {
            this.loadPreferences();

            // Limit to allowed dashboard-related types by default
            this.currentFilter.types = ALLOWED_DASHBOARD_TYPES.slice();
            // Ensure app filter is null to show all apps
            this.currentFilter.app = null;
            this.selectedApp = null;

            this.loadApps();
            // Load entities immediately with dashboard filter applied
            this.loadEntities();
            this.loadRecentChangesCount();
            this.setupKeyboardShortcuts();
            this.updateDrawerSize();
            window.addEventListener('resize', this.updateDrawerSize);
        },
        beforeDestroy: function() {
            window.removeEventListener('resize', this.updateDrawerSize);
        },
        methods: {
            loadApps: function() {
                const self = this;
                // eslint-disable-next-line no-undef
                if (typeof countlyGlobal !== 'undefined' && countlyGlobal.apps) {
                    // eslint-disable-next-line no-undef
                    self.apps = Object.values(countlyGlobal.apps).sort(function(a, b) {
                        const nameA = (a.name || '').toLowerCase();
                        const nameB = (b.name || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                }
            },
            loadEntities: function() {
                const self = this;
                self.isLoading = true;

                // If "All apps" is selected (null), pass null to get all entities
                const appIdToLoad = self.selectedApp || null;

                countlyCleanupCenter.getEntities(
                    appIdToLoad,
                    {},
                    function(data) {
                        const entities = data.entities || [];
                        entities.forEach(function(entity) {
                            entity.hover = false;
                            // Normalize date fields - handle both snake_case and camelCase
                            if (entity.created_at && !entity.createdAt) {
                                const date = new Date(entity.created_at);
                                entity.createdAt = isNaN(date.getTime()) ? null : date.getTime();
                            }
                            if (entity.updated_at && !entity.updatedAt) {
                                const date = new Date(entity.updated_at);
                                entity.updatedAt = isNaN(date.getTime()) ? null : date.getTime();
                            }
                            // Handle updated_by field
                            if (entity.updated_by && !entity.updatedBy) {
                                entity.updatedBy = entity.updated_by;
                            }
                            // Ensure createdAt and updatedAt are numbers (timestamps) or null
                            if (entity.createdAt && typeof entity.createdAt !== 'number') {
                                const date = new Date(entity.createdAt);
                                entity.createdAt = isNaN(date.getTime()) ? null : date.getTime();
                            }
                            if (entity.updatedAt && typeof entity.updatedAt !== 'number') {
                                const date = new Date(entity.updatedAt);
                                entity.updatedAt = isNaN(date.getTime()) ? null : date.getTime();
                            }
                        });
                        self.allEntities = entities;
                        self.isLoading = false;
                    },
                    function(error) {
                        // eslint-disable-next-line no-console
                        console.error('Error loading entities:', error);
                        CountlyHelpers.notify({
                            message: 'Error loading entities',
                            type: 'error'
                        });
                        self.isLoading = false;
                    }
                );
            },
            loadRecentChangesCount: function() {
                const self = this;
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

                countlyCleanupCenter.getAuditHistory(
                    {
                        app_id: self.selectedApp,
                        limit: 1000
                    },
                    function(data) {
                        const recentLogs = (data.logs || []).filter(log => log.timestamp >= sevenDaysAgo);
                        self.recentChangesCount = recentLogs.length;
                    },
                    function(error) {
                        // eslint-disable-next-line no-console
                        console.error('Error loading recent changes:', error);
                    }
                );
            },
            loadEntityDetails: function() {
                const self = this;
                if (!self.selectedEntity) {
                    return;
                }

                countlyCleanupCenter.getEntityDetails(
                    self.selectedEntity.id,
                    function(data) {
                        if (data.entity && data.entity.auditHistory) {
                            self.entityAuditHistory = data.entity.auditHistory;
                        }
                    },
                    function(error) {
                        // eslint-disable-next-line no-console
                        console.error('Error loading entity details:', error);
                    }
                );
            },
            loadAuditHistory: function() {
                const self = this;
                self.isLoadingAudit = true;

                const filters = {
                    app_id: self.selectedApp,
                    limit: self.auditPageSize,
                    skip: (self.auditCurrentPage - 1) * self.auditPageSize
                };

                if (self.historyActorFilter) {
                    filters.actor = self.historyActorFilter;
                }
                if (self.historyActionFilter) {
                    filters.action = self.historyActionFilter;
                }
                if (self.historyEntityTypeFilter) {
                    filters.entity_type = self.historyEntityTypeFilter;
                }

                countlyCleanupCenter.getAuditHistory(
                    filters,
                    function(data) {
                        self.auditLogs = data.logs || [];
                        self.auditTotal = data.total || 0;
                        self.isLoadingAudit = false;
                    },
                    function(error) {
                        // eslint-disable-next-line no-console
                        console.error('Error loading audit history:', error);
                        CountlyHelpers.notify({
                            message: 'Error loading audit history',
                            type: 'error'
                        });
                        self.isLoadingAudit = false;
                    }
                );
            },
            onAppChange: function() {
                this.currentFilter.app = this.selectedApp;
                this.clearSelection();
                this.loadEntities();
                this.loadRecentChangesCount();
                if (this.activeView === 'history') {
                    this.loadAuditHistory();
                }
            },
            refresh: function() {
                // Disable periodic auto-refresh to avoid unnecessary reloads; data is fetched on page load and user actions.
                return $.Deferred().resolve();
            },
            handleTabClick: function(tab) {
                if (tab.name === 'audit' && this.auditLogs.length === 0) {
                    this.loadAuditHistory();
                }
            },
            handleFilterChange: function() {
                this.currentPage = 1;
                this.savePreferences();
            },
            handleSubmitFilter: function(newFilter) {
                const filter = {
                    app: newFilter.app || null,
                    types: Array.isArray(newFilter.types) && newFilter.types.length > 0 ? newFilter.types : ALLOWED_DASHBOARD_TYPES.slice(),
                    entity: (newFilter.entity || '').trim()
                };
                this.currentFilter = filter;
                this.selectedApp = (typeof filter.app === 'undefined') ? countlyCommon.ACTIVE_APP_ID : filter.app;
                this.currentPage = 1;
                this.loadEntities();
                if (this.$refs.filterDropdown) {
                    this.$refs.filterDropdown.doClose();
                }
                this.savePreferences();
            },
            handleCancelFilterClick: function() {
                if (this.$refs.filterDropdown) {
                    this.$refs.filterDropdown.doClose();
                }
                this.reloadFilterValues();
            },
            handleResetFilterClick: function() {
                this.currentFilter = {
                    app: null,
                    types: ALLOWED_DASHBOARD_TYPES.slice(),
                    entity: ''
                };
                this.selectedApp = null;
                this.currentPage = 1;
                this.loadEntities();
                if (this.$refs.filterForm) {
                    this.$refs.filterForm.reset();
                }
            },
            reloadFilterValues: function() {
                if (this.$refs.filterForm) {
                    this.$refs.filterForm.reset();
                }
            },
            handleSortChange: function() {
                this.currentPage = 1;
                this.savePreferences();
            },
            handlePageChange: function(page) {
                if (typeof page === 'number') {
                    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
                }
                else {
                    this.currentPage = parseInt(page) || 1;
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            handlePageSizeChange: function(size) {
                if (typeof size === 'number') {
                    this.pageSize = size;
                }
                this.currentPage = 1;
                this.savePageSizePreference();
            },
            goToFirstPage: function() {
                if (this.prevAvailable) {
                    this.handlePageChange(1);
                }
            },
            goToPrevPage: function() {
                if (this.prevAvailable) {
                    this.handlePageChange(this.currentPage - 1);
                }
            },
            goToNextPage: function() {
                if (this.nextAvailable) {
                    this.handlePageChange(this.currentPage + 1);
                }
            },
            goToLastPage: function() {
                if (this.nextAvailable) {
                    this.handlePageChange(this.totalPages);
                }
            },
            handleAuditPageChange: function(page) {
                this.auditCurrentPage = page;
                this.loadAuditHistory();
            },
            handleSelectionChange: function(selection) {
                this.selectedEntityIds = selection.map(e => e.id);
            },
            handleRowAction: function(command) {
                const action = command.action;
                const entity = command.entity;

                switch (action) {
                case 'preview':
                    this.openPreview(entity);
                    break;
                }
            },
            openPreview: function(entity) {
                if (!entity || !entity.id) {
                    return;
                }
                // Expected id format from cleanup-center backend: dashboard_<appId>_<dashboardId>
                const parts = (entity.id || '').split('_');
                if (parts.length < 3) {
                    return;
                }
                const appId = parts[1];
                // Dashboard id may contain underscores; rejoin remainder
                const dashboardId = parts.slice(2).join('_');

                // Build hash-based dashboard URL with preview flags that are ignored by tracking
                const base = window.location.origin;
                const hashPath = '#/' + encodeURIComponent(appId) + '/custom/' + encodeURIComponent(dashboardId);
                const query = '?preview=true&cleanupPreview=1';
                const previewUrl = base + '/dashboard?' + hashPath + query;
                window.open(previewUrl, '_blank', 'noopener');
            },
            handleBatchAction: function(command) {
                switch (command) {
                case 'merge':
                    this.batchMerge();
                    break;
                case 'delete':
                    this.batchDelete();
                    break;
                }
            },
            filterToUnused: function() {
                this.currentFilter.types = ['event'];
                this.currentFilter.entity = '';
                this.currentFilter.lastSeenRange = null;
                this.sortBy = 'lastSeen';
                this.currentPage = 1;
                this.activeView = 'data';
            },
            filterToBlocked: function() {
                this.searchQuery = '';
                this.currentFilter.types = ['dashboard'];
                this.currentFilter.entity = '';
                this.currentFilter.lastSeenRange = null;
                this.currentPage = 1;
                this.activeView = 'data';
            },
            clearSelection: function() {
                this.$refs.dataTable.clearSelection();
                this.selectedEntityIds = [];
            },
            openDetailsDrawer: function(row) {
                this.selectedEntity = row;
                this.openDrawer('entityDetailsDrawer', {});
            },
            closeDetailsDrawer: function() {
                this.closeDrawer('entityDetailsDrawer');
                this.selectedEntity = null;
                this.entityAuditHistory = [];
            },
            toggleHide: function(entity) {
                const newHiddenState = !entity.hidden;

                entity.hidden = newHiddenState;

                countlyCleanupCenter.hideEntity(
                    entity.id,
                    newHiddenState,
                    function() {
                        CountlyHelpers.notify({
                            message: newHiddenState ? 'Entity hidden' : 'Entity unhidden',
                            type: 'success'
                        });
                    },
                    function(error) {
                        entity.hidden = !newHiddenState;
                        // eslint-disable-next-line no-console
                        console.error('Error hiding entity:', error);
                        CountlyHelpers.notify({
                            message: 'Error updating entity',
                            type: 'error'
                        });
                    }
                );
            },
            toggleBlock: function(entity) {
                const newBlockedState = !entity.blocked;

                const message = newBlockedState ?
                    'Blocking will prevent new data from being recorded for "' + entity.displayName + '". Continue?' :
                    'Are you sure you want to unblock "' + entity.displayName + '"?';

                CountlyHelpers.confirm(
                    message,
                    'warning',
                    function() {
                        entity.blocked = newBlockedState;
                        entity.status = newBlockedState ? 'blocked' : 'live';

                        countlyCleanupCenter.blockEntity(
                            entity.id,
                            newBlockedState,
                            function() {
                                CountlyHelpers.notify({
                                    message: newBlockedState ? 'Blocked ' + entity.displayName : 'Unblocked ' + entity.displayName,
                                    type: 'success'
                                });
                            },
                            function(error) {
                                entity.blocked = !newBlockedState;
                                entity.status = newBlockedState ? 'live' : 'blocked';
                                // eslint-disable-next-line no-console
                                console.error('Error blocking entity:', error);
                                CountlyHelpers.notify({
                                    message: 'Error updating entity',
                                    type: 'error'
                                });
                            }
                        );
                    },
                    function() {}
                );
            },
            renameEntity: function(entity) {
                const self = this;
                CountlyHelpers.prompt(
                    'Enter new display name:',
                    entity.displayName || entity.key,
                    function(newName) {
                        if (newName && newName !== entity.displayName) {
                            countlyCleanupCenter.renameEntity(
                                entity.id,
                                newName,
                                function() {
                                    entity.displayName = newName;
                                    CountlyHelpers.notify({
                                        message: 'Entity renamed',
                                        type: 'success'
                                    });
                                    self.loadEntities();
                                },
                                function(error) {
                                    // eslint-disable-next-line no-console
                                    console.error('Error renaming entity:', error);
                                    CountlyHelpers.notify({
                                        message: 'Error renaming entity',
                                        type: 'error'
                                    });
                                }
                            );
                        }
                    }
                );
            },
            mergeEntity: function() {
                CountlyHelpers.notify({
                    message: 'Merge functionality coming soon - side-by-side picker',
                    type: 'info'
                });
            },
            deleteEntity: function(entity) {
                this.entityToDelete = entity;
                this.deleteConfirmText = '';
                this.showDeleteModal = true;
            },
            confirmDelete: function() {
                const self = this;

                if (!self.entityToDelete) {
                    return;
                }

                if (self.deleteConfirmText !== self.entityToDelete.key) {
                    return;
                }

                const entityName = self.entityToDelete.displayName;
                const entityId = self.entityToDelete.id;

                countlyCleanupCenter.deleteEntity(
                    entityId,
                    function() {
                        CountlyHelpers.notify({
                            message: 'Marked ' + entityName + ' for deletion',
                            type: 'success'
                        });
                        self.showDeleteModal = false;
                        self.showDetailsDrawer = false;
                        self.entityToDelete = null;
                        self.deleteConfirmText = '';
                        self.loadEntities();
                    },
                    function(error) {
                        // eslint-disable-next-line no-console
                        console.error('Error deleting entity:', error);
                        CountlyHelpers.notify({
                            message: 'Error deleting entity',
                            type: 'error'
                        });
                    }
                );
            },
            batchHide: function() {
                const self = this;
                const selectedEntities = self.allEntities.filter(e =>
                    self.selectedEntityIds.includes(e.id)
                );

                let completed = 0;
                let errors = 0;

                selectedEntities.forEach(function(entity) {
                    countlyCleanupCenter.hideEntity(
                        entity.id,
                        true,
                        function() {
                            completed++;
                            entity.hidden = true;
                            if (completed + errors === selectedEntities.length) {
                                CountlyHelpers.notify({
                                    message: 'Hidden ' + completed + ' entities',
                                    type: 'success'
                                });
                                self.clearSelection();
                            }
                        },
                        function(error) {
                            errors++;
                            // eslint-disable-next-line no-console
                            console.error('Error hiding entity:', error);
                            if (completed + errors === selectedEntities.length) {
                                CountlyHelpers.notify({
                                    message: 'Completed with ' + errors + ' errors',
                                    type: 'warning'
                                });
                                self.clearSelection();
                            }
                        }
                    );
                });
            },
            batchBlock: function() {
                const self = this;
                const selectedEntities = self.allEntities.filter(e =>
                    self.selectedEntityIds.includes(e.id)
                );

                CountlyHelpers.confirm(
                    'Blocking will prevent new data for ' + selectedEntities.length + ' entities. Continue?',
                    'warning',
                    function() {
                        let completed = 0;
                        let errors = 0;

                        selectedEntities.forEach(function(entity) {
                            countlyCleanupCenter.blockEntity(
                                entity.id,
                                true,
                                function() {
                                    completed++;
                                    entity.blocked = true;
                                    entity.status = 'blocked';
                                    if (completed + errors === selectedEntities.length) {
                                        CountlyHelpers.notify({
                                            message: 'Blocked ' + completed + ' entities',
                                            type: 'success'
                                        });
                                        self.clearSelection();
                                    }
                                },
                                function(error) {
                                    errors++;
                                    // eslint-disable-next-line no-console
                                    console.error('Error blocking entity:', error);
                                    if (completed + errors === selectedEntities.length) {
                                        CountlyHelpers.notify({
                                            message: 'Completed with ' + errors + ' errors',
                                            type: 'warning'
                                        });
                                        self.clearSelection();
                                    }
                                }
                            );
                        });
                    },
                    function() {}
                );
            },
            batchMerge: function() {
                CountlyHelpers.notify({
                    message: 'Batch merge coming soon',
                    type: 'info'
                });
            },
            batchDelete: function() {
                CountlyHelpers.notify({
                    message: 'Batch delete coming soon',
                    type: 'info'
                });
            },
            sortEntities: function(entities) {
                const self = this;
                const sorted = entities.slice();

                sorted.sort(function(a, b) {
                    switch (self.sortBy) {
                    case 'lastSeen':
                        return new Date(b.lastSeen) - new Date(a.lastSeen);
                    case 'usage':
                        return (b.usage30d || 0) - (a.usage30d || 0);
                    case 'created':
                        return (b.createdAt || 0) - (a.createdAt || 0);
                    case 'updated':
                        return (b.updatedAt || 0) - (a.updatedAt || 0);
                    case 'status':
                        return a.status.localeCompare(b.status);
                    case 'type':
                        return a.type.localeCompare(b.type);
                    case 'key-asc':
                        return a.key.localeCompare(b.key);
                    case 'key-desc':
                        return b.key.localeCompare(a.key);
                    default:
                        return 0;
                    }
                });

                return sorted;
            },
            getTypeCount: function(type) {
                return this.allEntities.filter(e => e.type === type).length;
            },
            getStatusCount: function(status) {
                return this.allEntities.filter(e => e.status === status).length;
            },
            getRowClassName: function({ row }) {
                if (row.blocked) {
                    return 'row-blocked';
                }
                if (row.hidden) {
                    return 'row-hidden';
                }
                if (row.isUnused) {
                    return 'row-unused';
                }
                return '';
            },
            setupKeyboardShortcuts: function() {
                document.addEventListener('keydown', function(e) {
                    if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const searchInput = document.querySelector('.el-input__inner[placeholder*="Search"]');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }
                });
            },
            onCellMouseEnter: function(row) {
                if (this.selectedEntityIds.length > 0) {
                    return;
                }
                if (!row.hover) {
                    this.$set(row, 'hover', true);
                }
            },
            onCellMouseLeave: function(row) {
                if (row.hover) {
                    this.$set(row, 'hover', false);
                }
            },
            updateDrawerSize: function() {
                const width = window.innerWidth;
                if (width >= 1280) {
                    this.drawerSize = '640px';
                }
                else if (width >= 1024) {
                    this.drawerSize = '520px';
                }
                else {
                    this.drawerSize = '100%';
                }
            },
            saveDensity: function() {
                try {
                    localStorage.setItem('cleanup-center-density', this.density);
                }
                catch (e) {
                    // Ignore
                }
            },
            loadPreferences: function() {
                try {
                    const density = localStorage.getItem('cleanup-center-density');
                    if (density) {
                        this.density = density;
                    }

                    const showOverview = localStorage.getItem('cleanup-center-show-overview');
                    if (showOverview !== null) {
                        this.showOverviewRail = showOverview === 'true';
                    }

                    const storedPageSize = parseInt(localStorage.getItem('cleanup-center-page-size'), 10);
                    if (!isNaN(storedPageSize) && this.pageSizes.includes(storedPageSize)) {
                        this.pageSize = storedPageSize;
                    }
                }
                catch (e) {
                    // Ignore
                }
            },
            savePreferences: function() {
                try {
                    localStorage.setItem('cleanup-center-show-overview', this.showOverviewRail);
                }
                catch (e) {
                    // Ignore
                }
            },
            savePageSizePreference: function() {
                try {
                    localStorage.setItem('cleanup-center-page-size', this.pageSize);
                }
                catch (e) {
                    // Ignore
                }
            },
            formatNumber: function(num) {
                return countlyCommon.formatNumber(num);
            },
            formatRelativeTime: function(timestamp) {
                if (!timestamp || timestamp === 'N/A') {
                    return 'N/A';
                }

                // Handle both seconds (10 digits) and milliseconds (13 digits)
                let ts = timestamp;
                if (typeof ts === 'number') {
                    // If timestamp is in seconds (10 digits), convert to milliseconds
                    const tsStr = Math.round(ts).toString();
                    if (tsStr.length === 10) {
                        ts = ts * 1000;
                    }
                    // Also check for very small numbers that might be seconds
                    if (ts < 10000000000 && ts > 0) {
                        ts = ts * 1000;
                    }
                }

                const date = new Date(ts);
                if (isNaN(date.getTime()) || date.getTime() < 0) {
                    return 'N/A';
                }

                // Use Countly's built-in formatTimeAgoText if available
                if (countlyCommon && countlyCommon.formatTimeAgoText) {
                    try {
                        const result = countlyCommon.formatTimeAgoText(ts);
                        // formatTimeAgoText returns an object with {text, tooltip, color}
                        if (result && typeof result === 'object' && result.text) {
                            return result.text;
                        }
                        // If it's already a string, return it
                        if (typeof result === 'string') {
                            return result;
                        }
                    }
                    catch (e) {
                        // Fall through to custom formatting
                    }
                }

                // Fallback to custom formatting
                const now = new Date();
                const diff = Math.abs(now - date);
                const minutes = Math.floor(diff / 60000);

                if (minutes < 1) {
                    return 'Just now';
                }
                if (minutes < 60) {
                    return minutes + 'm ago';
                }
                const hours = Math.floor(minutes / 60);
                if (hours < 24) {
                    return hours + 'h ago';
                }
                const days = Math.floor(hours / 24);
                if (days < 30) {
                    return days + 'd ago';
                }
                const months = Math.floor(days / 30);
                if (months < 12) {
                    return months + 'mo ago';
                }
                const years = Math.floor(days / 365);
                return years + 'y ago';
            },
            formatFullTimestamp: function(timestamp) {
                if (!timestamp) {
                    return '';
                }

                // Handle both seconds (10 digits) and milliseconds (13 digits)
                let ts = timestamp;
                if (typeof ts === 'number') {
                    // If timestamp is in seconds (10 digits), convert to milliseconds
                    const tsStr = Math.round(ts).toString();
                    if (tsStr.length === 10) {
                        ts = ts * 1000;
                    }
                    // Also check for very small numbers that might be seconds
                    if (ts < 10000000000 && ts > 0) {
                        ts = ts * 1000;
                    }
                }

                const date = new Date(ts);
                if (isNaN(date.getTime()) || date.getTime() < 0) {
                    return '';
                }

                // Use Countly's formatTimeAndDateShort if available (NOT formatTime which is for durations!)
                if (countlyCommon && countlyCommon.formatTimeAndDateShort) {
                    return countlyCommon.formatTimeAndDateShort(ts);
                }

                // Use moment if available
                // eslint-disable-next-line no-undef
                if (typeof moment !== 'undefined') {
                    // eslint-disable-next-line no-undef
                    return moment(ts).format('YYYY-MM-DD HH:mm');
                }

                // Fallback to custom formatting
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
            },
            formatViewUsersForTable: function(viewUsers) {
                if (!viewUsers || !Array.isArray(viewUsers)) {
                    return [];
                }

                // Group view records by userId and count occurrences
                var userViewMap = {};

                viewUsers.forEach(function(view) {
                    if (!view || !view.userId) {
                        return;
                    }
                    var userId = view.userId;
                    if (!userViewMap[userId]) {
                        userViewMap[userId] = {
                            userId: userId,
                            userName: view.userName || view.userEmail || userId,
                            userEmail: view.userEmail,
                            dates: [],
                            count: 0
                        };
                    }
                    var viewDate = new Date(view.date);
                    if (!isNaN(viewDate.getTime())) {
                        userViewMap[userId].dates.push(viewDate.getTime());
                        userViewMap[userId].count++;
                    }
                });

                // Convert to array and format
                var displayData = Object.keys(userViewMap).map(function(userId) {
                    var userData = userViewMap[userId];
                    var latestDate = userData.dates.length > 0 ? Math.max.apply(null, userData.dates) : null;

                    return {
                        userId: userId,
                        userName: userData.userName,
                        userEmail: userData.userEmail,
                        count: userData.count,
                        lastViewed: latestDate
                    };
                });

                // Sort by last viewed date (most recent first)
                displayData.sort(function(a, b) {
                    if (!a.lastViewed) {
                        return 1;
                    }
                    if (!b.lastViewed) {
                        return -1;
                    }
                    return b.lastViewed - a.lastViewed;
                });

                return displayData;
            },
            formatChangeSummary: function(audit) {
                if (audit.action === 'rename') {
                    return 'Renamed';
                }
                if (audit.action === 'hide') {
                    return audit.after.hidden ? 'Hidden' : 'Unhidden';
                }
                if (audit.action === 'block') {
                    return audit.after.blocked ? 'Blocked' : 'Unblocked';
                }
                if (audit.action === 'delete') {
                    return 'Marked for deletion';
                }
                return audit.action;
            },
            formatAuditDiff: function(audit) {
                return JSON.stringify({
                    before: audit.before,
                    after: audit.after
                }, null, 2);
            },
            getInitials: function(name) {
                if (!name) {
                    return '?';
                }
                const parts = name.split(' ');
                if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
            },
            formatViewUsers: function(viewUsers) {
                if (!viewUsers || !Array.isArray(viewUsers)) {
                    return [];
                }

                // Group view records by userId and count occurrences
                var userViewMap = {};

                viewUsers.forEach(function(view) {
                    var userId = view.userId;
                    if (!userViewMap[userId]) {
                        userViewMap[userId] = {
                            userId: userId,
                            userName: view.userName || view.userEmail || userId,
                            userEmail: view.userEmail,
                            dates: [],
                            count: 0
                        };
                    }
                    userViewMap[userId].dates.push(new Date(view.date));
                    userViewMap[userId].count++;
                });

                // Convert to array and format
                var displayData = Object.keys(userViewMap).map(function(userId) {
                    var userData = userViewMap[userId];
                    var latestDate = new Date(Math.max.apply(null, userData.dates));

                    return {
                        userId: userId,
                        userName: userData.userName,
                        userEmail: userData.userEmail,
                        count: userData.count,
                        lastViewed: latestDate,
                        formattedDate: latestDate.toLocaleString()
                    };
                });

                // Sort by last viewed date (most recent first)
                displayData.sort(function(a, b) {
                    return b.lastViewed - a.lastViewed;
                });

                return displayData;
            },
            getViewHistoryRangeLabel: function() {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const start = new Date(today);
                start.setDate(start.getDate() - 29);
                const opts = {month: 'short', day: 'numeric'};
                return start.toLocaleDateString(undefined, opts) + ' - ' + today.toLocaleDateString(undefined, opts);
            },
            getViewHistoryChartOptions: function(entity) {
                var viewUsers = entity.viewUsers || [];

                // Create last 30 days array
                var today = new Date();
                today.setHours(0, 0, 0, 0);
                var last30Days = [];
                var dateMap = {};

                for (var i = 29; i >= 0; i--) {
                    var date = new Date(today);
                    date.setDate(date.getDate() - i);
                    var dateKey = date.toISOString().split('T')[0];
                    last30Days.push(dateKey);
                    dateMap[dateKey] = 0;
                }

                // Count views per day (only for last 30 days)
                viewUsers.forEach(function(view) {
                    var viewDate = new Date(view.date);
                    var viewDateKey = viewDate.toISOString().split('T')[0];
                    if (Object.prototype.hasOwnProperty.call(dateMap, viewDateKey)) {
                        dateMap[viewDateKey]++;
                    }
                });

                // Prepare chart data - format dates nicely
                var xAxisData = last30Days.map(function(dateStr) {
                    var d = new Date(dateStr);
                    var month = d.toLocaleDateString(undefined, {month: 'short'});
                    var day = d.getDate();
                    return month + ' ' + day;
                });
                var xAxisStartLabel = xAxisData[0] || '';
                var xAxisEndLabel = xAxisData[xAxisData.length - 1] || '';
                var yAxisData = last30Days.map(function(d) {
                    return dateMap[d];
                });
                // Ensure we always have data points (zeros) to avoid "No data" state
                if (!yAxisData.length) {
                    yAxisData = new Array(last30Days.length || 30).fill(0);
                }

                const hasNonZero = yAxisData.some(function(v) {
                    return v > 0;
                });
                let seriesData;
                if (hasNonZero) {
                    seriesData = yAxisData;
                }
                else {
                    // Keep zeros visually on the baseline; add tiny epsilon to pass "no data" guards in chart component.
                    seriesData = yAxisData.map(function() {
                        return 0;
                    });
                    if (seriesData.length > 0) {
                        seriesData[0] = 0.0001;
                        seriesData[seriesData.length - 1] = 0.0001;
                    }
                }

                var maxY = Math.max.apply(null, yAxisData);
                // Ensure chart shows a baseline when all values are zero
                var yAxisMax = maxY === 0 ? 1 : maxY + 1;

                return {
                    grid: {
                        left: '10px',
                        right: '10px',
                        top: '24px',
                        bottom: '48px',
                        containLabel: true
                    },
                    xAxis: {
                        type: 'category',
                        data: xAxisData,
                        boundaryGap: false,
                        axisLabel: {
                            interval: 0, // evaluate every tick
                            formatter: function(value, index) {
                                if (index === 0) {
                                    return xAxisStartLabel;
                                }
                                if (index === xAxisData.length - 1) {
                                    return xAxisEndLabel;
                                }
                                return '';
                            },
                            showMinLabel: true,
                            showMaxLabel: true,
                            fontSize: 11,
                            color: '#666',
                            rotate: 0,
                            align: 'center',
                            margin: 12,
                            overflow: 'break'
                        },
                        axisLine: {
                            show: false
                        },
                        axisTick: {
                            show: false
                        }
                    },
                    yAxis: {
                        type: 'value',
                        minInterval: 1,
                        min: 0,
                        max: yAxisMax,
                        axisLabel: {
                            fontSize: 11,
                            color: '#666'
                        },
                        splitLine: {
                            lineStyle: {
                                color: '#eee',
                                type: 'dashed'
                            }
                        }
                    },
                    series: [{
                        name: 'Views',
                        type: 'line',
                        data: seriesData,
                        smooth: true,
                        lineStyle: {
                            color: '#0166D6',
                            width: 3
                        },
                        itemStyle: {
                            color: '#0166D6'
                        },
                        areaStyle: {
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 0,
                                y2: 1,
                                colorStops: [
                                    { offset: 0, color: 'rgba(1, 102, 214, 0.35)' },
                                    { offset: 1, color: 'rgba(1, 102, 214, 0.02)' }
                                ]
                            }
                        },
                        symbol: 'circle',
                        symbolSize: 0,
                        showSymbol: false
                    }],
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: 'rgba(50, 50, 50, 0.9)',
                        borderColor: '#333',
                        textStyle: {
                            color: '#fff'
                        },
                        formatter: function(params) {
                            if (params && params[0]) {
                                var value = params[0].value;
                                var displayValue = value < 0.5 ? 0 : value;
                                var label = value === 1 ? 'view' : 'views';
                                return '<strong>' + params[0].name + '</strong><br/>' + displayValue + ' ' + label;
                            }
                            return '';
                        }
                    }
                };
            },
            getStatusTagType: function(status) {
                const types = {
                    'live': 'success',
                    'deprecated': 'warning',
                    'blocked': 'danger',
                    'hidden': 'info'
                };
                return types[status] || '';
            },
            getTypeLabel: function(type) {
                const labels = {
                    'event': 'Event',
                    'event_property': 'Event Property',
                    'user_property': 'User Property',
                    'view': 'View',
                    'error': 'Error',
                    'feature_flag': 'Feature Flag',
                    'cohort': 'Cohort',
                    'dashboard': 'Dashboard',
                    'funnel': 'Funnel',
                    'report': 'Report',
                    'alert': 'Alert',
                    'campaign': 'Campaign',
                    'ab_test': 'A/B Test',
                    'api_key': 'API Key',
                    'app': 'App',
                    'member': 'Member',
                    'user_group': 'User Group',
                    'widget': 'Widget',
                    'survey': 'Survey',
                    'nps': 'NPS',
                    'flow': 'Flow',
                    'hook': 'Hook',
                    'note': 'Note',
                    'remote_config_condition': 'Remote Config Condition',
                    'attribution_campaign': 'Attribution Campaign',
                    'drill_bookmark': 'Drill Bookmark',
                    'event_group': 'Event Group',
                    'event_category': 'Event Category',
                    'formula': 'Formula',
                    'star_rating_widget': 'Star Rating Widget',
                    'blocking_rule': 'Blocking Rule',
                    'date_preset': 'Date Preset',
                    'journey_definition': 'Journey Definition',
                    'journey_version': 'Journey Version',
                    'content_block': 'Content Block',
                    'data_transformation': 'Data Transformation',
                    'crash_symbol': 'Crash Symbol',
                    'crash_group': 'Crash Group',
                    'geo_location': 'Geo Location',
                    'online_user_alert': 'Online User Alert',
                    'auth_token': 'Auth Token',
                    'long_task': 'Long Task',
                    'populator_template': 'Populator Template',
                    'populator_environment': 'Populator Environment'
                };
                return labels[type] || type;
            },
            getTypeIcon: function(type) {
                const icons = {
                    'event': 'ion-flash',
                    'event_property': 'ion-ios-pulse',
                    'user_property': 'ion-person',
                    'view': 'ion-eye',
                    'error': 'ion-alert-circled',
                    'feature_flag': 'ion-flag',
                    'cohort': 'ion-person-stalker',
                    'dashboard': 'ion-stats-bars',
                    'funnel': 'ion-funnel',
                    'report': 'ion-document-text',
                    'alert': 'ion-alert',
                    'campaign': 'ion-paper-airplane',
                    'ab_test': 'ion-shuffle',
                    'api_key': 'ion-key',
                    'app': 'ion-ios-box',
                    'member': 'ion-person',
                    'user_group': 'ion-person-stalker',
                    'widget': 'ion-ios-box-outline',
                    'survey': 'ion-ios-list-outline',
                    'nps': 'ion-ios-chatbubble-outline',
                    'flow': 'ion-arrow-graph-up-right',
                    'hook': 'ion-ios-gear',
                    'note': 'ion-ios-paper',
                    'remote_config_condition': 'ion-ios-toggle',
                    'attribution_campaign': 'ion-link',
                    'drill_bookmark': 'ion-bookmark',
                    'event_group': 'ion-ios-folder',
                    'event_category': 'ion-ios-pricetags',
                    'formula': 'ion-calculator',
                    'star_rating_widget': 'ion-star',
                    'blocking_rule': 'ion-ios-close-outline',
                    'date_preset': 'ion-calendar',
                    'journey_definition': 'ion-map',
                    'journey_version': 'ion-ios-list',
                    'content_block': 'ion-ios-box',
                    'data_transformation': 'ion-shuffle',
                    'crash_symbol': 'ion-code',
                    'crash_group': 'ion-bug',
                    'geo_location': 'ion-location',
                    'online_user_alert': 'ion-person',
                    'auth_token': 'ion-key',
                    'long_task': 'ion-load-a',
                    'populator_template': 'ion-ios-paper-outline',
                    'populator_environment': 'ion-ios-world-outline'
                };
                return icons[type] || 'ion-help';
            },
            getActionLabel: function(action) {
                const labels = {
                    'hide': 'Hide',
                    'block': 'Block',
                    'rename': 'Rename',
                    'merge': 'Merge',
                    'delete': 'Delete',
                    'change-type': 'Change Type',
                    'validate': 'Validate'
                };
                return labels[action] || action;
            },
            getActionTagType: function(action) {
                const types = {
                    'hide': 'info',
                    'block': 'warning',
                    'rename': 'primary',
                    'merge': 'warning',
                    'delete': 'danger',
                    'change-type': 'primary',
                    'validate': 'success'
                };
                return types[action] || 'info';
            },
            getEntityAppId: function(row) {
                if (row && row.appId) {
                    return row.appId;
                }
                return this.selectedApp;
            },
            getEntityAppName: function(row) {
                const appId = this.getEntityAppId(row);
                if (!appId || appId === 'global') {
                    return this.i18n('cleanup-center.global-app');
                }
                const app = this.apps.find(a => a._id === appId);
                if (app) {
                    return app.name;
                }
                if (appId === this.selectedApp) {
                    return this.currentAppName;
                }
                return appId;
            },
            getRowKey: function(row) {
                if (row && row.id) {
                    return row.id;
                }
                if (row && row.key) {
                    return row.key;
                }
                return '';
            }
        },
        watch: {
            showOverviewRail: function() {
                this.savePreferences();
            }
        }
    });

    var cleanupCenterView = new countlyVue.views.BackboneWrapper({
        component: CleanupCenterView,
        vuex: [],
        templates: ["/cleanup-center/templates/cleanup-center-simple.html"]
    });

    // Register route - now V2 is the default and only interface
    app.route('/manage/cleanup-center', 'cleanup-center', function() {
        this.renderWhenReady(cleanupCenterView);
    });

    app.addMenu("management", {code: "cleanup-center", permission: FEATURE_NAME, url: "#/manage/cleanup-center", text: "cleanup-center.title", priority: 115});

})();

