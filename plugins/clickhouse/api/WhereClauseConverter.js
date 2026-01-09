const log = require('../../../api/utils/log.js')('clickhouse');
const countlyCommon = require('../../../api/lib/countly.common.js');
/**
 * Converts MongoDB-style query objects into ClickHouse SQL WHERE clauses with proper type handling
 * and parameterized queries for security and performance.
 */
class WhereClauseConverter {

    /** Map field names to their ClickHouse types */
    #specialFields = { 'ts': 'DateTime64(3)' };

    #meta = null;

    #operators = {
        COMPARISON: {
            '$gt': '>',
            '$gte': '>=',
            '$lt': '<',
            '$lte': '<=',
            '$ne': '!=',
            '$eq': '='
        },
        LOGICAL: {
            '$and': 'AND',
            '$or': 'OR',
            '$nor': 'NOR'
        },
        ARRAY: {
            '$in': 'IN',
            '$nin': 'NOT IN'
        }
    };

    /** SQL patterns for empty array edge cases */
    #sqlPatterns = {
        EMPTY_IN: '1 = 0',
        EMPTY_NIN: '1 = 1',
        EMPTY_OR: '(1 = 0)',
        EMPTY_AND: '(1 = 1)',
        EMPTY_NOR: '(1 = 1)'
    };

    /**
     * Creates a new WhereClauseConverter instance
     * @param {Object} [config={}] - Configuration options
     * @param {Object<string, string>} [config.specialFields] - Map of field names to ClickHouse types
     */
    constructor(config = {}) {
        if (config.specialFields) {
            this.#specialFields = { ...this.#specialFields, ...config.specialFields };
        }
        if (config.meta) {
            this.#meta = config.meta;
        }
    }

    /**
     * Converts values for special fields that require custom handling
     * @param {*} value - The value to convert
     * @param {string} type - The ClickHouse type
     * @returns {*} The converted value, or original value if no conversion needed
     * @private
     */
    #convertSpecialFieldValue(value, type) {
        if (type && type.startsWith('DateTime64')) {
            if (typeof value === 'number') {
                return value / 1000;
            }
            else if (value instanceof Date) {
                return value.getTime() / 1000;
            }
            else if (typeof value === 'string') {
                return new Date(value).getTime() / 1000;
            }
        }
        return value;
    }

    /**
     * Infers the appropriate ClickHouse type for a JavaScript value
     * @param {*} val - The value to analyze
     * @param {string|null} [fieldName=null] - Optional field name for special field lookup
     * @returns {string} ClickHouse type string
     * @private
     */
    #inferType(val, fieldName = null) {
        if (fieldName && this.#specialFields[fieldName]) {
            return this.#specialFields[fieldName];
        }
        if (val === null || val === undefined) {
            return 'Nullable(String)';
        }
        if (Array.isArray(val)) {
            return `Array(${this.#inferType(val[0])})`;
        }
        switch (typeof val) {
        case 'number':
            return 'Float64';
        case 'boolean':
            return 'Bool';
        case 'object':
            if (val instanceof Date) {
                return 'DateTime';
            }
            return 'String';
        default:
            return 'String';
        }
    }

    /**
     * Gets the ClickHouse data type for a field from metadata
     * @param {string} field  - field name
     * @returns {string} ClickHouse data type
     */
    #getDataTypeFromMeta(field) {
        if (this.#meta) {
            let prefix = "sg",
                firstDot = field.indexOf(".");

            if (firstDot !== -1) {
                prefix = field.substring(0, firstDot);
                field = field.substring(firstDot + 1);
            }
            return countlyCommon.getDescendantProp(this.#meta, (prefix === "up") ? `${field}.type` : `${prefix}.${field}.type`);
        }
        else {
            return "";
        }
    }

    /**
     * Adds a SQL condition and its parameters to the accumulator arrays
     * @param {string[]} parts - Array to accumulate SQL fragments
     * @param {any[]} paramsArr - Array to accumulate parameter values
     * @param {string} sql - SQL fragment to add
     * @param {...any} vals - Parameter values to add
     * @private
     */
    #pushCondition(parts, paramsArr, sql, ...vals) {
        parts.push(sql);
        paramsArr.push(...vals);
    }

    /**
     * Creates a null-safe comparison expression for MongoDB compatibility
     * @param {string} field - Field name
     * @param {string} operator - SQL comparison operator
     * @param {*} value - Value being compared (used for type inference)
     * @returns {string} SQL expression with proper type casting
     * @private
     */
    #createNullSafeComparison(field, operator, value) {
        const type = this.#inferType(value);
        const quotedField = this.#quoteFieldName(field);

        if (type === 'Float64') {
            return `toFloat64OrNull(CAST(${quotedField}, 'String')) ${operator} ?`;
        }
        else {
            return `${quotedField}::${type} ${operator} ?`;
        }
    }

    /**
     * Converts SQL with ? placeholders to ClickHouse format with typed parameters
     * @param {string} sql - SQL string with ? placeholders
     * @param {any[]} paramValues - Array of parameter values
     * @param {string[]} [fieldNames=[]] - Optional field names for type inference
     * @param {number} [indexOffset=0] - Optional index offset for parameter naming
     * @returns {{sql: string, params: Object}} ClickHouse-formatted SQL and parameters
     * @private
     */
    #convertPlaceholders(sql, paramValues, fieldNames = [], indexOffset = 0) {
        if (!paramValues.length) {
            return { sql, params: {} };
        }
        let parameterIndex = 0;
        const params = {};
        const convertedSql = sql.replace(/\?/g, () => {
            const value = paramValues[parameterIndex];
            const paramName = `p${parameterIndex + indexOffset}`;
            params[paramName] = value;
            const fieldName = fieldNames[parameterIndex];
            const type = this.#inferType(value, fieldName);
            parameterIndex += 1;
            return `{${paramName}:${type}}`;
        });
        return { sql: convertedSql, params };
    }

    /**
     * Checks if an expression is a field-level $not operator
     * @param {*} expr - Expression to check
     * @returns {boolean} True if this is a field-level $not expression
     * @private
     */
    #isFieldLevelNot(expr) {
        return expr && typeof expr === 'object' && expr.$not !== undefined;
    }

    /**
     * Checks if an expression is a literal value (not an operator object)
     * @param {*} expr - Expression to check
     * @returns {boolean} True if this is a literal value for equality comparison
     * @private
     */
    #isLiteralValue(expr) {
        return !expr || typeof expr !== 'object' || Array.isArray(expr);
    }

    /**
     * Handles direct equality comparison for literal values
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name
     * @param {*} expr - Literal value
     * @param {boolean} isNot - Whether to negate the condition
     * @private
     */
    #handleLiteralEquality(parts, paramsArr, fieldNamesArr, field, expr, isNot) {
        // Handle NULL equality with proper SQL semantics
        if (expr === null || expr === undefined) {
            const quotedField = this.#quoteFieldName(field);
            const condition = `${quotedField} IS NULL`;
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${condition})` : condition);
            return;
        }

        const typedField = this.#getTypedField(field, expr);
        const sql = `${typedField} = ?`;
        const convertedValue = this.#convertValueForField(field, expr);
        fieldNamesArr.push(field);
        this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, convertedValue);
    }

    /**
     * Quotes field names by splitting on dots and quoting each part individually
     * This handles dotted field names like sg.button-name → `sg`.`button-name`
     * @param {string} fieldName - Name of the field to quote
     * @returns {string} Quoted field name with dots properly handled
     * @private
     */
    #quoteFieldName(fieldName) {
        // Split on dots and handle each part for ClickHouse compatibility
        const parts = fieldName.split('.');
        let result = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Numeric array index parts are assumed to be 0-based (e.g., from MongoDB),
            // and are converted to 1-based for ClickHouse bracket notation.
            if (/^\d+$/.test(part)) {
                const index = parseInt(part, 10) + 1;
                result += `[${index}]`;
            }
            else {
                // Regular field name - escape backticks and quote
                const escaped = part.replace(/`/g, '``');
                if (i > 0) {
                    result += '.';
                }
                result += `\`${escaped}\``;
            }
        }

        return result;
    }

    /**
     * Generates a field name with appropriate ClickHouse type casting
     * @param {string} fieldName - Name of the field
     * @param {*} value - Value being compared (for type inference)
     * @returns {string} Field name with type casting
     * @private
     */
    #getTypedField(fieldName, value) {
        const quotedFieldName = this.#quoteFieldName(fieldName);
        const specialType = this.#specialFields[fieldName];
        if (specialType && specialType.startsWith('DateTime64')) {
            return quotedFieldName;
        }
        const type = this.#inferType(value);
        if (type === 'Float64') {
            // Use tolerant conversion for numeric types to match MongoDB behavior
            return `toFloat64OrNull(CAST(${quotedFieldName}, 'String'))`;
        }
        return `${quotedFieldName}::${type}`;
    }

    /**
     * Converts a single value for a specific field, applying special field handling
     * @param {string} fieldName - Name of the field
     * @param {*} value - Value to convert
     * @returns {*} Converted value
     * @private
     */
    #convertValueForField(fieldName, value) {
        const specialType = this.#specialFields[fieldName];
        return specialType ? this.#convertSpecialFieldValue(value, specialType) : value;
    }

    /**
     * Converts an array of values for a specific field, applying special field handling
     * @param {string} fieldName - Name of the field
     * @param {any[]} values - Array of values to convert
     * @returns {any[]} Array of converted values
     * @private
     */
    #convertValuesForField(fieldName, values) {
        const specialType = this.#specialFields[fieldName];
        return specialType ? values.map(v => this.#convertSpecialFieldValue(v, specialType)) : values;
    }

    /**
     * Handles MongoDB comparison operators ($gt, $gte, $lt, $lte, $ne)
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name
     * @param {string} op - MongoDB operator
     * @param {*} val - Comparison value
     * @param {boolean} isNot - Whether to negate the condition
     * @private
     */
    #handleComparisonOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot) {
        // Handle $ne with null specially
        if (op === '$ne' && (val === null || val === undefined)) {
            const quotedField = this.#quoteFieldName(field);
            const condition = `${quotedField} IS NOT NULL`;
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${condition})` : condition);
            return;
        }

        let sql;
        const specialType = this.#specialFields[field];
        const operator = this.#operators.COMPARISON[op];

        if (specialType) {
            const quotedField = this.#quoteFieldName(field);
            sql = `${quotedField} ${operator} ?`;
        }
        else {
            sql = this.#createNullSafeComparison(field, operator, val);
        }

        const value = this.#convertValueForField(field, val);
        fieldNamesArr.push(field);
        this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, value);
    }

    /**
     * Handles MongoDB array operators ($in, $nin, $all)
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name
     * @param {string} op - MongoDB operator
     * @param {any[]} val - Array of values
     * @param {boolean} isNot - Whether to negate the condition
     * @private
     */
    #handleArrayOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot) {
        let sql;
        if (field === 'uid') {
            //list with validated uid's. We have to make sure they get validated.
            const typedField = this.#getTypedField(field, val[0]);
            const sqlOperator = this.#operators.ARRAY[op];
            //UIDS can be just numbers, letters 
            /*["0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
            "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
            "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];*/
            val = val.filter(function(uid) {
                return typeof uid === "string" && uid.match(/^[0-9a-zA-Z]+$/);
            });
            sql = `${typedField} ${sqlOperator} (${"'" + val.join("', '") + "'"})`;
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql);
        }
        else {
            if (op === '$in' || op === '$nin') {
                if (!Array.isArray(val) || val.length === 0) {
                    sql = op === '$in' ? this.#sqlPatterns.EMPTY_IN : this.#sqlPatterns.EMPTY_NIN;
                    this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql);
                    return;
                }

                const typedField = this.#getTypedField(field, val[0]);
                const placeholderList = val.map(() => '?').join(',');
                const sqlOperator = this.#operators.ARRAY[op];

                sql = `${typedField} ${sqlOperator} (${placeholderList})`;
                var fieldType = this.#getDataTypeFromMeta(field);
                if (fieldType === 'a') {
                    sql = `hasAny(${this.#quoteFieldName(field)}, [${placeholderList}])`;
                    if (op === '$nin') {
                        sql = `NOT hasAny(${this.#quoteFieldName(field)}, [${placeholderList}])`;
                    }
                }
                else {
                    sql = `${typedField} ${sqlOperator} (${placeholderList})`;
                }

            }
            else if (op === '$all') {
                // Empty $all is always true (matches all documents)
                if (!Array.isArray(val) || val.length === 0) {
                    sql = '1 = 1';
                    this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : `(${sql})`);
                    return;
                }

                const quotedField = this.#quoteFieldName(field);
                const placeholderList = val.map(() => '?').join(',');
                sql = `hasAll(${quotedField}, [${placeholderList}])`;
            }

            const values = this.#convertValuesForField(field, val);
            for (let i = 0; i < values.length; i++) {
                fieldNamesArr.push(field);
            }

            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, ...values);
        }
    }

    /**
     * Handles MongoDB string/regex operators ($regex, rgxcn, rgxntc, rgxbw, rgxitl)
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name
     * @param {string} op - MongoDB operator
     * @param {*} val - String/regex value
     * @param {boolean} isNot - Whether to negate the condition
     * @private
     */
    #handleStringOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot) {
        const typedField = this.#getTypedField(field, val);
        let sql;

        switch (op) {
        case '$regex':
        case 'rgxcn':
            sql = `match(${typedField}, ?)`;
            break;
        case 'rgxntc':
            sql = `NOT match(${typedField}, ?)`;
            break;
        case 'rgxbw':
            sql = `startsWith(${typedField}, ?)`;
            break;
        case 'rgxitl':
            sql = `match(${typedField}, ?)`;
            break;
        }
        if (typeof val === 'object' && val instanceof RegExp) {
            try {
                val = val.source;
            }
            catch (e) {
                log.e(e);
            }
        }
        fieldNamesArr.push(field);
        const finalVal = op === 'rgxitl' ? `(?i)${val}` : val;
        this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, finalVal);
    }

    /**
     * Handles MongoDB special operators ($exists, $size)
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name
     * @param {string} op - MongoDB operator
     * @param {*} val - Operator value
     * @param {boolean} isNot - Whether to negate the condition
     * @private
     */
    #handleSpecialOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot) {
        if (op === '$exists') {
            const quotedField = this.#quoteFieldName(field);
            const condition = val ? `${quotedField} IS NOT NULL` : `${quotedField} IS NULL`;
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${condition})` : condition);
        }
        else if (op === '$size') {
            const quotedField = this.#quoteFieldName(field);
            const sql = `length(${quotedField}) = ?`;
            fieldNamesArr.push(field);
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, val);
        }
    }

    /**
     * Routes MongoDB operators to their appropriate handlers
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name
     * @param {string} op - MongoDB operator
     * @param {*} val - Operator value
     * @param {boolean} isNot - Whether to negate the condition
     * @private
     */
    #handleOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot) {
        if (this.#operators.COMPARISON[op]) {
            this.#handleComparisonOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot);
        }
        else if (op === '$in' || op === '$nin' || op === '$all') {
            this.#handleArrayOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot);
        }
        else if (op === '$regex' || op === 'rgxcn' || op === 'rgxntc' || op === 'rgxbw' || op === 'rgxitl') {
            this.#handleStringOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot);
        }
        else if (op === '$exists' || op === '$size') {
            this.#handleSpecialOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot);
        }
        else if (op === '$ne') {
            const sql = this.#createNullSafeComparison(field, '!=', val);
            const value = this.#convertValueForField(field, val);
            fieldNamesArr.push(field);
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, value);
        }
        else {
            throw new Error(`Unsupported operator ${op}`);
        }
    }

    /**
     * Processes logical operators ($and, $or, $nor) from a query
     * @param {Object} query - MongoDB query object
     * @param {any[]} params - Parameters accumulator
     * @param {string[]} fieldNames - Field names accumulator
     * @param {boolean} isNot - Whether to negate the condition
     * @returns {string[]} Array of logical expressions
     * @private
     */
    #processLogicalOperators(query, params, fieldNames, isNot) {
        const logicalOps = [];

        // Process each logical operator separately to handle multiple logical operators in one query
        for (const logicalOp of ['$and', '$or', '$nor']) {
            if (query[logicalOp]) {
                const op = logicalOp === '$and' ? 'AND' : logicalOp === '$or' ? 'OR' : 'NOR';
                const subQueries = query[logicalOp];

                if (Array.isArray(subQueries) && subQueries.length === 0) {
                    if (op === 'OR') {
                        logicalOps.push(this.#sqlPatterns.EMPTY_OR);
                    }
                    else {
                        logicalOps.push(this.#sqlPatterns.EMPTY_AND);
                    }
                }
                else {
                    const fragments = [];
                    for (const subQuery of subQueries) {
                        const { sql, params: subParams, fieldNames: subFieldNames } = this.#walkQuery(subQuery);
                        params.push(...subParams);
                        fieldNames.push(...subFieldNames);
                        if (sql) {
                            // For OR operations, parenthesize fragments that contain AND operations
                            // to ensure proper operator precedence
                            if (op === 'OR' && sql.includes(' AND ') && !sql.startsWith('(')) {
                                fragments.push(`(${sql})`);
                            }
                            else {
                                fragments.push(sql);
                            }
                        }
                    }

                    if (fragments.length > 0) {
                        const innerSql = fragments.join(` ${op === 'NOR' ? 'OR' : op} `);
                        const expression = op === 'NOR' ? `NOT (${innerSql})` :
                            isNot ? `NOT (${innerSql})` : `(${innerSql})`;
                        logicalOps.push(expression);
                    }
                }
            }
        }

        return logicalOps;
    }

    /**
     * Parses a single field and its expression into SQL parts and parameters
     * @param {string[]} parts - SQL parts accumulator
     * @param {any[]} paramsArr - Parameters accumulator
     * @param {string[]} fieldNamesArr - Field names accumulator
     * @param {string} field - Field name to process
     * @param {*} expr - Field expression (literal value or operator object)
     * @param {boolean} [isNot=false] - Whether to negate the condition
     * @private
     */
    #parseField(parts, paramsArr, fieldNamesArr, field, expr, isNot = false) {
        // Special synthetic field: sSearch → case-insensitive LIKE
        // Supports either a string (defaults to search on e only) or
        // an array of { field: string, value: string } to control target fields

        if (expr && expr.$not && expr.$not instanceof RegExp) {
            try {
                expr.$not = {"$regex": expr.$not.source};
            }
            catch (e) {
                log.e(e);
            }
        }

        if (field === 'sSearch') {
            // Handle $not operator for sSearch
            if (expr && typeof expr === 'object' && expr.$not !== undefined) {
                this.#parseField(parts, paramsArr, fieldNamesArr, field, expr.$not, !isNot);
                return;
            }
            if (Array.isArray(expr) && expr.length > 0) {
                const fragments = [];
                const values = [];
                const fields = [];
                for (const item of expr) {
                    if (!item || typeof item.field !== 'string' || item.field.length === 0 || typeof item.value !== 'string' || item.value.length === 0) {
                        continue;
                    }
                    const escaped = item.value.replace(/([%_\\])/g, '\\$1');
                    const quotedField = this.#quoteFieldName(item.field);
                    fragments.push(`lower(${quotedField}) LIKE lower(?)`);
                    values.push(`%${escaped}%`);
                    fields.push(item.field);
                }
                if (fragments.length > 0) {
                    const composite = `(${fragments.join(' OR ')})`;
                    this.#pushCondition(parts, paramsArr, isNot ? `NOT (${composite})` : composite, ...values);
                    for (const f of fields) {
                        fieldNamesArr.push(f);
                    }
                }
                return;
            }
            if (typeof expr === 'string' && expr.length > 0) {
                const escaped = expr.replace(/([%_\\])/g, '\\$1');
                const sql = '(lower(`e`) LIKE lower(?) OR lower(`n`) LIKE lower(?))';
                this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, `%${escaped}%`, `%${escaped}%`);
                fieldNamesArr.push('e');
                fieldNamesArr.push('n');
            }
            return;
        }

        if (this.#isFieldLevelNot(expr)) {
            // Handle empty $not: {} as existence check
            if (Object.keys(expr.$not).length === 0) {
                const quotedField = this.#quoteFieldName(field);
                const condition = `${quotedField} IS NOT NULL`;
                this.#pushCondition(parts, paramsArr, isNot ? `NOT (${condition})` : condition);
                return;
            }
            this.#parseField(parts, paramsArr, fieldNamesArr, field, expr.$not, !isNot);
            return;
        }

        if (this.#isLiteralValue(expr)) {
            this.#handleLiteralEquality(parts, paramsArr, fieldNamesArr, field, expr, isNot);
            return;
        }

        // Special handling for $regex with $options
        if (expr.$regex !== undefined && expr.$options !== undefined) {
            const regex = expr.$regex;
            const options = expr.$options;
            const typedField = this.#getTypedField(field, regex);
            let sql;

            if (options.includes('i')) {
                // Case-insensitive regex - use (?i) flag
                sql = `match(${typedField}, ?)`;
            }
            else {
                sql = `match(${typedField}, ?)`;
            }

            fieldNamesArr.push(field);
            const finalRegex = options.includes('i') ? `(?i)${regex}` : regex;
            this.#pushCondition(parts, paramsArr, isNot ? `NOT (${sql})` : sql, finalRegex);
            return;
        }

        for (const [op, val] of Object.entries(expr)) {
            // Skip $options if it's paired with $regex (already handled above)
            if (op === '$options' && expr.$regex !== undefined) {
                continue;
            }
            this.#handleOperator(parts, paramsArr, fieldNamesArr, field, op, val, isNot);
        }
    }

    /**
     * Recursively processes a MongoDB query object into SQL fragments
     * @param {Object} query - MongoDB-style query object
     * @param {boolean} [isNot=false] - Whether to negate the entire query
     * @returns {{sql: string, params: any[], fieldNames: string[]}} SQL and parameters
     * @throws {Error} When query is not a valid object
     * @private
     */
    #walkQuery(query, isNot = false) {
        const sqlParts = [];
        const params = [];
        const fieldNames = [];

        if (!query || typeof query !== 'object' || Array.isArray(query)) {
            throw new Error('Unexpected literal at root: ' + query);
        }

        const logicalExpressions = this.#processLogicalOperators(query, params, fieldNames, isNot);

        if (query.$not !== undefined) {
            const { sql, params: subParams, fieldNames: subFieldNames } = this.#walkQuery(query.$not, false);
            params.push(...subParams);
            fieldNames.push(...subFieldNames);
            if (sql) {
                // Ensure proper parenthesization for NOT
                sqlParts.push(`NOT (${sql})`);
            }
        }

        for (const [field, expression] of Object.entries(query)) {
            if (field === '$comment' || field === '$and' || field === '$or' || field === '$nor' || field === '$not') {
                continue;
            }
            this.#parseField(sqlParts, params, fieldNames, field, expression, isNot);
        }

        const allConditions = [...logicalExpressions, ...sqlParts].filter(Boolean);
        return { sql: this.#joinConditionsWithProperPrecedence(allConditions), params, fieldNames };
    }

    /**
     * Joins conditions with proper operator precedence awareness
     * @param {string[]} conditions - Array of SQL condition strings
     * @returns {string} Properly joined SQL conditions
     * @private
     */
    #joinConditionsWithProperPrecedence(conditions) {
        if (conditions.length === 0) {
            return '';
        }
        if (conditions.length === 1) {
            return conditions[0];
        }

        // Separate OR-containing expressions from simple AND expressions
        const orConditions = [];
        const andConditions = [];

        for (const condition of conditions) {
            // Check if this is an OR expression that needs special handling
            if (condition.includes(' OR ') && !condition.startsWith('(')) {
                orConditions.push(`(${condition})`);
            }
            else {
                andConditions.push(condition);
            }
        }

        // Join all conditions with AND, ensuring OR expressions are properly parenthesized
        return [...orConditions, ...andConditions].join(' AND ');
    }

    /**
     * Turn Countly queryObject into { sql, params }
     * @param {Object} query - MongoDB-style query object
     * @param {number} [indexOffset=0] - Optional index offset for parameter naming
     * @returns {{sql: string, params: Object}} SQL WHERE clause and parameters
     */
    queryObjToWhere(query = {}, indexOffset) {
        const { sql: rawSql, params: paramArray, fieldNames } = this.#walkQuery(query);
        const { sql: typedSql, params: typedParams } = this.#convertPlaceholders(rawSql, paramArray, fieldNames, indexOffset);

        return {
            sql: typedSql ? `WHERE ${typedSql}` : '',
            params: typedParams,
            cn: paramArray.length
        };
    }
}

module.exports = WhereClauseConverter;
