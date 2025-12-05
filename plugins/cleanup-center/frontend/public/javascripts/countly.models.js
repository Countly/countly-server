/* global CV, countlyCommon */

(function(countlyCleanupCenter) {

    // eslint-disable-next-line no-unused-vars
    const FEATURE_NAME = 'cleanup_center';

    /**
     * Get all entities with optional filters
     * @param {string|null} appId - Application ID or null for all apps
     * @param {Object} filters - Filter object
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.getEntities = function(appId, filters, successCallback, errorCallback) {
        const params = {};

        // Only send app_id when we actually want to scope by a single app.
        // When appId is null/undefined, backend will return entities for all apps.
        if (appId) {
            params.app_id = appId;
        }

        if (filters) {
            if (filters.type) {
                params.type = filters.type;
            }
            if (filters.status) {
                params.status = filters.status;
            }
            if (filters.owner) {
                params.owner = filters.owner;
            }
            if (filters.q) {
                params.q = filters.q;
            }
        }

        CV.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/cleanup/entities",
            data: params,
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Get single entity details
     * @param {string} entityId - Entity ID
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.getEntityDetails = function(entityId, successCallback, errorCallback) {
        CV.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/cleanup/entities/details",
            data: {
                entity_id: entityId
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Hide/unhide an entity
     * @param {string} entityId - Entity ID
     * @param {boolean} hidden - Hidden state
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.hideEntity = function(entityId, hidden, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/hide",
            data: {
                entity_id: entityId,
                hidden: hidden
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Block/unblock an entity
     * @param {string} entityId - Entity ID
     * @param {boolean} blocked - Blocked state
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.blockEntity = function(entityId, blocked, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/block",
            data: {
                entity_id: entityId,
                blocked: blocked
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Rename an entity
     * @param {string} entityId - Entity ID
     * @param {string} newName - New name
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.renameEntity = function(entityId, newName, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/rename",
            data: {
                entity_id: entityId,
                new_name: newName
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Merge entities
     * @param {string} sourceId - Source entity ID
     * @param {string} targetId - Target entity ID
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.mergeEntities = function(sourceId, targetId, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/merge",
            data: {
                source_id: sourceId,
                target_id: targetId
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Delete an entity
     * @param {string} entityId - Entity ID
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.deleteEntity = function(entityId, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/delete",
            data: {
                entity_id: entityId
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Change entity type
     * @param {string} entityId - Entity ID
     * @param {string} newType - New type
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.changeEntityType = function(entityId, newType, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/change-type",
            data: {
                entity_id: entityId,
                new_type: newType
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Add validation rule
     * @param {string} entityId - Entity ID
     * @param {Object} rule - Validation rule
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.addValidationRule = function(entityId, rule, successCallback, errorCallback) {
        CV.$.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/cleanup/entities/validate",
            data: {
                entity_id: entityId,
                validation_rule: rule
            },
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

    /**
     * Get audit history
     * @param {Object} filters - Filter object
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    countlyCleanupCenter.getAuditHistory = function(filters, successCallback, errorCallback) {
        const params = {};

        if (filters) {
            if (filters.app_id) {
                params.app_id = filters.app_id;
            }
            if (filters.entity_type) {
                params.entity_type = filters.entity_type;
            }
            if (filters.action) {
                params.action = filters.action;
            }
            if (filters.actor) {
                params.actor = filters.actor;
            }
            if (filters.limit) {
                params.limit = filters.limit;
            }
            if (filters.skip) {
                params.skip = filters.skip;
            }
        }

        CV.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/cleanup/audit",
            data: params,
            dataType: "json",
            success: successCallback,
            error: errorCallback
        });
    };

})(window.countlyCleanupCenter = window.countlyCleanupCenter || {});




