import 'cypress-file-upload';
const helper = require('./helper');
const chai = require('chai');
const expect = chai.expect;

// ─────────────────────────────────────────────
// Soft Assertion Commands
// ─────────────────────────────────────────────

// Initializes the soft assertion error list
Cypress.Commands.add('initSoftAssert', () => {
    cy.wrap([]).as('softErrors');
});

// Collects soft assertion failures without stopping the test
Cypress.Commands.add('softFail', (message) => {
    cy.get('@softErrors', { log: false }).then((errors) => {
        errors.push(message);
        cy.wrap(errors, { log: false }).as('softErrors');
    }).catch(() => {
        // if alias missing → fail immediately
        throw new Error(message);
    });
});

// Safe wrapper to continue test after a failed Cypress command
Cypress.Commands.add('safeCheck', (fn, description = '') => {
    return cy.then(() => {
        return Cypress.Promise.try(() => fn())
            .catch((err) => {
                cy.softFail(`${description} - ${err.message || err}`);
                return null; // test devam eder
            });
    });
});

// Fails the test if there were any collected soft assertion errors
Cypress.Commands.add('assertAll', () => {
    cy.get('@softErrors').then((errors) => {
        if (errors.length > 0) {
            throw new Error(`Soft assertion errors:\n${errors.join('\n')}`);
        }
    });
});

// ─────────────────────────────────────────────
// getElement helper (supports { soft: true })
// ─────────────────────────────────────────────
Cypress.Commands.add('getElement', (selector, parent = null, options = {}) => {
    const { soft = false, timeout = 5000 } = options;
    let finalSelector;

    if (!selector.includes('[data-test-id=')) {
        if (selector.startsWith('.') || selector.startsWith('#')) {
            finalSelector = selector;
        }
        else {
            finalSelector = parent
                ? `${parent} [data-test-id="${selector}"]`
                : `[data-test-id="${selector}"]`;
        }
    }
    else {
        finalSelector = selector;
    }

    if (soft) {
        return cy.get('body', { timeout }).then(($body) => {
            const found = $body.find(finalSelector);
            if (found.length > 0) {
                return cy.wrap(found);
            }
            else {
                cy.softFail(`❌ Element not found: ${finalSelector}`);
                return cy.wrap(Cypress.$([])); // empty set
            }
        });
    }
    else {
        return cy.get(finalSelector, { timeout });
    }
});

// ─────────────────────────────────────────────
// Common Element Commands
// ─────────────────────────────────────────────
Cypress.Commands.add("typeInput", (element, tag) => {
    cy.getElement(element).clear().type(tag);
});

Cypress.Commands.add("typeInputWithIndex", (element, tag, { index = 0, force = false } = {}) => {
    cy.getElement(element)
        .eq(index)
        .clear({ force })
        .type(`${tag}{enter}`, { force });
});

Cypress.Commands.add("clearInput", (element) => {
    cy.getElement(element).clear();
});

Cypress.Commands.add("typeSelectInput", (element, ...tags) => {
    for (var i = 0; i < tags.length; i++) {
        cy.getElement(element).type(tags[i] + '{enter}', { force: true });
    }
    cy.clickBody();
});

Cypress.Commands.add('getText', { prevSubject: true }, (subject) => {
    return cy.wrap(subject).invoke('text');
});

Cypress.Commands.add("clickDataTableMoreButtonItem", (element, rowIndex = 0) => {
    cy.getElement("datatable-more-button-area")
        .eq(rowIndex)
        .invoke('show')
        .trigger('mouseenter', { force: true });

    cy.clickElement(element, true);
});

Cypress.Commands.add("clickElement", (element, isForce = false, index = 0) => {
    cy.getElement(element).eq(index).click({ force: isForce });
    cy.checkPaceRunning();
});

Cypress.Commands.add("clickBody", () => {
    cy.get('body').click({ force: true });
    cy.checkPaceRunning();
});

