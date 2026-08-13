/**
 * Reports a write that reaches Object.prototype through a key taken from an
 * enumerated object.
 *
 * The shape, established by isolated test rather than by reasoning:
 *
 *   reported   target[k][x] = v     indexes INTO target[k]. When k is "__proto__" and
 *              target[k][x] += v    target has no own property of that name, target[k]
 *                                   IS Object.prototype, so the write lands there and
 *                                   stays for the life of the process.
 *
 *   not        target[k] = v        the __proto__ setter fires and reparents the local
 *   reported                        object. Object.prototype is untouched.
 *
 *   not        src[k][x] = v        where src is the very object carrying the own
 *   reported                        "__proto__" (straight out of JSON.parse or BSON),
 *                                   reading src[k] returns that own value. Such sites
 *                                   are listed in the reviewed option.
 *
 * Keys reaching these loops come from mongo documents and from JSON.parse of request
 * data, both of which can carry "__proto__" as an own enumerable property. Naming is
 * irrelevant, which is the point: the sinks this rule was written for were called
 * deepMerge, getMergedEventData, an unnamed inline loop, an `action` loop and a
 * `summed` loop, so no naming convention would have found them.
 *
 * Existing sites are carried in the `reviewed` option as "<relative path>|<sink text>",
 * so the rule fails only on new ones. They are held there rather than as 100+ inline
 * eslint-disable comments, which would bury the signal they are meant to carry.
 */
const path = require("path");

/**
 * The identifier a loop binds, when it enumerates an object's own keys.
 * @param {object} node - candidate loop node
 * @returns {string|null} the bound key name, or null when this is not such a loop
 */
function loopKeyName(node) {
    const left = node.left;
    let id = null;
    if (left.type === "VariableDeclaration" && left.declarations[0]) {
        const declared = left.declarations[0].id;
        if (declared.type === "Identifier") {
            id = declared.name;
        }
        else if (declared.type === "ArrayPattern" && declared.elements[0]
            && declared.elements[0].type === "Identifier") {
            id = declared.elements[0].name;
        }
    }
    else if (left.type === "Identifier") {
        id = left.name;
    }
    if (!id) {
        return null;
    }
    if (node.type === "ForInStatement") {
        return id;
    }
    // for-of only counts when it walks an object's own keys
    const right = node.right;
    if (right && right.type === "CallExpression" && right.callee.type === "MemberExpression"
        && right.callee.object && right.callee.object.name === "Object"
        && right.callee.property && (right.callee.property.name === "keys"
            || right.callee.property.name === "entries")) {
        return id;
    }
    return null;
}

/**
 * Whether an assignment target indexes through key and then one level deeper.
 * @param {object} memberNode - the assignment's left side
 * @param {string} key - the loop key
 * @returns {boolean} true when the write can reach a prototype
 */
function indexesThroughKey(memberNode, key) {
    const chain = [];
    let node = memberNode;
    while (node && node.type === "MemberExpression") {
        chain.unshift(node);
        node = node.object;
    }
    for (let i = 0; i < chain.length; i++) {
        const link = chain[i];
        if (link.computed && link.property.type === "Identifier" && link.property.name === key) {
            return (chain.length - 1 - i) > 0;
        }
    }
    return false;
}

/**
 * Whether the loop opens with a guard that skips the key, which is how a fixed site
 * looks: an `if` whose test mentions the loop key and whose body continues. Covers
 * `if (!isMergeableKey(src, k)) { continue; }`, an explicit comparison against the
 * three prototype names, and a hasOwnProperty check.
 *
 * This trusts any leading key-referencing if/continue rather than proving the test is
 * sufficient, which is deliberate: without it the rule would keep reporting a site
 * after it had been fixed, and the only way to quieten it would be to record a fixed
 * site as "reviewed", which is exactly the wrong record to leave behind.
 * @param {object} node - the loop node
 * @param {string} key - the loop key name
 * @returns {boolean} true when the loop skips unwanted keys up front
 */
