/**
 * Helper functions for testing the crashes section
 */

/**
 * Navigates to a specific crash group by index
 * @param {number} index - The index of the crash group to navigate to (0-based)
 */
const navigateToCrashGroup = (index = 0) => {
    cy.get(`[data-test-id="datatable-crash-groups-group-title-${index}"]`).click();
    cy.wait(3000); // Wait for the detail page to load
};

/**
 * Filters crash groups by fatality
 * @param {string} fatality - The fatality to filter by ('Fatal' or 'Non-fatal')
 */
const filterByFatality = (fatality) => {
    // Click on the query builder
    cy.get('[data-test-id="cly-qb-bar"]').click();

    // Add a filter
    cy.get('[data-test-id="qb-add-filter-button"]').click();

    // Select Fatality property
    cy.get('[data-test-id="qb-property-select"]').click();
    cy.contains('Fatality').click();

    // Select equals operator
    cy.get('[data-test-id="qb-operator-select"]').click();
    cy.contains('equals').click();

    // Select the fatality value
    cy.get('[data-test-id="qb-value-select"]').click();
    cy.contains(fatality).click();

    // Apply the filter
    cy.get('[data-test-id="qb-apply-button"]').click();

    // Wait for filtered results
    cy.wait(3000);
};

/**
 * Filters crash groups by resolution status
 * @param {string} status - The status to filter by ('Resolved', 'Resolving', or 'Unresolved')
 */
const filterByResolutionStatus = (status) => {
    // Click on the query builder
    cy.get('[data-test-id="cly-qb-bar"]').click();

    // Add a filter
    cy.get('[data-test-id="qb-add-filter-button"]').click();

    // Select the appropriate property based on status
    cy.get('[data-test-id="qb-property-select"]').click();

    if (status === 'Resolved') {
        cy.contains('Resolved').click();
    }
    else if (status === 'Resolving') {
        cy.contains('Resolving').click();
    }

    // Select equals operator
    cy.get('[data-test-id="qb-operator-select"]').click();
    cy.contains('equals').click();

    // Select the value (true for resolved/resolving, false for unresolved)
    cy.get('[data-test-id="qb-value-select"]').click();
    if (status === 'Unresolved') {
        cy.contains('false').click();
    }
    else {
        cy.contains('true').click();
    }

    // Apply the filter
    cy.get('[data-test-id="qb-apply-button"]').click();

    // Wait for filtered results
    cy.wait(3000);
};

/**
 * Selects a crash group by index
 * @param {number} index - The index of the crash group to select (0-based)
 */
const selectCrashGroup = (index = 0) => {
    cy.get('.el-table__row .el-checkbox').eq(index).click();
};

/**
 * Marks selected crash groups with a specific status
 * @param {string} status - The status to set ('resolved', 'resolving', 'unresolved', 'hide', 'show')
 */
const markSelectedAs = (status) => {
    // Click on the Change Status dropdown
    cy.contains('Change Status').click();

    // Select the appropriate status
    if (status === 'resolved') {
        cy.contains('Resolved').click();
    }
    else if (status === 'resolving') {
        cy.contains('Resolving').click();
    }
    else if (status === 'unresolved') {
        cy.contains('Unresolved').click();
    }

    // Wait for the action to complete
    cy.wait(2000);
};

/**
 * Changes the visibility of selected crash groups
 * @param {string} visibility - The visibility to set ('show' or 'hide')
 */
const changeVisibility = (visibility) => {
    // Click on the Change Visibility dropdown
    cy.contains('Change Visibility').click();

    // Select the appropriate visibility
    if (visibility === 'show') {
        cy.contains('View').click();
    }
    else if (visibility === 'hide') {
        cy.contains('Hide').click();
    }

    // Wait for the action to complete
    cy.wait(2000);
};

/**
 * Switches to a specific tab in the crash statistics view
 * @param {string} tab - The tab to switch to ('total-occurrences', 'unique-crashes', 'crashes-per-session', 'crashfree-users', 'crashfree-sessions')
 */
const switchStatisticsTab = (tab) => {
    cy.get(`[data-test-id="${tab}-graph"]`).click();
    cy.wait(1000);
};

/**
 * Filters crash statistics by platform
 * @param {string} platform - The platform to filter by, or 'all' for all platforms
 */
