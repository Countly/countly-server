'use strict';

const { ObjectId } = require('./objectId');

class UpdateTranslator {
  constructor() {
    this.paramIndex = 0;
    this.params = [];
  }

  reset(startIndex = 0, existingParams = []) {
    this.paramIndex = startIndex;
    this.params = [...existingParams];
  }

  nextParam(value) {
    this.paramIndex++;
    this.params.push(value);
    return `$${this.paramIndex}`;
  }

  /**
   * Translate a MongoDB update document into SQL SET clause.
   * Returns { setClauses: string[], params: any[], startParamIndex }
   */
  translateUpdate(update, startParamIndex = 0, existingParams = []) {
    this.reset(startParamIndex, existingParams);

    // Check if this is a replacement document (no $ operators)
    const keys = Object.keys(update);
    const hasOperators = keys.some(k => k.startsWith('$'));

    if (!hasOperators) {
      // Full document replacement
      return this._translateReplacement(update);
    }

    // Build up a series of JSONB transformations
    let dataExpr = 'data';

    for (const [op, fields] of Object.entries(update)) {
      switch (op) {
        case '$set':
          dataExpr = this._translateSet(dataExpr, fields);
          break;
        case '$unset':
          dataExpr = this._translateUnset(dataExpr, fields);
          break;
        case '$inc':
          dataExpr = this._translateInc(dataExpr, fields);
          break;
        case '$mul':
          dataExpr = this._translateMul(dataExpr, fields);
          break;
        case '$min':
          dataExpr = this._translateMinMax(dataExpr, fields, 'min');
          break;
        case '$max':
          dataExpr = this._translateMinMax(dataExpr, fields, 'max');
          break;
        case '$rename':
          dataExpr = this._translateRename(dataExpr, fields);
          break;
        case '$push':
          dataExpr = this._translatePush(dataExpr, fields);
          break;
        case '$pull':
          dataExpr = this._translatePull(dataExpr, fields);
          break;
        case '$pop':
          dataExpr = this._translatePop(dataExpr, fields);
          break;
        case '$addToSet':
          dataExpr = this._translateAddToSet(dataExpr, fields);
          break;
        case '$currentDate':
          dataExpr = this._translateCurrentDate(dataExpr, fields);
          break;
        case '$bit':
          dataExpr = this._translateBit(dataExpr, fields);
          break;
        case '$setOnInsert':
          // Handled separately in upsert logic
          break;
        default:
          throw new Error(`Unsupported update operator: ${op}`);
      }
    }

    return {
      setClause: `data = ${dataExpr}`,
      params: this.params,
      dataExpr
    };
  }

  /**
   * Translate $setOnInsert for upsert operations
   */
  translateSetOnInsert(update, startParamIndex = 0, existingParams = []) {
    if (!update.$setOnInsert) return null;
    this.reset(startParamIndex, existingParams);
    let dataExpr = 'data';
    dataExpr = this._translateSet(dataExpr, update.$setOnInsert);
    return {
      setClause: `data = ${dataExpr}`,
      params: this.params,
      dataExpr
    };
  }

  _translateReplacement(doc) {
    const cleanDoc = { ...doc };
    delete cleanDoc._id; // _id cannot be changed
    const param = this.nextParam(JSON.stringify(this._toJsonValue(cleanDoc)));
    return {
      setClause: `data = ${param}::jsonb`,
      params: this.params,
      dataExpr: `${param}::jsonb`
    };
  }