Cypress.Commands.add('dragAndDropFile', (element, filePath) => {
    cy.getElement(element)
        .attachFile(filePath, {
            encoding: 'utf-8',
            subjectType: 'drag-n-drop'
        });
});

Cypress.Commands.add('uploadFile', (filePath) => {
    cy.get('input[type="file"]').attachFile(filePath, { force: true });
});

// ─────────────────────────────────────────────
// Selectors and Dropdowns
// ─────────────────────────────────────────────
Cypress.Commands.add("selectOption", (element, option) => {
    cy.getElement(element).click();
    cy.clickOption('.el-select-dropdown__item', option);
});

Cypress.Commands.add("selectListBoxItem", (element, item) => {
    cy.getElement(element).click();
    cy.clickOption('.cly-vue-listbox__item-label', item);
});

Cypress.Commands.add("selectCheckboxOption", (element, ...options) => {
    cy.getElement(element).click();
    for (var i = 0; i < options.length; i++) {
        cy.clickOption('.el-checkbox__label', options[i]);
    }

    cy.elementExists(`${element}-select-x-confirm-button`)
        .then((isExists) => {
            if (isExists) {
                cy.clickElement(`${element}-select-x-confirm-button`);
            }
        });

    cy.clickBody();
});

Cypress.Commands.add("clickOption", (element, option) => {
    cy.getElement(element).contains(new RegExp("^" + option + "$", "g")).click({ force: true });
});

Cypress.Commands.add("selectValue", (element, valueText) => {
    cy.getElement(element).then(($select) => {
        cy.wrap($select).find('option').contains(valueText).then(($option) => {
            cy.wrap($option).invoke('val').then((value) => {
                cy.wrap($select).select(value);
            });
        });
    });
});

Cypress.Commands.add("selectColor", (element, colorCode) => {
    cy.clickElement(element);
    cy.get('.vc-input__input')
        .eq(0)
        .invoke('val', colorCode)
        .trigger('input');

    cy.clickElement('.cly-vue-button.button-green-skin');
});

// ─────────────────────────────────────────────
// Assertions and Element Checks
// ─────────────────────────────────────────────
Cypress.Commands.add("shouldTooltipContainText", (element, text) => {
    cy.getElement(element).eq(0).invoke('show').trigger('mouseenter');
    cy.shouldContainText('.tooltip-inner', text);
    cy.getElement(element).eq(0).invoke('show').trigger('mouseleave');
});

Cypress.Commands.add("shouldBeVisible", (element) => {
    cy.getElement(element).should("be.visible");
});

Cypress.Commands.add("shouldBeDisabled", (element) => {
    cy.getElement(element).should("be.disabled");
});

Cypress.Commands.add("shouldNotBeDisabled", (element) => {
    cy.getElement(element).should("not.be.disabled");
});

Cypress.Commands.add("shouldBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"].is-disabled`).should("exist");
});

Cypress.Commands.add("shouldNotBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"].is-disabled`).should("not.exist");
});

Cypress.Commands.add("shouldContainText", (element, text) => {
    cy.getElement(element).should("contain", text);
});

Cypress.Commands.add("shouldNotContainText", (element, text) => {
    cy.getElement(element).eq(0).should("not.contain", text);
});

Cypress.Commands.add("shouldBeEqual", (element, text) => {
    cy.getElement(element).should("equal", text);
});

Cypress.Commands.add("shouldNotBeEqual", (element, text) => {
    cy.getElement(element).invoke('text').then((actualText) => {
        expect(actualText).not.to.equal(text);
    });
});

Cypress.Commands.add("shouldPlaceholderContainText", (element, text) => {
    cy.getElement(element).invoke("attr", "placeholder").should("contain", text);
});

Cypress.Commands.add("shouldDataOriginalTitleContainText", (element, text) => {
    cy.getElement(element).invoke("attr", "data-original-title").should("contain", text);
});

