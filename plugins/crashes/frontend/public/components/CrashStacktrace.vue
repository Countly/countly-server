<template>
    <div class="crash-stacktrace bu-p-5">
        <div class="crash-stacktrace__header bu-level is-mobile">
            <div class="bu-level-left"><slot name="header-left"></slot></div>
            <div class="bu-level-right"><slot name="header-right"></slot></div>
        </div>
        <pre><span class="crash-stacktrace__line-numbers">{{lineNumbers}}</span><code ref="code" class="crash-stacktrace__code" v-html="highlightedCode"></code></pre>
    </div>
</template>

<script>
import jQuery from 'jquery';
import { authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

var FEATURE_NAME = 'crashes';

export default {
    props: {
        code: {type: String, required: true}
    },
    mixins: [
        authMixin(FEATURE_NAME)
    ],
    computed: {
        hasHeaderLeft: function() {
            return !!(this.$scopedSlots["header-left"] || this.$slots["header-left"]);
        },
        hasHeaderRight: function() {
            return !!(this.$scopedSlots["header-right"] || this.$slots["header-right"]);
        },
        lineNumbers: function() {
            return Array.apply(null, Array((this.code.match(/\n/g) || []).length + 1)).map(function(_, i) {
                return i + 1;
            }).join("\n");
        },
        highlightedCode: function() {
            return window.hljs.highlightAuto(jQuery("<div/>").html(this.code).text()).value;
        }
    }
};
</script>
