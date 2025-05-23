/**
 * Dual Vue Gateway
 *  This script manages transitioning between Vue 2 and Vue 3 for experimental features.
 *  It ensures that the correct Vue version is active based on URL hash changes.
 *  It shows only one container at a time (Vue 2 or Vue 3) to avoid conflicts.
 *  It handles loading necessary scripts and styles dynamically.
 */

/* eslint-disable */

(function(window, document) {

    /* ------------------------------------------------------------------
     *  Constant CDN map
     * ----------------------------------------------------------------*/
    const VUE3_ASSETS = {
        vue3: { id: 'vue3-lib', src: 'https://unpkg.com/vue@3.5.14/dist/vue.global.prod.js' },
        router: { id: 'vue3-router', src: 'https://unpkg.com/vue-router@4.1.6/dist/vue-router.global.prod.js' },
        demi: { id: 'vue-demi-lib', src: 'https://unpkg.com/vue-demi@0.13.11/lib/index.iife.js' },
        elPlusJs: { id: 'element-plus-lib', src: 'https://unpkg.com/element-plus@2.3.9/dist/index.full.js' },
        elPlusCss: { id: 'element-plus-css', href: 'https://unpkg.com/element-plus@2.3.9/dist/index.css' },
        // ...other dependencies if needed 
    };

    const VUE2_ASSETS = {
        elUi: { id: 'element-ui-css' },
        vue2: { id: 'vue2-lib' },
        // ...other dependencies if needed
    };

    // const EL_UI_CSS_ID = 'element-ui-css';

    const vue2 = window.Vue; // snapshot original Vue 2

    /* ------------------------------------------------------------------
     *  Tiny DOM helpers
     * ----------------------------------------------------------------*/
    function loadScript({ id, src }) {
        return new Promise((resolve, reject) => {
            let node = document.getElementById(id);
            if (node) {
                node.remove();
            }
            
            node = Object.assign(document.createElement('script'), { id, src, async: false });
            document.head.appendChild(node);
            
            node.addEventListener('load', () => {
                resolve();
            }, { once: true });
            node.addEventListener('error', reject, { once: true });
        });
    }

    function addCss({ id, href }) {
        let link = document.getElementById(id);
        if (!link) {
            link = Object.assign(document.createElement('link'), { id, rel: 'stylesheet', href });
            document.head.appendChild(link);
        }
        link.disabled = false;
    }

    function toggleCss(id, enable) {
        // todo: there is a problem in here
        const link = document.getElementById(id);
        if (link) {
            link.disabled = !enable;
        }
    }

    function ensureRemoved(id) {
        const el = document.getElementById(id);
        if (el?.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    /* ------------------------------------------------------------------
     *  Container visibility helper - always call this first!
     * ----------------------------------------------------------------*/
    function setContainers({ vue3 }) {
        const v2 = document.getElementById('vue2-app');
        const v3 = document.getElementById('vue3-app');
        if (v2) {
            v2.style.display = vue3 ? 'none' : 'block';
        }
        if (v3) {
            v3.style.display = vue3 ? 'block' : 'none';
        }
    }

    /* ------------------------------------------------------------------
     *  Vue 3 initialization
     * ----------------------------------------------------------------*/
    async function initVue3App() {
        // Always set containers first to avoid double-visible divs
        setContainers({ vue3: true });

        // If Vue 3 is already active, all we need is CSS switch-over
        if (window.Vue?.version?.startsWith('3.')) {
            toggleCss(VUE2_ASSETS.elUi, false); // disable Element-UI
            addCss(VUE3_ASSETS.elPlusCss); // ensure Element Plus CSS present

            // If app is already created, we don't need to recreate it
            if (window.Vue3App) {
                return;
            }
        }

        /* Switching from Vue 2 -> Vue 3 */

        // 1- Styles: swap CSS
        toggleCss(VUE2_ASSETS.elUi, false);
        addCss(VUE3_ASSETS.elPlusCss);

        // 2- We might need to detach Vue 2 so Vue 3 can mount cleanly
        // window.Vue = undefined;

        // 3- Load libraries (skip ones already present & loaded)
        await loadScript(VUE3_ASSETS.vue3);
        await loadScript(VUE3_ASSETS.router);
        await loadScript(VUE3_ASSETS.demi);
        await loadScript(VUE3_ASSETS.elPlusJs);

        // 4-  Sanity check - Element Plus must be on window by now
        if (!window.ElementPlus) {
            console.error('[DualVueGateway] Element Plus failed to load');
            return;
        }

        if (!window.Vue3App) {
        // 5- Build Vue 3 app instance once to avoid re-creating it on every hash change
            const app = Vue.createApp({
                template: 
              `<div style="display:flex;flex-direction:column;height:100vh">
                <header style="padding:16px;background:#f5f5f5;border-bottom:1px solid #ddd">
                  <h2 style="margin:0 0 8px">Vue 3 Experimental App</h2>
                  <el-button type="success">Element Plus Works!</el-button>
                </header>
                <main style="flex:1;padding:16px"><router-view></router-view></main>
              </div>`
            });

            app.use(window.ElementPlus);
            // 6- Add Vue Router
            const router = VueRouter.createRouter({
                history: VueRouter.createWebHashHistory(),
                routes: [...(countlyVue3.getRoutes() || [])]
            });

            app.use(router).mount('#vue3-app');

            window.Vue3App = app;
            window.Vue3Router = router;

            console.log('[DualVueGateway] Vue 3 app initialized successfully.');
        }
    }

    /* ------------------------------------------------------------------
     *  Vue 2 restore
     * ----------------------------------------------------------------*/
    function initVue2App() {
        // Always set containers first so only one div shows
        setContainers({ vue3: false });

        // Styles - Element-UI back, Element Plus gone
        toggleCss(VUE2_ASSETS.elUi, true);
        ensureRemoved(VUE3_ASSETS.elPlusCss.id);

        // If Vue 2 already active, return (to avoid duplicate)
        if (window.Vue?.version?.startsWith('2.')) {
            return;
        }

        /* Switching from Vue 3 -> Vue 2 */
        window.Vue = vue2;
    }

    // window.countlyVueGateway = { initVue3App, initVue2App }; // Turn this on if needed in other places

    const isExperimental = () => window.location.href.includes('experimental');
    isExperimental() ? initVue3App() : initVue2App();

    window.addEventListener('hashchange', () => {
        isExperimental() ? initVue3App() : initVue2App();
    });

})(window, document);