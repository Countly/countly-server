import {
    jobsPageElements,
    jobsDataTableElements
} from "../../../../support/elements/dashboard/manage/jobs/jobs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: jobsPageElements.PAGE_TITLE,
        labelText: "Jobs"
    });

    cy.verifyElement({
        element: jobsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: jobsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: jobsDataTableElements().COLUMN_NAME_NAME_LABEL,
        labelText: "Name",
        element: jobsDataTableElements().COLUMN_NAME_NAME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: jobsDataTableElements().COLUMN_NAME_STATUS_LABEL,
        labelText: "Status",
        element: jobsDataTableElements().COLUMN_NAME_STATUS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: jobsDataTableElements().COLUMN_NAME_SCHEDULE_LABEL,
        labelText: "Schedule",
        element: jobsDataTableElements().COLUMN_NAME_SCHEDULE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: jobsDataTableElements().COLUMN_NAME_NEXT_RUN_LABEL,
        labelText: "Next Run",
        element: jobsDataTableElements().COLUMN_NAME_NEXT_RUN_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: jobsDataTableElements().COLUMN_NAME_LAST_RUN_LABEL,
        labelText: "Last Run",
        element: jobsDataTableElements().COLUMN_NAME_LAST_RUN_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: jobsDataTableElements().COLUMN_NAME_TOTAL_LABEL,
        labelText: "Total",
        element: jobsDataTableElements().COLUMN_NAME_TOTAL_SORTABLE_ICON,
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyJobsDataTable({
        shouldNotEqual: true,
    });
};

const verifyJobsDataTable = ({
    index = 0,
    shouldNotEqual = false,
    name = null,
    status = null,
    schedule = null,
    scheduleTime = null,
    nextRun = null,
    nextRunTime = null,
    lastRun = null,
    total = null
}) => {

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: jobsDataTableElements(index).NAME,
        elementText: name,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: jobsDataTableElements(index).STATUS,
        elementText: status,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: jobsDataTableElements(index).SCHEDULE,
        elementText: schedule,
    });

    if (scheduleTime !== null) {
        cy.verifyElement({
            element: jobsDataTableElements(index).SCHEDULE_TIME,
            elementText: scheduleTime,
        });
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: jobsDataTableElements(index).NEXT_RUN,
        elementText: nextRun,
    });

    if (nextRunTime !== null) {
        cy.verifyElement({
            element: jobsDataTableElements(index).NEXT_RUN_TIME,
            elementText: nextRunTime,
        });
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: jobsDataTableElements(index).LAST_RUN,
        elementText: lastRun,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: jobsDataTableElements(index).TOTAL,
        elementText: total,
    });
};

module.exports = {
    verifyPageElements,
    verifyJobsDataTable
};