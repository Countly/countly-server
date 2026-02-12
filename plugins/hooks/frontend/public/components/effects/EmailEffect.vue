<template>
<div class="cly-vue-drawer-step__section">
    <div class="text-medium text-heading">
       {{i18n('hooks.send-email')}}
    </div>
        <validation-provider name="action-email-address" rules="required">
        <cly-select-email :collapse-tags="false" placeholder="Input Email Address" v-model="value.address"></cly-select-email>
        </validation-provider>
        <div class="bu-mt-2">
            <textarea required v-html="value.emailTemplate" v-model="value.emailTemplate" @change="textChange" style="width:100%;box-sizing: border-box; padding: 10px 10px;background: #FBFDFE;border-radius: 4px;border: 1px solid #CFD6E4;
            resize: none; " name="email-template" rows="5" cols="60" placeholder="Content template here"></textarea>
        </div>
     </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import _ from 'underscore';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
        };
    },
    props: {
        value: {
            type: Object
        },
    },
    mounted: function() {
        this.value.emailTemplate = _.unescape(this.value.emailTemplate);
    },
    methods: {
        textChange: function(event) {
            this.value.emailTemplate = _.unescape(event.currentTarget.value);
        }
    }
};
</script>