Cypress.Commands.add("shouldHrefContainUrl", (element, url) => {
    cy.getElement(element).invoke("attr", "href").should("contain", url);
});

Cypress.Commands.add("shouldHaveValue", (element, value) => {
    cy.getElement(element).should("have.value", value);
});

Cypress.Commands.add("shouldUrlInclude", (url) => {
    cy.url().should('include', url);
});

// ─────────────────────────────────────────────
// Utility Checks
// ─────────────────────────────────────────────
Cypress.Commands.add('elementExists', (selector) => {
    cy.wait(500);
    if (!selector.includes('[data-test-id=') && (!selector[0].includes('.') || !selector[0].includes('#'))) {
        selector = `[data-test-id="${selector}"]`;
    }

    cy.get('body').then(($body) => {
        return $body.find(selector).length > 0;
    });
});

Cypress.Commands.add('shouldBeExist', (element) => {
    cy.getElement(element).should('exist');
});

Cypress.Commands.add('shouldNotExist', (element) => {
    cy.getElement(element).should('not.exist');
});

Cypress.Commands.add('checkPaceRunning', () => {
    cy.elementExists('.pace-running').then((isExists) => {
        if (isExists) {
            cy.shouldNotExist('.pace-running');
        }
    });
});

Cypress.Commands.add('checkPaceActive', () => {
    cy.elementExists('.pace-active').then((isExists) => {
        if (isExists) {
            cy.shouldNotExist('.pace-active');
        }
    });
});

// ─────────────────────────────────────────────
// Scroll Helpers
// ─────────────────────────────────────────────
Cypress.Commands.add("scrollPageSlightly", (element = '.main-view', index = 0) => {
    cy.get(element).eq(index).then(($el) => {
        const currentScroll = $el[0].scrollTop;
        const newScroll = currentScroll + 550;

        cy.wrap($el).scrollTo(0, newScroll, {
            duration: 1000,
            ensureScrollable: false,
        });
    });
});

Cypress.Commands.add("scrollPageToBottom", (element = '.main-view', index = 0) => {
    cy.get(element).eq(index).scrollTo('bottom', { ensureScrollable: false });
});

Cypress.Commands.add("scrollPageToTop", (element = '.main-view', index = 0) => {
    cy.get(element).eq(index).scrollTo('top', { ensureScrollable: false });
});

Cypress.Commands.add("scrollPageToCenter", (element = '.main-view', index = 0) => {
    cy.get(element).eq(index).scrollTo('center', { ensureScrollable: false });
});

Cypress.Commands.add("scrollDataTableToRight", (element = '.el-table__body-wrapper', index = 0) => {
    cy.get(element).eq(index).scrollTo('right', { ensureScrollable: false });
});

Cypress.Commands.add("scrollDataTableToLeft", (element = '.el-table__body-wrapper', index = 0) => {
    cy.get(element).eq(index).scrollTo('left', { ensureScrollable: false });
});

