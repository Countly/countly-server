import 'cypress-file-upload';
const helper = require('./helper');
let softErrors = [];

/* ---------------- Soft Assertions ---------------- */

Cypress.Commands.add("softAssert", (condition, errorMessage) => {
    if (!condition) {
        const testName = Cypress.currentTest.title || "Unknown Test";
        cy.url().then((url) => {
            softErrors.push(`Test: "${testName}"\nURL: ${url}\n${errorMessage}`);
        });
    }
});

Cypress.Commands.add("assertAll", () => {
    if (softErrors.length > 0) {
        const formatted = softErrors
            .map((err, idx) => `--------------------\n#${idx + 1}\n${err}\n--------------------`)
            .join("\n");

        const totalErrors = softErrors.length;
        softErrors = [];

        throw new Error(`Soft Assertion Failures (Total: ${totalErrors}):\n${formatted}`);
    }
});

/* ---------------- Element Get Helper ---------------- */

Cypress.Commands.add('getElement', (selector, parent = null) => {
    if (!selector.includes('[data-test-id=')) {

        if (selector.startsWith('.') || selector.startsWith('#')) {

            return cy.get(selector, { timeout: 0 }).then($el => {
                if ($el.length === 0) {
                    cy.softAssert(false, `Element not found: "${selector}"`);
                    return null; // allow test to continue
                }
                return cy.wrap($el);
            });
        }

        selector = parent
            ? `${parent} [data-test-id="${selector}"]`
            : `[data-test-id="${selector}"]`;
    }

    // Safe get logic
    return cy.get('body').then($body => {
        const found = $body.find(selector);

        if (found.length === 0) {
            cy.softAssert(false, `Element not found: "${selector}"`);
            return null; // continue test
        }

        return cy.get(selector); // return real Cypress chain
    });
});

/* ---------------- Input Helpers ---------------- */

Cypress.Commands.add("typeInput", (element, text) => cy.getElement(element).clear().type(text));

Cypress.Commands.add("typeInputWithIndex", (element, text, { index = 0, force = false } = {}) => {
    cy.getElement(element).eq(index).clear({ force }).type(`${text}{enter}`, { force });
});

Cypress.Commands.add("clearInput", (element) => cy.getElement(element).clear());

Cypress.Commands.add("typeSelectInput", (element, ...tags) => {
    tags.forEach(tag => cy.getElement(element).type(`${tag}{enter}`, { force: true }));
    cy.clickBody();
});

/* ---------------- Click & Select Helpers ---------------- */

Cypress.Commands.add("clickElement", (element, isForce = false, index = 0) => {
    cy.getElement(element).eq(index).click({ force: isForce });
    cy.checkPaceRunning();
});

Cypress.Commands.add("clickBody", () => {
    cy.get('body').click({ force: true });
    cy.checkPaceRunning();
});

Cypress.Commands.add("clickOption", (element, option) => {
    cy.getElement(element).contains(new RegExp("^" + option + "$", "g")).click({ force: true });
});

Cypress.Commands.add("clickDataTableMoreButtonItem", (element, rowIndex = 0) => {
    cy.getElement("datatable-more-button-area").eq(rowIndex).invoke('show').trigger('mouseenter', { force: true });
    cy.clickElement(element, true);
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
    options.forEach(opt => cy.clickOption('.el-checkbox__label', opt));

    cy.elementExists(`${element}-select-x-confirm-button`).then(isExists => {
        if (isExists) {
            cy.clickElement(`${element}-select-x-confirm-button`);
        }
    });

    cy.clickBody();
});

Cypress.Commands.add("selectValue", (element, valueText) => {
    cy.getElement(element).then($select => {
        cy.wrap($select).find('option').contains(valueText).invoke('val').then(val => {
            cy.wrap($select).select(val);
        });
    });
});

Cypress.Commands.add("selectColor", (element, colorCode) => {
    cy.clickElement(element);
    cy.get('.vc-input__input').eq(0).invoke('val', colorCode).trigger('input');
    cy.clickElement('.cly-vue-button.button-green-skin');
});

/* ---------------- File Helpers ---------------- */

Cypress.Commands.add('dragAndDropFile', (element, filePath) => {
    cy.getElement(element).attachFile(filePath, { encoding: 'utf-8', subjectType: 'drag-n-drop' });
});

Cypress.Commands.add('uploadFile', (filePath) => {
    cy.get('input[type="file"]').attachFile(filePath, { force: true });
});

/* ---------------- Soft Assertions for Element Values ---------------- */

Cypress.Commands.add("shouldContainText", (selector, expected) => {
    cy.getElement(selector).then($el => {
        if (!$el) {
            return;
        }

        const actual = $el.text().trim();
        cy.softAssert(actual.includes(expected), `Element: "${selector}"\nExpected to contain: "${expected}"\nActual value: "${actual}"`);
    });
});

