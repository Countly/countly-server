<template>
    <a @click="back" class="cly-vue-back-link" :data-test-id="testId + '-back-link-label'">
        <span class="text-medium bu-is-capitalized">
            <i class="fas fa-arrow-left bu-pr-3" :data-test-id="testId + '-back-link-icon'"></i>{{innerTitle}}
        </span>
    </a>
</template>

<script>
import { app } from '../../countly/countly.template.js';

export default {
    props: {
        title: { type: String, required: false },
        link: { type: String, required: false },
        testId: { type: String, required: false }
    },
    methods: {
        back: function() {
            if (this.link) {
                app.navigate(this.link, true);
            }
            else {
                app.back();
            }
        }
    },
    computed: {
        innerTitle: function() {
            if (this.title) {
                return this.title;
            }
            return this.$i18n("common.back");
        }
    }
};
</script>
