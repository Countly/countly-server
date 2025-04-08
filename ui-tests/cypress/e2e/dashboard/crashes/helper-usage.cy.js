const navigationHelpers = require('../../../support/navigations');
const crashesHelpers = require('../../../lib/dashboard/crashes/crashes');

describe('Crashes Helper Usage', () => {
    beforeEach(function() {
    // Visit the dashboard with the token URL
        cy.visit('https://arturs.count.ly/login/token/b0c1003d74ceb45e5b8469c72421fa6ab21d7abc');

        // Wait for the dashboard to load (longer wait as requested)
        cy.wait(10000);

        // Verify we're on the dashboard
        cy.url().should('include', '/dashboard');

        // Navigate to crashes overview
        navigationHelpers.goToCrashesOverviewPage();

        // Wait for crash groups to load
        cy.wait(5000);
    });

    it('should navigate through crash groups using helpers', function() {
    // Verify crash groups elements
        cy.get('[data-test-id="crash-groups"]').should('be.visible');

        // Navigate to a crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                // Use the helper to navigate to the first crash group
                crashesHelpers.navigateToCrashGroup(0);

                // Verify crash group detail elements using the helper
                crashesHelpers.verifyCrashGroupDetailElements();

                // Go back to the crashes overview
                navigationHelpers.goToCrashesOverviewPage();
            }
        });
    });

    it('should filter crash groups using helpers', function() {
    // Check if query builder exists
        cy.get('body').then($body => {
            if ($body.find('[data-test-id="cly-qb-bar"]').length > 0) {
                // Use the helper to filter by fatality
                crashesHelpers.filterByFatality('Fatal');

                // Verify the filter is applied
                cy.url().should('include', 'filter');

                // Wait for filtered results
                cy.wait(3000);

                // Go back to the crashes overview
                navigationHelpers.goToCrashesOverviewPage();
                cy.wait(3000);

                // Use the helper to filter by resolution status
                crashesHelpers.filterByResolutionStatus('Resolved');

                // Verify the filter is applied
                cy.url().should('include', 'filter');
            }
        });
    });

    it('should perform actions on crash groups using helpers', function() {
    // Check if there are crash groups
        cy.get('.el-table__row').then($rows => {
            if ($rows.length > 0) {
                // Use the helper to select the first crash group
                crashesHelpers.selectCrashGroup(0);

                // Verify the selection count
                cy.get('.selected-count-blue').should('be.visible');

                // Use the helper to mark selected crash groups as resolved
                crashesHelpers.markSelectedAs('resolved');

                // Verify the status change (the row might have a badge indicating resolved)
                cy.get('.crash-badge--positive').should('exist');
            }
        });
    });

    it('should test crash statistics using helpers', function() {
    // Switch to crash statistics tab
        cy.get('[data-test-id="tab-crash-statistics-label"]').click();

        // Verify crash statistics elements using the helper
        crashesHelpers.verifyCrashStatisticsElements();

        // Use the helper to switch between graph tabs
        crashesHelpers.switchStatisticsTab('unique-crashes');
        crashesHelpers.switchStatisticsTab('crashes-per-session');
        crashesHelpers.switchStatisticsTab('crashfree-users');
        crashesHelpers.switchStatisticsTab('crashfree-sessions');
        crashesHelpers.switchStatisticsTab('total-occurrences');

        // Use the helper to filter by platform if available
        cy.get('body').then($body => {
            if ($body.find('.el-select-dropdown__item').length > 1) {
                crashesHelpers.filterStatisticsByPlatform('Android');
            }
        });
    });

    it('should test crash group detail functionality using helpers', function() {
    // Check if there are crash groups
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                // Use the helper to navigate to the first crash group
                crashesHelpers.navigateToCrashGroup(0);

                // Use the helper to mark the crash group as resolved if possible
                cy.get('.crash-mark-as__button').then($button => {
                    if ($button.length > 0 && !$button.hasClass('is-disabled')) {
                        crashesHelpers.markCrashGroupAs('resolved');

                        // Verify the status change
                        cy.get('.crash-badge').contains('Resolved').should('exist');
                    }
                });

                // Use the helper to add a comment if possible
                cy.get('.comment-box textarea').then($textarea => {
                    if ($textarea.length > 0) {
                        crashesHelpers.addComment('Test comment using helper function');

                        // Verify the comment was added
                        cy.contains('Test comment using helper function').should('exist');
                    }
                });

                // Check if the crash has binary images
                cy.get('.cly-more-options').click();
                cy.get('.el-dropdown-menu').then($menu => {
                    if ($menu.find(':contains("Show Binary Images")').length > 0) {
                        // Use the helper to navigate to binary images
                        crashesHelpers.navigateToBinaryImages();

                        // Verify we're on the binary images page
                        cy.url().should('include', 'binary-images');
                    }
                    else {
                        cy.clickBody(); // Close dropdown if option doesn't exist
                    }
                });
            }
        });
    });
});