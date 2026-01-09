/* global Vue, $, ResizeObserver, _, countlyVue */

(function() {

    var scope = "@scroll-shadow-fn";

    var epsilon = 1;

    var IS_VUE_3 = countlyVue && countlyVue.compat && countlyVue.compat.IS_VUE_3;

    var directiveImpl = function(el) {
        var checkFn = _.debounce(function() {
            el.classList.remove("is-scroll-shadow-at-top");
            el.classList.remove("is-scroll-shadow-at-middle");
            el.classList.remove("is-scroll-shadow-at-bottom");
            if (el.scrollHeight > el.clientHeight) {
                var bottomDelta = Math.abs(el.clientHeight + el.scrollTop - el.scrollHeight);
                var atTop = el.scrollTop === 0;
                var atBottom = bottomDelta <= epsilon;
                var atMiddle = !atTop && !atBottom;
                if (atTop) {
                    el.classList.add("is-scroll-shadow-at-top");
                }
                if (atBottom) {
                    el.classList.add("is-scroll-shadow-at-bottom");
                }
                if (atMiddle) {
                    el.classList.add("is-scroll-shadow-at-middle");
                }
                $(el).find(".scroll-shadow-container").css("top", (el.offsetTop + $(el).height()) + "px");
            }
        }, 50);

        $(el).prepend("<div class='scroll-shadow-container'></div>");

        checkFn();

        el.addEventListener("scroll", checkFn, true);
        /*  passive = true 
            (https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scrolling_performance_with_passive_listeners)
        */
        var ro = new ResizeObserver(checkFn);
        ro.observe(el);

        el[scope] = {
            scrollListener: checkFn,
            resizeObserver: ro
        };
    };

    var directiveCleanup = function(el) {
        if (el[scope]) {
            el.removeEventListener("scroll", el[scope].scrollListener);
            el[scope].resizeObserver.unobserve(el);
            el[scope].resizeObserver.disconnect();
            delete el[scope];
        }
    };

    // Directive definition with both Vue 2 and Vue 3 hook names
    var directiveDefinition = {
        // Vue 2 hooks
        inserted: directiveImpl,
        unbind: directiveCleanup,
        // Vue 3 hooks
        mounted: directiveImpl,
        unmounted: directiveCleanup
    };

    // Register the directive
    if (IS_VUE_3 && countlyVue.registerDirective) {
        countlyVue.registerDirective('scroll-shadow', directiveDefinition);
    }
    else if (typeof Vue !== 'undefined') {
        Vue.directive('scroll-shadow', directiveDefinition);
    }
})();