/**
 * Data Masking Service for ClickHouse Queries
 * Provides functionality to mask sensitive data from queries and results
 */

const log = require('../../../api/utils/log.js')('clickhouse:data-masking');

/**
 * Service class for masking sensitive data in ClickHouse queries and results
 */
class DataMaskingService {
    /**
     * Constructor
     */
    constructor() {
        this.appId = null;
        this.plugins = null;
    }

    /**
     * Set the plugins reference
     * @param {Object} plugins - Plugin manager instance
     */
    setPlugins(plugins) {
        this.plugins = plugins;
    }

    /**
     * Set the application ID for masking context
     * @param {string} appId - Application ID
     */
    setAppId(appId) {
        this.appId = appId;
    }

    /**
     * Attempt to mask sensitive data from query string using regex patterns
     * @param {string} query - SQL query string with parameter placeholders
     * @param {Object} [_params] - Query parameters (unused)
     * @returns {Object} Object with masked query and whether masking was applied
     */
    maskQueryString(query, _params) {
        try {
            // disabling query masking until it is still stable
            // keeping result masking enabled
            void _params;
            log.d('Query masking temporarily disabled, only result masking will be applied');
            return { query, masked: false };

            // Original query masking logic

            // if (!this.appId) {
            //     log.w('No app ID set, skipping query masking');
            //     return { query, masked: false };
            // }

            // // Get masking settings for this app
            // const masking = this.getMaskingSettings(this.appId);
            // if (!masking) {
            //     return { query, masked: false };
            // }

            // // Check if we have any masking configured
            // const hasEventMasking = masking.events && Object.keys(masking.events).length > 0;
            // const hasPropMasking = masking.prop && Object.keys(masking.prop).length > 0;

            // if (!hasEventMasking && !hasPropMasking) {
            //     return { query, masked: false };
            // }

            // let maskedQuery = query;
            // let maskingApplied = false;

            // // Check if query contains sg (segments) in SELECT
            // if (hasEventMasking && query.includes('sg')) {
            //     const segmentResult = this._maskSegmentsInQuery(maskedQuery, masking);
            //     if (segmentResult.masked) {
            //         maskedQuery = segmentResult.query;
            //         maskingApplied = true;
            //     }
            // }

            // // Check if query contains properties that need masking (up, custom, cmp)
            // if (hasPropMasking) {
            //     const propMaskingResult = this._maskPropertiesInQuery(maskedQuery, masking);
            //     if (propMaskingResult.masked) {
            //         maskedQuery = propMaskingResult.query;
            //         maskingApplied = true;
            //     }
            // }

            // return { query: maskedQuery, masked: maskingApplied };
        }
        catch (error) {
            log.e('Error masking query string', error);
            return { query, masked: false };
        }
    }

