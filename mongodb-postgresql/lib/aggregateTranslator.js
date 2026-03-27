'use strict';

const { QueryTranslator } = require('./queryTranslator');

class AggregateTranslator {
  constructor(collectionName, schemaName) {
    this.collectionName = collectionName;
    this.schemaName = schemaName;
    this.paramIndex = 0;
    this.params = [];
    this.queryTranslator = new QueryTranslator();
    this.cteCounter = 0;
  }

  nextParam(value) {
    this.paramIndex++;
    this.params.push(value);
    return `$${this.paramIndex}`;
  }

  tableName() {
    return this.schemaName ? `"${this.schemaName}"."${this.collectionName}"` : `"${this.collectionName}"`;
  }

  /**
   * Translate a MongoDB aggregation pipeline to SQL.
   * Returns { sql: string, params: any[] }
   *
   * For pipelines that cannot be fully expressed in SQL, we return
   * partial SQL + pipeline stages that must be processed in JS.
   */
  translate(pipeline) {
    this.paramIndex = 0;
    this.params = [];
    this.cteCounter = 0;

    if (!pipeline || pipeline.length === 0) {
      return { sql: `SELECT _id, data FROM ${this.tableName()}`, params: [] };
    }

    // Build the query progressively through the pipeline stages
    let source = this.tableName();
    const ctes = [];
    let postProcessStages = [];
    let hitUnsupported = false;

    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];
      const stageOp = Object.keys(stage)[0];

      if (hitUnsupported) {
        postProcessStages.push(stage);
        continue;
      }