Cypress.Commands.add("shouldNotContainText", (selector, expected) => {
    cy.getElement(selector).then($el => {
        if (!$el) {
            return;
        }

        const actual = $el.text().trim();
        cy.softAssert(!actual.includes(expected), `Element: "${selector}"\nExpected NOT to contain: "${expected}"\nActual value: "${actual}"`);
    });
});

Cypress.Commands.add("shouldBeEqual", (selector, expected) => {
    cy.getElement(selector).then($el => {
        if (!$el) {
            return;
        }

        const actual = $el.text().trim();
        cy.softAssert(actual === expected, `Element: "${selector}"\nExpected to be equal: "${expected}"\nActual value: "${actual}"`);
    });
});

Cypress.Commands.add("shouldNotBeEqual", (selector, expected) => {
    cy.getElement(selector).then($el => {
        if (!$el) {
            return;
        }

        const actual = $el.text().trim();
        cy.softAssert(actual !== expected, `Element: "${selector}"\nExpected NOT to be equal: "${expected}"\nActual value: "${actual}"`);
    });
});

Cypress.Commands.add("shouldPlaceholderContainText", (selector, expected) => {
    cy.getElement(selector).invoke("attr", "placeholder").then(actual => {
        cy.softAssert(actual && actual.includes(expected), `Element: "${selector}"\nExpected placeholder to contain: "${expected}"\nActual value: "${actual}"`);
    });
});

Cypress.Commands.add("shouldDataOriginalTitleContainText", (selector, expected) => {
    cy.getElement(selector).invoke("attr", "data-original-title").then(actual => {
        cy.softAssert(actual && actual.includes(expected), `Element: "${selector}"\nExpected data-original-title to contain: "${expected}"\nActual value: "${actual}"`);
    });
});

Cypress.Commands.add("shouldHrefContainUrl", (selector, expected) => {
    cy.getElement(selector).invoke("attr", "href").then(actual => {
        cy.softAssert(actual && actual.includes(expected), `Element: "${selector}"\nExpected href to contain: "${expected}"\nActual value: "${actual}"`);
    });
});

/* ---------------- Visibility & Disabled (Soft Assert) ---------------- */

Cypress.Commands.add("shouldBeVisible", (element) => {
    cy.getElement(element).then($el => {
        if (!$el) {
            return;
        }

        const isVisible = $el.is(":visible");
        cy.softAssert(
            isVisible,
            `Element: "${element}"\nExpected: visible\nActual: not visible`
        );
    });
});

Cypress.Commands.add("shouldBeDisabled", (element) => {
    cy.getElement(element).then($el => {
        if (!$el) {
            return;
        }

        const isDisabled = $el.is(":disabled");
        cy.softAssert(
            isDisabled,
            `Element: "${element}"\nExpected: disabled\nActual: enabled`
        );
    });
});

Cypress.Commands.add("shouldNotBeDisabled", (element) => {
    cy.getElement(element).then($el => {
        if (!$el) {
            return;
        }

        const isDisabled = $el.is(":disabled");
        cy.softAssert(
            !isDisabled,
            `Element: "${element}"\nExpected: enabled\nActual: disabled`
        );
    });
});


Cypress.Commands.add("shouldBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"]`).then($el => {
        if (!$el) {
            return;
        }

        const hasClass = $el.hasClass("is-disabled");
        cy.softAssert(
            hasClass,
            `Element: "${element}"\nExpected: has class "is-disabled"\nActual: does NOT have class`
        );
    });
});

Cypress.Commands.add("shouldNotBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"]`).then($el => {
        if (!$el) {
            return;
        }

        const hasClass = $el.hasClass("is-disabled");
        cy.softAssert(
            !hasClass,
            `Element: "${element}"\nExpected: NOT to have class "is-disabled"\nActual: class found`
        );
    });
});

/* ---------------- Tooltip ---------------- */

Cypress.Commands.add("shouldTooltipContainText", (element, expectedText) => {
    cy.getElement(element).eq(0).invoke('show').trigger('mouseenter');
    cy.wait(500);

    cy.getElement('.tooltip-inner:visible').then($tooltip => {
        if (!$tooltip) {
            return;
        }

        const actualText = $tooltip.text().trim();
        cy.softAssert(actualText.includes(expectedText), `Tooltip Element: "${element}"\nExpected to contain: "${expectedText}"\nActual value: "${actualText}"`);
    });

    cy.getElement(element).eq(0).invoke('show').trigger('mouseleave');
});

/* ---------------- Page & Table Scroll ---------------- */