// ─────────────────────────────────────────────
// verifyElement — Soft Assertion Aware
// ─────────────────────────────────────────────
Cypress.Commands.add('verifyElement', ({
    labelElement,
    labelText,
    tooltipElement,
    tooltipText,
    element,
    isElementVisible = true,
    elementText,
    elementPlaceHolder,
    hrefContainUrl,
    value,
    isChecked,
    isDisabled,
    unVisibleElement,
    selectedIconColor,
    selectedMainColor,
    selectedFontColor,
    attr,
    attrText,
    shouldNot = false
}) => {

    if (!shouldNot) {

        if (labelElement && isElementVisible) {
            cy.safeCheck(() => cy.shouldBeVisible(labelElement), `Label element "${labelElement}" should be visible`);
        }

        if (labelText) {
            cy.safeCheck(() => cy.shouldContainText(labelElement, labelText), `Label text mismatch for "${labelElement}"`);
        }

        if (tooltipElement) {
            cy.safeCheck(() => cy.shouldBeVisible(tooltipElement), `Tooltip element "${tooltipElement}" should be visible`);
        }

        if (tooltipText) {
            cy.safeCheck(() => cy.shouldTooltipContainText(tooltipElement, tooltipText), `Tooltip text mismatch for "${tooltipElement}"`);
        }

        if (element && isElementVisible) {
            cy.safeCheck(() => cy.shouldBeVisible(element), `Element "${element}" should be visible`);
        }

        if (elementText) {
            cy.safeCheck(() => cy.shouldContainText(element, elementText), `Element text mismatch for "${element}"`);
        }

        if (elementPlaceHolder) {
            cy.safeCheck(() => cy.shouldPlaceholderContainText(element, elementPlaceHolder), `Placeholder mismatch for "${element}"`);
        }

        if (hrefContainUrl) {
            cy.safeCheck(() => cy.shouldHrefContainUrl(element, hrefContainUrl), `Href mismatch for "${element}"`);
        }

        if (value) {
            cy.safeCheck(() => cy.shouldHaveValue(element, value), `Value mismatch for "${element}"`);
        }

        if (isChecked != null) {
            const selector = `[data-test-id="${element}"]`;
            if (isChecked) {
                cy.safeCheck(() => cy.shouldBeVisible(selector + '.is-checked'), `Element "${selector}" should be checked`);
            }
            else {
                cy.safeCheck(() => cy.shouldNotExist(selector + '.is-checked'), `Element "${selector}" should not be checked`);
            }
        }

        if (isDisabled != null) {
            if (isDisabled) {
                cy.safeCheck(() => cy.shouldBeDisabled(element), `Element "${element}" should be disabled`);
            }
            else {
                cy.safeCheck(() => cy.shouldNotBeDisabled(element), `Element "${element}" should not be disabled`);
            }
        }

        if (selectedIconColor) {
            const selector = unVisibleElement || element;
            cy.safeCheck(() => {
                cy.getElement(`[data-test-id="${selector}"]`)
                    .invoke('attr', 'style')
                    .should('contain', helper.hexToRgb(selectedIconColor));
            }, `Selected icon color mismatch for "${selector}"`);
        }

        if (selectedFontColor) {
            cy.safeCheck(() => {
                cy.getElement(`[data-test-id="${element}"]`)
                    .invoke('attr', 'style')
                    .should('contain', helper.hexToRgb(selectedFontColor));
            }, `Selected font color mismatch for "${element}"`);
        }

        if (selectedMainColor) {
            cy.safeCheck(() => {
                cy.getElement(`[data-test-id="${element}"]`)
                    .invoke('attr', 'style')
                    .should('contain', helper.hexToRgb(selectedMainColor));
            }, `Selected main color mismatch for "${element}"`);
        }

        if (attr && attrText) {
            cy.safeCheck(() => {
                cy.getElement(`[data-test-id="${element}"]`)
                    .invoke('attr', attr)
                    .should('contain', attrText);
            }, `Attribute "${attr}" mismatch for "${element}"`);
        }

    }
    else {

        if (element && isElementVisible) {
            cy.safeCheck(() => cy.shouldBeVisible(element), `Element "${element}" should be visible`);
            cy.safeCheck(() => cy.shouldNotBeEqual(element, elementText), `Element "${element}" text should not equal "${elementText}"`);
        }

        if (labelElement && isElementVisible) {
            cy.safeCheck(() => cy.shouldBeVisible(labelElement), `Label element "${labelElement}" should be visible`);
            cy.safeCheck(() => cy.shouldNotBeEqual(labelElement, labelText), `Label text should not equal "${labelText}"`);
        }
    }
});

// ─────────────────────────────────────────────
// DB helper
// ─────────────────────────────────────────────
Cypress.Commands.add('dropMongoDatabase', () => {
    cy.exec("mongosh mongodb/countly --eval 'db.dropDatabase()'");
});