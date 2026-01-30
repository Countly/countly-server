# TypeScript Migration Guide — Countly Server

Gradual migration from JavaScript (CommonJS) to TypeScript on Node.js 24.

---

## 1. `package.json` — Do NOT add `"type": "module"`

Your `package.json` has no `"type"` field. **Keep it that way.** This means:

- All `.js` files → **CommonJS** (can use `require`/`module.exports`)
- All `.ts` files → **CommonJS** (can use `import`/`export` syntax, but TypeScript treats them as CJS)

```jsonc
// package.json — no changes needed
{
  "name": "countly-server",
  "version": "25.03.0"
  // NO "type" field = defaults to "commonjs"
}
```

If you added `"type": "module"`, all your existing `.js` files using `require()` would break.

---

## 2. `tsconfig.json` — Recommended settings

```jsonc
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["es2024"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowJs": true,
    "checkJs": true,
    "resolveJsonModule": true,
    "strict": true,
    "noEmit": true,
    "outDir": "dist",
    "allowImportingTsExtensions": true,

    // These help with CJS → TS interop:
    "esModuleInterop": true,       // enables default imports from CJS modules
    "isolatedModules": true         // catches patterns that won't work at runtime
  }
}
```

Key options explained:

| Option | Why |
|---|---|
| `module: "nodenext"` | Detects CJS/ESM per-file based on extension + `package.json` `"type"` |
| `moduleResolution: "nodenext"` | Resolves imports the same way Node.js does |
| `allowJs: true` | Lets TypeScript process `.js` files |
| `esModuleInterop: true` | Allows `import x from './cjs.js'` for CJS `module.exports` |
| `noEmit: true` | Type-checking only, no compiled output |

---

## 3. How module format is determined per-file

Since `package.json` has **no `"type"` field** (defaults to `"commonjs"`):

| File extension | Module format | `require()` | `import/export` syntax |
|---|---|---|---|
| `.js` | CJS | Yes | No |
| `.ts` | CJS | Yes (via `require()`) | Yes (emits as `require`) |
| `.mts` | ESM | No | Yes (true ESM) |
| `.cts` | CJS | Yes | Yes (emits as `require`) |
| `.mjs` | ESM | No | Yes (true ESM) |
| `.cjs` | CJS | Yes | No |

**Your `.ts` files are CJS.** TypeScript lets you write `import`/`export` syntax, but under the hood it's CJS. This is exactly what you want — it interoperates seamlessly with your existing `.js` files.

---

## 4. Import patterns — JS into TS

### Pattern A: JS file exports an object via `module.exports`

```js
// api/utils/common.js
module.exports = {
    someFunc: function() { /* ... */ },
    otherFunc: function() { /* ... */ }
};
```

```ts
// api/someNewFile.ts

// Default import — gets the whole module.exports object
import common from '../utils/common.js';
common.someFunc();

// Destructured named imports — also works
import { someFunc, otherFunc } from '../utils/common.js';
someFunc();
```

### Pattern B: JS file exports a single function/class

```js
// plugins/pluginManager.js
module.exports = PluginManager;
```

```ts
// someFile.ts
import PluginManager from '../../plugins/pluginManager.js';
```

### Pattern C: JS file uses `exports.xxx` individually

```js
// someLib.js
exports.foo = function() {};
exports.bar = 42;
```

```ts
// someFile.ts
import { foo, bar } from './someLib.js';
```

### Pattern D: Using `require()` directly in `.ts` (escape hatch)

```ts
// This works in CJS-mode .ts files, but you lose type info:
const common = require('../utils/common.js');  // typed as `any`
```

---

## 5. File extensions are mandatory

With `nodenext`, you **must** include `.js` in import paths, even when importing a `.ts` file:

```ts
// Importing a .js file — use .js
import common from '../utils/common.js';      // correct

// Importing another .ts file — STILL use .js
import { helper } from './myHelper.js';        // correct (resolves to myHelper.ts)

// No extension — ERROR
import common from '../utils/common';          // TS error
```

This is because TypeScript mirrors how Node.js resolves modules at runtime — Node sees `.js` files, not `.ts` files.

**Exception:** Since we have `allowImportingTsExtensions: true` and `noEmit: true`, you can also use `.ts` extensions directly:

```ts
import { helper } from './myHelper.ts';        // works with allowImportingTsExtensions
```

---

## 6. When TypeScript can't infer types from a JS file

If a `.js` file has no JSDoc and TypeScript can't figure out the types, you have three options:

### Option A: Add JSDoc to the JS file (no migration needed)

```js
// common.js
/**
 * @param {string} id
 * @returns {Promise<object>}
 */
module.exports.getById = function(id) { /* ... */ };
```

### Option B: Create a `.d.ts` declaration file next to it

```ts
// common.d.ts
export function getById(id: string): Promise<object>;
export function someFunc(): void;
```

### Option C: Declare the module globally in a `types.d.ts`

```ts
// types.d.ts (place in project root, ensure it's in tsconfig "include")
declare module '*/utils/common.js' {
    export function someFunc(): void;
    export function otherFunc(): void;
}
```

---

## Summary checklist

1. **`package.json`** — No `"type"` field (keeps everything CJS)
2. **`tsconfig.json`** — Add `target: "es2024"`, `lib: ["es2024"]`, `esModuleInterop: true`
3. **`.ts` files** — Use `import`/`export` syntax (TypeScript handles CJS conversion)
4. **Import paths** — Always include `.js` extension
5. **New files** — Create as `.ts`, use `import` to pull in existing `.js` files
6. **Types** — Add JSDoc to `.js` files or create `.d.ts` files as needed

---

## References

- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [TypeScript Modules Theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- [Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [TSConfig: module](https://www.typescriptlang.org/tsconfig/module.html)
- [TSConfig: moduleResolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html)
- [@tsconfig/node24](https://www.npmjs.com/package/@tsconfig/node24)
- [Total TypeScript: Configuring TypeScript](https://www.totaltypescript.com/books/total-typescript-essentials/configuring-typescript)
