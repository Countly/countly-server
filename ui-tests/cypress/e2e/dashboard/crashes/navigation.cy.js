const navigationHelpers = require('../../../support/navigations');

describe('Crashes Navigation', () => {
    beforeEach(function() {
    // Visit the dashboard with the token URL
        cy.visit('https://arturs.count.ly/login/token/b0c1003d74ceb45e5b8469c72421fa6ab21d7abc');

        // Wait for the dashboard to load (longer wait as requested)
        cy.wait(10000);

        // Verify we're on the dashboard
        cy.url().should('include', '/dashboard');
    });

    it('should navigate to crashes overview and verify UI elements', function() {
    // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Verify we're on the crashes page
        cy.url().should('include', '/crashes');

        // Add data-test-id to the crash groups tab
        cy.get('[data-test-id="tab-crash-groups-label"]').should('be.visible');
        cy.get('[data-test-id="tab-crash-statistics-label"]').should('be.visible');

        // Verify crash groups table is visible
        cy.get('[data-test-id="crash-groups"]').should('be.visible');

        // Verify auto-refresh toggle is present
        cy.get('[data-test-id="crash-groups-auto-refresh-toggle"]').should('exist');
    });

    it('should switch to crash statistics tab and verify charts', function() {
    // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Switch to crash statistics tab
        cy.get('[data-test-id="tab-crash-statistics-label"]').click();

        // Verify statistics elements
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
    });

    it('should navigate to a crash group detail page', function() {
    // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Wait for crash groups to load
        cy.wait(5000);

        // Click on the first crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                cy.wrap($el).click();

                // Verify we're on the crash group detail page
                cy.url().should('include', '/crashes/');

                // Verify crash group detail elements
                cy.get('.crashes-crashgroup-header__name').should('be.visible');

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
            }
        });
    });

    it('should test crash group detail tabs', function() {
    // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Wait for crash groups to load
        cy.wait(5000);

        // Click on the first crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                cy.wrap($el).click();

                // Verify stacktrace tab
                cy.contains('Stacktrace').should('be.visible');
                cy.get('.crash-stacktrace__code').should('be.visible');

                // Check if All Threads tab exists and click it if it does
                cy.contains('All Threads').then($threads => {
                    if ($threads.length > 0) {
                        cy.wrap($threads).click();
                        cy.get('.el-collapse-item').should('exist');
                    }
                });

                // Click on Comments tab
                cy.contains('Comments').click();

                // Verify comments section
                cy.get('.comment-box').should('be.visible');

                // Verify crash metrics chart
                cy.contains('Crash Occurences').should('be.visible');
                cy.get('.cly-chart-bar').should('be.visible');
            }
        });
    });

    it('should test crash group actions', function() {
    // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Wait for crash groups to load
        cy.wait(5000);

        // Click on the first crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                cy.wrap($el).click();

                // Test Mark As dropdown if user has permissions
                cy.get('.crash-mark-as__button').then($button => {
                    if ($button.length > 0 && !$button.hasClass('is-disabled')) {
                        cy.wrap($button).click();
                        cy.get('.crash-mark-as__dropdown').should('be.visible');
                        cy.clickBody(); // Close dropdown
                    }
                });

                // Test More Options dropdown
                cy.get('.cly-more-options').click();
                cy.get('.el-dropdown-menu').should('be.visible');
                cy.clickBody(); // Close dropdown
            }
        });
    });

    it('should test crash occurrences table', function() {
    // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Wait for crash groups to load
        cy.wait(5000);

        // Click on the first crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                cy.wrap($el).click();

                // Scroll to crash occurrences section
                cy.contains('Crash Occurences').scrollIntoView();

                // Verify crash occurrences table
                cy.get('.crash-occurences .cly-datatable-n').should('be.visible');

                // Click on the first row to expand it if available
                cy.get('.crash-occurences .el-table__row').then($rows => {
                    if ($rows.length > 0) {
                        cy.wrap($rows).first().click();

                        // Verify expanded content
                        cy.get('.crash-pre').should('be.visible');
                        cy.get('.crash-stacktrace').should('be.visible');
                    }
                });
            }
        });
    });
});