import 'cypress-file-upload';
const helper = require('./helper');
const chai = require('chai');
const expect = chai.expect;

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
        .eq(rowIndex).invoke('show')
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

    cy
        .elementExists(`${element}-select-x-confirm-button`)
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

Cypress.Commands.add("shouldTooltipContainText", (element, text) => {
    cy.getElement(element)
        .eq(0).invoke('show')
        .trigger('mouseenter');

    cy.shouldContainText('.tooltip-inner', text);

    cy.getElement(element)
        .eq(0).invoke('show')
        .trigger('mouseleave');
});

Cypress.Commands.add("shouldBeVisible", (element) => {
    cy.getElement(element).should("be.visible");
});

Cypress.Commands.add("shouldBeDisabled", (element) => {
    cy.getElement(element).should("be.disabled");
});

Cypress.Commands.add("shouldBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"].is-disabled`).should("exist");
});

Cypress.Commands.add("shouldNotBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"].is-disabled`).should("not.exist");
});

Cypress.Commands.add("shouldNotBeDisabled", (element) => {
    cy.getElement(element).should("not.be.disabled");
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

Cypress.Commands.add('elementExists', (selector) => {

    cy.wait(500);
    if (!selector.includes('[data-test-id=') && (!selector[0].includes('.') || !selector[0].includes('#'))) {
        selector = `[data-test-id="${selector}"]`;
    }

    cy
        .get('body')
        .then(($body) => {
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
    cy
        .elementExists('.pace-running')
        .then((isExists) => {
            if (isExists) {
                cy.shouldNotExist('.pace-running');
            }
        });
});

Cypress.Commands.add('checkPaceActive', () => {
    cy
        .elementExists('.pace-active')
        .then((isExists) => {
            if (isExists) {
                cy.shouldNotExist('.pace-active');
            }
        });
});

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

Cypress.Commands.add('verifyElement', (options) => {
    const {
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
    } = options;

    const safeCheck = (fn, description) => {
        try {
            fn();
        } catch (err) {
            cy.softFail(`${description} - ${err.message}`);
        }
    };

    if (!shouldNot) {
        if (labelElement != null && isElementVisible === true) {
            safeCheck(() => cy.getElement(labelElement, null, { soft: true }).should("be.visible"), `Element not visible: ${labelElement}`);
        }

        if (labelText != null) {
            safeCheck(() => cy.getElement(labelElement, null, { soft: true }).should("contain", labelText), `Label text mismatch: ${labelElement}`);
        }

        if (tooltipElement != null) {
            safeCheck(() => cy.getElement(tooltipElement, null, { soft: true }).should("be.visible"), `Tooltip not visible: ${tooltipElement}`);
        }

        if (tooltipText != null) {
            safeCheck(() => cy.shouldTooltipContainText(tooltipElement, tooltipText), `Tooltip text mismatch`);
        }

        if (element != null && isElementVisible === true) {
            safeCheck(() => cy.getElement(element, null, { soft: true }).should("be.visible"), `Element not visible: ${element}`);
        }

        if (elementText != null) {
            safeCheck(() => cy.getElement(element, null, { soft: true }).should("contain", elementText), `Element text mismatch: ${element}`);
        }

        if (elementPlaceHolder != null) {
            safeCheck(() => cy.getElement(element, null, { soft: true }).invoke("attr", "placeholder").should("contain", elementPlaceHolder), `Placeholder mismatch: ${element}`);
        }

        if (hrefContainUrl != null) {
            safeCheck(() => cy.getElement(element, null, { soft: true }).invoke("attr", "href").should("contain", hrefContainUrl), `Href mismatch: ${element}`);
        }

        if (value != null) {
            safeCheck(() => cy.getElement(element, null, { soft: true }).should("have.value", value), `Value mismatch: ${element}`);
        }

        if (isChecked != null) {
            safeCheck(() => {
                isChecked
                    ? cy.getElement(`${element}.is-checked`, null, { soft: true }).should('exist')
                    : cy.getElement(`${element}.is-checked`, null, { soft: true }).should('not.exist');
            }, `Checkbox state mismatch: ${element}`);
        }

        if (isDisabled != null) {
            safeCheck(() => {
                isDisabled
                    ? cy.getElement(element, null, { soft: true }).should("be.disabled")
                    : cy.getElement(element, null, { soft: true }).should("not.be.disabled");
            }, `Disabled state mismatch: ${element}`);
        }

        if (selectedIconColor != null) {
            safeCheck(() => {
                const selector = unVisibleElement ?? element;
                cy.getElement(selector, null, { soft: true })
                    .invoke('attr', 'style')
                    .should('contain', helper.hexToRgb(selectedIconColor));
            }, `Icon color mismatch: ${element}`);
        }

        if (selectedFontColor != null) {
            safeCheck(() => {
                cy.getElement(element, null, { soft: true })
                    .invoke('attr', 'style')
                    .should('contain', helper.hexToRgb(selectedFontColor));
            }, `Font color mismatch: ${element}`);
        }

        if (selectedMainColor != null) {
            safeCheck(() => {
                cy.getElement(element, null, { soft: true })
                    .invoke('attr', 'style')
                    .should('contain', helper.hexToRgb(selectedMainColor));
            }, `Main color mismatch: ${element}`);
        }

        if (attr != null && attrText != null) {
            safeCheck(() => {
                cy.getElement(element, null, { soft: true })
                    .invoke('attr', attr)
                    .should('contain', attrText);
            }, `Attribute mismatch: ${element}`);
        }
    } else {
        if (element != null && isElementVisible === true) {
            safeCheck(() => {
                cy.getElement(element, null, { soft: true }).should("be.visible");
                cy.getElement(element, null, { soft: true }).should("not.contain", elementText);
            }, `Negative assertion failed: ${element}`);
        }

        if (labelElement != null && isElementVisible === true) {
            safeCheck(() => {
                cy.getElement(labelElement, null, { soft: true }).should("be.visible");
                cy.getElement(labelElement, null, { soft: true }).should("not.contain", labelText);
            }, `Negative assertion failed: ${labelElement}`);
        }
    }
});

// Soft assert setup
// initializes the error list at the beginning of a new test.
Cypress.Commands.add('initSoftAssert', () => {
    cy.wrap([]).as('softErrors');
});

// collects soft assertion failures without failing the test immediately.
Cypress.Commands.add('softFail', (message) => {
    cy.get('@softErrors').then((errors) => {
        errors.push(message);
        cy.wrap(errors).as('softErrors');
    });
});

// checks if there were any soft assertion failures and fails the test if there were.
Cypress.Commands.add('assertAll', () => {
    cy.get('@softErrors').then((errors) => {
        if (errors.length > 0) {
            throw new Error(`Soft assertion errors:\n${errors.join('\n')}`);
        }
    });
});

Cypress.Commands.add('dropMongoDatabase', () => {
    cy.exec("mongosh mongodb/countly --eval 'db.dropDatabase()'");
});

Cypress.Commands.overwrite('getElement', (originalFn, selector, parent = null, options = {}) => {
    const { soft = false, timeout = 5000 } = options;
    let finalSelector;

    if (!selector.includes('[data-test-id=')) {
        if (selector[0].includes('.') || selector[0].includes('#')) {
            finalSelector = selector;
        } else {
            finalSelector = parent
                ? `${parent} [data-test-id="${selector}"]`
                : `[data-test-id="${selector}"]`;
        }
    } else {
        finalSelector = selector;
    }

    if (soft) {
        return cy.get('body', { timeout }).then(($body) => {
            const found = $body.find(finalSelector);
            if (found.length > 0) {
                return cy.wrap(found);
            } else {
                cy.softFail(`❌ Element not found: ${finalSelector}`);
                return cy.wrap(Cypress.$([]));
            }
        });
    } else {
        return originalFn(finalSelector, { timeout });
    }
});