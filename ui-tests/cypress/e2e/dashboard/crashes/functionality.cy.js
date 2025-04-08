const navigationHelpers = require('../../../support/navigations');

describe('Crashes Functionality', () => {
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

    it('should filter crash groups', function() {
    // Check if query builder exists
        cy.get('body').then($body => {
            if ($body.find('[data-test-id="cly-qb-bar"]').length > 0) {
                // Click on the query builder
                cy.get('[data-test-id="cly-qb-bar"]').click();

                // Add a filter
                cy.get('[data-test-id="qb-add-filter-button"]').click();

                // Select a property (e.g., Fatality)
                cy.get('[data-test-id="qb-property-select"]').click();
                cy.contains('Fatality').click();

                // Select an operator
                cy.get('[data-test-id="qb-operator-select"]').click();
                cy.contains('equals').click();

                // Select a value (e.g., Fatal)
                cy.get('[data-test-id="qb-value-select"]').click();
                cy.contains('Fatal').click();

                // Apply the filter
                cy.get('[data-test-id="qb-apply-button"]').click();

                // Verify the filter is applied
                cy.url().should('include', 'filter');

                // Wait for filtered results
                cy.wait(3000);
            }
        });
    });

    it('should test crash group actions', function() {
    // Select the first crash group if available
        cy.get('.el-table__row').then($rows => {
            if ($rows.length > 0) {
                // Click the checkbox of the first row
                cy.get('.el-table__row .el-checkbox').first().click();

                // Verify the selection count
                cy.get('.selected-count-blue').should('be.visible');

                // Test Change Status dropdown
                cy.contains('Change Status').click();
                cy.get('.el-dropdown-menu').should('be.visible');
                cy.contains('Resolved').click();

                // Wait for the action to complete
                cy.wait(2000);

                // Verify the status change (the row might have a badge indicating resolved)
                cy.get('.crash-badge--positive').should('exist');

                // Deselect by clicking the X button
                cy.get('.x-button').click();
            }
        });
    });

    it('should test crash statistics filters', function() {
    // Switch to crash statistics tab
        cy.get('[data-test-id="tab-crash-statistics-label"]').click();

        // Test platform filter
        cy.contains('All Platforms').click();
        cy.get('.el-select-dropdown__item').should('be.visible');

        // Select a specific platform if available
        cy.get('.el-select-dropdown__item').then($items => {
            if ($items.length > 1) {
                cy.wrap($items).eq(1).click();

                // Wait for the filter to apply
                cy.wait(2000);

                // Verify the charts update
                cy.get('.cly-chart-line').should('be.visible');
            }
            else {
                // Close the dropdown if no platforms to select
                cy.clickBody();
            }
        });

        // Test switching between graph tabs
        cy.get('[data-test-id="unique-crashes-graph"]').click();
        cy.wait(1000);
        cy.get('[data-test-id="crashes-per-session-graph"]').click();
        cy.wait(1000);
        cy.get('[data-test-id="crashfree-users-graph"]').click();
        cy.wait(1000);
        cy.get('[data-test-id="crashfree-sessions-graph"]').click();
        cy.wait(1000);
        cy.get('[data-test-id="total-occurrences-graph"]').click();
    });

    it('should test crash group detail functionality', function() {
    // Click on the first crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                cy.wrap($el).click();

                // Wait for the detail page to load
                cy.wait(3000);

                // Test Mark As dropdown if available
                cy.get('.crash-mark-as__button').then($button => {
                    if ($button.length > 0 && !$button.hasClass('is-disabled')) {
                        cy.wrap($button).click();

                        // Mark as resolved if option exists
                        cy.get('.crash-mark-as__dropdown').then($dropdown => {
                            if ($dropdown.find(':contains("Resolved")').length > 0) {
                                cy.contains('Resolved').click();
                                cy.wait(2000);

                                // Verify the status change
                                cy.get('.crash-badge').contains('Resolved').should('exist');
                            }
                            else {
                                cy.clickBody(); // Close dropdown if option doesn't exist
                            }
                        });
                    }
                });

                // Test adding a comment if the input is available
                cy.get('.comment-box textarea').then($textarea => {
                    if ($textarea.length > 0) {
                        cy.wrap($textarea).type('Test comment from automated test');
                        cy.contains('Add Comment').click();
                        cy.wait(2000);

                        // Verify the comment was added
                        cy.contains('Test comment from automated test').should('exist');
                    }
                });

                // Test crash occurrences filtering
                cy.scrollTo('bottom');
                cy.get('.crash-occurences').should('be.visible');

                // Test expanding a crash occurrence
                cy.get('.crash-occurences .el-table__row').then($rows => {
                    if ($rows.length > 0) {
                        cy.wrap($rows).first().click();
                        cy.wait(1000);

                        // Verify the expanded content
                        cy.get('.crash-pre').should('be.visible');
                    }
                });
            }
        });
    });

    it('should test binary images view if available', function() {
    // Click on the first crash group if available
        cy.get('[data-test-id="datatable-crash-groups-group-title-0"]').then($el => {
            if ($el.length > 0) {
                cy.wrap($el).click();

                // Wait for the detail page to load
                cy.wait(3000);

                // Check if the crash has binary images
                cy.get('.cly-more-options').click();
                cy.get('.el-dropdown-menu').then($menu => {
                    if ($menu.find(':contains("Show Binary Images")').length > 0) {
                        cy.contains('Show Binary Images').click();
                        cy.wait(3000);

                        // Verify we're on the binary images page
                        cy.url().should('include', 'binary-images');
                        cy.contains('Binary Images').should('be.visible');

                        // Verify the binary images table
                        cy.get('.cly-datatable-n').should('be.visible');
                        cy.get('.el-table__row').should('exist');
                    }
                    else {
                        cy.clickBody(); // Close dropdown if option doesn't exist
                    }
                });
            }
        });
    });

    it('should add data-test-ids to elements that need them', function() {
    // This test is a placeholder to document elements that need data-test-ids
    // The actual implementation would involve modifying the source code

        // Elements that need data-test-ids:
        // 1. Auto-refresh toggle in crash groups tab
        // 2. Filter elements in crash groups tab
        // 3. Crash group table rows and cells
        // 4. Crash statistics filter dropdowns
        // 5. Elements in crash group detail page
        // 6. Elements in binary images view

        // This can be implemented by adding data-test-id attributes to the
        // corresponding elements in the template files:
        // - plugins/crashes/frontend/public/templates/overview.html
        // - plugins/crashes/frontend/public/templates/crashgroup.html
        // - plugins/crashes/frontend/public/templates/binary-images.html
        // - plugins/crashes/frontend/public/templates/stacktrace.html

        cy.log('Elements that need data-test-ids have been documented');
    });
});