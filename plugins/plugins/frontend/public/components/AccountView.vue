<template>
<div v-bind:class="[componentId]">
    <cly-header
        :title="noaccess ? i18n('plugins.no-access') : i18n('plugins.user-account')"
    >
    </cly-header>
    <cly-main>
        <div class="bu-columns bu-is-gapless">
            <div class="bu-column bu-is-12">
                <h3 class="bu-mb-4"> {{i18n('plugins.user-configs')}} &nbsp;</h3>
                <cly-section>
                    <div class="bu-columns bu-m-0">
                        <div class="bu-column bu-is-8 bu-mr-4">
                            <cly-form
                                :initial-edited-object="userData"
                                @submit="save">
                                <template v-slot="formScope">
                                    <cly-form-step :id="formId">
                                        <cly-inline-form-field rules="required" :label="i18n('user-settings.username')" prop="username">
                                            <el-input :placeholder="i18n('user-settings.username')" v-model="formScope.editedObject.username"></el-input>
                                        </cly-inline-form-field>
                                        <cly-inline-form-field rules="required" :label="i18n('management-users.full-name')" prop="full_name">
                                            <el-input :placeholder="i18n('management-users.full-name')" v-model="formScope.editedObject.full_name" @input="nameChanged"></el-input>
                                        </cly-inline-form-field>
                                        <cly-inline-form-field rules="required" :label="i18n('user-settings.api-key')" prop="api_key" class="apikey">
                                            <el-input :placeholder="i18n('user-settings.api-key')" v-model="formScope.editedObject.api_key" readonly></el-input>
                                            <el-button @click="formScope.editedObject.api_key = generateAPIKey()">{{i18n('configs.regenerate')}}</el-button>
                                        </cly-inline-form-field>
                                        <cly-inline-form-field :label="i18n('management-users.password')">
                                            <el-button @click="changePassword.showDialog = true">{{i18n('user-settings.change-password')}}</el-button>
                                        </cly-inline-form-field>
                                        <div :key="configKey" v-for="(userConf, configKey) in userConfigs">
                                        <cly-inline-form-field :key="key" :label="getLabelName(configKey, key)" v-for="(conf, key) in userConfigs[configKey]">
                                            <div
                                                v-if="getInputType(configKey, key) === 'function'"
                                                v-html="predefinedInputs[configKey + '.' + key](conf)">
                                            </div>
                                            <el-input
                                                v-else-if="getInputType(configKey, key) === 'el-input'"
                                                @input="onChange(configKey, key, $event)"
                                                :value="conf"
                                                v-bind="predefinedInputs[configKey + '.' + key].attrs"
                                                >
                                            </el-input>
                                            <el-select
                                                v-else-if="getInputType(configKey, key) === 'el-select'"
                                                :value="conf"
                                                v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                                <el-option :key="option.value" :value="option.value" :label="option.label" v-for="option in predefinedInputs[configKey + '.' + key].list"></el-option>
                                            </el-select>
                                            <el-slider
                                                v-else-if="getInputType(configKey, key) === 'el-slider'"
                                                @change="onChange(configKey, key, $event)"
                                                :value="conf"
                                                v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                            </el-slider>
                                            <el-button
                                                v-else-if="getInputType(configKey, key) === 'el-button'"
                                                @click="predefinedInputs[configKey + '.' + key].click()"
                                                v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                                {{predefinedInputs[configKey + '.' + key].label}}
                                            </el-button>
                                            <el-switch
                                                v-else-if="getInputType(configKey, key) === 'el-switch'"
                                                @change="onChange(configKey, key, $event)"
                                                :value="conf"
                                                v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                            </el-switch>
                                            <el-input-number
                                                v-else-if="getInputType(configKey, key) === 'el-input-number'"
                                                @change="onChange(configKey, key, $event)"
                                                :max='2147483647'
                                                :min='0'
                                                :value="conf"
                                                v-bind="predefinedInputs[configKey + '.' + key].attrs">
                                            </el-input-number>
                                            <el-input
                                                v-else
                                                @input="onChange(configKey, key, $event)"
                                                :value="conf">
                                            </el-input>
                                        </cly-inline-form-field>
                                        </div>
                                        <div :key="key" v-for="(value, key) in components">
                                        <component v-if="value.component" v-bind:is="value.component" @change="onChange"></component>
                                        </div>
                                    </cly-form-step>
                                    <div class="bu-has-text-right">
                                        <el-button :disabled="!formScope.isSubmissionAllowed" @click="formScope.submit()" type="primary">{{i18n('common.apply')}}</el-button>
                                    </div>
                                </template>
                            </cly-form>
                        </div>
                        <div class="bu-column bu-is-3 bu-ml-4 bu-px-4 bu-py-0 account-settings-avatar-box">
                            <div class="bu-is-vcentered bu-px-3 bu-ml-4">
                                <el-upload
                                    action="member/icon"
                                    :on-success="handleAvatarSuccess"
                                    :data="uploadData"
                                    :show-file-list="true"
                                    :limit="1"
                                    name="member_image"
                                    accept="image/png, image/jpeg, image/gif"
                                    class="bu-is-pulled-right">
                                    <el-button size="small" type="text" class="bu-p-0">{{i18n('user-settings.upload')}}</el-button>
                                </el-upload>
                                <p class="bu-has-text-weight-medium">{{i18n('user-settings.profile-picture')}}</p>
                                <p class="bu-has-text-centered">&nbsp;<el-button
                                    size="small"
                                    type="text"
                                    @click="deleteAvatar"
                                    v-if="userData.member_image"
                                    class="bu-p-0">{{i18n('management-users.delete')}}</el-button></p>
                                <div>
                                    <div class="account-settings-avatar" :style="avatar">
                                        <span v-if="!userData.member_image" class="has-ellipsis">{{initials}}</span>
                                    </div>
                                </div>
                                <p>&nbsp;</p>
                                <p class="account-upload-instructions">{{i18n('management-applications.icon-error')}}</p>
                            </div>
                        </div>
                    </div>
                </cly-section>
                <h3 class="bu-my-4"> {{i18n('configs.danger-zone')}} &nbsp;</h3>
                <cly-section class="bu-mr-4">
                    <template slot-scope="scope">
                        <div class="bu-columns bu-is-vcentered bu-p-3 bu-mx-1">
                            <div class="bu-column bu-is-10">
                                <p class="bu-has-text-weight-medium">{{i18n('configs.delete-account')}} </p>
                                <p class="text-medium">{{i18n('configs.cannot-be-undone')}} {{i18n('configs.will-permanently-delete')}}</p>
                            </div>
                            <div class="bu-column bu-is-2 bu-has-text-left">
                                <el-button @click="deleteAccount.showDialog = true" type="danger">{{i18n('configs.delete-account')}}</el-button>
                            </div>
                        </div>
                    </template>
                </cly-section>
            </div>
        </div>
        <cly-confirm-dialog @cancel="deleteAccount.showDialog = false" @confirm="submitDeleteDialog" :visible.sync="deleteAccount.showDialog" dialogType="danger" :saveButtonLabel="deleteAccount.saveButtonLabel" :cancelButtonLabel="deleteAccount.cancelButtonLabel" :title="deleteAccount.title" >
            <template slot-scope="scope">
                <ul>
                    <li>{{i18n('configs.cannot-be-undone')}}</li>
                    <li>{{i18n('configs.will-permanently-delete')}}</li>
                </ul>
                <span>{{i18n('configs.confirm-for-delete')}}</span>
                <cly-inline-form-field rules="required" :label="i18n('management-users.password')">
                    <el-input type="password" :placeholder="i18n('management-users.password')" v-model="deleteAccount.password"></el-input>
                </cly-inline-form-field>
            </template>
        </cly-confirm-dialog>
        <cly-confirm-dialog @cancel="changePassword.showDialog = false" @confirm="passwordDialog" :visible.sync="changePassword.showDialog" :saveButtonLabel="changePassword.saveButtonLabel" :cancelButtonLabel="changePassword.cancelButtonLabel" :title="changePassword.title" >
            <template slot-scope="scope">
                <div>
                    <cly-form-field rules="required" :label="i18n('configs.current-password')">
                        <el-input type="password" :placeholder="i18n('configs.current-password')" v-model="changePassword.password"></el-input>
                    </cly-form-field>
                    <cly-form-field rules="required" :label="i18n('configs.new-password')" class="bu-pb-0">
                        <el-input type="password" :placeholder="i18n('configs.new-password')" v-model="changePassword.newPassword"></el-input>
                    </cly-form-field>
                    <cly-form-field rules="required" :label="i18n('configs.confirmation')">
                        <el-input type="password" :placeholder="i18n('configs.confirmation')" v-model="changePassword.confirmPassword"></el-input>
                    </cly-form-field>
                </div>
                <div class="account-settings-hint" >
                    <i v-if="changePassword.newPassword.length < security.password_min" class="far fa-circle"></i>
                    <i v-else class="far fa-check-circle"></i>
                    &nbsp;{{i18n('management-users.password.length', security.password_min)}}
                </div>
                <div class="account-settings-hint" v-if="security.password_char">
                    <i v-if="!/[A-Z]/.test(changePassword.newPassword)" class="far fa-circle"></i>
                    <i v-else class="far fa-check-circle"></i>
                    &nbsp;{{i18n('management-users.password.has-char')}}
                </div>
                <div class="account-settings-hint" v-if="security.password_number">
                    <i v-if="!/\d/.test(changePassword.newPassword)" class="far fa-circle"></i>
                    <i v-else class="far fa-check-circle"></i>
                    &nbsp;{{i18n('management-users.password.has-number')}}
                </div>
                <div class="account-settings-hint" v-if="security.password_symbol">
                    <i v-if="!/[^A-Za-z\d]/.test(changePassword.newPassword)" class="far fa-circle"></i>
                    <i v-else class="far fa-check-circle"></i>
                    &nbsp;{{i18n('management-users.password.has-special')}}
                </div>
            </template>
        </cly-confirm-dialog>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import * as countlyPlugins from '../store/index.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import jQuery from 'jquery';