      try {
        const result = this._translateStage(stageOp, stage[stageOp], source, ctes);
        source = result.source;
        if (result.cte) {
          ctes.push(result.cte);
        }
      } catch (e) {
        // If we hit an unsupported stage, process remaining in JS
        hitUnsupported = true;
        postProcessStages.push(stage);
      }
    }

    let sql;
    if (ctes.length > 0) {
      const cteStr = ctes.map(c => `${c.name} AS (${c.sql})`).join(', ');
      sql = `WITH ${cteStr} SELECT _id, data FROM ${source}`;
    } else {
      sql = `SELECT _id, data FROM ${source}`;
    }

    return { sql, params: this.params, postProcessStages };
  }

  _translateStage(op, value, source, ctes) {
    switch (op) {
      case '$match':
        return this._translateMatch(value, source, ctes);
      case '$project':
        return this._translateProject(value, source, ctes);
      case '$group':
        return this._translateGroup(value, source, ctes);
      case '$sort':
        return this._translateSort(value, source, ctes);
      case '$limit':
        return this._translateLimit(value, source, ctes);
      case '$skip':
        return this._translateSkip(value, source, ctes);
      case '$unwind':
        return this._translateUnwind(value, source, ctes);
      case '$lookup':
        return this._translateLookup(value, source, ctes);
      case '$addFields':
      case '$set':
        return this._translateAddFields(value, source, ctes);
      case '$unset':
        return this._translateUnsetStage(value, source, ctes);
      case '$replaceRoot':
        return this._translateReplaceRoot(value, source, ctes);
      case '$count':
        return this._translateCount(value, source, ctes);
      case '$sample':
        return this._translateSample(value, source, ctes);
      case '$sortByCount':
        return this._translateSortByCount(value, source, ctes);
      case '$out':
        return this._translateOut(value, source, ctes);
      case '$merge':
        return this._translateMerge(value, source, ctes);
      case '$facet':
        return this._translateFacet(value, source, ctes);
      case '$bucket':
        return this._translateBucket(value, source, ctes);
      case '$bucketAuto':
        throw new Error('$bucketAuto is not supported in SQL translation');
      case '$graphLookup':
        return this._translateGraphLookup(value, source, ctes);
      case '$unionWith':
        return this._translateUnionWith(value, source, ctes);
      case '$setWindowFields':
        return this._translateSetWindowFields(value, source, ctes);
      case '$redact':
        throw new Error('$redact requires JS post-processing');
      default:
        throw new Error(`Unsupported aggregation stage: ${op}`);
    }
  }

  _translateMatch(match, source, ctes) {
    const qt = new QueryTranslator();
    qt.paramIndex = this.paramIndex;
    qt.params = [];
    // Call _translateExpression directly to avoid reset() in translateFilter
    let where;
    if (!match || Object.keys(match).length === 0) {
      where = 'TRUE';
    } else {
      where = qt._translateExpression(match);
    }
    this.params.push(...qt.params);
    this.paramIndex = qt.paramIndex;

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, data FROM ${source} WHERE ${where}`
      }
    };
  }

  _translateProject(projection, source, ctes) {
    // $project in aggregation creates new document shape
    // We handle this in post-processing for complex expressions
    // but can handle simple inclusion/exclusion
    const entries = Object.entries(projection);
    const hasExpressions = entries.some(([k, v]) =>
      (typeof v === 'object' && v !== null) ||
      (typeof v === 'string' && v.startsWith('$'))
    );

    if (hasExpressions) {
      // Complex projection with expressions - build JSONB
      const buildParts = [];
      let includeId = true;

      for (const [field, value] of entries) {
        if (field === '_id') {
          if (value === 0 || value === false) includeId = false;
          continue;
        }

        if (value === 1 || value === true) {
          buildParts.push(`${this.nextParam(field)}::text, data->'${field}'`);
        } else if (value === 0 || value === false) {
          continue;
        } else if (typeof value === 'string' && value.startsWith('$')) {
          // Field reference
          const refField = value.substring(1);
          buildParts.push(`${this.nextParam(field)}::text, data->'${refField}'`);
        } else if (typeof value === 'object') {
          // Expression
          const expr = this._translateAggExpression(value);
          buildParts.push(`${this.nextParam(field)}::text, ${expr}`);
        } else {
          // Literal value
          buildParts.push(`${this.nextParam(field)}::text, ${this.nextParam(JSON.stringify(value))}::jsonb`);
        }
      }

      const cteName = this._nextCte();
      const idExpr = includeId ? '_id' : 'NULL AS _id';
      const dataExpr = buildParts.length > 0
        ? `jsonb_build_object(${buildParts.join(', ')})`
        : "'{}'::jsonb";

      return {
        source: cteName,
        cte: {
          name: cteName,
          sql: `SELECT ${idExpr}, ${dataExpr} AS data FROM ${source}`
        }
      };
    }

    // Simple projection - use post-processing
    // We still pass through all data but mark for post-process
    return { source };
  }

  _translateGroup(group, source, ctes) {
    const groupId = group._id;
    let groupByExpr;
    let idExpr;

    if (groupId === null) {
      groupByExpr = null;
      idExpr = "'__null_group__'";
    } else if (typeof groupId === 'string' && groupId.startsWith('$')) {
      const field = groupId.substring(1);
      groupByExpr = `data->>'${field}'`;
      idExpr = groupByExpr;
    } else if (typeof groupId === 'object' && groupId !== null) {
      // Compound group key
      const keyParts = [];
      const buildParts = [];
      for (const [key, val] of Object.entries(groupId)) {
        if (typeof val === 'string' && val.startsWith('$')) {
          const field = val.substring(1);
          keyParts.push(`data->>'${field}'`);
          buildParts.push(`'${key}', to_jsonb(data->>'${field}')`);
        }
      }
      groupByExpr = keyParts.join(', ');
      idExpr = `jsonb_build_object(${buildParts.join(', ')})::text`;
    } else {
      groupByExpr = null;
      idExpr = this.nextParam(JSON.stringify(groupId));
    }

    // Build accumulator expressions
    const accumulators = [];
    for (const [field, acc] of Object.entries(group)) {
      if (field === '_id') continue;

      const [accOp, accVal] = Object.entries(acc)[0];
      const sqlAcc = this._translateAccumulator(accOp, accVal);
      accumulators.push(`${this.nextParam(field)}::text, ${sqlAcc}`);
    }

    const dataExpr = accumulators.length > 0
      ? `jsonb_build_object(${accumulators.join(', ')})`
      : "'{}'::jsonb";

    const cteName = this._nextCte();
    let sql = `SELECT ${idExpr} AS _id, ${dataExpr} AS data FROM ${source}`;
    if (groupByExpr) {
      sql += ` GROUP BY ${groupByExpr}`;
    }

    return {
      source: cteName,
      cte: { name: cteName, sql }
    };
  }

  _translateAccumulator(op, value) {
    const fieldExpr = this._fieldRefToSql(value);

    switch (op) {
      case '$sum':
        if (typeof value === 'number') {
          return `to_jsonb(COUNT(*)::numeric * ${value})`;
        }
        return `to_jsonb(SUM((${fieldExpr})::numeric))`;
      case '$avg':
        return `to_jsonb(AVG((${fieldExpr})::numeric))`;
      case '$min':
        return `to_jsonb(MIN((${fieldExpr})::numeric))`;
      case '$max':
        return `to_jsonb(MAX((${fieldExpr})::numeric))`;
      case '$first':
        return `to_jsonb((array_agg(${fieldExpr}))[1])`;
      case '$last':
        return `to_jsonb((array_agg(${fieldExpr}))[array_length(array_agg(${fieldExpr}), 1)])`;
      case '$push':
        if (typeof value === 'string' && value.startsWith('$')) {
          const field = value.substring(1);
          return `COALESCE(jsonb_agg(data->'${field}'), '[]'::jsonb)`;
        }
        return `COALESCE(jsonb_agg(data), '[]'::jsonb)`;
      case '$addToSet':
        if (typeof value === 'string' && value.startsWith('$')) {
          const field = value.substring(1);
          return `COALESCE(jsonb_agg(DISTINCT data->'${field}'), '[]'::jsonb)`;
        }
        return `COALESCE(jsonb_agg(DISTINCT data), '[]'::jsonb)`;
      case '$count':
        return `to_jsonb(COUNT(*))`;
      case '$stdDevPop':
        return `to_jsonb(stddev_pop((${fieldExpr})::numeric))`;
      case '$stdDevSamp':
        return `to_jsonb(stddev_samp((${fieldExpr})::numeric))`;
      case '$mergeObjects':
        if (typeof value === 'string' && value.startsWith('$')) {
          const field = value.substring(1);
          return `COALESCE((SELECT jsonb_agg_val FROM (SELECT jsonb_object_agg(key, val) AS jsonb_agg_val FROM jsonb_each(data->'${field}') AS t(key, val)) sub), '{}'::jsonb)`;
        }
        return `'{}'::jsonb`;
      case '$top': {
        const sortBy = value.sortBy;
        const output = this._fieldRefToSql(value.output);
        const orderParts = Object.entries(sortBy).map(([f, d]) => `data->>'${f}' ${d === -1 ? 'DESC' : 'ASC'}`);
        return `to_jsonb((array_agg(${output} ORDER BY ${orderParts.join(', ')}))[1])`;
      }
      case '$bottom': {
        const sortBy = value.sortBy;
        const output = this._fieldRefToSql(value.output);
        const orderParts = Object.entries(sortBy).map(([f, d]) => `data->>'${f}' ${d === -1 ? 'ASC' : 'DESC'}`);
        return `to_jsonb((array_agg(${output} ORDER BY ${orderParts.join(', ')}))[1])`;
      }
      case '$topN': {
        const sortBy = value.sortBy;
        const output = this._fieldRefToSql(value.output);
        const n = value.n;
        const orderParts = Object.entries(sortBy).map(([f, d]) => `data->>'${f}' ${d === -1 ? 'DESC' : 'ASC'}`);
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM (SELECT unnest((array_agg(${output} ORDER BY ${orderParts.join(', ')}))[1:${n}]) AS v) sub)`;
      }
      case '$bottomN': {
        const sortBy = value.sortBy;
        const output = this._fieldRefToSql(value.output);
        const n = value.n;
        const orderParts = Object.entries(sortBy).map(([f, d]) => `data->>'${f}' ${d === -1 ? 'ASC' : 'DESC'}`);
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM (SELECT unnest((array_agg(${output} ORDER BY ${orderParts.join(', ')}))[1:${n}]) AS v) sub)`;
      }
      case '$firstN': {
        const n = typeof value === 'object' && value.n ? value.n : 1;
        const input = typeof value === 'object' && value.input ? this._fieldRefToSql(value.input) : fieldExpr;
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM (SELECT unnest((array_agg(${input}))[1:${n}]) AS v) sub)`;
      }
      case '$lastN': {
        const n = typeof value === 'object' && value.n ? value.n : 1;
        const input = typeof value === 'object' && value.input ? this._fieldRefToSql(value.input) : fieldExpr;
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM (SELECT unnest((array_agg(${input}))[array_length(array_agg(${input}), 1) - ${n} + 1:]) AS v) sub)`;
      }
      case '$maxN': {
        const n = typeof value === 'object' && value.n ? value.n : 1;
        const input = typeof value === 'object' && value.input ? this._fieldRefToSql(value.input) : fieldExpr;
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM (SELECT unnest((array_agg(${input} ORDER BY ${input} DESC))[1:${n}]) AS v) sub)`;
      }
      case '$minN': {
        const n = typeof value === 'object' && value.n ? value.n : 1;
        const input = typeof value === 'object' && value.input ? this._fieldRefToSql(value.input) : fieldExpr;
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM (SELECT unnest((array_agg(${input} ORDER BY ${input} ASC))[1:${n}]) AS v) sub)`;
      }
      default:
        throw new Error(`Unsupported accumulator: ${op}`);
    }
  }

  _fieldRefToSql(value) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const field = value.substring(1);
      if (field.includes('.')) {
        const parts = field.split('.');
        return `data#>>'{${parts.join(',')}}'`;
      }
      return `data->>'${field}'`;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return `data::text`;
  }

  _translateSort(sort, source, ctes) {
    const parts = [];
    for (const [field, direction] of Object.entries(sort)) {
      const dir = direction === -1 ? 'DESC' : 'ASC';
      if (field === '_id') {
        parts.push(`_id ${dir}`);
      } else {
        parts.push(`data->>'${field}' ${dir}`);
      }
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, data FROM ${source} ORDER BY ${parts.join(', ')}`
      }
    };
  }

  _translateLimit(limit, source, ctes) {
    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, data FROM ${source} LIMIT ${this.nextParam(limit)}::integer`
      }
    };
  }

  _translateSkip(skip, source, ctes) {
    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, data FROM ${source} OFFSET ${this.nextParam(skip)}::integer`
      }
    };
  }

  _translateUnwind(unwind, source, ctes) {
    let path;
    let preserveNull = false;
    let includeIndex = null;

    if (typeof unwind === 'string') {
      path = unwind.startsWith('$') ? unwind.substring(1) : unwind;
    } else {
      path = unwind.path.startsWith('$') ? unwind.path.substring(1) : unwind.path;
      preserveNull = unwind.preserveNullAndEmptyArrays || false;
      includeIndex = unwind.includeArrayIndex || null;
    }

    const cteName = this._nextCte();
    const joinType = preserveNull ? 'LEFT JOIN LATERAL' : 'CROSS JOIN LATERAL';

    let indexExpr = '';
    if (includeIndex) {
      indexExpr = `, ${this.nextParam(includeIndex)}, to_jsonb(elem.idx - 1)`;
    }

    const onClause = preserveNull ? ' ON true' : '';
    const sql = `SELECT s._id, jsonb_set(s.data, ${this.nextParam(`{${path}}`)}::text[], elem.value${indexExpr ? ` || jsonb_build_object(${indexExpr})` : ''}) AS data FROM ${source} s ${joinType} jsonb_array_elements(s.data->'${path}') WITH ORDINALITY AS elem(value, idx)${onClause}`;

    return {
      source: cteName,
      cte: { name: cteName, sql }
    };
  }

  _translateLookup(lookup, source, ctes) {
    const { from, localField, foreignField, as: asField, let: letVars, pipeline: subPipeline } = lookup;
    const foreignTable = this.schemaName ? `"${this.schemaName}"."${from}"` : `"${from}"`;

    const cteName = this._nextCte();

    if (localField && foreignField) {
      // Standard lookup (equality match)
      const localExpr = `s.data->>'${localField}'`;
      const foreignExpr = foreignField === '_id' ? 'f._id' : `f.data->>'${foreignField}'`;

      const sql = `SELECT s._id, jsonb_set(s.data, ${this.nextParam(`{${asField}}`)}, COALESCE((SELECT jsonb_agg(f.data) FROM ${foreignTable} f WHERE ${localExpr} = ${foreignExpr}), '[]'::jsonb)) AS data FROM ${source} s`;

      return {
        source: cteName,
        cte: { name: cteName, sql }
      };
    }

    // Correlated subquery pipeline lookup - more complex
    // For now, use a simplified approach
    throw new Error('Pipeline $lookup requires JS post-processing');
  }

  _translateAddFields(fields, source, ctes) {
    let dataExpr = 'data';
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        const refField = value.substring(1);
        dataExpr = `jsonb_set(${dataExpr}, ${this.nextParam(`{${field}}`)}::text[], COALESCE(data->'${refField}', 'null'::jsonb), true)`;
      } else if (typeof value === 'object' && value !== null) {
        const expr = this._translateAggExpression(value);
        dataExpr = `jsonb_set(${dataExpr}, ${this.nextParam(`{${field}}`)}::text[], COALESCE(${expr}, 'null'::jsonb), true)`;
      } else {
        const param = this.nextParam(JSON.stringify(value));
        dataExpr = `jsonb_set(${dataExpr}, ${this.nextParam(`{${field}}`)}::text[], ${param}::jsonb, true)`;
      }
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, ${dataExpr} AS data FROM ${source}`
      }
    };
  }

  _translateUnsetStage(fields, source, ctes) {
    const fieldList = Array.isArray(fields) ? fields : [fields];
    let dataExpr = 'data';
    for (const field of fieldList) {
      if (field.includes('.')) {
        const parts = field.split('.');
        dataExpr = `${dataExpr} #- ${this.nextParam(`{${parts.join(',')}}`)}`;
      } else {
        dataExpr = `${dataExpr} - ${this.nextParam(field)}`;
      }
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, ${dataExpr} AS data FROM ${source}`
      }
    };
  }

  _translateReplaceRoot(replaceRoot, source, ctes) {
    const newRoot = replaceRoot.newRoot;
    let dataExpr;

    if (typeof newRoot === 'string' && newRoot.startsWith('$')) {
      const field = newRoot.substring(1);
      dataExpr = `data->'${field}'`;
    } else if (typeof newRoot === 'object') {
      // Expression
      dataExpr = this._translateAggExpression(newRoot);
    } else {
      dataExpr = 'data';
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, ${dataExpr} AS data FROM ${source}`
      }
    };
  }

  _translateCount(countField, source, ctes) {
    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT NULL AS _id, jsonb_build_object(${this.nextParam(countField)}::text, COUNT(*)) AS data FROM ${source}`
      }
    };
  }

  _translateSample(sample, source, ctes) {
    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, data FROM ${source} ORDER BY RANDOM() LIMIT ${this.nextParam(sample.size)}::integer`
      }
    };
  }

  _translateSortByCount(field, source, ctes) {
    const fieldRef = typeof field === 'string' && field.startsWith('$') ? field.substring(1) : field;
    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT data->>'${fieldRef}' AS _id, jsonb_build_object('count', COUNT(*)) AS data FROM ${source} GROUP BY data->>'${fieldRef}' ORDER BY COUNT(*) DESC`
      }
    };
  }

  _translateOut(out, source, ctes) {
    // $out writes to a collection - we create a new table
    const targetTable = typeof out === 'string' ? out : out.coll;
    const cteName = this._nextCte();
    // This is a side-effect stage, handled specially by the collection
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, data FROM ${source}`
      },
      sideEffect: { type: 'out', table: targetTable }
    };
  }

  _translateMerge(merge, source, ctes) {
    // $merge is similar to $out but with merge semantics
    // Handled at the collection level
    return { source };
  }

  _translateFacet(facet, source, ctes) {
    // $facet runs multiple sub-pipelines on the same input set.
    // We materialise the source into a CTE, then run each sub-pipeline
    // against it and combine results via jsonb_build_object.

    // First ensure the source is a named CTE so every sub-pipeline can reference it
    const sourceCte = this._nextCte();
    ctes.push({ name: sourceCte, sql: `SELECT _id, data FROM ${source}` });

    const parts = [];
    for (const [name, subPipeline] of Object.entries(facet)) {
      const subTranslator = new AggregateTranslator(sourceCte, null);
      const subResult = subTranslator.translate(subPipeline || []);

      // If it has post-process stages that couldn't be translated,
      // fall back to JS post-processing for the whole $facet
      if (subResult.postProcessStages && subResult.postProcessStages.length > 0) {
        throw new Error('$facet sub-pipeline requires JS post-processing');
      }

      // Re-number the sub-pipeline's $N params to continue from our current index
      let subSql = subResult.sql;
      // Replace $1, $2, ... with $offset+1, $offset+2, ...
      const offset = this.paramIndex;
      for (let i = subResult.params.length; i >= 1; i--) {
        subSql = subSql.replace(new RegExp(`\\$${i}(?!\\d)`, 'g'), `$${i + offset}`);
      }
      this.params.push(...subResult.params);
      this.paramIndex += subResult.params.length;

      const dataSql = subSql.replace(/^SELECT _id, data FROM/, 'SELECT data FROM');
      parts.push(`${this.nextParam(name)}::text, COALESCE((SELECT jsonb_agg(data) FROM (${dataSql}) _sub_${name}), '[]'::jsonb)`);
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT NULL AS _id, jsonb_build_object(${parts.join(', ')}) AS data`
      }
    };
  }

  _translateBucket(bucket, source, ctes) {
    const { groupBy, boundaries, default: defaultBucket, output } = bucket;
    const fieldRef = typeof groupBy === 'string' && groupBy.startsWith('$') ? groupBy.substring(1) : groupBy;

    // Build CASE expression for bucket assignment
    const caseParts = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      caseParts.push(`WHEN (data->>'${fieldRef}')::numeric >= ${this.nextParam(boundaries[i])} AND (data->>'${fieldRef}')::numeric < ${this.nextParam(boundaries[i + 1])} THEN ${this.nextParam(boundaries[i])}`);
    }
    if (defaultBucket !== undefined) {
      caseParts.push(`ELSE ${this.nextParam(JSON.stringify(defaultBucket))}`);
    }

    const bucketExpr = `CASE ${caseParts.join(' ')} END`;

    // Build output accumulators
    let outputExpr = `jsonb_build_object('count', COUNT(*))`;
    if (output) {
      const parts = [];
      for (const [field, acc] of Object.entries(output)) {
        const [accOp, accVal] = Object.entries(acc)[0];
        parts.push(`${this.nextParam(field)}::text, ${this._translateAccumulator(accOp, accVal)}`);
      }
      outputExpr = `jsonb_build_object(${parts.join(', ')})`;
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT (${bucketExpr})::text AS _id, ${outputExpr} AS data FROM ${source} GROUP BY ${bucketExpr}`
      }
    };
  }

  _translateGraphLookup(graphLookup, source, ctes) {
    const { from, startWith, connectFromField, connectToField, as: asField, maxDepth, depthField, restrictSearchWithMatch } = graphLookup;
    const foreignTable = this.schemaName ? `"${this.schemaName}"."${from}"` : `"${from}"`;

    // Use recursive CTE for graph traversal
    const cteName = this._nextCte();
    const recCte = this._nextCte();

    const startExpr = typeof startWith === 'string' && startWith.startsWith('$')
      ? `s.data->>'${startWith.substring(1)}'`
      : this.nextParam(startWith);

    const maxDepthClause = maxDepth !== undefined ? `AND depth < ${this.nextParam(maxDepth)}` : '';

    const sql = `SELECT s._id, jsonb_set(s.data, ${this.nextParam(`{${asField}}`)},
      COALESCE((
        WITH RECURSIVE ${recCte} AS (
          SELECT f._id, f.data, 0 AS depth
          FROM ${foreignTable} f
          WHERE f.data->>'${connectToField}' = ${startExpr}
          UNION ALL
          SELECT f._id, f.data, r.depth + 1
          FROM ${foreignTable} f
          JOIN ${recCte} r ON f.data->>'${connectToField}' = r.data->>'${connectFromField}'
          WHERE TRUE ${maxDepthClause}
        )
        SELECT jsonb_agg(${depthField ? `data || jsonb_build_object('${depthField}', depth)` : 'data'})
        FROM ${recCte}
      ), '[]'::jsonb)) AS data
    FROM ${source} s`;

    return {
      source: cteName,
      cte: { name: cteName, sql }
    };
  }

  _translateUnionWith(unionWith, source, ctes) {
    const collName = typeof unionWith === 'string' ? unionWith : unionWith.coll;
    const targetTable = this.schemaName ? `"${this.schemaName}"."${collName}"` : `"${collName}"`;

    const cteName = this._nextCte();
    let sql = `SELECT _id, data FROM ${source} UNION ALL SELECT _id, data FROM ${targetTable}`;

    if (typeof unionWith === 'object' && unionWith.pipeline) {
      // Apply sub-pipeline to the unioned collection
      const subTranslator = new AggregateTranslator(collName, this.schemaName);
      const subResult = subTranslator.translate(unionWith.pipeline);
      this.params.push(...subResult.params);
      sql = `SELECT _id, data FROM ${source} UNION ALL ${subResult.sql}`;
    }

    return {
      source: cteName,
      cte: { name: cteName, sql }
    };
  }

  _translateSetWindowFields(spec, source, ctes) {
    const { partitionBy, sortBy, output } = spec;

    // Build PARTITION BY clause
    let partitionClause = '';
    if (partitionBy) {
      if (typeof partitionBy === 'string' && partitionBy.startsWith('$')) {
        partitionClause = `PARTITION BY data->>'${partitionBy.substring(1)}'`;
      } else if (typeof partitionBy === 'object') {
        const parts = Object.entries(partitionBy).map(([k, v]) => {
          if (typeof v === 'string' && v.startsWith('$')) {
            return `data->>'${v.substring(1)}'`;
          }
          return `data->>'${k}'`;
        });
        partitionClause = `PARTITION BY ${parts.join(', ')}`;
      }
    }

    // Build ORDER BY clause
    let orderClause = '';
    if (sortBy) {
      const parts = Object.entries(sortBy).map(([field, dir]) =>
        `data->>'${field}' ${dir === -1 ? 'DESC' : 'ASC'}`
      );
      orderClause = `ORDER BY ${parts.join(', ')}`;
    }

    const windowSpec = `${partitionClause} ${orderClause}`.trim();

    // Build the output fields with window functions
    const setClauses = [];
    for (const [fieldName, windowExpr] of Object.entries(output)) {
      const op = Object.keys(windowExpr)[0];
      const opArgs = windowExpr[op];
      const windowDef = windowExpr.window;

      // Build frame clause if window bounds specified
      let frameClause = '';
      if (windowDef) {
        const docOrRange = windowDef.range ? 'RANGE' : 'ROWS';
        if (windowDef.documents || windowDef.range) {
          const bounds = windowDef.documents || windowDef.range;
          const lower = bounds[0] === 'unbounded' ? 'UNBOUNDED PRECEDING'
            : bounds[0] === 'current' ? 'CURRENT ROW'
            : bounds[0] < 0 ? `${Math.abs(bounds[0])} PRECEDING`
            : `${bounds[0]} FOLLOWING`;
          const upper = bounds[1] === 'unbounded' ? 'UNBOUNDED FOLLOWING'
            : bounds[1] === 'current' ? 'CURRENT ROW'
            : bounds[1] < 0 ? `${Math.abs(bounds[1])} PRECEDING`
            : `${bounds[1]} FOLLOWING`;
          frameClause = `${docOrRange} BETWEEN ${lower} AND ${upper}`;
        }
      }

      const fullWindow = `${windowSpec} ${frameClause}`.trim();
      const sqlWindowExpr = this._windowOpToSql(op, opArgs, fullWindow);
      setClauses.push(`${this.nextParam(`{${fieldName}}`)}, ${sqlWindowExpr}`);
    }

    const jsonbSetChain = setClauses.reduce((expr, [pathParam, valueExpr], idx) => {
      // We have pairs of (pathParam, valueExpr) but they come as comma-separated
      // Actually setClauses are strings like "$N, expr" — let's build differently
      return expr;
    }, 'data');

    // Build as: jsonb_set(jsonb_set(data, path1, val1), path2, val2)
    let dataExpr = 'data';
    for (let i = 0; i < setClauses.length; i += 1) {
      const parts = setClauses[i];
      // parts is like "$3, to_jsonb(RANK() OVER (...))"
      const commaIdx = parts.indexOf(',');
      const pathParam = parts.substring(0, commaIdx).trim();
      const valueExpr = parts.substring(commaIdx + 1).trim();
      dataExpr = `jsonb_set(${dataExpr}, ${pathParam}, ${valueExpr}, true)`;
    }

    const cteName = this._nextCte();
    return {
      source: cteName,
      cte: {
        name: cteName,
        sql: `SELECT _id, ${dataExpr} AS data FROM ${source}`
      }
    };
  }

  _windowOpToSql(op, args, windowSpec) {
    const overClause = `OVER (${windowSpec})`;
    const fieldExpr = typeof args === 'string' && args.startsWith('$')
      ? `(data->>'${args.substring(1)}')::numeric` : null;

    switch (op) {
      case '$sum':
        return fieldExpr
          ? `to_jsonb(SUM(${fieldExpr}) ${overClause})`
          : `to_jsonb(COUNT(*) ${overClause})`;
      case '$avg':
        return `to_jsonb(AVG(${fieldExpr}) ${overClause})`;
      case '$min':
        return `to_jsonb(MIN(${fieldExpr}) ${overClause})`;
      case '$max':
        return `to_jsonb(MAX(${fieldExpr}) ${overClause})`;
      case '$count':
        return `to_jsonb(COUNT(*) ${overClause})`;
      case '$push':
        return fieldExpr
          ? `COALESCE(jsonb_agg(data->'${args.substring(1)}') ${overClause}, '[]'::jsonb)`
          : `COALESCE(jsonb_agg(data) ${overClause}, '[]'::jsonb)`;
      case '$stdDevPop':
        return `to_jsonb(stddev_pop(${fieldExpr}) ${overClause})`;
      case '$stdDevSamp':
        return `to_jsonb(stddev_samp(${fieldExpr}) ${overClause})`;
      case '$first':
        return `to_jsonb(FIRST_VALUE(${fieldExpr || 'data'}) ${overClause})`;
      case '$last':
        return `to_jsonb(LAST_VALUE(${fieldExpr || 'data'}) ${overClause})`;
      case '$rank':
        return `to_jsonb(RANK() ${overClause})`;
      case '$denseRank':
        return `to_jsonb(DENSE_RANK() ${overClause})`;
      case '$documentNumber':
        return `to_jsonb(ROW_NUMBER() ${overClause})`;
      case '$shift': {
        const by = args.by || 1;
        const defaultVal = args.default !== undefined
          ? this.nextParam(JSON.stringify(args.default)) + '::jsonb'
          : "'null'::jsonb";
        const output = args.output && typeof args.output === 'string' && args.output.startsWith('$')
          ? `data->>'${args.output.substring(1)}'` : 'data';
        if (by >= 0) {
          return `COALESCE(to_jsonb(LEAD(${output}, ${by}) ${overClause}), ${defaultVal})`;
        }
        return `COALESCE(to_jsonb(LAG(${output}, ${Math.abs(by)}) ${overClause}), ${defaultVal})`;
      }
      case '$derivative':
      case '$integral':
        // These require calculus over sorted windows — approximate with difference
        throw new Error(`${op} is not supported in SQL translation`);
      case '$expMovingAvg':
        throw new Error('$expMovingAvg is not supported in SQL translation');
      case '$linearFill':
        throw new Error('$linearFill is not supported in SQL translation');
      default:
        throw new Error(`Unsupported window operator: ${op}`);
    }
  }

  _translateAggExpression(expr) {
    if (expr === null || expr === undefined) return "'null'::jsonb";

    if (typeof expr === 'string') {
      if (expr.startsWith('$')) {
        const field = expr.substring(1);
        return `data->'${field}'`;
      }
      return `${this.nextParam(JSON.stringify(expr))}::jsonb`;
    }

    if (typeof expr === 'number') {
      return `to_jsonb(${this.nextParam(expr)}::numeric)`;
    }

    if (typeof expr === 'boolean') {
      return `to_jsonb(${this.nextParam(expr)}::boolean)`;
    }

    // Object with operators
    const keys = Object.keys(expr);
    if (keys.length === 0) return "'{}'::jsonb";

    const op = keys[0];
    if (!op.startsWith('$')) {
      // Literal object
      const parts = [];
      for (const [k, v] of Object.entries(expr)) {
        parts.push(`${this.nextParam(k)}, ${this._translateAggExpression(v)}`);
      }
      return `jsonb_build_object(${parts.join(', ')})`;
    }

    return this._translateAggOp(op, expr[op]);
  }

  _translateAggOp(op, args) {
    switch (op) {
      // Arithmetic
      case '$add': {
        const parts = args.map(a => `COALESCE((${this._translateAggExpression(a)}#>>'{}')::numeric, 0)`);
        return `to_jsonb(${parts.join(' + ')})`;
      }
      case '$subtract': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}')::numeric - (${this._translateAggExpression(args[1])}#>>'{}')::numeric)`;
      }
      case '$multiply': {
        const parts = args.map(a => `COALESCE((${this._translateAggExpression(a)}#>>'{}')::numeric, 0)`);
        return `to_jsonb(${parts.join(' * ')})`;
      }
      case '$divide': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}')::numeric / NULLIF((${this._translateAggExpression(args[1])}#>>'{}')::numeric, 0))`;
      }
      case '$mod': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}')::numeric % (${this._translateAggExpression(args[1])}#>>'{}')::numeric)`;
      }
      case '$abs': {
        return `to_jsonb(ABS((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$ceil': {
        return `to_jsonb(CEIL((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$floor': {
        return `to_jsonb(FLOOR((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$round': {
        if (Array.isArray(args)) {
          return `to_jsonb(ROUND((${this._translateAggExpression(args[0])}#>>'{}')::numeric, ${args[1] || 0}))`;
        }
        return `to_jsonb(ROUND((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$sqrt': {
        return `to_jsonb(SQRT((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$pow': {
        return `to_jsonb(POWER((${this._translateAggExpression(args[0])}#>>'{}')::numeric, (${this._translateAggExpression(args[1])}#>>'{}')::numeric))`;
      }
      case '$ln': {
        return `to_jsonb(LN((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$log10': {
        return `to_jsonb(LOG(10, (${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$log': {
        return `to_jsonb(LOG((${this._translateAggExpression(args[1])}#>>'{}')::numeric, (${this._translateAggExpression(args[0])}#>>'{}')::numeric))`;
      }
      case '$trunc': {
        if (Array.isArray(args)) {
          return `to_jsonb(TRUNC((${this._translateAggExpression(args[0])}#>>'{}')::numeric, ${args[1] || 0}))`;
        }
        return `to_jsonb(TRUNC((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }
      case '$exp': {
        return `to_jsonb(EXP((${this._translateAggExpression(args)}#>>'{}')::numeric))`;
      }

      // String
      case '$concat': {
        const parts = args.map(a => `(${this._translateAggExpression(a)}#>>'{}')`);
        return `to_jsonb(${parts.join(' || ')})`;
      }
      case '$toLower': {
        return `to_jsonb(LOWER(${this._translateAggExpression(args)}#>>'{}'))`;
      }
      case '$toUpper': {
        return `to_jsonb(UPPER(${this._translateAggExpression(args)}#>>'{}'))`;
      }
      case '$substr':
      case '$substrBytes': {
        return `to_jsonb(SUBSTR(${this._translateAggExpression(args[0])}#>>'{}', ${args[1] + 1}, ${args[2]}))`;
      }
      case '$strLenBytes':
      case '$strLenCP': {
        return `to_jsonb(LENGTH(${this._translateAggExpression(args)}#>>'{}'))`;
      }
      case '$trim': {
        const input = args.input || args;
        const chars = args.chars;
        if (chars) {
          return `to_jsonb(BTRIM(${this._translateAggExpression(input)}#>>'{}', ${this.nextParam(chars)}))`;
        }
        return `to_jsonb(BTRIM(${this._translateAggExpression(input)}#>>'{}'))`;
      }
      case '$ltrim': {
        const input = args.input || args;
        return `to_jsonb(LTRIM(${this._translateAggExpression(input)}#>>'{}'))`;
      }
      case '$rtrim': {
        const input = args.input || args;
        return `to_jsonb(RTRIM(${this._translateAggExpression(input)}#>>'{}'))`;
      }
      case '$split': {
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(elem)), '[]'::jsonb) FROM unnest(string_to_array(${this._translateAggExpression(args[0])}#>>'{}', ${this.nextParam(args[1])})) AS elem)`;
      }
      case '$regexMatch': {
        const input = this._translateAggExpression(args.input);
        const regex = args.regex;
        const options = args.options || '';
        const op = options.includes('i') ? '~*' : '~';
        return `to_jsonb((${input}#>>'{}') ${op} ${this.nextParam(typeof regex === 'string' ? regex : regex.source)})`;
      }
      case '$regexFind': {
        const input = this._translateAggExpression(args.input);
        const regex = args.regex;
        return `to_jsonb(regexp_match(${input}#>>'{}', ${this.nextParam(typeof regex === 'string' ? regex : regex.source)}))`;
      }
      case '$replaceOne': {
        return `to_jsonb(REPLACE(${this._translateAggExpression(args.input)}#>>'{}', ${this.nextParam(args.find)}, ${this.nextParam(args.replacement)}))`;
      }
      case '$replaceAll': {
        return `to_jsonb(REPLACE(${this._translateAggExpression(args.input)}#>>'{}', ${this.nextParam(args.find)}, ${this.nextParam(args.replacement)}))`;
      }

      // Comparison
      case '$cmp': {
        const a = `(${this._translateAggExpression(args[0])}#>>'{}')`;
        const b = `(${this._translateAggExpression(args[1])}#>>'{}')`;
        return `to_jsonb(CASE WHEN ${a} < ${b} THEN -1 WHEN ${a} > ${b} THEN 1 ELSE 0 END)`;
      }
      case '$eq': {
        return `to_jsonb(${this._translateAggExpression(args[0])} = ${this._translateAggExpression(args[1])})`;
      }
      case '$ne': {
        return `to_jsonb(${this._translateAggExpression(args[0])} != ${this._translateAggExpression(args[1])})`;
      }
      case '$gt': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}') > (${this._translateAggExpression(args[1])}#>>'{}'))`;
      }
      case '$gte': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}') >= (${this._translateAggExpression(args[1])}#>>'{}'))`;
      }
      case '$lt': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}') < (${this._translateAggExpression(args[1])}#>>'{}'))`;
      }
      case '$lte': {
        return `to_jsonb((${this._translateAggExpression(args[0])}#>>'{}') <= (${this._translateAggExpression(args[1])}#>>'{}'))`;
      }

      // Boolean
      case '$and': {
        const parts = args.map(a => `(${this._translateAggExpression(a)}#>>'{}')::boolean`);
        return `to_jsonb(${parts.join(' AND ')})`;
      }
      case '$or': {
        const parts = args.map(a => `(${this._translateAggExpression(a)}#>>'{}')::boolean`);
        return `to_jsonb(${parts.join(' OR ')})`;
      }
      case '$not': {
        return `to_jsonb(NOT (${this._translateAggExpression(args[0])}#>>'{}')::boolean)`;
      }

      // Conditional
      case '$cond': {
        let ifExpr, thenExpr, elseExpr;
        if (Array.isArray(args)) {
          [ifExpr, thenExpr, elseExpr] = args;
        } else {
          ifExpr = args.if;
          thenExpr = args.then;
          elseExpr = args.else;
        }
        return `CASE WHEN (${this._translateAggExpression(ifExpr)}#>>'{}')::boolean THEN ${this._translateAggExpression(thenExpr)} ELSE ${this._translateAggExpression(elseExpr)} END`;
      }
      case '$ifNull': {
        return `COALESCE(${this._translateAggExpression(args[0])}, ${this._translateAggExpression(args[1])})`;
      }
      case '$switch': {
        const branches = args.branches.map(b =>
          `WHEN (${this._translateAggExpression(b.case)}#>>'{}')::boolean THEN ${this._translateAggExpression(b.then)}`
        );
        const defaultExpr = args.default !== undefined
          ? `ELSE ${this._translateAggExpression(args.default)}`
          : '';
        return `CASE ${branches.join(' ')} ${defaultExpr} END`;
      }

      // Date
      case '$year':
        return `to_jsonb(EXTRACT(YEAR FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$month':
        return `to_jsonb(EXTRACT(MONTH FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$dayOfMonth':
        return `to_jsonb(EXTRACT(DAY FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$dayOfWeek':
        return `to_jsonb(EXTRACT(DOW FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer + 1)`;
      case '$dayOfYear':
        return `to_jsonb(EXTRACT(DOY FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$hour':
        return `to_jsonb(EXTRACT(HOUR FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$minute':
        return `to_jsonb(EXTRACT(MINUTE FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$second':
        return `to_jsonb(EXTRACT(SECOND FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$millisecond':
        return `to_jsonb((EXTRACT(MILLISECONDS FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer % 1000))`;
      case '$week':
        return `to_jsonb(EXTRACT(WEEK FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$dateToString': {
        const dateExpr = this._translateAggExpression(args.date);
        // Basic date format translation from MongoDB to PostgreSQL
        const format = (args.format || '%Y-%m-%dT%H:%M:%S.%LZ')
          .replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD')
          .replace('%H', 'HH24').replace('%M', 'MI').replace('%S', 'SS')
          .replace('%L', 'MS');
        return `to_jsonb(to_char((${dateExpr}->>'$date')::timestamp, ${this.nextParam(format)}))`;
      }
      case '$dateFromString': {
        const dateStr = this._translateAggExpression(args.dateString);
        return `jsonb_build_object('$date', (${dateStr}#>>'{}')::timestamp)`;
      }
      case '$dateDiff': {
        const startDate = `(${this._translateAggExpression(args.startDate)}->>'$date')::timestamp`;
        const endDate = `(${this._translateAggExpression(args.endDate)}->>'$date')::timestamp`;
        const unit = args.unit;
        return `to_jsonb(EXTRACT(EPOCH FROM ${endDate} - ${startDate}) / ${this._dateUnitSeconds(unit)})`;
      }

      // Array
      case '$size': {
        return `to_jsonb(jsonb_array_length(${this._translateAggExpression(args)}))`;
      }
      case '$arrayElemAt': {
        const arr = this._translateAggExpression(args[0]);
        const idx = args[1];
        if (idx >= 0) {
          return `${arr}->${idx}`;
        }
        return `${arr}->(jsonb_array_length(${arr}) + ${idx})`;
      }
      case '$first': {
        return `${this._translateAggExpression(args)}->0`;
      }
      case '$last': {
        const arr = this._translateAggExpression(args);
        return `${arr}->(jsonb_array_length(${arr}) - 1)`;
      }
      case '$filter': {
        const input = this._translateAggExpression(args.input);
        const as = args.as || 'this';
        // Filter is complex - simplified version
        return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements(${input}) AS elem)`;
      }
      case '$map': {
        const input = this._translateAggExpression(args.input);
        // Map is complex - simplified version returns input
        return input;
      }
      case '$reduce': {
        // Reduce cannot be efficiently translated to SQL
        throw new Error('$reduce requires JS post-processing');
      }
      case '$concatArrays': {
        const parts = args.map(a => this._translateAggExpression(a));
        return parts.join(' || ');
      }
      case '$in': {
        return `to_jsonb(${this._translateAggExpression(args[1])} @> jsonb_build_array(${this._translateAggExpression(args[0])}))`;
      }
      case '$isArray': {
        return `to_jsonb(jsonb_typeof(${this._translateAggExpression(args)}) = 'array')`;
      }
      case '$reverseArray': {
        const arr = this._translateAggExpression(args);
        return `(SELECT COALESCE(jsonb_agg(elem ORDER BY idx DESC), '[]'::jsonb) FROM jsonb_array_elements(${arr}) WITH ORDINALITY AS t(elem, idx))`;
      }
      case '$slice': {
        const arr = this._translateAggExpression(args[0]);
        if (args.length === 2) {
          const n = args[1];
          if (n >= 0) {
            return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(${arr}) AS elem LIMIT ${n}) sub)`;
          }
          return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(${arr}) WITH ORDINALITY AS t(elem, idx) WHERE idx > jsonb_array_length(${arr}) - ${Math.abs(n)}) sub)`;
        }
        return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(${arr}) WITH ORDINALITY AS t(elem, idx) WHERE idx > ${args[1]} AND idx <= ${args[1] + args[2]}) sub)`;
      }
      case '$zip': {
        const inputs = args.inputs;
        const useLongestLength = args.useLongestLength || false;
        const defaults = args.defaults || [];

        // Generate a series from 0 to max array length, then pick element i from each array
        const arrExprs = inputs.map(a => this._translateAggExpression(a));
        const lenExpr = useLongestLength
          ? `GREATEST(${arrExprs.map(a => `jsonb_array_length(${a})`).join(', ')})`
          : `LEAST(${arrExprs.map(a => `jsonb_array_length(${a})`).join(', ')})`;

        const elemParts = arrExprs.map((a, idx) => {
          if (useLongestLength && defaults[idx] !== undefined) {
            return `COALESCE(${a}->i, ${this.nextParam(JSON.stringify(defaults[idx]))}::jsonb)`;
          }
          return `COALESCE(${a}->i, 'null'::jsonb)`;
        });

        return `(SELECT COALESCE(jsonb_agg(jsonb_build_array(${elemParts.join(', ')})), '[]'::jsonb) FROM generate_series(0, ${lenExpr} - 1) AS i)`;
      }

      // Type conversion
      case '$toString': {
        return `to_jsonb(${this._translateAggExpression(args)}#>>'{}')`;
      }
      case '$toInt':
      case '$toLong': {
        return `to_jsonb((${this._translateAggExpression(args)}#>>'{}')::bigint)`;
      }
      case '$toDouble': {
        return `to_jsonb((${this._translateAggExpression(args)}#>>'{}')::double precision)`;
      }
      case '$toDecimal': {
        return `to_jsonb((${this._translateAggExpression(args)}#>>'{}')::numeric)`;
      }
      case '$toBool': {
        return `to_jsonb((${this._translateAggExpression(args)}#>>'{}')::boolean)`;
      }
      case '$toDate': {
        return `jsonb_build_object('$date', (${this._translateAggExpression(args)}#>>'{}')::timestamp)`;
      }
      case '$toObjectId': {
        return `to_jsonb(${this._translateAggExpression(args)}#>>'{}')`;
      }
      case '$type': {
        return `to_jsonb(jsonb_typeof(${this._translateAggExpression(args)}))`;
      }
      case '$convert': {
        return this._translateAggExpression(args.input);
      }

      // Object
      case '$mergeObjects': {
        if (Array.isArray(args)) {
          const parts = args.map(a => this._translateAggExpression(a));
          return parts.reduce((a, b) => `${a} || ${b}`);
        }
        return this._translateAggExpression(args);
      }
      case '$objectToArray': {
        return `(SELECT COALESCE(jsonb_agg(jsonb_build_object('k', key, 'v', value)), '[]'::jsonb) FROM jsonb_each(${this._translateAggExpression(args)}) AS t(key, value))`;
      }
      case '$arrayToObject': {
        return `(SELECT COALESCE(jsonb_object_agg(elem->>'k', elem->'v'), '{}'::jsonb) FROM jsonb_array_elements(${this._translateAggExpression(args)}) AS elem)`;
      }

      // Literal
      case '$literal': {
        return `${this.nextParam(JSON.stringify(args))}::jsonb`;
      }

      // --- Trigonometric / Math ---
      case '$sin':
        return `to_jsonb(SIN((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$cos':
        return `to_jsonb(COS((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$tan':
        return `to_jsonb(TAN((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$asin':
        return `to_jsonb(ASIN((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$acos':
        return `to_jsonb(ACOS((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$atan':
        return `to_jsonb(ATAN((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$atan2':
        return `to_jsonb(ATAN2((${this._translateAggExpression(args[0])}#>>'{}')::double precision, (${this._translateAggExpression(args[1])}#>>'{}')::double precision))`;
      case '$sinh':
        return `to_jsonb(SINH((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$cosh':
        return `to_jsonb(COSH((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$tanh':
        return `to_jsonb(TANH((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$degreesToRadians':
        return `to_jsonb(RADIANS((${this._translateAggExpression(args)}#>>'{}')::double precision))`;
      case '$radiansToDegrees':
        return `to_jsonb(DEGREES((${this._translateAggExpression(args)}#>>'{}')::double precision))`;

      // --- $sampleRate (probabilistic filter expression) ---
      case '$sampleRate':
        return `to_jsonb(RANDOM() < (${this._translateAggExpression(args)}#>>'{}')::double precision)`;

      // --- BSON Timestamp parts ---
      case '$tsSecond':
        return `to_jsonb(((${this._translateAggExpression(args)}#>>'{}')::bigint >> 32)::integer)`;
      case '$tsIncrement':
        return `to_jsonb(((${this._translateAggExpression(args)}#>>'{}')::bigint & 4294967295)::integer)`;

      // --- Additional date operators ---
      case '$isoWeek':
        return `to_jsonb(EXTRACT(WEEK FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$isoWeekYear':
        return `to_jsonb(EXTRACT(ISOYEAR FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$isoDayOfWeek':
        return `to_jsonb(EXTRACT(ISODOW FROM (${this._translateAggExpression(args)}->>'$date')::timestamp)::integer)`;
      case '$dateAdd': {
        const startD = `(${this._translateAggExpression(args.startDate)}->>'$date')::timestamp`;
        const amount = this._translateAggExpression(args.amount);
        const unitI = this._dateIntervalUnit(args.unit);
        return `jsonb_build_object('$date', (${startD} + (${amount}#>>'{}')::integer * INTERVAL '1 ${unitI}')::text)`;
      }
      case '$dateSubtract': {
        const startD = `(${this._translateAggExpression(args.startDate)}->>'$date')::timestamp`;
        const amount = this._translateAggExpression(args.amount);
        const unitI = this._dateIntervalUnit(args.unit);
        return `jsonb_build_object('$date', (${startD} - (${amount}#>>'{}')::integer * INTERVAL '1 ${unitI}')::text)`;
      }
      case '$dateTrunc': {
        const dateE = `(${this._translateAggExpression(args.date)}->>'$date')::timestamp`;
        const unitT = this._dateTruncUnit(args.unit);
        return `jsonb_build_object('$date', date_trunc(${this.nextParam(unitT)}, ${dateE})::text)`;
      }

      // --- Additional string operators ---
      case '$indexOfBytes':
      case '$indexOfCP': {
        const str = `(${this._translateAggExpression(args[0])}#>>'{}')`;
        const substr = this.nextParam(args[1]);
        const start = args[2] !== undefined ? args[2] : 0;
        return `to_jsonb(GREATEST(POSITION(${substr} IN SUBSTRING(${str} FROM ${start + 1})) - 1 + ${start}, -1))`;
      }
      case '$substrCP': {
        return `to_jsonb(SUBSTR(${this._translateAggExpression(args[0])}#>>'{}', ${args[1] + 1}, ${args[2]}))`;
      }
      case '$strcasecmp': {
        const a = `LOWER(${this._translateAggExpression(args[0])}#>>'{}')`;
        const b = `LOWER(${this._translateAggExpression(args[1])}#>>'{}')`;
        return `to_jsonb(CASE WHEN ${a} < ${b} THEN -1 WHEN ${a} > ${b} THEN 1 ELSE 0 END)`;
      }
      case '$regexFindAll': {
        const input = this._translateAggExpression(args.input);
        const regex = args.regex;
        const regexStr = typeof regex === 'string' ? regex : regex.source;
        return `(SELECT COALESCE(jsonb_agg(jsonb_build_object('match', to_jsonb(m[1]))), '[]'::jsonb) FROM regexp_matches(${input}#>>'{}', ${this.nextParam(regexStr)}, 'g') AS m)`;
      }

      // --- Additional array operators ---
      case '$range': {
        const start = `(${this._translateAggExpression(args[0])}#>>'{}')::integer`;
        const end = `(${this._translateAggExpression(args[1])}#>>'{}')::integer`;
        const step = args[2] ? `(${this._translateAggExpression(args[2])}#>>'{}')::integer` : '1';
        return `(SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb) FROM generate_series(${start}, ${end} - 1, ${step}) AS i)`;
      }
      case '$indexOfArray': {
        const arr = this._translateAggExpression(args[0]);
        const search = this._translateAggExpression(args[1]);
        return `to_jsonb(COALESCE((SELECT (idx - 1)::integer FROM jsonb_array_elements(${arr}) WITH ORDINALITY AS t(elem, idx) WHERE elem = ${search} LIMIT 1), -1))`;
      }
      case '$setUnion': {
        const arrays = args.map(a => this._translateAggExpression(a));
        const unionParts = arrays.map(a => `SELECT DISTINCT elem FROM jsonb_array_elements(${a}) AS elem`).join(' UNION ');
        return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (${unionParts}) sub)`;
      }
      case '$setIntersection': {
        const arrays = args.map(a => this._translateAggExpression(a));
        const intersectParts = arrays.map(a => `SELECT elem FROM jsonb_array_elements(${a}) AS elem`).join(' INTERSECT ');
        return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (${intersectParts}) sub)`;
      }
      case '$setDifference': {
        const arr1 = this._translateAggExpression(args[0]);
        const arr2 = this._translateAggExpression(args[1]);
        return `(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM (SELECT elem FROM jsonb_array_elements(${arr1}) AS elem EXCEPT SELECT elem FROM jsonb_array_elements(${arr2}) AS elem) sub)`;
      }
      case '$setIsSubset': {
        const arr1 = this._translateAggExpression(args[0]);
        const arr2 = this._translateAggExpression(args[1]);
        return `to_jsonb(NOT EXISTS (SELECT elem FROM jsonb_array_elements(${arr1}) AS elem EXCEPT SELECT elem FROM jsonb_array_elements(${arr2}) AS elem))`;
      }
      case '$setEquals': {
        const arrays = args.map(a => this._translateAggExpression(a));
        // Two sets are equal if neither has elements the other lacks
        const a1 = arrays[0]; const a2 = arrays[1];
        return `to_jsonb(NOT EXISTS (SELECT elem FROM jsonb_array_elements(${a1}) AS elem EXCEPT SELECT elem FROM jsonb_array_elements(${a2}) AS elem) AND NOT EXISTS (SELECT elem FROM jsonb_array_elements(${a2}) AS elem EXCEPT SELECT elem FROM jsonb_array_elements(${a1}) AS elem))`;
      }
      case '$sortArray': {
        const input = this._translateAggExpression(args.input);
        const sortBy = args.sortBy;
        if (typeof sortBy === 'number') {
          const dir = sortBy === -1 ? 'DESC' : 'ASC';
          return `(SELECT COALESCE(jsonb_agg(elem ORDER BY elem ${dir}), '[]'::jsonb) FROM jsonb_array_elements(${input}) AS elem)`;
        }
        const orderParts = Object.entries(sortBy).map(([f, d]) => `elem->>'${f}' ${d === -1 ? 'DESC' : 'ASC'}`);
        return `(SELECT COALESCE(jsonb_agg(elem ORDER BY ${orderParts.join(', ')}), '[]'::jsonb) FROM jsonb_array_elements(${input}) AS elem)`;
      }

      // --- Conditional/Type operators ---
      case '$isNumber': {
        return `to_jsonb(jsonb_typeof(${this._translateAggExpression(args)}) = 'number')`;
      }
      case '$getField': {
        if (typeof args === 'string') {
          return `data->'${args}'`;
        }
        const field = typeof args.field === 'string' ? args.field : args.field;
        const input = args.input ? this._translateAggExpression(args.input) : 'data';
        return `${input}->'${field}'`;
      }
      case '$setField': {
        const field = args.field;
        const input = args.input ? this._translateAggExpression(args.input) : 'data';
        const value = this._translateAggExpression(args.value);
        return `jsonb_set(${input}, ${this.nextParam(`{${field}}`)}, ${value}, true)`;
      }
      case '$unsetField': {
        const field = args.field;
        const input = args.input ? this._translateAggExpression(args.input) : 'data';
        return `${input} - ${this.nextParam(field)}`;
      }

      default:
        throw new Error(`Unsupported aggregation expression operator: ${op}`);
    }
  }

  _dateUnitSeconds(unit) {
    const map = {
      millisecond: 0.001, second: 1, minute: 60, hour: 3600,
      day: 86400, week: 604800, month: 2592000, quarter: 7776000, year: 31536000
    };
    return map[unit] || 1;
  }

  _dateIntervalUnit(unit) {
    const map = {
      millisecond: 'millisecond', second: 'second', minute: 'minute',
      hour: 'hour', day: 'day', week: 'week', month: 'month',
      quarter: 'quarter', year: 'year'
    };
    return map[unit] || 'day';
  }

  _dateTruncUnit(unit) {
    const map = {
      millisecond: 'milliseconds', second: 'second', minute: 'minute',
      hour: 'hour', day: 'day', week: 'week', month: 'month',
      quarter: 'quarter', year: 'year'
    };
    return map[unit] || 'day';
  }

  _nextCte() {
    this.cteCounter++;
    return `stage_${this.cteCounter}`;
  }
}

module.exports = { AggregateTranslator };