const filterStatisticsByPlatform = (platform) => {
    // Click on the platform filter
    cy.contains('All Platforms').click();

    // Select the specified platform
    if (platform === 'all') {
        cy.contains('All Platforms').click();
    }
    else {
        cy.contains(platform).click();
    }

    // Wait for the filter to apply
    cy.wait(2000);
};

/**
 * Adds a comment to a crash group
 * @param {string} comment - The comment text to add
 */
const addComment = (comment) => {
    // Click on the Comments tab if not already active
    cy.contains('Comments').click();

    // Type the comment
    cy.get('.comment-box textarea').type(comment);

    // Click the Add Comment button
    cy.contains('Add Comment').click();

    // Wait for the comment to be added
    cy.wait(2000);
};

/**
 * Marks a crash group with a specific status from the detail page
 * @param {string} status - The status to set ('resolved', 'resolving', 'unresolved', 'hidden', 'shown')
 */
const markCrashGroupAs = (status) => {
    // Click on the Mark As dropdown
    cy.get('.crash-mark-as__button').click();

    // Select the appropriate status
    if (status === 'resolved') {
        cy.contains('Resolved').click();
    }
    else if (status === 'resolving') {
        cy.contains('Resolving').click();
    }
    else if (status === 'unresolved') {
        cy.contains('Unresolved').click();
    }
    else if (status === 'hidden') {
        cy.contains('Hidden').click();
    }
    else if (status === 'shown') {
        cy.contains('Shown').click();
    }

    // Wait for the action to complete
    cy.wait(2000);
};

/**
 * Navigates to the binary images view for a crash
 */
const navigateToBinaryImages = () => {
    // Click on the More Options dropdown
    cy.get('.cly-more-options').click();

    // Click on Show Binary Images
    cy.contains('Show Binary Images').click();

    // Wait for the binary images page to load
    cy.wait(3000);
};

/**
 * Verifies the crash group detail elements
 */
const verifyCrashGroupDetailElements = () => {
    // Verify header elements
    cy.get('.crashes-crashgroup-header__name').should('be.visible');
    cy.get('.crash-badge').should('exist');

    // Verify tabs
    cy.contains('Stacktrace').should('be.visible');
    cy.contains('Comments').should('be.visible');

    // Verify crash metrics section
    cy.contains('Platform').should('be.visible');
    cy.contains('Occurrences').should('be.visible');
    cy.contains('Affected Users').should('be.visible');
    cy.contains('Crash Frequency').should('be.visible');
    cy.contains('Latest App Version').should('be.visible');

    // Verify crash occurrences section
    cy.contains('Crash Occurences').should('be.visible');
};

/**
 * Verifies the crash statistics elements
 */
const verifyCrashStatisticsElements = () => {
    // Verify metrics
    cy.get('[data-test-id="affected-user"]').should('be.visible');
    cy.get('[data-test-id="resolution-status"]').should('be.visible');
    cy.get('[data-test-id="crash-fatality"]').should('be.visible');

    // Verify top platforms section
    cy.get('[data-test-id="crash-statistics-top-platforms-label"]').should('be.visible');

    // Verify crash statistics metrics
    cy.get('[data-test-id="crash-statistics-new-crashes"]').should('be.visible');
    cy.get('[data-test-id="crash-statistics-reoccured-crashes"]').should('be.visible');
    cy.get('[data-test-id="crash-statistics-revenue-loss"]').should('be.visible');

    // Verify crash filters
    cy.get('[data-test-id="crashes-crash-filters-label"]').should('be.visible');

    // Verify graph tabs
    cy.get('[data-test-id="total-occurrences-graph"]').should('be.visible');
    cy.get('[data-test-id="unique-crashes-graph"]').should('be.visible');
    cy.get('[data-test-id="crashes-per-session-graph"]').should('be.visible');
    cy.get('[data-test-id="crashfree-users-graph"]').should('be.visible');
    cy.get('[data-test-id="crashfree-sessions-graph"]').should('be.visible');
};

module.exports = {
    navigateToCrashGroup,
    filterByFatality,
    filterByResolutionStatus,
    selectCrashGroup,
    markSelectedAs,
    changeVisibility,
    switchStatisticsTab,
    filterStatisticsByPlatform,
    addComment,
    markCrashGroupAs,
    navigateToBinaryImages,
    verifyCrashGroupDetailElements,
    verifyCrashStatisticsElements
};