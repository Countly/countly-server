'use strict';

const { ObjectId } = require('./objectId');

class QueryTranslator {
  constructor() {
    this.paramIndex = 0;
    this.params = [];
  }

  reset() {
    this.paramIndex = 0;
    this.params = [];
  }

  nextParam(value) {
    this.paramIndex++;
    this.params.push(value);
    return `$${this.paramIndex}`;
  }

  /**
   * Translate a MongoDB filter object into a SQL WHERE clause.
   * Returns { where: string, params: any[] }
   */
  translateFilter(filter) {
    this.reset();
    if (!filter || Object.keys(filter).length === 0) {
      return { where: 'TRUE', params: [] };
    }
    const clause = this._translateExpression(filter);
    return { where: clause, params: this.params };
  }

  _translateExpression(expr) {
    const parts = [];

    for (const key of Object.keys(expr)) {
      if (key.startsWith('$')) {
        parts.push(this._translateTopLevelOperator(key, expr[key]));
      } else {
        parts.push(this._translateField(key, expr[key]));
      }
    }

    if (parts.length === 0) return 'TRUE';
    if (parts.length === 1) return parts[0];
    return `(${parts.join(' AND ')})`;
  }

  _translateTopLevelOperator(op, value) {
    switch (op) {
      case '$and':
        return `(${value.map(v => this._translateExpression(v)).join(' AND ')})`;
      case '$or':
        return `(${value.map(v => this._translateExpression(v)).join(' OR ')})`;
      case '$nor':
        return `NOT (${value.map(v => this._translateExpression(v)).join(' OR ')})`;
      case '$not':
        return `NOT (${this._translateExpression(value)})`;
      case '$where':
        // $where with JS expressions cannot be directly translated
        throw new Error('$where operator is not supported in PostgreSQL compatibility layer');
      case '$expr':
        return this._translateExprOperator(value);
      case '$text':
        return this._translateTextSearch(value);
      case '$comment':
        return 'TRUE'; // Comments are ignored
      default:
        throw new Error(`Unsupported top-level operator: ${op}`);
    }
  }

