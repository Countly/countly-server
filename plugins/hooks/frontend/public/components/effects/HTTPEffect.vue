<template>
<div>
    <div class="cly-vue-drawer-step__section">
        <div class="text-medium text-heading">
           {{i18n('hooks.http-effect-url')}}
        </div>

        <div style="display: flex;">
            <div style="flex-grow:1; margin-right:10px;">
                <validation-provider name="action-http-url" rules="required">
                <el-input v-model="value.url" placeholder="https://"></el-input>
                </validation-provider>
            </div>
            <div style="flex:1">
                <validation-provider name="action-http-method" rules="required">
                <cly-select-x
                   placeholder="Select method"
                   mode="single-list"
                   v-model="value.method"
                   :options="methodOptions">
                </cly-select-x>
                </validation-provider>

            </div>
        </div>
    </div>

    <div class="cly-vue-drawer-step__section">
        <div class="text-medium text-heading">
        {{i18n('hooks.http-intro')}}
        </div>
        <validation-provider name="action-http-data" tag="div" rules="required">
        <textarea v-html="value.requestData" v-model="value.requestData" @change="textChange" style="width:100%;box-sizing: border-box; resize: none; border: 1px solid #d6d6d6;" name="http-effect-params" rows="5" cols="60"></textarea>
        </validation-provider>
    </div>

    <!-- HTTP Headers Section -->
    <div class="cly-vue-drawer-step__section">
        <div class="text-medium text-heading">
            {{i18n('hooks.http-headers')}}
        </div>
        <div v-for="(header, index) in headers" :key="index" class="hooks-http-headers bu-mb-2">
            <div class="bu-is-flex bu-is-align-items-center">
                <validation-provider name="action-http-header-key" rules="required" class="hooks-http-headers__validation">
                    <el-input
                        :placeholder="i18n('hooks.header-key')"
                        class="bu-mr-2"
                        style="width:40%;"
                        v-model="header.key">
                    </el-input>
                </validation-provider>
                <validation-provider name="action-http-header-value" rules="required" class="hooks-http-headers__validation">
                    <el-input
                        :placeholder="i18n('hooks.header-value')"
                        class="bu-mr-2"
                        style="width:40%; flex:1"
                        v-model="header.value">
                    </el-input>
                </validation-provider>
                <el-button
                    @click="removeHeader(index)"
                    class="hooks-http-headers__remove-button color-red-100"
                    type="text"
                >
                    <i class="cly-io cly-io-trash"></i>
                </el-button>
            </div>
        </div>
        <el-button
            @click="addHeader"
            class="hooks-http-headers__add-button bg-light-blue-100 color-blue-100 bu-mt-2"
            type="text"
        >
            + {{i18n('hooks.add-http-header')}}
        </el-button>
    </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import _ from 'underscore';
import ClySelectX from '../../../../../../frontend/express/public/javascripts/components/input/select-x.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClySelectX,
    },
    data: function() {
        return {
            methodOptions: [{label: 'GET', value: 'get'}, {label: 'POST', value: 'post'}],
            headers: []
        };
    },
    props: {
        value: {
            type: Object
        },
    },
    mounted: function() {
        this.value.requestData = _.unescape(this.value.requestData);
        if (this.value.headers) {
            this.headers = Object.entries(this.value.headers).map(([key, value]) => ({key, value}));
        }
    },
    methods: {
        textChange: function(event) {
            this.value.requestData = _.unescape(event.currentTarget.value);
        },
        addHeader: function() {
            this.headers.push({key: '', value: ''});
            this.updateHeaders();
        },
        removeHeader: function(index) {
            this.headers.splice(index, 1);
            this.updateHeaders();
        },
        updateHeaders: function() {
            const headerObj = {};
            this.headers.forEach(h => {
                if (h.key && h.value) {
                    headerObj[h.key] = h.value;
                }
            });
            this.value.headers = headerObj;
        }
    },
    watch: {
        headers: {
            deep: true,
            handler: function() {
                this.updateHeaders();
            }
        }
    }
};
</script>