import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyForm from '../../../../../frontend/express/public/javascripts/components/form/cly-form.vue';
import ClyFormStep from '../../../../../frontend/express/public/javascripts/components/form/cly-form-step.vue';
import ClyInlineFormField from '../../../../../frontend/express/public/javascripts/components/form/cly-inline-form-field.vue';
import ClyFormField from '../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';
import ClyConfirmDialog from '../../../../../frontend/express/public/javascripts/components/dialog/cly-confirm-dialog.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyForm,
        ClyFormStep,
        ClyInlineFormField,
        ClyFormField,
        ClyConfirmDialog,
    },
    computed: {
        predefinedLabels: function() {
            return this.$store.getters['countlyConfigurations/predefinedLabels'];
        },
        predefinedInputs: function() {
            return this.$store.getters['countlyConfigurations/predefinedInputs'];
        }
    },
    data: function() {
        return {
            uploadData: {
                _csrf: countlyGlobal.csrf_token,
                member_image_id: countlyGlobal.member._id
            },
            changes: {},
            deleteAccount: {
                showDialog: false,
                title: i18n("configs.delete-account"),
                saveButtonLabel: i18n("configs.delete-my-account"),
                cancelButtonLabel: i18n("configs.cancel"),
                password: ""
            },
            changePassword: {
                showDialog: this.$route.params && this.$route.params.reset || false,
                title: i18n("configs.change-password"),
                saveButtonLabel: i18n("configs.change-password"),
                cancelButtonLabel: i18n("configs.cancel"),
                password: "",
                newPassword: "",
                confirmPassword: ""
            },
            noaccess: this.$route.params && this.$route.params.noaccess || false,
            components: {},
            formId: "account-settings-form",
            userData: countlyGlobal.member,
            userConfigs: {},
            avatar: this.setDefaultAvatar(countlyGlobal.member.member_image),
            initials: this.updateInitials(countlyGlobal.member.full_name),
            selectedConfig: "frontend",
            security: countlyGlobal.security
        };
    },
    beforeCreate: function() {
        var self = this;
        return jQuery.when(countlyPlugins.initializeUserConfigs())
            .then(function() {
                try {
                    self.userConfigs = JSON.parse(JSON.stringify(countlyPlugins.getUserConfigsData()));
                }
                catch (ex) {
                    self.userConfigs = {};
                }
                if (!self.userConfigs.frontend) {
                    self.userConfigs.frontend = {};
                }
                var predefinedUserInputs = self.$store.getters['countlyConfigurations/predefinedUserInputs'];
                for (var key in predefinedUserInputs) {
                    var parts = key.split(".");
                    var val = predefinedUserInputs[key];
                    if (!self.userConfigs[parts[0]]) {
                        self.userConfigs[parts[0]] = {};
                    }
                    if (parts[1]) {
                        self.userConfigs[parts[0]][parts[1]] = typeof val === "function" ? val() : val;
                    }
                }
                for (var subkey in self.userConfigs[self.selectedConfig]) {
                    if (!self.predefinedInputs[self.selectedConfig + "." + subkey]) {
                        var type = typeof self.userConfigs[self.selectedConfig][subkey];
                        if (type === "string") {
                            self.$store.commit('countlyConfigurations/registerInput', {id: self.selectedConfig + "." + subkey, value: {input: "el-input", attrs: {}}});
                        }
                        else if (type === "number") {
                            self.$store.commit('countlyConfigurations/registerInput', {id: self.selectedConfig + "." + subkey, value: {input: "el-input-number", attrs: {}}});
                        }
                        else if (type === "boolean") {
                            self.$store.commit('countlyConfigurations/registerInput', {id: self.selectedConfig + "." + subkey, value: {input: "el-switch", attrs: {}}});
                        }
                    }
                }
                self.loadComponents();
            });
    },
    methods: {
        onChange: function(id, key, value) {
            if (!this.changes[id]) {
                this.changes[id] = {};
            }

            this.changes[id][key] = value;

            var configsData = countlyPlugins.getUserConfigsData();

            if (!this.changes[id]) {
                this.changes[id] = {};
            }

            delete this.changes[id][key];

            this.userConfigs[id][key] = value;

            if (Array.isArray(value) && Array.isArray(configsData[id][key])) {
                value.sort();
                configsData[id][key].sort();
                if (JSON.stringify(value) !== JSON.stringify(configsData[id][key])) {
                    this.changes[id][key] = value;
                }
            }
            else if (configsData[id][key] !== value) {
                this.changes[id][key] = value;
            }
        },
        passwordDialog: function() {
            var old_pwd = this.changePassword.password;
            var new_pwd = this.changePassword.newPassword;
            var re_new_pwd = this.changePassword.confirmPassword;

            if (old_pwd.length > 0 && new_pwd.length > 0 && re_new_pwd.length > 0) {
                var data = {
                    _csrf: countlyGlobal.csrf_token,
                    username: countlyGlobal.member.username,
                    full_name: countlyGlobal.member.full_name,
                    api_key: countlyGlobal.member.api_key,
                    old_pwd: old_pwd,
                    new_pwd: new_pwd,
                    re_new_pwd: re_new_pwd
                };
                this.saveSettings(data);
            }
            else {
                notify({
                    title: jQuery.i18n.map["configs.not-saved"],
                    message: jQuery.i18n.map["configs.fill-required-fields"],
                    type: "error"
                });
            }
        },
        submitDeleteDialog: function() {
            var pv = this.deleteAccount.password.trim();
            if (pv === "") {
                var msg1 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["user-settings.password-mandatory"], clearAll: true, type: "error"};
                notify(msg1);
            }
            else {
                countlyPlugins.deleteAccount({password: pv}, function(err, msg) {
                    if (msg === true || msg === 'true') {
                        window.location = "/login";
                    }
                    else if (msg === 'password not valid' || msg === 'password mandatory' || msg === 'global admin limit') {
                        notify({title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["user-settings." + msg], sticky: true, clearAll: true, type: "error"});
                    }
                    else if (err === true) {
                        var msg2 = {title: jQuery.i18n.map["common.error"], message: msg, sticky: true, clearAll: true, type: "error"};
                        notify(msg2);
                    }
                });
            }
        },
        getLabelName: function(id, key) {
            return this.$store.getters['countlyConfigurations/getInputLabel'](id + "." + key);
        },
        getInputType: function(id, key) {
            return this.$store.getters['countlyConfigurations/getInputType'](id + "." + key);
        },
        save: function(doc) {
            var data = {
                _csrf: countlyGlobal.csrf_token,
                username: doc.username,
                full_name: doc.full_name,
                api_key: doc.api_key
            };
            this.saveSettings(data);
        },
        saveSettings: function(doc) {
            var self = this;
            jQuery.ajax({
                type: "POST",
                url: countlyGlobal.path + "/user/settings",
                data: doc,
                success: function(result) {
                    if (result === "username-exists") {
                        notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["management-users.username.exists"],
                            type: "error"
                        });
                        return true;
                    }
                    else if (!result) {
                        notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.alert"],
                            type: "error"
                        });
                        return true;
                    }
                    else {
                        if (!isNaN(parseInt(result))) {
                            countlyGlobal.member.password_changed = parseInt(result);
                        }
                        else if (typeof result === "string") {
                            notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: jQuery.i18n.map[result],
                                type: "error"
                            });
                            return true;
                        }

                        countlyGlobal.member.full_name = doc.full_name;
                        countlyGlobal.member.username = doc.username;
                        countlyGlobal.member.api_key = doc.api_key;
                    }
                    if (Object.keys(self.changes).length) {
                        countlyPlugins.updateUserConfigs(self.changes, function(err) {
                            if (err) {
                                notify({
                                    title: jQuery.i18n.map["configs.not-saved"],
                                    message: jQuery.i18n.map["configs.not-changed"],
                                    type: "error"
                                });
                            }
                            else {
                                window.location.reload(true);
                            }
                        });
                    }
                    else {
                        notify({
                            title: jQuery.i18n.map["configs.changed"],
                            message: jQuery.i18n.map["configs.saved"]
                        });
                    }
                },
                error: function() {
                    notify({
                        title: jQuery.i18n.map["configs.not-saved"],
                        message: jQuery.i18n.map["configs.not-changed"],
                        type: "error"
                    });
                }
            });
        },
        handleAvatarSuccess: function(url) {
            countlyGlobal.member.member_image = url;
            this.avatar = this.setDefaultAvatar(countlyGlobal.member.member_image);
            this.updateGlobalObject();
        },
        nameChanged: function(val) {
            this.initials = this.updateInitials(val);
            this.updateGlobalObject();
        },
        updateInitials: function(full_name) {
            var name = (full_name || "").trim().split(" ");
            if (name.length === 1) {
                return name[0][0] || "";
            }
            return (name[0][0] || "") + (name[name.length - 1][0] || "");
        },
        updateGlobalObject: function() {
            var userImage = {};
            var member = countlyGlobal.member;
            if (member.member_image) {
                userImage.url = member.member_image;
                userImage.found = true;
            }
            else {
                var defaultAvatarSelector = (member.created_at || Date.now()) % 10 * -60;
                userImage.found = false;
                userImage.url = "images/avatar-sprite.png?v2";
                userImage.position = defaultAvatarSelector;
                userImage.initials = this.initials;
            }

            member.image = userImage;
        },
        deleteAvatar: function() {
            var self = this;
            jQuery.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/user/settings",
                data: {
                    username: countlyGlobal.member.username,
                    api_key: countlyGlobal.member.api_key,
                    member_image: "delete",
                    _csrf: countlyGlobal.csrf_token
                },
                success: function() {
                    countlyGlobal.member.member_image = "";
                    self.avatar = self.setDefaultAvatar(countlyGlobal.member.member_image);
                    self.updateGlobalObject();
                },
                error: function() {
                    notify({ type: "error", message: jQuery.i18n.map['configs.delete_avatar_failed']});
                }
            });
        },
        setDefaultAvatar: function(image) {
            if (image) {
                return {'background-image': 'url("' + image + '?' + Date.now() + '")', "background-repeat": "no-repeat", "background-size": "auto 100px"};
            }
            else {
                var defaultAvatarSelector = (countlyGlobal.member.created_at || Date.now()) % 10 * -100;
                return {'background-image': 'url("images/avatar-sprite.png?v2")', 'background-position': defaultAvatarSelector + 'px', 'background-size': 'auto 100px'};
            }
        },
        loadComponents: function() {
            var cc = dataMixin({
                'accountSettingsComponents': '/account/settings'
            });
            cc = cc.data();
            var allComponents = cc.accountSettingsComponents;
            for (var i = 0; i < allComponents.length; i++) {
                if (allComponents[i]._id && allComponents[i].title && allComponents[i].component) {
                    this.components[allComponents[i]._id] = allComponents[i];
                }
            }
        },
        generateAPIKey: function() {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < 32; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        }
    }
};
</script>