  _translateSet(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const jsonValue = JSON.stringify(this._toJsonValue(value));
      const param = this.nextParam(jsonValue);

      if (field.includes('.')) {
        dataExpr = this._setNestedField(dataExpr, field, `${param}::jsonb`);
      } else {
        dataExpr = `jsonb_set(${dataExpr}, ${this.nextParam(`{${field}}`)}, ${param}::jsonb, true)`;
      }
    }
    return dataExpr;
  }

  _translateUnset(dataExpr, fields) {
    for (const field of Object.keys(fields)) {
      if (field.includes('.')) {
        const parts = field.split('.');
        const pathParam = this.nextParam(`{${parts.join(',')}}`);
        dataExpr = `${dataExpr} #- ${pathParam}`;
      } else {
        dataExpr = `${dataExpr} - ${this.nextParam(field)}`;
      }
    }
    return dataExpr;
  }

  _translateInc(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const valParam = this.nextParam(value);
      // Extract current value, add increment, set back
      const textPath = this._fieldToTextExtract(field, dataExpr);
      dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, to_jsonb(COALESCE((${textPath})::numeric, 0) + ${valParam}), true)`;
    }
    return dataExpr;
  }

  _translateMul(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const valParam = this.nextParam(value);
      const textPath = this._fieldToTextExtract(field, dataExpr);
      dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, to_jsonb(COALESCE((${textPath})::numeric, 0) * ${valParam}), true)`;
    }
    return dataExpr;
  }

  _translateMinMax(dataExpr, fields, func) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const valParam = this.nextParam(value);
      const textPath = this._fieldToTextExtract(field, dataExpr);
      if (typeof value === 'number') {
        const sqlFunc = func === 'min' ? 'LEAST' : 'GREATEST';
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, to_jsonb(${sqlFunc}(COALESCE((${textPath})::numeric, ${valParam}), ${valParam})), true)`;
      } else {
        // For non-numeric, use string comparison
        const jsonVal = JSON.stringify(this._toJsonValue(value));
        const jsonParam = this.nextParam(jsonVal);
        const cmp = func === 'min' ? '<' : '>';
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, CASE WHEN ${textPath} IS NULL OR ${jsonParam}::jsonb ${cmp} ${this._fieldToJsonExtract(field, dataExpr)} THEN ${jsonParam}::jsonb ELSE ${this._fieldToJsonExtract(field, dataExpr)} END, true)`;
      }
    }
    return dataExpr;
  }

  _translateRename(dataExpr, fields) {
    for (const [oldField, newField] of Object.entries(fields)) {
      // Get old value, set at new path, remove old path
      const oldPath = this._fieldToPathArray(oldField);
      const newPath = this._fieldToPathArray(newField);
      const oldJsonPath = this._fieldToJsonExtract(oldField, dataExpr);
      dataExpr = `jsonb_set(${dataExpr} #- ${this.nextParam(oldPath)}, ${this.nextParam(newPath)}, ${oldJsonPath}, true)`;
    }
    return dataExpr;
  }

  _translatePush(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const currentArray = this._fieldToJsonExtract(field, dataExpr);

      if (value !== null && typeof value === 'object' && !Array.isArray(value) && value.$each) {
        // Handle $each, $sort, $slice, $position
        let items = value.$each;
        let arrayExpr = `COALESCE(${currentArray}, '[]'::jsonb)`;

        if (value.$position !== undefined) {
          // Insert at position
          const jsonItems = JSON.stringify(items.map(v => this._toJsonValue(v)));
          const itemsParam = this.nextParam(jsonItems);
          const posParam = this.nextParam(value.$position);
          arrayExpr = `(
            SELECT jsonb_agg(elem ORDER BY idx)
            FROM (
              SELECT elem, idx FROM jsonb_array_elements(
                (SELECT jsonb_agg(elem) FROM (
                  SELECT elem, row_number() OVER () - 1 AS pos FROM jsonb_array_elements(${arrayExpr}) AS elem
                ) sub
                WHERE pos < ${posParam})
              ) WITH ORDINALITY AS t(elem, idx)
              UNION ALL
              SELECT elem, ${posParam} + row_number() OVER () - 0.5 FROM jsonb_array_elements(${itemsParam}::jsonb) AS elem
              UNION ALL
              SELECT elem, idx + 1000000 FROM (
                SELECT elem, row_number() OVER () - 1 AS pos FROM jsonb_array_elements(${arrayExpr}) AS elem
              ) sub2
              WITH ORDINALITY AS t(elem, idx)
              WHERE pos >= ${posParam}
            ) combined
          )`;
        } else {
          // Append items
          const jsonItems = JSON.stringify(items.map(v => this._toJsonValue(v)));
          const itemsParam = this.nextParam(jsonItems);
          arrayExpr = `${arrayExpr} || ${itemsParam}::jsonb`;
        }

        if (value.$sort !== undefined) {
          if (typeof value.$sort === 'number') {
            const dir = value.$sort === -1 ? 'DESC' : 'ASC';
            arrayExpr = `(SELECT COALESCE(jsonb_agg(elem ORDER BY elem ${dir}), '[]'::jsonb) FROM jsonb_array_elements(${arrayExpr}) AS elem)`;
          } else {
            // Sort by nested field
            const sortEntries = Object.entries(value.$sort);
            const orderParts = sortEntries.map(([sortField, sortDir]) => {
              const dir = sortDir === -1 ? 'DESC' : 'ASC';
              return `elem->>'${sortField}' ${dir}`;
            });
            arrayExpr = `(SELECT COALESCE(jsonb_agg(elem ORDER BY ${orderParts.join(', ')}), '[]'::jsonb) FROM jsonb_array_elements(${arrayExpr}) AS elem)`;
          }
        }

        if (value.$slice !== undefined) {
          if (value.$slice >= 0) {
            arrayExpr = `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(${arrayExpr}) AS elem LIMIT ${this.nextParam(value.$slice)}) sub)`;
          } else {
            const absSlice = Math.abs(value.$slice);
            arrayExpr = `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(${arrayExpr}) WITH ORDINALITY AS t(elem, idx) WHERE idx > jsonb_array_length(${arrayExpr}) - ${this.nextParam(absSlice)}) sub)`;
          }
        }

        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, ${arrayExpr}, true)`;
      } else {
        // Simple push
        const jsonValue = JSON.stringify(this._toJsonValue(value));
        const valParam = this.nextParam(jsonValue);
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, COALESCE(${currentArray}, '[]'::jsonb) || ${valParam}::jsonb, true)`;
      }
    }
    return dataExpr;
  }

  _translatePull(dataExpr, fields) {
    for (const [field, condition] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const currentArray = this._fieldToJsonExtract(field, dataExpr);

      if (condition !== null && typeof condition === 'object' && !Array.isArray(condition) &&
          !(condition instanceof RegExp)) {
        const keys = Object.keys(condition);
        if (keys.some(k => k.startsWith('$'))) {
          // Complex condition - use subquery filter
          // This handles operators like $gt, $in, etc.
          const filterParts = [];
          for (const [op, val] of Object.entries(condition)) {
            switch (op) {
              case '$eq':
                filterParts.push(`elem = ${this.nextParam(JSON.stringify(this._toJsonValue(val)))}::jsonb`);
                break;
              case '$ne':
                filterParts.push(`elem != ${this.nextParam(JSON.stringify(this._toJsonValue(val)))}::jsonb`);
                break;
              case '$gt':
                filterParts.push(`(elem#>>'{}')::numeric > ${this.nextParam(val)}`);
                break;
              case '$gte':
                filterParts.push(`(elem#>>'{}')::numeric >= ${this.nextParam(val)}`);
                break;
              case '$lt':
                filterParts.push(`(elem#>>'{}')::numeric < ${this.nextParam(val)}`);
                break;
              case '$lte':
                filterParts.push(`(elem#>>'{}')::numeric <= ${this.nextParam(val)}`);
                break;
              case '$in': {
                const inVals = val.map(v => `${this.nextParam(JSON.stringify(this._toJsonValue(v)))}::jsonb`);
                filterParts.push(`elem IN (${inVals.join(', ')})`);
                break;
              }
              default:
                // For object-matching conditions on array elements
                filterParts.push(`elem @> ${this.nextParam(JSON.stringify(this._toJsonValue({ [op]: val })))}::jsonb`);
            }
          }
          dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(${currentArray}, '[]'::jsonb)) AS elem WHERE NOT (${filterParts.join(' AND ')})), true)`;
        } else {
          // Match subdocument
          const condParam = this.nextParam(JSON.stringify(this._toJsonValue(condition)));
          dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(${currentArray}, '[]'::jsonb)) AS elem WHERE NOT elem @> ${condParam}::jsonb), true)`;
        }
      } else {
        // Simple value removal
        const condParam = this.nextParam(JSON.stringify(this._toJsonValue(condition)));
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(${currentArray}, '[]'::jsonb)) AS elem WHERE elem != ${condParam}::jsonb), true)`;
      }
    }
    return dataExpr;
  }

  _translatePop(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const currentArray = this._fieldToJsonExtract(field, dataExpr);

      if (value === 1) {
        // Remove last element
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(COALESCE(${currentArray}, '[]'::jsonb)) WITH ORDINALITY AS t(elem, idx) WHERE idx < jsonb_array_length(COALESCE(${currentArray}, '[]'::jsonb))) sub), true)`;
      } else {
        // Remove first element
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(COALESCE(${currentArray}, '[]'::jsonb)) WITH ORDINALITY AS t(elem, idx) WHERE idx > 1) sub), true)`;
      }
    }
    return dataExpr;
  }

  _translateAddToSet(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const currentArray = this._fieldToJsonExtract(field, dataExpr);

      if (value !== null && typeof value === 'object' && value.$each) {
        // Add multiple values, each only if not present
        for (const item of value.$each) {
          const jsonVal = JSON.stringify(this._toJsonValue(item));
          const valParam = this.nextParam(jsonVal);
          dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, CASE WHEN COALESCE(${currentArray}, '[]'::jsonb) @> ${this.nextParam(`[${jsonVal}]`)}::jsonb THEN COALESCE(${currentArray}, '[]'::jsonb) ELSE COALESCE(${currentArray}, '[]'::jsonb) || ${valParam}::jsonb END, true)`;
        }
      } else {
        const jsonVal = JSON.stringify(this._toJsonValue(value));
        const valParam = this.nextParam(jsonVal);
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, CASE WHEN COALESCE(${currentArray}, '[]'::jsonb) @> ${this.nextParam(`[${jsonVal}]`)}::jsonb THEN COALESCE(${currentArray}, '[]'::jsonb) ELSE COALESCE(${currentArray}, '[]'::jsonb) || ${valParam}::jsonb END, true)`;
      }
    }
    return dataExpr;
  }

  _translateCurrentDate(dataExpr, fields) {
    for (const [field, value] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);

      if (value === true || (typeof value === 'object' && value.$type === 'date')) {
        const dateParam = this.nextParam(JSON.stringify({ $date: new Date().toISOString() }));
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, ${dateParam}::jsonb, true)`;
      } else if (typeof value === 'object' && value.$type === 'timestamp') {
        const ts = Date.now();
        const tsParam = this.nextParam(ts);
        dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, to_jsonb(${tsParam}), true)`;
      }
    }
    return dataExpr;
  }

  _translateBit(dataExpr, fields) {
    for (const [field, operations] of Object.entries(fields)) {
      const path = this._fieldToPathArray(field);
      const pathParam = this.nextParam(path);
      const textPath = this._fieldToTextExtract(field, dataExpr);

      let bitExpr = `COALESCE((${textPath})::integer, 0)`;

      for (const [op, val] of Object.entries(operations)) {
        const valParam = this.nextParam(val);
        switch (op) {
          case 'and':
            bitExpr = `(${bitExpr}) & ${valParam}`;
            break;
          case 'or':
            bitExpr = `(${bitExpr}) | ${valParam}`;
            break;
          case 'xor':
            bitExpr = `(${bitExpr}) # ${valParam}`;
            break;
        }
      }

      dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, to_jsonb(${bitExpr}), true)`;
    }
    return dataExpr;
  }

  _setNestedField(dataExpr, field, valueExpr) {
    const parts = field.split('.');
    const pathArray = `{${parts.join(',')}}`;
    const pathParam = this.nextParam(pathArray);

    // Ensure intermediate objects exist
    let expr = dataExpr;
    for (let i = 0; i < parts.length - 1; i++) {
      const subPath = `{${parts.slice(0, i + 1).join(',')}}`;
      const subPathParam = this.nextParam(subPath);
      expr = `CASE WHEN ${expr} #> ${subPathParam} IS NULL THEN jsonb_set(${expr}, ${subPathParam}, '{}'::jsonb, true) ELSE ${expr} END`;
    }

    return `jsonb_set(${expr}, ${pathParam}, ${valueExpr}, true)`;
  }

  _fieldToPathArray(field) {
    const parts = field.split('.');
    return `{${parts.join(',')}}`;
  }

  _fieldToTextExtract(field, dataExpr) {
    const parts = field.split('.');
    if (parts.length === 1) {
      return `${dataExpr}->>'${parts[0]}'`;
    }
    const pathArray = parts.join(',');
    return `${dataExpr}#>>'{${pathArray}}'`;
  }

  _fieldToJsonExtract(field, dataExpr) {
    const parts = field.split('.');
    if (parts.length === 1) {
      return `${dataExpr}->'${parts[0]}'`;
    }
    const pathArray = parts.join(',');
    return `${dataExpr}#>'{${pathArray}}'`;
  }

  _toJsonValue(value) {
    if (value instanceof ObjectId) return value.toHexString();
    if (value instanceof Date) return { $date: value.toISOString() };
    if (value instanceof RegExp) return { $regex: value.source, $options: value.flags };
    if (Buffer.isBuffer(value)) return { $binary: value.toString('base64') };
    if (Array.isArray(value)) return value.map(v => this._toJsonValue(v));
    if (value !== null && typeof value === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this._toJsonValue(v);
      }
      return result;
    }
    return value;
  }
}

module.exports = { UpdateTranslator };