function opensWithKeyGuard(node, key) {
    const body = node.body;
    const statements = body.type === "BlockStatement" ? body.body : [body];
    for (const statement of statements) {
        if (statement.type !== "IfStatement") {
            // only a leading guard counts; once real work starts, stop looking
            return false;
        }
        const consequent = statement.consequent;
        const continues = consequent.type === "ContinueStatement"
            || (consequent.type === "BlockStatement"
                && consequent.body.some((inner) => inner.type === "ContinueStatement"));
        if (!continues) {
            return false;
        }
        let mentionsKey = false;
        (function scan(current) {
            if (!current || typeof current.type !== "string" || mentionsKey) {
                return;
            }
            if (current.type === "Identifier" && current.name === key) {
                mentionsKey = true;
                return;
            }
            for (const prop of Object.keys(current)) {
                if (prop === "parent" || prop === "loc" || prop === "range") {
                    continue;
                }
                const value = current[prop];
                if (Array.isArray(value)) {
                    value.forEach(scan);
                }
                else if (value && typeof value.type === "string") {
                    scan(value);
                }
            }
        }(statement.test));
        if (mentionsKey) {
            return true;
        }
    }
    return false;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description: "disallow writing through a key taken from an enumerated object, "
                + "which reaches Object.prototype when the key is \"__proto__\"",
            recommended: true,
        },
        schema: [{
            type: "object",
            properties: {
                reviewed: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
        }],
        messages: {
            sink: "Writing through '{{key}}' can reach Object.prototype: a stored or parsed "
                + "key may be \"__proto__\", and this indexes into it. Skip inherited and "
                + "prototype-member keys. If the target is the object that carries the own "
                + "__proto__ this is safe, in which case add to bin/eslint-rules/"
                + "prototype-pollution-reviewed.json: {{signature}}",
        },
    },

    create(context) {
        const options = context.options[0] || {};
        const cwdForList = context.cwd || process.cwd();
        let reviewedList = options.reviewed;
        if (!reviewedList) {
            // Default to the list beside this rule, so both an eslintrc and a flat
            // config need only "error" rather than carrying dozens of signatures.
            try {
                reviewedList = require(path.join(cwdForList,
                    "bin/eslint-rules/prototype-pollution-reviewed.json")).reviewed;
            }
            catch (e) {
                reviewedList = [];
            }
        }
        const reviewed = new Set(reviewedList);
        // eslint 8 exposes these as methods, 9+ as properties
        const filename = context.filename || context.getFilename();
        const sourceCode = context.sourceCode || context.getSourceCode();
        const cwd = context.cwd || process.cwd();
        const relative = path.relative(cwd, filename).split(path.sep).join("/");
        const alreadyReported = new Set();

        /**
         * Check one loop for dangerous writes in its body.
         * @param {object} node - the loop node
         * @returns {void}
         */
        function checkLoop(node) {
            const key = loopKeyName(node);
            if (!key || !node.body) {
                return;
            }
            if (opensWithKeyGuard(node, key)) {
                return;
            }
            const assignments = [];
            /**
             * Collect assignment nodes anywhere inside the loop body.
             * @param {object} current - node to descend into
             * @returns {void}
             */
            function collect(current) {
                if (!current || typeof current.type !== "string") {
                    return;
                }
                if (current.type === "AssignmentExpression" || current.type === "UpdateExpression") {
                    assignments.push(current);
                }
                for (const prop of Object.keys(current)) {
                    if (prop === "parent" || prop === "loc" || prop === "range") {
                        continue;
                    }
                    const value = current[prop];
                    if (Array.isArray(value)) {
                        value.forEach(collect);
                    }
                    else if (value && typeof value.type === "string") {
                        collect(value);
                    }
                }
            }
            collect(node.body);

            for (const assignment of assignments) {
                const target = assignment.type === "AssignmentExpression"
                    ? assignment.left : assignment.argument;
                if (!target || target.type !== "MemberExpression") {
                    continue;
                }
                if (!indexesThroughKey(target, key)) {
                    continue;
                }
                // signature is the file plus the normalised sink text, so unrelated
                // edits moving line numbers do not churn the reviewed list
                const text = sourceCode.getText(assignment).replace(/\s+/g, " ").trim();
                const signature = relative + "|" + text;
                if (reviewed.has(signature)) {
                    continue;
                }
                const at = assignment.range ? assignment.range[0] : assignment.start;
                if (alreadyReported.has(at)) {
                    continue;
                }
                alreadyReported.add(at);
                context.report({ node: assignment, messageId: "sink", data: { key, signature } });
            }
        }

        return {
            ForInStatement: checkLoop,
            ForOfStatement: checkLoop,
        };
    },
};
