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
 * There is deliberately no list of exceptions. Every site this rule reports is guarded
 * in the source instead, so the rule is simply clean, and a new report means new code
 * rather than an entry to add somewhere.
 */
/**
 * The identifier a loop binds, when it enumerates an object's own keys.
 * @param {object} node - candidate loop node
 * @returns {string|null} the bound key name, or null when this is not such a loop
 */
function loopKeyNames(node) {
    const left = node.left;
    const bound = [];
    if (left.type === "VariableDeclaration" && left.declarations[0]) {
        const declared = left.declarations[0].id;
        if (declared.type === "Identifier") {
            bound.push(declared.name);
        }
        else if (declared.type === "ArrayPattern") {
            // for (const [k, v] of Object.entries(x)): k is the key, and v can itself be
            // a string later used as a key, which is how the original defect worked (a
            // segmentation VALUE became a field name). Both are candidates.
            declared.elements.forEach((element) => {
                if (element && element.type === "Identifier") {
                    bound.push(element.name);
                }
            });
        }
    }
    else if (left.type === "Identifier") {
        bound.push(left.name);
    }
    if (!bound.length) {
        return [];
    }
    if (node.type === "ForInStatement") {
        return bound;
    }
    // for-of counts when it walks an object's own keys or its own values: a value that
    // is the string "__proto__" is just as dangerous once used as a key.
    const right = node.right;
    if (right && right.type === "CallExpression" && right.callee.type === "MemberExpression"
        && right.callee.object && right.callee.object.name === "Object"
        && right.callee.property && (right.callee.property.name === "keys"
            || right.callee.property.name === "entries"
            || right.callee.property.name === "values")) {
        return bound;
    }
    return [];
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

const PROTOTYPE_MEMBER_NAMES = ["__proto__", "constructor", "prototype"];

// Helpers that exist to reject those names. Calling one counts as a rejection, so a
// site fixed through a shared helper still reads as fixed.
const REJECTING_HELPER = /forbidden|unsafe|reserved|dangerous|mergeable|safekey|safefield|protokey/i;

/**
 * Whether an if-test actually rejects the prototype member names, rather than merely
 * mentioning the key.
 *
 * The distinction matters because the obvious-looking guard does not hold:
 * `hasOwnProperty.call(src, k)` is TRUE for a key that came out of JSON.parse as a
 * literal "__proto__", since that is an own property. Such a loop passes the check and
 * then pollutes anyway - confirmed by running it, not by reading the spec. Accepting it
 * as a guard would let a site that was never really fixed sit silently inside the gate.
 * @param {object} test - the if-statement test
 * @returns {boolean} true when the test names a prototype member or calls a helper that does
 */
function rejectsPrototypeKeys(test) {
    let rejects = false;
    (function scan(current) {
        if (!current || typeof current.type !== "string" || rejects) {
            return;
        }
        if (current.type === "Literal" && typeof current.value === "string"
            && PROTOTYPE_MEMBER_NAMES.includes(current.value)) {
            rejects = true;
            return;
        }
        if (current.type === "CallExpression") {
            const callee = current.callee;
            let name = "";
            if (callee.type === "Identifier") {
                name = callee.name;
            }
            else if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
                name = callee.property.name;
            }
            if (REJECTING_HELPER.test(name)) {
                rejects = true;
                return;
            }
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
    }(test));
    return rejects;
}

/**
 * Whether an expression reads through one of the given keys, e.g. `src[k]` or
 * `src[k].name`. Used to find values that came off the enumerated object.
 * @param {object} node - expression to inspect
 * @param {Array} keys - key names in scope
 * @returns {boolean} true when the expression indexes with one of them
 */
function readsThroughAnyKey(node, keys) {
    let found = false;
    (function scan(current) {
        if (!current || typeof current.type !== "string" || found) {
            return;
        }
        if (current.type === "MemberExpression" && current.computed
            && current.property.type === "Identifier" && keys.includes(current.property.name)) {
            found = true;
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
    }(node));
    return found;
}

/**
 * Names bound inside the loop to something read off the enumerated object, which are
 * then just as dangerous as the key when used as one.
 *
 * This is how the original defect actually worked: a segmentation VALUE became a field
 * name. A loop can guard its key perfectly and still write through
 * `uniqueNames[valueFromDocument][k]`, so guarding the key does not clear these.
 * @param {object} body - the loop body
 * @param {Array} keys - key names already in scope
 * @returns {Array} additional names that carry document data
 */
function derivedKeyNames(body, keys) {
    const derived = [];
    (function scan(current) {
        if (!current || typeof current.type !== "string") {
            return;
        }
        if (current.type === "VariableDeclarator" && current.id.type === "Identifier"
            && current.init && readsThroughAnyKey(current.init, keys.concat(derived))) {
            derived.push(current.id.name);
        }
        else if (current.type === "AssignmentExpression" && current.left.type === "Identifier"
            && readsThroughAnyKey(current.right, keys.concat(derived))) {
            derived.push(current.left.name);
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
    }(body));
    return derived;
}

/**
 * Whether the loop opens with a guard that skips the key, which is how a fixed site
 * looks: an `if` whose test mentions the loop key, names a prototype member (or calls a
 * helper that rejects them), and whose body continues. Covers
 * `if (!isMergeableKey(src, k)) { continue; }` and an explicit comparison against the
 * three prototype names.
 *
 * A bare `hasOwnProperty` check is deliberately NOT enough - see rejectsPrototypeKeys.
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
        if (mentionsKey && rejectsPrototypeKeys(statement.test)) {
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
        schema: [],
        messages: {
            sink: "Writing through '{{key}}' can reach Object.prototype: a stored or parsed "
                + "key may be \"__proto__\", and this indexes into it. Skip the prototype "
                + "member names at the top of the loop, the way the surrounding code does.",
        },
    },

    create(context) {
        // eslint 8 exposes these as methods, 9+ as properties
        const alreadyReported = new Set();

        /**
         * Check one loop for dangerous writes in its body.
         * @param {object} node - the loop node
         * @returns {void}
         */
        function checkLoop(node) {
            const keys = loopKeyNames(node);
            if (!keys.length || !node.body) {
                return;
            }
            // a name bound to a value off the enumerated object is as dangerous as the
            // key, and a guard on the key does not clear it
            const derived = derivedKeyNames(node.body, keys);
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
                // a leading guard clears the loop key it names; it cannot clear a name
                // carrying a value read out of the document, so derived names are checked
                // without it
                const key = keys.find((candidate) => indexesThroughKey(target, candidate)
                    && !opensWithKeyGuard(node, candidate))
                    || derived.find((candidate) => indexesThroughKey(target, candidate));
                if (!key) {
                    continue;
                }
                // signature is the file plus the normalised sink text, so unrelated
                // edits moving line numbers do not churn the reviewed list
                const at = assignment.range ? assignment.range[0] : assignment.start;
                if (alreadyReported.has(at)) {
                    continue;
                }
                alreadyReported.add(at);
                context.report({ node: assignment, messageId: "sink", data: { key } });
            }
        }

        return {
            ForInStatement: checkLoop,
            ForOfStatement: checkLoop,
        };
    },
};
