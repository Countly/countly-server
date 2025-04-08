/**
 * This file serves as documentation for the data-test-id attributes
 * that need to be added to the crashes section to make the tests more robust.
 * 
 * The tests in this file will fail until the data-test-id attributes are added
 * to the corresponding elements in the template files.
 */

describe('Crashes Data Test IDs', () => {
    beforeEach(function() {
    // Visit the dashboard with the token URL
        cy.visit('https://arturs.count.ly/login/token/b0c1003d74ceb45e5b8469c72421fa6ab21d7abc');

        // Wait for the dashboard to load
        cy.wait(10000);

        // Verify we're on the dashboard
        cy.url().should('include', '/dashboard');
    });

    it('should document data-test-ids needed for crash groups tab', function() {
    // Navigate to crashes overview
        cy.get('[data-test-id="sidebar-menuoptions-analytics"]').click();
        cy.get('[data-test-id="sidebar-mainmenu-menutitle-crashes-title-el-collapse-item-label"]').click();
        cy.get('[data-test-id="sidebar-mainmenu-subitem-crash"]').click();

        // The following elements need data-test-ids:

        // 1. Auto-refresh toggle
        cy.log('Need data-test-id="crash-groups-auto-refresh-toggle" for auto-refresh toggle');

        // 2. Query builder elements
        cy.log('Need data-test-id="cly-qb-bar" for query builder bar');
        cy.log('Need data-test-id="qb-add-filter-button" for add filter button');
        cy.log('Need data-test-id="qb-property-select" for property select');
        cy.log('Need data-test-id="qb-operator-select" for operator select');
        cy.log('Need data-test-id="qb-value-select" for value select');
        cy.log('Need data-test-id="qb-apply-button" for apply button');

        // 3. Table elements
        cy.log('Need data-test-id="datatable-crash-groups-row-{index}" for each row');
        cy.log('Need data-test-id="datatable-crash-groups-checkbox-{index}" for each checkbox');
        cy.log('Need data-test-id="datatable-crash-groups-group-title-{index}" for each group title');
        cy.log('Need data-test-id="datatable-crash-groups-badge-type-{badgeIndex}-col-{index}" for each badge');
        cy.log('Need data-test-id="datatable-crash-groups-platform-{index}" for platform column');
        cy.log('Need data-test-id="datatable-crash-groups-occurences-{index}" for occurrences column');
        cy.log('Need data-test-id="datatable-crash-groups-last-occurrence-{index}" for last occurrence column');
        cy.log('Need data-test-id="datatable-crash-groups-affected-users-{index}" for affected users column');
        cy.log('Need data-test-id="datatable-crash-groups-latest-app-version-{index}" for latest app version column');

        // 4. Bottomline actions
        cy.log('Need data-test-id="crash-groups-selected-count" for selected count');
        cy.log('Need data-test-id="crash-groups-change-status-dropdown" for change status dropdown');
        cy.log('Need data-test-id="crash-groups-change-status-resolved" for resolved option');
        cy.log('Need data-test-id="crash-groups-change-status-resolving" for resolving option');
        cy.log('Need data-test-id="crash-groups-change-status-unresolved" for unresolved option');
        cy.log('Need data-test-id="crash-groups-change-visibility-dropdown" for change visibility dropdown');
        cy.log('Need data-test-id="crash-groups-change-visibility-show" for show option');
        cy.log('Need data-test-id="crash-groups-change-visibility-hide" for hide option');
        cy.log('Need data-test-id="crash-groups-delete-button" for delete button');
        cy.log('Need data-test-id="crash-groups-cancel-selection-button" for cancel selection button');
    });

    it('should document data-test-ids needed for crash statistics tab', function() {
    // Navigate to crashes overview
        cy.get('[data-test-id="sidebar-menuoptions-analytics"]').click();
        cy.get('[data-test-id="sidebar-mainmenu-menutitle-crashes-title-el-collapse-item-label"]').click();
        cy.get('[data-test-id="sidebar-mainmenu-subitem-crash"]').click();

        // Switch to crash statistics tab
        cy.get('[data-test-id="tab-crash-statistics-label"]').click();

        // The following elements need data-test-ids:

        // 1. Metrics
        cy.log('Need data-test-id="affected-user" for affected user metric');
        cy.log('Need data-test-id="resolution-status" for resolution status metric');
        cy.log('Need data-test-id="crash-fatality" for crash fatality metric');

        // 2. Top platforms
        cy.log('Need data-test-id="crash-statistics-top-platforms-label" for top platforms label');
        cy.log('Need data-test-id="crash-statistics-top-platforms-tooltip" for top platforms tooltip');
        cy.log('Need data-test-id="crash-statistics-top-platforms-platform-{index}" for each platform');
        cy.log('Need data-test-id="crash-statistics-top-platforms-platform-users-percentage-{index}" for each platform percentage');

        // 3. Crash statistics metrics
        cy.log('Need data-test-id="crash-statistics-new-crashes" for new crashes metric');
        cy.log('Need data-test-id="crash-statistics-reoccured-crashes" for reoccurred crashes metric');
        cy.log('Need data-test-id="crash-statistics-revenue-loss" for revenue loss metric');

        // 4. Filters
        cy.log('Need data-test-id="crashes-crash-filters-label" for crash filters label');
        cy.log('Need data-test-id="crashes-crash-filters-dropdown" for crash filters dropdown');

        // 5. Graph tabs
        cy.log('Need data-test-id="total-occurrences-graph" for total occurrences graph');
        cy.log('Need data-test-id="unique-crashes-graph" for unique crashes graph');
        cy.log('Need data-test-id="crashes-per-session-graph" for crashes per session graph');
        cy.log('Need data-test-id="crashfree-users-graph" for crashfree users graph');
        cy.log('Need data-test-id="crashfree-sessions-graph" for crashfree sessions graph');
    });

    it('should document data-test-ids needed for crash group detail page', function() {
    // Navigate to crashes overview
        cy.get('[data-test-id="sidebar-menuoptions-analytics"]').click();
        cy.get('[data-test-id="sidebar-mainmenu-menutitle-crashes-title-el-collapse-item-label"]').click();
        cy.get('[data-test-id="sidebar-mainmenu-subitem-crash"]').click();

        // The following elements need data-test-ids:

        // 1. Header elements
        cy.log('Need data-test-id="crash-group-header-name" for crash group name');
        cy.log('Need data-test-id="crash-group-header-badge-{index}" for each badge');

        // 2. Action buttons
        cy.log('Need data-test-id="crash-mark-as-button" for mark as button');
        cy.log('Need data-test-id="crash-mark-as-resolved" for resolved option');
        cy.log('Need data-test-id="crash-mark-as-resolving" for resolving option');
        cy.log('Need data-test-id="crash-mark-as-unresolved" for unresolved option');
        cy.log('Need data-test-id="crash-mark-as-hidden" for hidden option');
        cy.log('Need data-test-id="crash-mark-as-shown" for shown option');
        cy.log('Need data-test-id="crash-more-options" for more options button');
        cy.log('Need data-test-id="crash-more-options-view-user-list" for view user list option');
        cy.log('Need data-test-id="crash-more-options-delete" for delete option');

        // 3. Metrics
        cy.log('Need data-test-id="crash-metric-platform" for platform metric');
        cy.log('Need data-test-id="crash-metric-occurrences" for occurrences metric');
        cy.log('Need data-test-id="crash-metric-affected-users" for affected users metric');
        cy.log('Need data-test-id="crash-metric-crash-frequency" for crash frequency metric');
        cy.log('Need data-test-id="crash-metric-latest-app-version" for latest app version metric');

        // 4. Tabs
        cy.log('Need data-test-id="crash-tab-stacktrace" for stacktrace tab');
        cy.log('Need data-test-id="crash-tab-all-threads" for all threads tab');
        cy.log('Need data-test-id="crash-tab-comments" for comments tab');

        // 5. Stacktrace
        cy.log('Need data-test-id="crash-stacktrace-code" for stacktrace code');
        cy.log('Need data-test-id="crash-stacktrace-symbolicated-switch" for symbolicated switch');
        cy.log('Need data-test-id="crash-stacktrace-more-options" for more options button');
        cy.log('Need data-test-id="crash-stacktrace-more-options-symbolicate" for symbolicate option');
        cy.log('Need data-test-id="crash-stacktrace-more-options-upload-symbols" for upload symbols option');
        cy.log('Need data-test-id="crash-stacktrace-more-options-binary-images" for binary images option');
        cy.log('Need data-test-id="crash-stacktrace-more-options-download" for download option');

        // 6. All Threads
        cy.log('Need data-test-id="crash-thread-{index}" for each thread');
        cy.log('Need data-test-id="crash-thread-name-{index}" for each thread name');
        cy.log('Need data-test-id="crash-thread-crashed-badge-{index}" for each crashed badge');
        cy.log('Need data-test-id="crash-thread-content-{index}" for each thread content');

        // 7. Comments
        cy.log('Need data-test-id="crash-comments-count" for comments count');
        cy.log('Need data-test-id="crash-comment-{index}" for each comment');
        cy.log('Need data-test-id="crash-comment-author-{index}" for each comment author');
        cy.log('Need data-test-id="crash-comment-time-{index}" for each comment time');
        cy.log('Need data-test-id="crash-comment-more-options-{index}" for each comment more options');
        cy.log('Need data-test-id="crash-comment-more-options-edit-{index}" for each comment edit option');
        cy.log('Need data-test-id="crash-comment-more-options-delete-{index}" for each comment delete option');
        cy.log('Need data-test-id="crash-comment-text-{index}" for each comment text');
        cy.log('Need data-test-id="crash-comment-input" for comment input');
        cy.log('Need data-test-id="crash-comment-cancel-button" for comment cancel button');
        cy.log('Need data-test-id="crash-comment-save-button" for comment save button');
        cy.log('Need data-test-id="crash-comment-add-button" for comment add button');

        // 8. Mobile diagnostics
        cy.log('Need data-test-id="crash-mobile-diagnostic-{key}" for each mobile diagnostic');
        cy.log('Need data-test-id="crash-mobile-diagnostic-tooltip-{key}" for each mobile diagnostic tooltip');
        cy.log('Need data-test-id="crash-mobile-diagnostic-average-{key}" for each mobile diagnostic average');
        cy.log('Need data-test-id="crash-mobile-diagnostic-min-{key}" for each mobile diagnostic min');
        cy.log('Need data-test-id="crash-mobile-diagnostic-max-{key}" for each mobile diagnostic max');

        // 9. Mobile metrics
        cy.log('Need data-test-id="crash-mobile-metric-root" for root metric');
        cy.log('Need data-test-id="crash-mobile-metric-online" for online metric');
        cy.log('Need data-test-id="crash-mobile-metric-muted" for muted metric');
        cy.log('Need data-test-id="crash-mobile-metric-background" for background metric');

        // 10. Chart
        cy.log('Need data-test-id="crash-chart-by-select" for chart by select');
        cy.log('Need data-test-id="crash-chart-by-option-{value}" for each chart by option');

        // 11. Crash occurrences
        cy.log('Need data-test-id="crash-occurrences-table" for crash occurrences table');
        cy.log('Need data-test-id="crash-occurrences-user-filter" for user filter');
        cy.log('Need data-test-id="crash-occurrences-row-{index}" for each row');
        cy.log('Need data-test-id="crash-occurrences-expand-{index}" for each expand button');
        cy.log('Need data-test-id="crash-occurrences-time-{index}" for each time column');
        cy.log('Need data-test-id="crash-occurrences-os-version-{index}" for each OS version column');
        cy.log('Need data-test-id="crash-occurrences-device-{index}" for each device column');
        cy.log('Need data-test-id="crash-occurrences-app-version-{index}" for each app version column');
        cy.log('Need data-test-id="crash-occurrences-user-{index}" for each user column');
    });

    it('should document data-test-ids needed for binary images view', function() {
    // The following elements need data-test-ids:

        // 1. Header elements
        cy.log('Need data-test-id="binary-images-header-title" for header title');
        cy.log('Need data-test-id="binary-images-crash-name" for crash name');
        cy.log('Need data-test-id="binary-images-app-build" for app build');
        cy.log('Need data-test-id="binary-images-app-version" for app version');
        cy.log('Need data-test-id="binary-images-platform-version" for platform version');

        // 2. Table elements
        cy.log('Need data-test-id="binary-images-table" for binary images table');
        cy.log('Need data-test-id="binary-images-row-{index}" for each row');
        cy.log('Need data-test-id="binary-images-name-{index}" for each name column');
        cy.log('Need data-test-id="binary-images-uuid-{index}" for each UUID column');
        cy.log('Need data-test-id="binary-images-load-address-{index}" for each load address column');
        cy.log('Need data-test-id="binary-images-add-symbol-button-{index}" for each add symbol button');
    });
});