/* global Vue, $, ResizeObserver, _ */

(function() {

    var scope = "@scroll-shadow-fn";

    var epsilon = 1;

    Vue.directive('scroll-shadow', {
        inserted: function(el) {
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
        },
        unbind: function(el) {
            if (el[scope]) {
                el.removeEventListener("scroll", el[scope].scrollListener);
                el[scope].resizeObserver.unobserve(el);
                el[scope].resizeObserver.disconnect();
                delete el[scope];
            }
        }
    });
})();