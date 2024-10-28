const { FEATURE_TYPE, SETTINGS } = require('../../../../constants');
const helper = require('../../../../helper');

export const configurationsPageElements = {
    PAGE_TITLE: 'header-title',
    SEARCH_INPUT: 'search-in-settings-input',
};

const configurationsListBoxElements = ({
    feature = FEATURE_TYPE.CORE,
    subFeature = SETTINGS.API.BATCH_PROCESSING.BATCH_PROCESSING
}) => {
    return {
        LIST_BOX_ITEM: 'configurations-listbox-item-' + helper.toSlug(feature),

        SELECTED_FEATURE_NAME: 'selected-config-name-label-' + helper.toSlug(feature),
        SELECTED_FEATURE_DESCRIPTION: 'selected-config-description-label-' + helper.toSlug(feature),
        SELECTED_FEATURE_GROUP_NAME: 'selected-config-group-label-' + helper.toSlug(subFeature),

        SELECTED_SUBFEATURE_TITLE: 'settings-title-label-' + helper.toSlug(subFeature),
        SELECTED_SUBFEATURE_DESCRIPTION: 'settings-description-label-' + helper.toSlug(subFeature),

        SELECTED_SUBFEATURE_CHECKBOX: 'settings-' + helper.toSlug(subFeature) + '-el-switch-wrapper',
        SELECTED_SUBFEATURE_INPUT_NUMBER: 'settings-' + helper.toSlug(subFeature) + '-input-number',
        SELECTED_SUBFEATURE_INPUT: 'settings-' + helper.toSlug(subFeature) + '-input',
        SELECTED_SUBFEATURE_SELECT: 'settings-' + helper.toSlug(subFeature) + '-select-input',
        SELECTED_SUBFEATURE_BUTTON: 'settings-' + helper.toSlug(subFeature) + '-button',
        SELECTED_SUBFEATURE_TEXTAREA: 'settings-' + helper.toSlug(subFeature) + '-textarea',
        SELECTED_SUBFEATURE_UPLOAD: 'settings-' + helper.toSlug(subFeature) + '-upload',
        SELECTED_SUBFEATURE_COLOR_PICKER: 'settings-' + helper.toSlug(subFeature) + '-color-picker',
    };
};

module.exports = {
    configurationsPageElements,
    configurationsListBoxElements,
};