  _translateField(field, condition) {
    // Handle _id field specially - it's a column, not in JSONB
    if (field === '_id') {
      return this._translateIdField(condition);
    }

    if (condition === null) {
      const path = this._fieldToJsonPath(field);
      return `(${path} IS NULL OR ${path} = 'null'::jsonb)`;
    }

    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition) &&
        !(condition instanceof RegExp) && !(condition instanceof ObjectId) && !(condition instanceof Date)) {
      const keys = Object.keys(condition);
      if (keys.length > 0 && keys.every(k => k.startsWith('$'))) {
        return this._translateFieldOperators(field, condition);
      }
    }

    // Direct equality
    return this._translateEquality(field, condition);
  }

  _translateIdField(condition) {
    if (condition === null) {
      return '_id IS NULL';
    }

    if (condition !== null && typeof condition === 'object' && !(condition instanceof ObjectId) && !(condition instanceof Date)) {
      if (condition instanceof RegExp) {
        const param = this.nextParam(condition.source);
        const flags = condition.flags.includes('i') ? '~*' : '~';
        return `_id ${flags} ${param}`;
      }

      const keys = Object.keys(condition);
      if (keys.length > 0 && keys.every(k => k.startsWith('$'))) {
        return this._translateIdOperators(condition);
      }
    }

    // Direct equality
    const val = this._extractValue(condition);
    const param = this.nextParam(String(val));
    return `_id = ${param}`;
  }

  _translateIdOperators(operators) {
    const parts = [];
    for (const [op, value] of Object.entries(operators)) {
      switch (op) {
        case '$eq': {
          const param = this.nextParam(String(this._extractValue(value)));
          parts.push(`_id = ${param}`);
          break;
        }
        case '$ne': {
          const param = this.nextParam(String(this._extractValue(value)));
          parts.push(`_id != ${param}`);
          break;
        }
        case '$gt': {
          const param = this.nextParam(String(this._extractValue(value)));
          parts.push(`_id > ${param}`);
          break;
        }
        case '$gte': {
          const param = this.nextParam(String(this._extractValue(value)));
          parts.push(`_id >= ${param}`);
          break;
        }
        case '$lt': {
          const param = this.nextParam(String(this._extractValue(value)));
          parts.push(`_id < ${param}`);
          break;
        }
        case '$lte': {
          const param = this.nextParam(String(this._extractValue(value)));
          parts.push(`_id <= ${param}`);
          break;
        }
        case '$in': {
          const vals = value.map(v => String(this._extractValue(v)));
          const param = this.nextParam(vals);
          parts.push(`_id = ANY(${param})`);
          break;
        }
        case '$nin': {
          const vals = value.map(v => String(this._extractValue(v)));
          const param = this.nextParam(vals);
          parts.push(`_id != ALL(${param})`);
          break;
        }
        case '$exists': {
          parts.push(value ? '_id IS NOT NULL' : '_id IS NULL');
          break;
        }
        case '$regex': {
          const flags = operators.$options || '';
          const regOp = flags.includes('i') ? '~*' : '~';
          const param = this.nextParam(value);
          parts.push(`_id ${regOp} ${param}`);
          break;
        }
        default:
          throw new Error(`Unsupported _id operator: ${op}`);
      }
    }
    return parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`;
  }

  _translateFieldOperators(field, operators) {
    const parts = [];
    const path = this._fieldToJsonPath(field);
    const textPath = this._fieldToTextPath(field);

    for (const [op, value] of Object.entries(operators)) {
      switch (op) {
        case '$eq':
          parts.push(this._translateEquality(field, value));
          break;
        case '$ne':
          if (value === null) {
            parts.push(`(${path} IS NOT NULL AND ${path} != 'null'::jsonb)`);
          } else {
            const param = this.nextParam(JSON.stringify(this._toJsonValue(value)));
            parts.push(`(${path} IS NULL OR ${path} != ${param}::jsonb)`);
          }
          break;
        case '$gt':
          parts.push(this._translateComparison(field, '>', value));
          break;
        case '$gte':
          parts.push(this._translateComparison(field, '>=', value));
          break;
        case '$lt':
          parts.push(this._translateComparison(field, '<', value));
          break;
        case '$lte':
          parts.push(this._translateComparison(field, '<=', value));
          break;
        case '$in':
          parts.push(this._translateIn(field, value, false));
          break;
        case '$nin':
          parts.push(this._translateIn(field, value, true));
          break;
        case '$exists':
          parts.push(this._translateExists(field, value));
          break;
        case '$type':
          parts.push(this._translateType(field, value));
          break;
        case '$regex': {
          const flags = operators.$options || '';
          const regOp = flags.includes('i') ? '~*' : '~';
          const param = this.nextParam(value instanceof RegExp ? value.source : value);
          parts.push(`${textPath} ${regOp} ${param}`);
          break;
        }
        case '$options':
          // Handled by $regex
          break;
        case '$not':
          parts.push(`NOT (${this._translateFieldOperators(field, value)})`);
          break;
        case '$elemMatch':
          parts.push(this._translateElemMatch(field, value));
          break;
        case '$size':
          parts.push(`jsonb_array_length(${path}) = ${this.nextParam(value)}`);
          break;
        case '$all':
          parts.push(this._translateAll(field, value));
          break;
        case '$mod': {
          const [divisor, remainder] = value;
          parts.push(`(${textPath})::numeric % ${this.nextParam(divisor)} = ${this.nextParam(remainder)}`);
          break;
        }
        case '$geoWithin':
        case '$geoIntersects':
        case '$near':
        case '$nearSphere':
          parts.push(this._translateGeo(field, op, value));
          break;
        case '$bitsAllClear':
        case '$bitsAllSet':
        case '$bitsAnyClear':
        case '$bitsAnySet':
          parts.push(this._translateBitwise(field, op, value));
          break;
        default:
          throw new Error(`Unsupported field operator: ${op}`);
      }
    }

    return parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`;
  }

  _translateEquality(field, value) {
    const path = this._fieldToJsonPath(field);

    if (value === null) {
      return `(${path} IS NULL OR ${path} = 'null'::jsonb)`;
    }

    if (value instanceof RegExp) {
      const textPath = this._fieldToTextPath(field);
      const flags = value.flags.includes('i') ? '~*' : '~';
      const param = this.nextParam(value.source);
      return `${textPath} ${flags} ${param}`;
    }

    if (Array.isArray(value)) {
      const param = this.nextParam(JSON.stringify(value.map(v => this._toJsonValue(v))));
      return `${path} = ${param}::jsonb`;
    }

    if (typeof value === 'object') {
      const param = this.nextParam(JSON.stringify(this._toJsonValue(value)));
      return `${path} = ${param}::jsonb`;
    }

    const param = this.nextParam(JSON.stringify(this._toJsonValue(value)));
    return `${path} = ${param}::jsonb`;
  }

  _translateComparison(field, sqlOp, value) {
    const textPath = this._fieldToTextPath(field);
    const path = this._fieldToJsonPath(field);

    if (value instanceof Date) {
      const param = this.nextParam(value.toISOString());
      return `${textPath} ${sqlOp} ${param}`;
    }

    if (typeof value === 'number') {
      const param = this.nextParam(value);
      return `(${textPath})::numeric ${sqlOp} ${param}`;
    }

    if (typeof value === 'string') {
      const param = this.nextParam(value);
      return `${textPath} ${sqlOp} ${param}`;
    }

    // For ObjectId and other types, compare as text
    const val = this._extractValue(value);
    const param = this.nextParam(String(val));
    return `${textPath} ${sqlOp} ${param}`;
  }

  _translateIn(field, values, negate) {
    if (field === '_id') {
      const vals = values.map(v => String(this._extractValue(v)));
      const param = this.nextParam(vals);
      return negate ? `_id != ALL(${param})` : `_id = ANY(${param})`;
    }

    const path = this._fieldToJsonPath(field);
    const jsonValues = values.map(v => {
      if (v === null) return 'null';
      return JSON.stringify(this._toJsonValue(v));
    });

    // Check if value is in array OR if the field itself matches one of the values
    const conditions = jsonValues.map(jv => {
      const param = this.nextParam(jv);
      return `${path} @> ${param}::jsonb`;
    });

    // Also handle the case where the field value equals one of the values
    const eqConditions = jsonValues.map(jv => {
      const param = this.nextParam(jv);
      return `${path} = ${param}::jsonb`;
    });

    const combined = [...conditions, ...eqConditions];
    const clause = `(${combined.join(' OR ')})`;
    return negate ? `NOT ${clause}` : clause;
  }

  _translateExists(field, value) {
    const parts = field.split('.');
    if (parts.length === 1) {
      const condition = `data ? ${this.nextParam(field)}`;
      return value ? condition : `NOT (${condition})`;
    }

    // For nested fields, check if the parent path contains the key
    const parentParts = parts.slice(0, -1);
    const lastKey = parts[parts.length - 1];
    const parentPath = this._buildJsonPath(parentParts);
    const condition = `${parentPath} ? ${this.nextParam(lastKey)}`;
    return value ? condition : `NOT (${condition})`;
  }

  _translateType(field, type) {
    const path = this._fieldToJsonPath(field);
    const typeMap = {
      'double': 'number', 1: 'number',
      'string': 'string', 2: 'string',
      'object': 'object', 3: 'object',
      'array': 'array', 4: 'array',
      'bool': 'boolean', 8: 'boolean',
      'boolean': 'boolean',
      'null': 'null', 10: 'null',
      'int': 'number', 16: 'number',
      'long': 'number', 18: 'number',
      'decimal': 'number', 19: 'number',
      'number': 'number'
    };

    if (Array.isArray(type)) {
      const types = type.map(t => typeMap[t] || t);
      const conditions = [...new Set(types)].map(t => `jsonb_typeof(${path}) = ${this.nextParam(t)}`);
      return `(${conditions.join(' OR ')})`;
    }

    const pgType = typeMap[type] || type;
    return `jsonb_typeof(${path}) = ${this.nextParam(pgType)}`;
  }

  _translateElemMatch(field, conditions) {
    // $elemMatch requires that at least one array element satisfies ALL conditions
    // We use a subquery with jsonb_array_elements
    const path = this._fieldToJsonPath(field);
    const subConditions = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (key.startsWith('$')) {
        // Operator on the element itself
        subConditions.push(this._translateElemOperator('elem', key, value));
      } else {
        // Field within the element
        subConditions.push(this._translateElemField(`elem->'${key}'`, `elem->>'${key}'`, value));
      }
    }

    return `EXISTS (SELECT 1 FROM jsonb_array_elements(${path}) AS elem WHERE ${subConditions.join(' AND ')})`;
  }

  _translateElemOperator(elemAlias, op, value) {
    switch (op) {
      case '$eq': {
        const param = this.nextParam(JSON.stringify(this._toJsonValue(value)));
        return `${elemAlias} = ${param}::jsonb`;
      }
      case '$ne': {
        const param = this.nextParam(JSON.stringify(this._toJsonValue(value)));
        return `${elemAlias} != ${param}::jsonb`;
      }
      case '$gt': {
        const param = this.nextParam(value);
        return typeof value === 'number'
          ? `(${elemAlias}#>>'{}')::numeric > ${param}`
          : `${elemAlias}#>>'{}' > ${param}`;
      }
      case '$gte': {
        const param = this.nextParam(value);
        return typeof value === 'number'
          ? `(${elemAlias}#>>'{}')::numeric >= ${param}`
          : `${elemAlias}#>>'{}' >= ${param}`;
      }
      case '$lt': {
        const param = this.nextParam(value);
        return typeof value === 'number'
          ? `(${elemAlias}#>>'{}')::numeric < ${param}`
          : `${elemAlias}#>>'{}' < ${param}`;
      }
      case '$lte': {
        const param = this.nextParam(value);
        return typeof value === 'number'
          ? `(${elemAlias}#>>'{}')::numeric <= ${param}`
          : `${elemAlias}#>>'{}' <= ${param}`;
      }
      case '$in': {
        const jsonValues = value.map(v => JSON.stringify(this._toJsonValue(v)));
        const conditions = jsonValues.map(jv => `${elemAlias} = ${this.nextParam(jv)}::jsonb`);
        return `(${conditions.join(' OR ')})`;
      }
      default:
        throw new Error(`Unsupported $elemMatch operator: ${op}`);
    }
  }

  _translateElemField(jsonPath, textPath, value) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.every(k => k.startsWith('$'))) {
        const parts = [];
        for (const [op, opVal] of Object.entries(value)) {
          parts.push(this._translateElemOperator(jsonPath, op, opVal));
        }
        return parts.join(' AND ');
      }
    }

    const param = this.nextParam(JSON.stringify(this._toJsonValue(value)));
    return `${jsonPath} = ${param}::jsonb`;
  }

  _translateAll(field, values) {
    const path = this._fieldToJsonPath(field);
    const conditions = values.map(v => {
      if (v !== null && typeof v === 'object' && v.$elemMatch) {
        return this._translateElemMatch(field, v.$elemMatch);
      }
      const param = this.nextParam(JSON.stringify([this._toJsonValue(v)]));
      return `${path} @> ${param}::jsonb`;
    });
    return `(${conditions.join(' AND ')})`;
  }

  _translateTextSearch(textSpec) {
    const search = textSpec.$search;
    const language = textSpec.$language || 'english';
    const param = this.nextParam(search);
    // Use PostgreSQL full-text search on the entire document
    return `to_tsvector(${this.nextParam(language)}, data::text) @@ plainto_tsquery(${this.nextParam(language)}, ${param})`;
  }

  _translateExprOperator(expr) {
    // $expr allows aggregation expressions in find queries
    // Support common comparison operators
    if (!expr || typeof expr !== 'object') return 'TRUE';

    const op = Object.keys(expr)[0];
    const args = expr[op];

    switch (op) {
      case '$eq':
        return `${this._exprToSql(args[0])} = ${this._exprToSql(args[1])}`;
      case '$ne':
        return `${this._exprToSql(args[0])} != ${this._exprToSql(args[1])}`;
      case '$gt':
        return `${this._exprToSql(args[0])} > ${this._exprToSql(args[1])}`;
      case '$gte':
        return `${this._exprToSql(args[0])} >= ${this._exprToSql(args[1])}`;
      case '$lt':
        return `${this._exprToSql(args[0])} < ${this._exprToSql(args[1])}`;
      case '$lte':
        return `${this._exprToSql(args[0])} <= ${this._exprToSql(args[1])}`;
      case '$and':
        return `(${args.map(a => this._translateExprOperator(a)).join(' AND ')})`;
      case '$or':
        return `(${args.map(a => this._translateExprOperator(a)).join(' OR ')})`;
      case '$not':
        return `NOT (${this._translateExprOperator(args[0])})`;
      default:
        throw new Error(`Unsupported $expr operator: ${op}`);
    }
  }

  _exprToSql(expr) {
    if (typeof expr === 'string' && expr.startsWith('$')) {
      // Field reference
      const field = expr.substring(1);
      if (field === '_id') return '_id';
      return this._fieldToTextPath(field);
    }
    return this.nextParam(expr);
  }

  /**
   * Translate MongoDB geospatial query operators to PostGIS SQL.
   * Requires the PostGIS extension to be enabled on the PostgreSQL database.
   *
   * MongoDB stores GeoJSON in document fields like:
   *   { location: { type: "Point", coordinates: [-73.97, 40.77] } }
   *
   * We convert the JSONB GeoJSON to a PostGIS geometry via ST_GeomFromGeoJSON
   * and apply the appropriate spatial function.
   */
  _translateGeo(field, op, value) {
    const path = this._fieldToJsonPath(field);
    // Build a PostGIS geometry from the document's GeoJSON field
    const docGeom = `ST_GeomFromGeoJSON(${path}::text)`;

    switch (op) {
      case '$geoWithin': {
        const queryGeom = this._geoQueryToGeom(value);
        return `ST_Within(${docGeom}, ${queryGeom})`;
      }
      case '$geoIntersects': {
        const geojson = value.$geometry;
        const param = this.nextParam(JSON.stringify(geojson));
        return `ST_Intersects(${docGeom}, ST_GeomFromGeoJSON(${param}))`;
      }
      case '$near': {
        return this._translateNear(docGeom, value, false);
      }
      case '$nearSphere': {
        return this._translateNear(docGeom, value, true);
      }
      default:
        throw new Error(`Unsupported geospatial operator: ${op}`);
    }
  }

  /**
   * Translate $near / $nearSphere.
   *
   * MongoDB syntax:
   *   { field: { $near: { $geometry: { type: "Point", coordinates: [...] }, $maxDistance: m, $minDistance: m } } }
   * or legacy:
   *   { field: { $near: [x, y], $maxDistance: d } }
   */
  _translateNear(docGeom, value, sphere) {
    let pointGeom;
    let maxDistance = null;
    let minDistance = null;

    if (value.$geometry) {
      const param = this.nextParam(JSON.stringify(value.$geometry));
      pointGeom = sphere
        ? `ST_GeomFromGeoJSON(${param})::geography`
        : `ST_GeomFromGeoJSON(${param})`;
      maxDistance = value.$maxDistance;
      minDistance = value.$minDistance;

      if (sphere) {
        // For sphere, docGeom also needs to be geography for meter-based distances
        const docGeog = `${docGeom}::geography`;
        const conditions = [];
        if (maxDistance != null) {
          conditions.push(`ST_DWithin(${docGeog}, ${pointGeom}, ${this.nextParam(maxDistance)})`);
        }
        if (minDistance != null) {
          conditions.push(`ST_Distance(${docGeog}, ${pointGeom}) >= ${this.nextParam(minDistance)}`);
        }
        if (conditions.length === 0) {
          return 'TRUE'; // No distance constraint, just order by distance (handled in sort)
        }
        return conditions.join(' AND ');
      }
    } else if (Array.isArray(value)) {
      // Legacy format: { $near: [lng, lat] }
      const coords = value;
      const geojson = JSON.stringify({ type: 'Point', coordinates: coords });
      pointGeom = `ST_GeomFromGeoJSON(${this.nextParam(geojson)})`;
    } else if (value.$near && Array.isArray(value.$near)) {
      // Legacy nested
      const coords = value.$near;
      const geojson = JSON.stringify({ type: 'Point', coordinates: coords });
      pointGeom = `ST_GeomFromGeoJSON(${this.nextParam(geojson)})`;
      maxDistance = value.$maxDistance;
      minDistance = value.$minDistance;
    } else {
      // Already have $geometry extracted above, fallback
      pointGeom = `ST_MakePoint(0, 0)`;
    }

    const conditions = [];
    if (maxDistance != null) {
      conditions.push(`ST_DWithin(${docGeom}, ${pointGeom}, ${this.nextParam(maxDistance)})`);
    }
    if (minDistance != null) {
      conditions.push(`ST_Distance(${docGeom}, ${pointGeom}) >= ${this.nextParam(minDistance)}`);
    }
    if (conditions.length === 0) {
      return 'TRUE';
    }
    return conditions.join(' AND ');
  }

  /**
   * Convert MongoDB $geoWithin value to a PostGIS geometry.
   *
   * Supports:
   *   { $geometry: { type: "Polygon", coordinates: [...] } }
   *   { $centerSphere: [[lng, lat], radiusInRadians] }
   *   { $center: [[x, y], radius] }
   *   { $box: [[x1, y1], [x2, y2]] }
   *   { $polygon: [[x1,y1], [x2,y2], ...] }
   */
  _geoQueryToGeom(value) {
    if (value.$geometry) {
      const param = this.nextParam(JSON.stringify(value.$geometry));
      return `ST_GeomFromGeoJSON(${param})`;
    }

    if (value.$centerSphere) {
      const [[lng, lat], radiusRadians] = value.$centerSphere;
      // Convert radians to meters (Earth radius ≈ 6378100m)
      const radiusMeters = radiusRadians * 6378100;
      const centerParam = this.nextParam(JSON.stringify({ type: 'Point', coordinates: [lng, lat] }));
      const radiusParam = this.nextParam(radiusMeters);
      return `ST_Buffer(ST_GeomFromGeoJSON(${centerParam})::geography, ${radiusParam})::geometry`;
    }

    if (value.$center) {
      const [[x, y], radius] = value.$center;
      const centerParam = this.nextParam(JSON.stringify({ type: 'Point', coordinates: [x, y] }));
      const radiusParam = this.nextParam(radius);
      return `ST_Buffer(ST_GeomFromGeoJSON(${centerParam}), ${radiusParam})`;
    }

    if (value.$box) {
      const [[x1, y1], [x2, y2]] = value.$box;
      return `ST_MakeEnvelope(${this.nextParam(x1)}, ${this.nextParam(y1)}, ${this.nextParam(x2)}, ${this.nextParam(y2)}, 4326)`;
    }

    if (value.$polygon) {
      const points = value.$polygon;
      // Close the ring if not already closed
      const ring = [...points];
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
        ring.push(ring[0]);
      }
      const geojson = { type: 'Polygon', coordinates: [ring] };
      return `ST_GeomFromGeoJSON(${this.nextParam(JSON.stringify(geojson))})`;
    }

    throw new Error('Unsupported $geoWithin shape');
  }

  _translateBitwise(field, op, value) {
    const textPath = this._fieldToTextPath(field);
    const bitmask = typeof value === 'number' ? value : Array.isArray(value)
      ? value.reduce((mask, pos) => mask | (1 << pos), 0) : 0;

    switch (op) {
      case '$bitsAllSet':
        return `(${textPath})::integer & ${this.nextParam(bitmask)} = ${this.nextParam(bitmask)}`;
      case '$bitsAllClear':
        return `(${textPath})::integer & ${this.nextParam(bitmask)} = 0`;
      case '$bitsAnySet':
        return `(${textPath})::integer & ${this.nextParam(bitmask)} != 0`;
      case '$bitsAnyClear':
        return `(${textPath})::integer & ${this.nextParam(bitmask)} != ${this.nextParam(bitmask)}`;
      default:
        throw new Error(`Unsupported bitwise operator: ${op}`);
    }
  }

  /**
   * Translate MongoDB sort to SQL ORDER BY
   */
  translateSort(sort) {
    if (!sort) return '';
    const parts = [];

    const entries = sort instanceof Map ? [...sort.entries()] :
      Array.isArray(sort) ? sort : Object.entries(sort);

    for (const [field, direction] of entries) {
      const dir = direction === -1 || direction === 'desc' ? 'DESC' : 'ASC';
      if (field === '_id') {
        parts.push(`_id ${dir}`);
      } else {
        // Use JSONB path (not text extraction) so numbers sort numerically
        parts.push(`${this._fieldToJsonPath(field)} ${dir}`);
      }
    }

    return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : '';
  }

  /**
   * Translate MongoDB projection to SQL SELECT
   */
  translateProjection(projection) {
    if (!projection || Object.keys(projection).length === 0) {
      return { select: '_id, data', postProcess: null };
    }

    const entries = Object.entries(projection);
    const isInclusion = entries.some(([k, v]) => v === 1 || v === true);
    const isExclusion = entries.some(([k, v]) => v === 0 || v === false);

    // MongoDB allows mixing inclusion/exclusion only for _id
    // We handle projection in post-processing for maximum compatibility
    return {
      select: '_id, data',
      postProcess: (doc) => this._applyProjection(doc, projection, isInclusion, isExclusion)
    };
  }

  _applyProjection(doc, projection, isInclusion, isExclusion) {
    const result = {};

    if (isInclusion) {
      // Include only specified fields (plus _id unless excluded)
      const includeId = projection._id !== 0 && projection._id !== false;
      if (includeId && doc._id !== undefined) {
        result._id = doc._id;
      }

      for (const [field, value] of Object.entries(projection)) {
        if (field === '_id') continue;
        if (value === 1 || value === true) {
          const val = this._getNestedValue(doc, field);
          if (val !== undefined) {
            this._setNestedValue(result, field, val);
          }
        } else if (typeof value === 'object') {
          // Projection operators like $slice, $elemMatch, $meta
          result[field] = this._applyProjectionOperator(doc, field, value);
        }
      }
    } else if (isExclusion) {
      // Copy everything except excluded fields
      Object.assign(result, doc);
      for (const [field, value] of Object.entries(projection)) {
        if (value === 0 || value === false) {
          this._deleteNestedValue(result, field);
        }
      }
    }

    return result;
  }

  _applyProjectionOperator(doc, field, operator) {
    const value = this._getNestedValue(doc, field);

    if (operator.$slice !== undefined) {
      if (!Array.isArray(value)) return value;
      if (typeof operator.$slice === 'number') {
        if (operator.$slice >= 0) return value.slice(0, operator.$slice);
        return value.slice(operator.$slice);
      }
      if (Array.isArray(operator.$slice)) {
        return value.slice(operator.$slice[0], operator.$slice[0] + operator.$slice[1]);
      }
    }

    if (operator.$elemMatch) {
      if (!Array.isArray(value)) return value;
      return [value.find(elem => this._matchesCondition(elem, operator.$elemMatch))].filter(Boolean);
    }

    if (operator.$meta === 'textScore') {
      return doc._textScore || 0;
    }

    return value;
  }

  _matchesCondition(elem, condition) {
    for (const [key, val] of Object.entries(condition)) {
      if (key.startsWith('$')) {
        // Simple operator matching for elemMatch in projections
        return true; // Simplified
      }
      if (elem[key] !== val) return false;
    }
    return true;
  }

  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  _deleteNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current == null) return;
      current = current[parts[i]];
    }
    if (current != null) {
      delete current[parts[parts.length - 1]];
    }
  }

  /**
   * Convert a dotted field path to a JSONB access path (returns jsonb)
   * e.g., "address.city" -> "data->'address'->'city'"
   */
  _fieldToJsonPath(field) {
    const parts = field.split('.');
    if (parts.length === 1) {
      return `data->'${this._escapeField(parts[0])}'`;
    }
    return `data${parts.map(p => `->'${this._escapeField(p)}'`).join('')}`;
  }

  /**
   * Convert a dotted field path to a text extraction path (returns text)
   * e.g., "address.city" -> "data->>'address'->>'city'" (actually uses #>>)
   */
  _fieldToTextPath(field) {
    const parts = field.split('.');
    if (parts.length === 1) {
      return `data->>'${this._escapeField(parts[0])}'`;
    }
    const pathArray = parts.map(p => this._escapeField(p)).join(',');
    return `data#>>'{${pathArray}}'`;
  }

  _buildJsonPath(parts) {
    return `data${parts.map(p => `->'${this._escapeField(p)}'`).join('')}`;
  }

  _escapeField(field) {
    return field.replace(/'/g, "''");
  }

  _toJsonValue(value) {
    if (value instanceof ObjectId) {
      return value.toHexString();
    }
    if (value instanceof Date) {
      return { $date: value.toISOString() };
    }
    if (value instanceof RegExp) {
      return { $regex: value.source, $options: value.flags };
    }
    if (Buffer.isBuffer(value)) {
      return { $binary: value.toString('base64') };
    }
    if (Array.isArray(value)) {
      return value.map(v => this._toJsonValue(v));
    }
    if (value !== null && typeof value === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this._toJsonValue(v);
      }
      return result;
    }
    return value;
  }

  _extractValue(value) {
    if (value instanceof ObjectId) return value.toHexString();
    if (value instanceof Date) return value.toISOString();
    return value;
  }
}

module.exports = { QueryTranslator };
