import 'cypress-file-upload';
const helper = require('./helper');

Cypress.Commands.add("typeInput", (element, tag) => {
    cy.getElement(element).clear().type(tag);
});

Cypress.Commands.add("clearInput", (element) => {
    cy.getElement(element).clear();
});

Cypress.Commands.add("typeSelectInput", (element, tag) => {
    cy.getElement(element).type(tag + '{enter}', { force: true });
    cy.clickBody();
});

Cypress.Commands.add('getText', { prevSubject: true }, (subject) => {
    return cy.wrap(subject).invoke('text');
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

Cypress.Commands.add("clickOption", (element, option) => {
    cy.getElement(element).contains(new RegExp("^" + option + "$", "g")).click();
});

Cypress.Commands.add("selectColor", (element, colorCode) => {
    cy.clickElement(element);
    cy.get('.vc-input__input')
        .eq(0)
        .invoke('val', colorCode)
        .trigger('input');

    cy.clickElement('.cly-vue-button.button-green-skin');
});

Cypress.Commands.add('uploadFile', (element, filePath) => {
    cy.getElement(element)
        .attachFile(filePath, {
            encoding: 'utf-8',
            subjectType: 'drag-n-drop'
        });
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

Cypress.Commands.add("scrollPageToBottom", (element, index = 0) => {
    cy.get(element).eq(index).scrollTo('bottom', { ensureScrollable: false });
});

Cypress.Commands.add('verifyElement', ({
    labelElement,
    labelText,
    tooltipElement,
    tooltipText,
    element,
    elementText,
    elementPlaceHolder,
    hrefContainUrl,
    value,
    isChecked,
    isDisabled,
    unVisibleElement,
    selectedIconColor,
    selectedMainColor,
    selectedFontColor
}) => {
    if (labelElement != null) {
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

    if (element != null) {
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
});

Cypress.Commands.add('dropMongoDatabase', () => {
    cy.exec("mongosh mongodb/countly --eval 'db.dropDatabase()'");
});

Cypress.Commands.add('getElement', (selector, parent = null) => {

    if (!selector.includes('[data-test-id=')) {
        if (selector[0].includes('.') || selector[0].includes('#')) {
            return cy.get(selector);
        }
        else {
            if (parent !== null) {
                selector = `${parent} [data-test-id="${selector}"]`;
            }
            else {
                selector = `[data-test-id="${selector}"]`;
            }
            return cy.get(selector);
        }
    }
    else {
        return cy.get(selector);
    }
});