Cypress.Commands.add("scrollPageSlightly", (element = '.main-view', index = 0) => {
    cy.get(element).eq(index).then($el => cy.wrap($el).scrollTo(0, $el[0].scrollTop + 550, { duration: 1000, ensureScrollable: false }));
});

["scrollPageToBottom", "scrollPageToTop", "scrollPageToCenter"].forEach(method => {
    Cypress.Commands.add(method, (element = '.main-view', index = 0) => cy.get(element).eq(index).scrollTo(method.replace('scrollPageTo', '').toLowerCase(), { ensureScrollable: false }));
});

["scrollDataTableToRight", "scrollDataTableToLeft"].forEach(method => {
    Cypress.Commands.add(method, (element = '.el-table__body-wrapper', index = 0) => cy.get(element).eq(index).scrollTo(method.includes('Right') ? 'right' : 'left', { ensureScrollable: false }));
});

/* ---------------- Misc Helpers ---------------- */

Cypress.Commands.add("shouldHaveValue", (element, value) => cy.getElement(element).should("have.value", value));

Cypress.Commands.add("shouldUrlInclude", (url) => cy.url().should('include', url));

Cypress.Commands.add('elementExists', (selector) => {
    cy.wait(500);
    if (!selector.includes('[data-test-id=') && (!selector[0].includes('.') || !selector[0].includes('#'))) {
        selector = `[data-test-id="${selector}"]`;
    }
    return cy.get('body').then($body => $body.find(selector).length > 0);
});

Cypress.Commands.add('shouldBeExist', (element) => cy.getElement(element).should('exist'));

Cypress.Commands.add('shouldNotExist', (element) => cy.getElement(element).should('not.exist'));

Cypress.Commands.add('checkPaceRunning', () => cy.elementExists('.pace-running').then(isExists => {
    if (isExists) {
        cy.shouldNotExist('.pace-running');
    }
}));

Cypress.Commands.add('checkPaceActive', () => cy.elementExists('.pace-active').then(isExists => {
    if (isExists) {
        cy.shouldNotExist('.pace-active');
    }
}));

/* ---------------- Database ---------------- */

Cypress.Commands.add('dropMongoDatabase', () => cy.exec("mongosh mongodb/countly --eval 'db.dropDatabase()'"));

/* ---------------- Verify Element Helper ---------------- */

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

        if (labelElement != null && isElementVisible === true) {
            cy.shouldBeVisible(labelElement);
        }

        if (labelText != null) {
            cy.shouldContainText(labelElement, labelText);
        }

        if (tooltipElement != null) {
            cy.shouldBeVisible(tooltipElement);
        }

        if (tooltipText != null) {
            cy.shouldTooltipContainText(tooltipElement, tooltipText);
        }

        if (element != null && isElementVisible === true) {
            cy.shouldBeVisible(element);
        }

        if (elementText != null) {
            cy.shouldContainText(element, elementText);
        }

        if (elementPlaceHolder != null) {
            cy.shouldPlaceholderContainText(element, elementPlaceHolder);
        }

        if (hrefContainUrl != null) {
            cy.shouldHrefContainUrl(element, hrefContainUrl);
        }

        if (value != null) {
            cy.shouldHaveValue(element, value);
        }

        if (isChecked != null) {
            isChecked ? cy.shouldBeVisible(`[data-test-id="${element}"]` + '.is-checked') : cy.shouldNotExist(`[data-test-id="${element}"]` + '.is-checked');
        }

        if (isDisabled != null) {
            isDisabled ? cy.shouldBeDisabled(element) : cy.shouldNotBeDisabled(element);
        }

        if (selectedIconColor != null) {
            var selector;
            unVisibleElement != null ? selector = unVisibleElement : selector = element;
            cy.getElement(`[data-test-id="${selector}"]`).invoke("attr", "style").should("contain", helper.hexToRgb(selectedIconColor));
        }

        if (selectedFontColor != null) {
            cy.getElement(`[data-test-id="${element}"]`).invoke("attr", "style").should("contain", helper.hexToRgb(selectedFontColor));
        }

        if (selectedMainColor != null) {
            cy.getElement(`[data-test-id="${element}"]`).invoke("attr", "style").should("contain", helper.hexToRgb(selectedMainColor));
        }

        if (attr != null && attrText != null) {
            cy.getElement(`[data-test-id="${element}"]`).invoke("attr", attr).should("contain", attrText);
        }
    }
    else {

        if (element != null && isElementVisible === true) {
            cy.shouldBeVisible(element);
            cy.shouldNotBeEqual(element, elementText);
        }

        if (labelElement != null && isElementVisible === true) {
            cy.shouldBeVisible(labelElement);
            cy.shouldNotBeEqual(labelElement, labelText);
        }
    }
});