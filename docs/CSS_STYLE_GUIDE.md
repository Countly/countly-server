# CSS Style Guide

This guide covers CSS conventions, SASS usage, and styling best practices for Countly development.

## CSS Preprocessor

Countly uses **SASS** as the CSS preprocessor with **Dart Sass** implementation and **SCSS** syntax.

### Key Resources
- NPM module: `sass`
- Implementation: [Dart Sass](https://sass-lang.com/dart-sass)
- Syntax: [SCSS](https://sass-lang.com/documentation/syntax#scss)

### Important SASS Topics
1. [Partials](https://sass-lang.com/guide#topic-4) - Files prefixed with `_` that are imported
2. [Private members](https://sass-lang.com/documentation/at-rules/use#private-members) - Variables/mixins not exported
3. [@use rule](https://sass-lang.com/documentation/at-rules/use) - Modern import syntax

## Compiling SASS

### Build Commands
```bash
# Compile all resources (recommended)
npx grunt dist-all

# Compile only SASS files
npx grunt sass

# Watch for SASS changes
npx grunt watch
```

### Manual Compilation
```bash
sass /path/to/input.scss /path/to/output.css --style compressed --no-source-map
```

Add `--watch` flag for development auto-compilation.

**Note:** Remove source maps from final merged code.

## Directory Structure

### Core CSS Directory
```
frontend/express/public/stylesheets/styles/
├── base/
│   ├── _base.scss              # Base DOM elements (p, h1, etc.)
│   ├── _colors.scss            # Global color variables
│   ├── _element-variables.scss # Element UI CSS variables
│   ├── _mixins.scss            # Global mixins
│   ├── _typography-variables.scss
│   └── _variables.scss         # All other global variables
├── blocks/                     # BEM block files
├── overrides/                  # Third-party lib overrides
│   ├── _element-overrides.scss
│   └── _bulma-overrides.scss
├── states/
│   └── _state.scss            # Global state classes
├── coreplugins/               # Core plugin CSS
│   └── _[plugin-name].scss
├── manifest.scss              # Loads all partials
└── manifest.css               # Compiled output
```

### Plugin CSS Structure
```
plugins/<name>/frontend/public/stylesheets/
├── main.scss        # Entry point, loads partials
├── main.css         # Compiled output
├── _component1.scss # Partial files (prefixed with _)
└── _component2.scss
```

### Using Core Variables in Plugins
```scss
// main.scss
@use "../../../../../../frontend/express/public/stylesheets/styles/base/colors" as c;

.text {
    color: c.$text-color;
}
```

## BEM Naming Convention

We use **BEM (Block Element Modifier)** with the **two dashes style** naming convention.

### Structure
- **Block**: Independent entity (`.cly-vue-section`)
- **Element**: Part of a block (`.cly-vue-section__content`)
- **Modifier**: Variation/state (`.cly-vue-section--white`)

### Naming Rules
1. **Prefix all blocks with `cly-vue-`** to avoid collisions with legacy code
2. Use class selectors only (no tag or ID selectors)
3. Don't combine tags and classes (e.g., avoid `button.button`)
4. Don't use combined selectors

### Example
```scss
// _section.scss
@use "../base/variables" as v;
@use "../base/colors" as c;

.cly-vue-section {
    padding: 2px;

    &__content {
        border-top: v.$border-base;
        border-bottom: v.$border-base;
    }

    &--white {
        background-color: c.$color-white;
    }
}
```

```html
<div class="cly-vue-section">
    <h4>Title</h4>
    <div class="cly-vue-section__content cly-vue-section--white">
        Content here
    </div>
</div>
```

## Bulma CSS Framework

We include **Bulma** for grid layouts and responsiveness.

### Namespace
All Bulma classes are prefixed with `bu-` to avoid collisions:
- `columns` → `bu-columns`
- `is-full` → `bu-is-full`

### Available Components
- [Columns](https://bulma.io/documentation/columns/basics/)
- [Tiles](https://bulma.io/documentation/layout/tiles/)
- [Container](https://bulma.io/documentation/layout/container/)
- [Flexbox helpers](https://bulma.io/documentation/helpers/flexbox-helpers/)
- [Level](https://bulma.io/documentation/layout/level/)
- [Spacing helpers](https://bulma.io/documentation/helpers/spacing-helpers/)
- [Progress](https://bulma.io/documentation/elements/progress/)
- [Image](https://bulma.io/documentation/elements/image/)
- [Media object](https://bulma.io/documentation/layout/media-object/)

### Example with Bulma Grid
```html
<div class="cly-vue-section bu-columns">
    <div class="bu-column bu-is-full">
        <div class="bu-level">
            <div class="bu-level-left">
                <div class="bu-level-item">
                    <h4>{{title}}</h4>
                </div>
            </div>
        </div>
    </div>
    <div class="bu-column bu-is-full cly-vue-section__content">
        <slot></slot>
    </div>
</div>
```

## Key Rules

### DO
- Use `@use` rule to load partials (not `@import`)
- Create partials (files starting with `_`) for organization
- Use BEM naming with `cly-vue-` prefix
- Use Bulma classes (`bu-*`) for grid and layout
- Move likely-to-change CSS properties to modifiers
- Use state classes from `_states.scss` partial

### DON'T
- Don't use `@import` in SASS files
- Don't load `element-variables.scss` in your SCSS files
- Don't use `!important` - increase specificity instead
- Don't combine tag and class selectors
- Don't use ID selectors for styling
- Don't add CSS to deprecated directories:
  - `frontend/express/public/stylesheets/main.css`
  - `frontend/express/public/stylesheets/vue/*`

## Third-Party Libraries

Add third-party CSS libraries to:
```
frontend/express/public/stylesheets/<library-name>/
```

## Element UI Customization

To modify Element UI components:

1. Clone from: https://github.com/Countly/element
2. Make changes to the cloned repo
3. Requirements: Node.js 14.x.x, Python 2.7
4. Build: `npm run dist --unsafe-perm`
5. Copy `lib/index.js` to `frontend/express/public/javascripts/utils/vue/element-ui.js`
6. Copy CSS from `lib/theme-chalk/` to `frontend/express/public/stylesheets/vue/element-ui.css`
7. Push changes to both repos to avoid override conflicts
