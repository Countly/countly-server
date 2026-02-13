<template>
<div id="two-factor-auth-setup-modal">
    <cly-inline-form-field :label="i18n('two-factor-auth.plugin-title')">
        <el-switch
            @change="onChange($event)"
            :value="TFAsettings.enabled">
        </el-switch>
    </cly-inline-form-field>
    <el-dialog :visible.sync="dataModal.showDialog"  :title="i18n('two-factor-auth.setup_auth')" width="55%" :before-close="closeDataModal">
        <cly-main>
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column bu-is-12">
                    <ol>
                        <li v-html="i18n('two-factor-auth.install_app')"></li>
                        <li v-html="i18n('two-factor-auth.scan_qr')"></li>
                    </ol>
                </div>
            </div>
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column bu-is-4"></div>
                <div class="bu-column bu-is-4">
                    <span v-html="qrcode_html"></span>
                </div>
                <div class="bu-column bu-is-4"></div>
            </div>
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column bu-is-12">
                    <h4 class="bu-mb-4">{{i18n('two-factor-auth.secret_token')}}: <span v-loading="!secret_token">{{ secret_token }}</span></h4>
                </div>
            </div>
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column bu-is-12">
                    <h4 class="bu-mb-4">{{i18n('two-factor-auth.enter_otp')}}</h4>
                    <el-input v-model="secret_code"></el-input>
                </div>
            </div>
            <div class="bu-columns bu-is-gapless">
                <div class="bu-column bu-is-12">
                    <span slot="footer" class="dialog-footer">
                        <el-button @click="dataModal.showDialog = false">{{i18n('common.cancel')}}</el-button>
                        <el-button type="primary" @click="confirmDialog">{{i18n('events.general.confirm')}}</el-button>
                    </span>
                </div>
            </div>
        </cly-main>
    </el-dialog>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import ClyInlineFormField from '../../../../../frontend/express/public/javascripts/components/form/cly-inline-form-field.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';

export default {
    components: {
        ClyInlineFormField,
        ClyMain,
    },
    mixins: [i18nMixin],
    data: function() {
        if (!countlyGlobal.member.two_factor_auth) {
            countlyGlobal.member.two_factor_auth = {};
        }
        if (typeof countlyGlobal.member.two_factor_auth.enabled === "undefined") {
            countlyGlobal.member.two_factor_auth.enabled = false;
        }
        return {
            TFAsettings: countlyGlobal.member.two_factor_auth,
            dataModal: {showDialog: false},
            qrcode_html: null,
            secret_token: null,
            secret_code: null
        };
    },
    methods: {
        onChange: function(value) {
            if (value) {
                this.dataModal.showDialog = true;
                this.getQRCode();
            }
            else {
                var self = this;
                CountlyConfirm(
                    $.i18n.map["two-factor-auth.confirm_disable"],
                    "popStyleGreen",
                    function(result) {
                        if (!result) {
                            return;
                        }
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.w + "/two-factor-auth",
                            data: {
                                method: "disable"
                            },
                            success: function() {
                                notify({
                                    title: $.i18n.map["two-factor-auth.disable_title"],
                                    message: $.i18n.map["two-factor-auth.disable_message"],
                                    type: "ok"
                                });
                                countlyGlobal.member.two_factor_auth.enabled = false;
                            },
                            error: function(xhr) {
                                var errMessage = "";

                                try {
                                    var response = JSON.parse(xhr.responseText);
                                    errMessage = response.result || xhr.statusText;
                                }
                                catch (err) {
                                    errMessage = xhr.statusText;
                                }

                                notify({
                                    title: $.i18n.map["two-factor-auth.faildisable_title"],
                                    message: $.i18n.prop("two-factor-auth.faildisable_message", errMessage),
                                    type: "error"
                                });
                            }
                        });
                    },
                    [$.i18n.map["common.cancel"], $.i18n.map["common.continue"]],
                    {
                        title: $.i18n.map["two-factor-auth.confirm_disable_title"],
                        image: "delete-user"
                    }
                );
            }
        },
        closeDataModal: function() {
            this.dataModal.showDialog = false;
        },
        confirmDialog: function() {
            var self = this;
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + "/two-factor-auth",
                data: {
                    method: "enable",
                    secret_token: self.secret_token,
                    auth_code: self.secret_code
                },
                success: function() {
                    notify({
                        title: $.i18n.map["two-factor-auth.setup_title"],
                        message: $.i18n.map["two-factor-auth.setup_message"],
                        type: "ok"
                    });

                    self.dataModal.showDialog = false;
                    countlyGlobal.member.two_factor_auth.enabled = true;
                },
                error: function(xhr) {
                    var errMessage = "";

                    try {
                        var response = JSON.parse(xhr.responseText);
                        errMessage = response.result || xhr.statusText;
                    }
                    catch (err) {
                        errMessage = xhr.statusText;
                    }

                    notify({
                        title: $.i18n.map["two-factor-auth.failsetup_title"],
                        message: $.i18n.prop("two-factor-auth.failsetup_message", errMessage),
                        type: "error"
                    });
                    self.dataModal.showDialog = false;
                }
            });
        },
        getQRCode: function() {
            var self = this;
            self.qrcode_html = null;
            self.secret_token = null;
            self.secret_code = null;
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + '/two-factor-auth',
                data: {
                    method: "generate-qr-code",
                    "countly-token": countlyGlobal.auth_token,
                    "Content-Type": "application/json; charset=utf-8",
                },
                success: function(data) {
                    self.qrcode_html = countlyCommon.unescapeHtml(data.qrCode);
                    self.secret_token = data.secret;
                },
                error: function(xhr) {
                    var errMessage = "";

                    try {
                        var response = JSON.parse(xhr.responseText);
                        errMessage = response.result || xhr.statusText;
                    }
                    catch (err) {
                        errMessage = xhr.statusText;
                    }

                    notify({
                        title: $.i18n.map["two-factor-auth.failsetup_title"],
                        message: $.i18n.prop("two-factor-auth.failsetup_message", errMessage),
                        type: "error"
                    });
                }
            });
        }
    }
};
</script>
