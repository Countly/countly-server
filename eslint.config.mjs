import { defineConfig, globalIgnores } from "eslint/config";
import { createRequire } from "node:module";
import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

const require = createRequire(import.meta.url);

// In-repo rules from bin/eslint-rules, loaded as a local plugin (flat config has no --rulesdir).
const countly = {
    meta: { name: "countly-local-rules" },
    rules: {
        "no-prototype-pollution-sink": require("./bin/eslint-rules/no-prototype-pollution-sink.js")
    }
};

// ESLint 10 no longer ships require-jsdoc and valid-jsdoc. These are their
// eslint-plugin-jsdoc counterparts, configured to the options the old rules ran with:
// require-jsdoc's `require` map, and valid-jsdoc with requireReturn: false (a function
// documents @returns only when it returns a value).
const jsdocRules = {
    "jsdoc/require-jsdoc": ["error", {
        require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            // The core rule only required JSDoc on an arrow function bound to a
            // variable (`const f = () => ...`), never on a callback or property value.
            ArrowFunctionExpression: false,
            FunctionExpression: false
        },
        contexts: ["VariableDeclarator > ArrowFunctionExpression"]
    }],
    "jsdoc/require-param": ["error", { checkDestructured: false }],
    "jsdoc/check-param-names": ["error", { checkDestructured: false }],
    "jsdoc/require-param-type": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-returns": ["error", { forceReturnsWithAsync: false }],
    "jsdoc/require-returns-check": "error",
    "jsdoc/require-returns-type": "error",
    "jsdoc/require-returns-description": "error",
    "jsdoc/valid-types": "error"
};

// Rules shared by the server-side and browser-side application code blocks.
const appCodeRules = {
    ...jsdocRules,
    "for-direction": "off",
    "no-control-regex": "off",
    "dot-notation": "error",
    "eqeqeq": ["error", "always"],
    "no-alert": "error",
    "no-caller": "error",
    "no-eval": "error",
    "no-extend-native": "error",
    "no-iterator": "error",
    "no-shadow": "error"
};

const nodeGlobals = { ...globals.node, ...globals.es2021 };

// Bluebird-only APIs, flagged as warnings until bluebird is gone.
const bluebirdStatics = [
    ["map", "use native arrays with Promise.all or a library like 'p-map'."],
    ["reduce", "use Array.reduce plus async/await or a concurrency library."],
    ["filter", "use Array.filter plus async/await or a concurrency library."],
    ["each", "use a for-loop/forEach with async/await."],
    ["props", "use Promise.all with Object.entries or a custom approach."],
    ["join", "use Promise.all([...]) and destructuring in .then."],
    ["try", "use a try/catch block or an async function."],
    ["attempt", "use a try/catch block or an async function."],
    ["method", "define an async function or return a native Promise."],
    ["promisify", "use native 'util.promisify' or wrap in a new Promise."],
    ["promisifyAll", "consider 'util.promisify' for each function or a similar library."],
    ["fromCallback", "use new Promise(...) or 'util.promisify'."],
    ["coroutine", "use native async/await."],
    ["spawn", "use native async/await."],
    ["using", "use try/finally or a resource-management library."],
    ["disposer", "use try/finally or a resource-management library."],
    ["settle", "use native 'Promise.allSettled'."]
];
const bluebirdInstanceMethods = [
    ["tap", "use '.then(value => { ...; return value; })'."],
    ["tapCatch", "use '.catch(error => { ...; throw error; })'."],
    ["spread", "use '.then(([a, b]) => ... )' with array destructuring."],
    ["delay", "use setTimeout() or a library (e.g., p-delay)."],
    ["timeout", "use p-timeout or similar library."],
    ["return", "use '.then(() => someValue)' or rewrite chain."],
    ["throw", "use '.then(() => { throw error; })'."],
    ["asCallback", "use 'util.callbackify' or rewrite manually."],
    ["nodeify", "use 'util.callbackify' or rewrite manually."],
    ["reflect", "use 'Promise.allSettled' or custom handling."],
    ["caught", "use '.catch()' with condition or separate logic."],
    ["catchReturn", "use '.catch(err => fallbackValue)' or similar."],
    ["catchThrow", "use '.catch(err => { throw newError; })'."]
];

