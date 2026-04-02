import 'cypress-file-upload';
import { setDebugContext, clearDebugContext } from './debugContext';
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
    for (let i = 0; i < tags.length; i++) {
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
    if (isForce) {
        cy.getElement(element).eq(index).click({ force: true });
    }
    else {
        cy.getElement(element)
            .filter(':visible')
            .eq(index)
            .should('exist')
            .and('not.be.disabled')
            .click();
    }

    cy.checkPaceRunning();
});

Cypress.Commands.add("clickBody", () => {
    cy.get('body', { log: false }).click(0, 0);
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

    for (let i = 0; i < options.length; i++) {
        cy.clickOption('.el-checkbox__label', options[i]);
    }

    cy.elementExists(`${element}-select-x-confirm-button`).then((isExists) => {
        if (isExists) {
            cy.clickElement(`${element}-select-x-confirm-button`);
        }
    });

    cy.clickBody();
});

Cypress.Commands.add("clickOption", (element, option) => {
    cy.getElement(element)
        .contains(new RegExp("^" + option + "$", "g"))
        .click({ force: true });
});

Cypress.Commands.add("selectValue", (element, valueText) => {
    cy.getElement(element).then(($select) => {
        cy.wrap($select)
            .find('option')
            .contains(valueText)
            .then(($option) => {
                cy.wrap($option)
                    .invoke('val')
                    .then((value) => {
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
    cy.getElement(element).attachFile(filePath, {
        encoding: 'utf-8',
        subjectType: 'drag-n-drop'
    });
});

Cypress.Commands.add('uploadFile', (filePath) => {
    cy.get('input[type="file"]').attachFile(filePath, { force: true });
});

Cypress.Commands.add("shouldTooltipContainText", (element, text) => {
    setDebugContext({
        assertion: 'tooltip contain text',
        expected: text,
        actual: undefined
    });

    cy.getElement(element)
        .eq(0)
        .trigger('mouseenter', { force: true });

    cy.get('.tooltip-inner:visible', { timeout: 4000 })
        .last()
        .should('contain', text)
        .then(($el) => {
            const actual = $el.text().trim();
            setDebugContext({ actual });
        });

    cy.getElement(element)
        .eq(0)
        .trigger('mouseleave', { force: true });
});

Cypress.Commands.add("shouldBeVisible", (element) => {
    setDebugContext({
        assertion: 'be visible',
        expected: true,
        actual: undefined
    });

    cy.getElement(element)
        .should('be.visible')
        .then(($el) => {
            const actual = Cypress.$($el).is(':visible');
            setDebugContext({ actual });
        });
});

Cypress.Commands.add("shouldBeDisabled", (element) => {
    setDebugContext({
        assertion: 'be disabled',
        expected: true,
        actual: undefined
    });

    cy.getElement(element)
        .should('be.disabled')
        .then(($el) => {
            const actual = $el.prop('disabled');
            setDebugContext({ actual });
        });
});

Cypress.Commands.add("shouldNotBeDisabled", (element) => {
    setDebugContext({
        assertion: 'not be disabled',
        expected: false,
        actual: undefined
    });

    cy.getElement(element)
        .should('not.be.disabled')
        .then(($el) => {
            const actual = $el.prop('disabled');
            setDebugContext({ actual });
        });
});

Cypress.Commands.add("shouldBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"].is-disabled`)
        .should('exist')
        .then(() => {
            setDebugContext({ assertion: 'have disabled class' });
        });
});

Cypress.Commands.add("shouldNotBeHasDisabledClass", (element) => {
    cy.get(`[data-test-id="${element}"].is-disabled`)
        .should('not.exist')
        .then(() => {
            setDebugContext({ assertion: 'not have disabled class' });
        });
});

Cypress.Commands.add("shouldContainText", (element, text) => {
    setDebugContext({
        assertion: 'contain text',
        expected: text,
        actual: undefined
    });

    cy.getElement(element)
        .should('contain', text)
        .then(($el) => {
            const actual = $el.text().trim();
            setDebugContext({ actual });
        });
});

Cypress.Commands.add("shouldNotContainText", (element, text) => {
    setDebugContext({
        assertion: 'not contain text',
        expected: text,
        actual: undefined
    });

    cy.getElement(element)
        .should('not.contain', text)
        .then(($el) => {
            const actual = $el.text().trim();
            setDebugContext({ actual });
        });
});

Cypress.Commands.add("shouldBeEqual", (element, text) => {
    setDebugContext({
        assertion: 'be equal',
        expected: text,
        actual: undefined
    });

    cy.getElement(element)
        .should('exist')
        .invoke('text')
        .then((actual) => {
            actual = actual.trim();
            setDebugContext({ actual });
            expect(actual).to.equal(text);
        });
});

Cypress.Commands.add("shouldNotBeEqual", (element, text) => {
    setDebugContext({
        assertion: 'not be equal',
        expected: text,
        actual: undefined
    });

    cy.getElement(element)
        .invoke('text')
        .then((actual) => {
            actual = actual.trim();
            setDebugContext({ actual });
            expect(actual).not.to.equal(text);
        });
});

Cypress.Commands.add("shouldPlaceholderContainText", (element, text) => {
    cy.getElement(element)
        .invoke('attr', 'placeholder')
        .should('contain', text)
        .then((actual) => {
            setDebugContext({
                assertion: 'placeholder contain text',
                expected: text,
                actual
            });
        });
});

Cypress.Commands.add("shouldDataOriginalTitleContainText", (element, text) => {
    cy.getElement(element)
        .invoke('attr', 'data-original-title')
        .should('contain', text)
        .then((actual) => {
            setDebugContext({
                assertion: 'data-original-title contain text',
                expected: text,
                actual
            });
        });
});

Cypress.Commands.add("shouldHrefContainUrl", (element, url) => {
    cy.getElement(element)
        .invoke('attr', 'href')
        .should('contain', url)
        .then((actual) => {
            setDebugContext({
                assertion: 'href contain url',
                expected: url,
                actual
            });
        });
});

Cypress.Commands.add("shouldHaveValue", (element, value) => {
    setDebugContext({
        assertion: 'have value',
        expected: value,
        actual: undefined
    });

    cy.getElement(element)
        .should('have.value', value)
        .then(($el) => {
            const actual = $el.val();
            setDebugContext({ actual });
        });
});

Cypress.Commands.add("shouldUrlInclude", (url) => {
    setDebugContext({
        assertion: 'url include',
        expected: url,
        actual: undefined
    });

    cy.url()
        .should('include', url)
        .then((actual) => {
            setDebugContext({ actual });
        });
});

Cypress.Commands.add('elementExists', (selector, { parent = 'body' } = {}) => {
    if (!selector.includes('[data-test-id=')) {
        if (!(selector.startsWith('.') || selector.startsWith('#'))) {
            selector = `[data-test-id="${selector}"]`;
        }
    }

    return cy.get(parent, { log: false }).then($parent => {
        const exists = $parent.find(selector).length > 0;
        return exists;
    });
});

Cypress.Commands.add("shouldBeExist", (element) => {
    cy.getElement(element)
        .should('exist')
        .then(() => {
            setDebugContext({ assertion: 'exist' });
        });
});

Cypress.Commands.add("shouldNotExist", (element) => {
    cy.getElement(element)
        .should('not.exist')
        .then(() => {
            setDebugContext({ assertion: 'not exist' });
        });
});

Cypress.Commands.add('checkPaceRunning', () => {
    cy.get('.pace-running', { timeout: 75000 }).should('not.exist');
});

Cypress.Commands.add('checkPaceActive', () => {
    cy.get('.pace-active', { timeout: 75000 }).should('not.exist');
});

Cypress.Commands.add('checkLoading', () => {
    cy.get('body').then($body => {
        if ($body.find('.el-loading-mask').length) {
            cy.get('.el-loading-mask', { timeout: 50000 })
                .should('not.be.visible');
        }
    });
});

Cypress.Commands.add("scrollPageSlightly", (element = '.main-view', index = 0) => {
    cy.get(element).eq(index).then(($el) => {
        const currentScroll = $el[0].scrollTop;
        const newScroll = currentScroll + 550;

        cy.wrap($el).scrollTo(0, newScroll, {
            duration: 1000,
            ensureScrollable: false
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
            isChecked
                ? cy.shouldBeVisible(`[data-test-id="${element}"]` + '.is-checked')
                : cy.shouldNotExist(`[data-test-id="${element}"]` + '.is-checked');
        }

        if (isDisabled != null) {
            isDisabled
                ? cy.shouldBeDisabled(element)
                : cy.shouldNotBeDisabled(element);
        }

        if (selectedIconColor != null) {
            let selector;
            unVisibleElement != null ? selector = unVisibleElement : selector = element;

            cy.getElement(`[data-test-id="${selector}"]`)
                .invoke("attr", "style")
                .should("contain", helper.hexToRgb(selectedIconColor));
        }

        if (selectedFontColor != null) {
            cy.getElement(`[data-test-id="${element}"]`)
                .invoke("attr", "style")
                .should("contain", helper.hexToRgb(selectedFontColor));
        }

        if (selectedMainColor != null) {
            cy.getElement(`[data-test-id="${element}"]`)
                .invoke("attr", "style")
                .should("contain", helper.hexToRgb(selectedMainColor));
        }

        if (attr != null && attrText != null) {
            cy.getElement(`[data-test-id="${element}"]`)
                .invoke("attr", attr)
                .should("contain", attrText);
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

Cypress.Commands.add('dropMongoDatabase', () => {
    cy.exec("mongosh mongodb/countly --eval 'db.dropDatabase()'");
});

Cypress.Commands.add('getElement', (selector, parent = null) => {

    clearDebugContext();

    if (!selector || typeof selector !== 'string') {
        throw new Error('getElement: selector must be a non-empty string');
    }

    let finalSelector = selector;

    const isCssSelector =
        selector.startsWith('.') ||
        selector.startsWith('#') ||
        selector.startsWith('[');

    if (!isCssSelector) {
        finalSelector = `[data-test-id="${selector}"]`;
    }

    if (parent) {
        finalSelector = `${parent} ${finalSelector}`;
    }

    setDebugContext({ selector: finalSelector });

    return cy.get(finalSelector);
});
