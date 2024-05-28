const quickstartPopoeverElements = {
    QUICKSTART_POPOVER_POSITIONER: 'quickstart-popover-positioner',
    CLOSE_ICON: 'quickstart-popover-close',
    QUICKSTART_LABEL: 'quickstart-title',
};

const verifyDefaultPageElements = () => {
    cy.verifyElement({
        element: quickstartPopoeverElements.QUICKSTART_POPOVER_POSITIONER,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.CLOSE_ICON,
    });

    cy.verifyElement({
        labelElement: quickstartPopoeverElements.QUICKSTART_LABEL,
        labelText: "Quick Start"
    });
};
const closeQuickStartPopover = () => {
    cy.clickElement(quickstartPopoeverElements.CLOSE_ICON);
};

module.exports = {
    verifyDefaultPageElements,
    closeQuickStartPopover
};