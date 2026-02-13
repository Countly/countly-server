<template>
    <div class="hooks-APIEndpointTrigger">
        <cly-form-field name="api-endpoint" :label="i18n('hooks.trigger-api-endpoint-uri')" rules="required">
            <div class="cly-vue-drawer-hook_description">
                {{i18n('hooks.api-trigger-intro')}}
             </div>
            <el-input v-model="value.path" placeholder="URL-Path" class="hook-api-url-block" disabled style="background-color:#FBFDFE;">
                <template v-slot:suffix>
                    <span class='hook-trigger-url' @click="copyURL">{{i18n('hooks.copy-url')}}</span>
                    <textarea id='url-box' style='position:fixed; z-index:-1000;top:-100px;' v-model="url"/>
                </template>
            </el-input>
        </cly-form-field>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import jQuery from 'jquery';
import ClyFormField from '../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormField,
    },
    data: function() {
        return {
        };
    },
    mounted: function() {
    },
    computed: {
        url: function() {
            return window.location.protocol + "//" + window.location.host + "/o/hooks/" + this.value.path;
        },
        valuePath: function() {
            return this.value.path;
        }
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        valuePath: function() {
            if (!this.value.path) {
                var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function(c) {
                    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                });
                this.$emit("input", {path: uri, method: 'get'});
            }
        }
    },
    methods: {
        copyURL: function() {
            var textbox = document.getElementById('url-box');
            textbox.select();
            document.execCommand("Copy");
            notify({clearAll: true, type: 'green', title: jQuery.i18n.map['hooks.copy-notify-title'], message: jQuery.i18n.map['hooks.copy-notify-message'], info: "", delay: 2000, sticky: false});
        }
    }
};
</script>