export default defineConfig([
    globalIgnores([
        // ESLint 8 skipped dot-directories by default; flat config does not.
        ".*/**",
        "**/node_modules/**",
        "bin/upgrade/**",
        "frontend/express/public/javascripts/dom/**",
        "frontend/express/public/javascripts/min/**",
        "frontend/express/public/javascripts/utils/**",
        "frontend/express/public/javascripts/visualization/**",
        "frontend/express/public/themes/**",
        "frontend/express/public/sdk/**",
        "plugins/*/frontend/public/*",
        "plugins/*/frontend/public/javascripts/*",
        "bin/scripts/nghttp2/*",
        "plugins/push/api/parts/apn/*",
        "!plugins/*/frontend/public/javascripts",
        "!plugins/*/frontend/public/javascripts/countly.*.js"
    ]),
    {
        // .eslintrc.json had no top-level parser options, so files outside every
        // block below parse as ES5 scripts with no environment globals, as before.
        languageOptions: {
            ecmaVersion: 5,
            sourceType: "script"
        },
        plugins: {
            "@stylistic": stylistic,
            jsdoc,
            security,
            "no-unsanitized": noUnsanitized,
            countly
        },
        settings: {
            jsdoc: { mode: "typescript" }
        }
    },
    js.configs.recommended,
    {
        rules: {
            "require-atomic-updates": "off",

            /* ---------- Security ----------
               Counts below were measured against this tree before each rule was turned on.
               A rule that costs nothing today is worth having as a forward gate; a rule
               whose cost is a long cleanup is carried at "warn" with that cleanup named.

               Deliberately NOT enabled:

               guard-for-in — 454 reports here, and 6.2% of them (28) sit on a loop that
                 actually contains a prototype-reaching write. Those 28 are found by the same
                 two predicates no-prototype-pollution-sink already uses, so the rule adds no
                 coverage over it while adding 454 reports. It also misses the sinks that
                 motivated that rule, because a lone if/else loop body satisfies it.

               security/detect-object-injection — fires on nearly every obj[key] read.

               security/detect-non-literal-fs-filename — 145 reports, dominated by legitimate
                 path building in Gruntfile, countlyFs and the upload handlers.

               security/detect-non-literal-require — 19 reports, all of them the plugin
                 loader doing what a plugin loader does. */

            // 0 reports: free forward gates.
            "no-proto": "error",
            "no-implied-eval": "error",
            "no-new-func": "error",
            "no-script-url": "error",
            // 0 reports. Exempts the destructured `const {spawn} = require('child_process')`
            // that 24 files use, and flags a non-literal first argument to exec() — which is
            // exactly the anti-pattern CLAUDE.md calls out.
            "security/detect-child-process": "error",
            "security/detect-eval-with-expression": "error",
            "security/detect-pseudoRandomBytes": "error",

            // 26 reports across 16 files, mostly in api/utils/common.js. Each needs a
            // read to tell a real ReDoS from a bounded pattern, so it stays at "warn"
            // until those are triaged rather than being disabled at 26 sites.
            "security/detect-unsafe-regex": "warn",
            // 14 innerHTML assignments across 6 files, all in frontend code, none of them
            // literal. Same reason: real findings, but fixing them is a code change, so
            // they are surfaced rather than either blocking the build or being silenced.
            "no-unsanitized/method": "warn",
            "no-unsanitized/property": "warn",

            "@stylistic/block-spacing": ["error", "always"],
            "@stylistic/brace-style": ["error", "stroustrup"],
            "@stylistic/comma-spacing": ["error", { before: false, after: true }],
            "@stylistic/comma-style": ["error", "last"],
            "@stylistic/computed-property-spacing": ["error", "never"],
            "curly": ["error", "all"],
            "@stylistic/function-call-spacing": ["error", "never"],
            "@stylistic/indent": ["error", 4, { SwitchCase: 0 }],
            "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
            "@stylistic/keyword-spacing": ["error", { before: true, after: true }],
            "@stylistic/lines-between-class-members": ["error", "always"],
            "@stylistic/no-multi-spaces": "error",
            "@stylistic/no-trailing-spaces": ["error", { ignoreComments: true }],
            "no-useless-escape": "off",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/object-curly-newline": ["error", { multiline: true, consistent: true }],
            "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/semi-style": ["error", "last"],
            "@stylistic/space-before-blocks": ["error", "always"],
            "@stylistic/space-before-function-paren": ["error", { anonymous: "never", named: "never", asyncArrow: "never", catch: "ignore" }],
            "@stylistic/space-in-parens": ["error", "never"],
            "@stylistic/space-infix-ops": "error",
            "@stylistic/space-unary-ops": ["error", { words: true, nonwords: false }],
            "@stylistic/switch-colon-spacing": "error",
            "unicode-bom": ["error", "never"],

            "no-restricted-properties": ["warn",
                ...bluebirdStatics.map(([property, suggestion]) => ({
                    object: "Promise",
                    property,
                    message: "Bluebird-specific method 'Promise." + property + "' detected. Suggestion: " + suggestion
                })),
                ...bluebirdStatics.map(([property, suggestion]) => ({
                    object: "Bluebird",
                    property,
                    message: "Bluebird-specific method 'Bluebird." + property + "' detected. Suggestion: " + suggestion
                }))
            ],
            "no-restricted-syntax": ["warn",
                ...bluebirdInstanceMethods.map(([name, suggestion]) => ({
                    selector: "CallExpression[callee.property.name='" + name + "']",
                    message: "Bluebird-specific instance method '." + name + "()' detected. Suggestion: " + suggestion
                })),
                {
                    selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='bind'][callee.object.name=/^(Promise|Bluebird|BPromise)$/]",
                    message: "Bluebird-specific '.bind()' detected on a Bluebird promise. Suggestion: manually bind 'this' or use arrow functions."
                }
            ]
        }
    },
    {
        files: ["api/**/*.js", "plugins/*/api/**/*.js", "frontend/express/public/javascripts/countly/**/*.js", "plugins/*/frontend/**/*.js"],
        ignores: ["**/tests.js", "**/tests/**"],
        rules: {
            "countly/no-prototype-pollution-sink": "error"
        }
    },
    {
        files: [
            "plugins/content/frontend/vite.config.js",
            "plugins/journey_engine/frontend/vite.config.js",
            "plugins/journey_engine/frontend/vite-manifest.js"
        ],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: nodeGlobals
        },
        rules: {
            "no-console": "off"
        }
    },
    {
        files: [
            "plugins/content/frontend/content-blocks/**/*.js",
            "plugins/journey_engine/frontend/builder/**/*.js"
        ],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: nodeGlobals
        },
        rules: {
            "no-console": "error",
            "no-unused-vars": ["error", {
                argsIgnorePattern: "^_", // unused function args
                varsIgnorePattern: "^_" // unused variables
            }]
        }
    },
    {
        files: [
            "frontend/express/public/javascripts/countly/*.js",
            "frontend/express/public/javascripts/countly/vue/*.js",
            "frontend/express/public/javascripts/countly/vue/components/*.js",
            "frontend/express/public/javascripts/countly/vue/data/*.js",
            "frontend/express/public/core/*/javascripts/countly.*.js",
            "plugins/*/frontend/public/javascripts/countly.*.js"
        ],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "script",
            globals: { ...globals.browser, ...globals.es2020 }
        },
        rules: {
            ...appCodeRules,
            "no-console": "error",
            "no-loop-func": "error"
        }
    },
    {
        files: ["plugins/content/api/positioning/**/*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: nodeGlobals
        }
    },
    {
        files: ["plugins/content/api/positioning/**/*.cjs"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "commonjs",
            globals: nodeGlobals
        }
    },
    {
        files: [
            "api/**/*.js",
            "frontend/express/*.js",
            "frontend/express/libs/*.js",
            "plugins/pluginManager.js",
            "plugins/pluginDependencies.js",
            "plugins/*/api/**/*.js",
            "plugins/*/frontend/**/*.js",
            "plugins/*/extend/**/*.js"
        ],
        ignores: [
            "plugins/*/frontend/public/**/*.js",
            "plugins/content/frontend/content-blocks/**/*.js",
            "plugins/journey_engine/frontend/builder/**/*.js"
        ],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "commonjs",
            globals: nodeGlobals
        },
        rules: {
            ...appCodeRules,
            "no-console": "off",
            "no-await-in-loop": "off",
            "no-loop-func": "off"
        }
    },
    {
        files: [
            "Gruntfile.js",
            "bin/**/*.js",
            "scripts/**/*.js",
            "extend/**/*.js",
            "plugins/*/*.js",
            "plugins/*/scripts/*.js",
            "*.js"
        ],
        ignores: ["plugins/*/tests.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "commonjs",
            globals: nodeGlobals
        },
        rules: {
            "no-console": "off"
        }
    },
    {
        files: [
            "test/**/*.js",
            "plugins/*/tests/**/*.js",
            "plugins/*/tests.js"
        ],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "commonjs",
            globals: { ...nodeGlobals, ...globals.mocha }
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": "off",
            "no-redeclare": "off"
        }
    },
    {
        files: ["ui-tests/**/*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: {
                ...nodeGlobals,
                ...globals.mocha,
                Cypress: "readonly",
                cy: "readonly"
            }
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": "off",
            "no-redeclare": "off"
        }
    },
    {
        // This file itself is an ES module run by Node.
        files: ["eslint.config.mjs"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: nodeGlobals
        }
    }
]);
