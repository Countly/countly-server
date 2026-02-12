<template>
<div class="cly-vue-drawer-step__section">
    <div class="text-medium text-heading">
       {{i18n('hooks.CustomCodeEffect')}}
    </div>
    <validation-provider name="action-customCode-code" tag="div" rules="required">
    <textarea required v-model="value.code" @change="textChange" style="width:100%;resize: none; box-sizing: border-box;border: 1px solid #d6d6d6;" name="custom-code-input" rows="5" cols="60" placeholder="//Javascript code here"></textarea>
    </validation-provider>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import _ from 'underscore';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            code: ''
        };
    },
    props: {
        value: {
            type: Object
        },
    },
    mounted: function() {
        this.value.code = _.unescape(this.value.code);
    },
    methods: {
        textChange: function(event) {
            this.value.code = _.unescape(event.currentTarget.value);
        }
    }
};
</script>