    /**
     * Mask segments (sg) in SELECT clause
     * @param {string} query - SQL query string
     * @param {Object} masking - Masking settings
     * @returns {Object} Object with masked query and whether masking was applied
     */
    _maskSegmentsInQuery(query, masking) {
        try {
            const selectPattern = /SELECT\s+([^]+?)\s+FROM/i;
            const match = query.match(selectPattern);

            if (!match || !match[1]) {
                return { query, masked: false };
            }

            const selectFields = match[1];
            let maskedQuery = query;
            let maskingApplied = false;

            // Collect all masked segment names across all events
            const maskedSegments = new Set();
            for (const eventName in masking.events) {
                if (masking.events[eventName] && masking.events[eventName].sg) {
                    for (const segmentName in masking.events[eventName].sg) {
                        if (masking.events[eventName].sg[segmentName]) {
                            maskedSegments.add(segmentName);
                        }
                    }
                }
            }

            if (maskedSegments.size === 0) {
                return { query, masked: false };
            }

            // Parse SELECT fields more carefully to handle function calls with commas
            const fields = this._parseSelectFields(selectFields);
            const filteredFields = fields.filter(field => {
                // Check if this field references a masked segment
                for (const segmentName of maskedSegments) {
                    // Check various patterns for segment references
                    if (field.includes(`sg.${segmentName}`) ||
                        field.includes(`sg['${segmentName}']`) ||
                        field.includes(`sg."${segmentName}"`) ||
                        field.includes(`JSONExtract(sg, '${segmentName}')`) ||
                        field.includes(`JSONExtractString(sg, '${segmentName}')`)) {
                        // Check if the segment is inside a complex function
                        const hasComplexFunction = /arrayFilter|groupArrayDistinct|tuple|formatDate|concat|if\(|multiIf|sum\(/i.test(field);
                        const isEntireField = field.trim() === `sg.${segmentName}` ||
                            field.trim() === `sg['${segmentName}']` ||
                            field.trim() === `JSONExtract(sg, '${segmentName}')`;

                        if (hasComplexFunction && !isEntireField) {
                            // Skip query-level masking for segments inside complex functions
                            log.d(`Skipping query-level masking for sg.${segmentName} - inside complex function`);
                            return true; // Keep this field, rely on result masking
                        }

                        log.d(`Removed masked segment field: ${field}`);
                        return false; // Remove this field
                    }
                }

                return true; // Keep this field
            });

            // If we removed any specific segment fields, update the query
            if (filteredFields.length < fields.length) {
                maskedQuery = query.replace(selectPattern, `SELECT ${filteredFields.join(', ')} FROM`);
                maskingApplied = true;
            }

            // If the query only has the general 'sg' field and we have masked segments,
            // we need to be more careful. We can either:
            // 1. Remove the entire sg field (current behavior)
            // 2. Try to construct a query that excludes masked segments

            // For now, let's check if only 'sg' remains and remove it entirely
            const remainingFields = filteredFields.filter(field => {
                const fieldName = field.split(/\s+/)[0].trim();
                return fieldName === 'sg';
            });

            if (remainingFields.length > 0) {
                // Remove the general 'sg' field since we can't guarantee which segments will be returned
                const finalFilteredFields = filteredFields.filter(field => {
                    const fieldName = field.split(/\s+/)[0].trim();
                    return fieldName !== 'sg';
                });

                if (finalFilteredFields.length < filteredFields.length) {
                    maskedQuery = maskedQuery.replace(selectPattern, `SELECT ${finalFilteredFields.join(', ')} FROM`);
                    log.d('Removed general sg field from SELECT clause (contains masked segments)');
                    maskingApplied = true;
                }
            }

            return { query: maskedQuery, masked: maskingApplied };
        }
        catch (error) {
            log.e('Error masking segments in query', error);
            return { query, masked: false };
        }
    }

    /**
     * Parse SELECT fields properly handling function calls with commas
     * @param {string} selectFields - The fields part of SELECT clause
     * @returns {Array} Array of properly parsed field expressions
     */
    _parseSelectFields(selectFields) {
        const fields = [];
        let currentField = '';
        let parenCount = 0;
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < selectFields.length; i++) {
            const char = selectFields[i];

            if (!inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
            }
            else if (inQuotes && char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            }
            else if (!inQuotes && char === '(') {
                parenCount++;
            }
            else if (!inQuotes && char === ')') {
                parenCount--;
            }
            else if (!inQuotes && char === ',' && parenCount === 0) {
                fields.push(currentField.trim());
                currentField = '';
                continue;
            }

            currentField += char;
        }

        if (currentField.trim()) {
            fields.push(currentField.trim());
        }

        return fields;
    }

    /**
     * Mask properties (up, custom, cmp) in SELECT clause
     * @param {string} query - SQL query string
     * @param {Object} masking - Masking settings
     * @returns {Object} Object with masked query and whether masking was applied
     */
    _maskPropertiesInQuery(query, masking) {
        try {
            const selectPattern = /SELECT\s+([^]+?)\s+FROM/i;
            const match = query.match(selectPattern);

            if (!match || !match[1]) {
                return { query, masked: false };
            }

            let selectFields = match[1];
            let maskedQuery = query;
            let maskingApplied = false;

            // Iterate through all property groups (up, custom, cmp)
            for (const group in masking.prop) {
                if (!masking.prop[group]) {
                    continue;
                }

                // For each masked property in this group, try to remove it
                for (const prop in masking.prop[group]) {
                    if (masking.prop[group][prop]) {
                        // Check for various patterns of property access in ClickHouse
                        const patterns = [
                            `${group}.${prop}`, // up.did
                            `${group}['${prop}']`, // up['did']
                            `${group}."${prop}"`, // up."did"
                            `JSONExtract(${group}, '${prop}')`, // JSONExtract(up, 'did')
                            `JSONExtractString(${group}, '${prop}')` // JSONExtractString(up, 'did')
                        ];

                        for (const pattern of patterns) {
                            // Parse fields properly to handle function calls with commas
                            const fields = this._parseSelectFields(selectFields);

                            // Check if this pattern exists in any field
                            const fieldsWithPattern = fields.filter(field => field.includes(pattern));

                            if (fieldsWithPattern.length > 0) {
                                // Check if the pattern is inside a complex function (not a simple field reference)
                                const isInsideComplexFunction = fieldsWithPattern.some(field => {
                                    // If the field contains complex aggregation functions like arrayFilter, groupArrayDistinct, etc.
                                    // and the pattern is not the entire field, it's inside a complex function
                                    // Note: JSONExtract is NOT considered complex - it should be masked normally
                                    const hasComplexFunction = /arrayFilter|groupArrayDistinct|tuple|formatDate|concat|if\(|multiIf/i.test(field);
                                    const isEntireField = field.trim() === pattern.trim();
                                    return hasComplexFunction && !isEntireField;
                                });

                                if (isInsideComplexFunction) {
                                    // Skip query-level masking for properties inside complex functions
                                    log.w(`Skipping query-level masking for ${pattern} - inside complex function`);
                                    continue;
                                }

                                // Check if removing this pattern would result in empty SELECT
                                const filteredFields = fields.filter(field => !field.includes(pattern));

                                if (filteredFields.length === 0) {
                                    // If removing would result in empty SELECT, skip query-level masking
                                    // and rely on result-level masking instead
                                    log.w(`Skipping query-level masking for ${pattern} - would result in empty SELECT`);
                                    continue;
                                }

                                // Safe to remove - update the query
                                maskedQuery = maskedQuery.replace(selectPattern, `SELECT ${filteredFields.join(', ')} FROM`);
                                selectFields = filteredFields.join(', ');
                                maskingApplied = true;
                                log.d('Removed property from SELECT', { group, prop, pattern });
                                break; // Exit the pattern loop once we find and remove a match
                            }
                        }
                    }
                }
            }

            return { query: maskedQuery, masked: maskingApplied };
        }
        catch (error) {
            log.e('Error masking properties in query', error);
            return { query, masked: false };
        }
    }

    /**
     * Mask sensitive data from query results by removing masked fields
     * @param {Array} results - Query results
     * @param {string} queryString - Original query string (may contain projectionKey info)
     * @param {Array} [projectionKey] - Optional projection key array mapping properties to s0-s4
     * @returns {Array} Masked results with fields removed
     */
    maskResults(results, queryString, projectionKey = null) {
        try {
            if (!this.appId || !results || !Array.isArray(results)) {
                return results;
            }

            // Get masking settings for this app
            const masking = this.getMaskingSettings(this.appId);
            // Build set of masked top-level fields (generalized)
            const maskedTopFields = new Set();
            if (masking && masking.top && Array.isArray(masking.top.fields)) {
                for (const f of masking.top.fields) {
                    if (typeof f === 'string' && f.trim()) {
                        maskedTopFields.add(f.trim());
                    }
                }
            }

            if (!masking || (!masking.events && !masking.prop && maskedTopFields.size === 0)) {
                return results;
            }

            log.d('Masking results based on config', {
                appId: this.appId,
                hasEvents: !!masking.events,
                hasProp: !!masking.prop,
                maskedTopFields: Array.from(maskedTopFields)
            });

            // Pre-compute alias references from the SELECT clause when present
            // aliasRefs: alias -> { ts: boolean, props: Array<{group, prop}>, segments: Array<string> }
            const aliasRefs = {};
            if (typeof queryString === 'string') {
                try {
                    const selectMatch = queryString.match(/SELECT\s+([^]+?)\s+FROM/i);
                    if (selectMatch && selectMatch[1]) {
                        const selectPart = selectMatch[1];
                        const fields = this._parseSelectFields(selectPart);
                        for (const fieldExpr of fields) {
                            // Extract alias via AS, case-insensitive
                            const asMatch = fieldExpr.match(/^(.*?)(?:\s+AS\s+([a-zA-Z_][a-zA-Z0-9_]*))\s*$/i);
                            if (!asMatch) {
                                continue;
                            }
                            const expr = asMatch[1].trim();
                            const alias = asMatch[2];
                            const refs = { top: new Set(), props: [], segments: [] };

                            // references to masked top-level fields
                            if (maskedTopFields.size > 0) {
                                for (const topField of maskedTopFields) {
                                    const re = new RegExp(`\\b${topField}\\b`, 'i');
                                    if (re.test(expr)) {
                                        refs.top.add(topField);
                                    }
                                }
                            }

                            // properties reference
                            if (masking.prop) {
                                for (const group in masking.prop) {
                                    const groupMask = masking.prop[group];
                                    if (!groupMask) {
                                        continue;
                                    }
                                    for (const prop in groupMask) {
                                        if (!groupMask[prop]) {
                                            continue;
                                        }
                                        const patterns = [
                                            `${group}.${prop}`,
                                            `${group}['${prop}']`,
                                            `${group}."${prop}"`,
                                            `JSONExtract(${group}, '${prop}')`,
                                            `JSONExtractString(${group}, '${prop}')`
                                        ];
                                        if (patterns.some(p => expr.includes(p))) {
                                            refs.props.push({ group, prop });
                                        }
                                    }
                                }
                            }

                            // segments reference (record names; decision per row by event)
                            if (masking.events) {
                                // collect all masked segment names
                                const segNames = new Set();
                                for (const ev in masking.events) {
                                    const evCfg = masking.events[ev];
                                    if (evCfg && evCfg.sg) {
                                        for (const seg in evCfg.sg) {
                                            if (evCfg.sg[seg]) {
                                                segNames.add(seg);
                                            }
                                        }
                                    }
                                }
                                for (const segName of segNames) {
                                    const segPatterns = [
                                        `sg.${segName}`,
                                        `sg['${segName}']`,
                                        `sg."${segName}"`,
                                        `JSONExtract(sg, '${segName}')`,
                                        `JSONExtractString(sg, '${segName}')`
                                    ];
                                    if (segPatterns.some(p => expr.includes(p))) {
                                        refs.segments.push(segName);
                                    }
                                }
                            }

                            if (refs.top.size > 0 || refs.props.length > 0 || refs.segments.length > 0) {
                                aliasRefs[alias] = {
                                    top: Array.from(refs.top),
                                    props: refs.props,
                                    segments: refs.segments
                                };
                            }
                        }
                    }
                }
                catch (e) {
                    log.w('Failed to parse alias references from query', e);
                }
            }

            // Check if this is a drill_snapshots query result (has s0-s4 columns)
            // Detect by: 1) query string contains drill_snapshots, or 2) results have s0-s4 columns
            // Also handles regular drill queries with projection (bucket_kind: seg/tot)
            const isSnapshotQueryByString = typeof queryString === 'string' &&
                queryString.toLowerCase().includes('drill_snapshots');
            const isSnapshotQueryByResults = results.length > 0 && results.some(row =>
                row && ('s0' in row || 's1' in row || 's2' in row || 's3' in row || 's4' in row)
            );
            const isSnapshotQuery = isSnapshotQueryByString || isSnapshotQueryByResults;

            const hasMaskedProps = masking.prop && Object.keys(masking.prop).some(group => {
                if (!masking.prop[group]) {
                    return false;
                }
                return Object.keys(masking.prop[group]).some(prop => masking.prop[group][prop]);
            });

            log.d('Result masking check', {
                isSnapshotQueryByString,
                isSnapshotQueryByResults,
                isSnapshotQuery,
                hasMaskedProps,
                resultsCount: results.length,
                projectionKey: projectionKey,
                projectionKeyType: typeof projectionKey,
                projectionKeyLength: Array.isArray(projectionKey) ? projectionKey.length : 'N/A',
                sampleRow: results[0] ? { bucket_kind: results[0].bucket_kind, row: results[0].row, hasS0: 's0' in results[0] } : null
            });

            // Apply masking to each result row
            const maskedResults = results.map(row => {
                const maskedRow = { ...row };

                // Mask s0-s4 columns for drill_snapshots queries
                // Try to determine which s0-s4 columns correspond to masked properties
                // If we can't determine, mask all s0-s4 columns (fallback)
                // Handle all bucket kinds: 'snapshot', 'seg', 'd', 'm', 'w', 'h', etc.
                if (isSnapshotQuery && hasMaskedProps && row) {
                    // Skip masking for 'tot' bucket_kind (totals row) or 'total' row type
                    const shouldSkip = row.bucket_kind === 'tot' || row.row === 'total';

                    // Mask all other rows that have s0-s4 columns (regardless of bucket_kind)
                    // This includes: 'snapshot', 'seg', 'd', 'm', 'w', 'h', and any other bucket kinds
                    const hasSColumns = 's0' in row || 's1' in row || 's2' in row || 's3' in row || 's4' in row;

                    if (hasSColumns && !shouldSkip) {
                        // Build set of s0-s4 columns to mask based on masked properties and projectionKey
                        const sColumnsToMask = new Set();

                        // If we have projectionKey, map properties to s0-s4 indices
                        if (projectionKey && Array.isArray(projectionKey) && projectionKey.length > 0) {
                            log.d('Processing projectionKey for result masking', {
                                projectionKey,
                                projectionKeyLength: projectionKey.length,
                                maskingConfig: Object.keys(masking.prop || {})
                            });
                            projectionKey.forEach((propPath, index) => {
                                // Only process indices 0-4 (s0-s4)
                                if (index >= 0 && index <= 4) {
                                    // Handle string property paths (e.g., 'up.cc', 'custom.field')
                                    if (typeof propPath === 'string' && propPath.trim()) {
                                        const parts = propPath.split('.');
                                        // Property path must have at least group.prop format
                                        if (parts.length >= 2) {
                                            const group = parts[0];
                                            const prop = parts.slice(1).join('.');
                                            // Check if this property is configured to be masked
                                            const isMasked = masking.prop[group] && masking.prop[group][prop];
                                            log.d(`Checking property mapping`, {
                                                propPath,
                                                index,
                                                group,
                                                prop,
                                                hasGroup: !!masking.prop[group],
                                                hasProp: !!(masking.prop[group] && masking.prop[group][prop]),
                                                isMasked
                                            });
                                            if (isMasked) {
                                                sColumnsToMask.add(`s${index}`);
                                                log.d(`Property ${propPath} maps to s${index}, will be masked in results`);
                                            }
                                        }
                                    }
                                }
                            });
                            log.d('Result masking projectionKey processing complete', {
                                sColumnsToMask: Array.from(sColumnsToMask)
                            });
                        }
                        else {
                            log.d('No valid projectionKey for result masking', {
                                projectionKey,
                                isArray: Array.isArray(projectionKey),
                                length: Array.isArray(projectionKey) ? projectionKey.length : 'N/A'
                            });
                        }

                        // If no specific mappings found, mask all s0-s4 (fallback)
                        // This happens when projectionKey is null, empty array, or no properties are configured to be masked
                        if (sColumnsToMask.size === 0) {
                            log.d('No projectionKey provided or no masked properties found in projectionKey, masking all s0-s4 columns (fallback)');
                            for (let i = 0; i <= 4; i++) {
                                sColumnsToMask.add(`s${i}`);
                            }
                        }

                        // Mask only the columns that need masking
                        for (let i = 0; i <= 4; i++) {
                            const colName = `s${i}`;
                            if (sColumnsToMask.has(colName) && colName in maskedRow) {
                                log.d(`Masking snapshot column in result: ${colName}`, {
                                    originalValue: maskedRow[colName],
                                    rowType: row.row || row.bucket_kind
                                });
                                maskedRow[colName] = '';
                            }
                        }
                    }
                }

                // Mask event segments if masking.events is configured
                // For drill_events, event name is in 'e' field, not 'key'
                const eventName = row.e || row.key;
                if (masking.events && eventName && masking.events[eventName]) {
                    const eventMasking = masking.events[eventName];
                    if (eventMasking.sg && maskedRow.sg) {
                        // For ClickHouse, sg is a JSON object, not an array
                        if (typeof maskedRow.sg === 'object' && maskedRow.sg !== null) {
                            // Remove masked segment properties from the JSON object
                            for (const segmentName in eventMasking.sg) {
                                if (eventMasking.sg[segmentName] && maskedRow.sg[segmentName] !== undefined) {
                                    log.d('Removing masked segment', { event: eventName, segment: segmentName });
                                    delete maskedRow.sg[segmentName];
                                }
                            }
                        }
                    }
                }

                // Mask user properties if masking.prop is configured
                if (masking.prop) {
                    // Special handling: systemUserProperties exist both at root level and in nested objects
                    // Currently only 'did' is in systemUserProperties
                    // When up.did is masked, we also need to mask root-level did
                    // Note: did does not exist in cmp for drill_events, only at root level and in up
                    const systemUserProperties = { 'did': true }; // Properties that exist at multiple levels

                    for (const group in masking.prop) {
                        if (!masking.prop[group]) {
                            continue;
                        }

                        for (const prop in masking.prop[group]) {
                            // Check if this property should be masked
                            if (masking.prop[group][prop]) {
                                // Handle different property groups (up, custom, cmp)
                                if (maskedRow[group] && typeof maskedRow[group] === 'object' && maskedRow[group] !== null) {
                                    if (maskedRow[group][prop] !== undefined) {
                                        log.d('Removing masked property', { group, prop });
                                        delete maskedRow[group][prop];
                                    }
                                }

                                // Special handling for systemUserProperties (like did)
                                if (systemUserProperties[prop]) {
                                    // Mask root-level field if it exists
                                    if (maskedRow[prop] !== undefined) {
                                        log.d(`Removing root-level ${prop} (masked via ${group}.${prop} configuration)`);
                                        delete maskedRow[prop];
                                    }
                                }
                            }
                        }
                    }
                }

                // Mask top-level fields (generalized) and any aliases that reference them
                if (maskedTopFields.size > 0) {
                    for (const topField of maskedTopFields) {
                        if (maskedRow[topField] !== undefined) {
                            delete maskedRow[topField];
                        }
                    }
                    for (const alias in aliasRefs) {
                        const refs = aliasRefs[alias];
                        if (refs && Array.isArray(refs.top) && refs.top.length > 0 && maskedRow[alias] !== undefined) {
                            // If alias references any masked top-level field, remove it
                            const hasMaskedTop = refs.top.some(tf => maskedTopFields.has(tf));
                            if (hasMaskedTop) {
                                delete maskedRow[alias];
                            }
                        }
                    }
                }

                // Remove any aliases that reference masked properties
                if (masking.prop) {
                    for (const alias in aliasRefs) {
                        const refs = aliasRefs[alias];
                        if (!refs || !refs.props || refs.props.length === 0) {
                            continue;
                        }
                        // If alias references any masked prop, remove alias
                        if (maskedRow[alias] !== undefined) {
                            delete maskedRow[alias];
                        }
                    }
                }

                // Remove any aliases that reference masked segments for this row's event
                if (masking.events && eventName) {
                    const evCfg = masking.events[eventName];
                    if (evCfg && evCfg.sg) {
                        for (const alias in aliasRefs) {
                            const refs = aliasRefs[alias];
                            if (!refs || !refs.segments || refs.segments.length === 0) {
                                continue;
                            }
                            const hasMaskedSeg = refs.segments.some(segName => evCfg.sg[segName]);
                            if (hasMaskedSeg && maskedRow[alias] !== undefined) {
                                delete maskedRow[alias];
                            }
                        }
                    }
                }

                // Remove empty objects
                if (maskedRow.sg && typeof maskedRow.sg === 'object' && Object.keys(maskedRow.sg).length === 0) {
                    delete maskedRow.sg;
                }
                if (maskedRow.up && typeof maskedRow.up === 'object' && Object.keys(maskedRow.up).length === 0) {
                    delete maskedRow.up;
                }
                if (maskedRow.custom && typeof maskedRow.custom === 'object' && Object.keys(maskedRow.custom).length === 0) {
                    delete maskedRow.custom;
                }
                if (maskedRow.cmp && typeof maskedRow.cmp === 'object' && Object.keys(maskedRow.cmp).length === 0) {
                    delete maskedRow.cmp;
                }

                return maskedRow;
            });

            return maskedResults;
        }
        catch (error) {
            log.e('Error masking results', error);
            return results;
        }
    }

    /**
     * Get masking settings for a specific app
     * @param {string} appId - Application ID
     * @returns {Object|null} Masking settings object
     */
    getMaskingSettings(appId) {
        try {
            if (!appId) {
                return null;
            }

            // Use the plugin system to get masking settings
            if (this.plugins && typeof this.plugins.getMaskingSettings === 'function') {
                return this.plugins.getMaskingSettings(appId);
            }

            return null;
        }
        catch (error) {
            log.e('Error getting masking settings', error);
            return null;
        }
    }
}

module.exports = DataMaskingService;
