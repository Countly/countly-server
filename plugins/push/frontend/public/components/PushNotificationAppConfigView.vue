<template>
<div id="push-notification-app-config">
    <div>
        <form>
        <div class="bu-is-flex bu-is-justify-content-space-between bu-mt-5 bu-ml-6 bu-mr-5">
            <h3>{{i18n('push-notification.ios-settings')}} </h3>
            <el-button type="danger" @click="onDeleteKey(PlatformEnum.IOS)" :disabled="isKeyEmpty(PlatformEnum.IOS)">{{i18n('push-notification.delete')}}</el-button>
        </div>
        <cly-inline-form-field :label="i18n('push-notification.authentication-type')">
            <el-select  :value="iosAuthConfigType" @change="onIOSAuthTypeChange">
                <el-option :key="iosAuthType.value" :value="iosAuthType.value" :label="iosAuthType.label" v-for="iosAuthType in iosAuthConfigTypeOptions"></el-option>
            </el-select>
        </cly-inline-form-field>
        <cly-inline-form-field :label="iosAuthConfigType === IOSAuthConfigTypeEnum.P8 ? i18n('push-notification.key-file-p8') : i18n('push-notification.key-file-p12')">
            <div class="bu-is-flex bu-is-flex-direction-column">
                <div class="bu-is-flex">
                    <validation-provider :rules="{required:isIOSConfigRequired}">
                        <el-input v-model="uploadedIOSKeyFilename" style="display:none" autocomplete="off"></el-input>
                        <el-upload
                            ref="keyFileUploader"
                            action=""
                            :multiple="false"
                            :on-change="onKeyFileChange"
                            :auto-upload="false"
                            :show-file-list="false"
                            accept="p8, p12">
                            <el-button size="small" type="text" class="bu-p-0">{{i18n('push-notification.choose-file')}}</el-button>
                        </el-upload>
                    </validation-provider>
                    <div class="bu-ml-5">{{uploadedIOSKeyFilename}}</div>
                </div>
                <div v-if="viewModel[PlatformEnum.IOS].hasKeyFile"> {{i18n('push-notification.key-file-already-uploaded',viewModel[PlatformEnum.IOS].authType)}} </div>
            </div>
        </cly-inline-form-field>
        <template v-if="iosAuthConfigType === IOSAuthConfigTypeEnum.P8">
            <cly-inline-form-field :label="i18n('push-notification.key-id')" :rules="{required:isIOSConfigRequired}">
                <el-input :value="viewModel[PlatformEnum.IOS].keyId" @input="onInput('keyId', $event, PlatformEnum.IOS)" autocomplete="off"></el-input>
            </cly-inline-form-field>
            <cly-inline-form-field :label="i18n('push-notification.team-id')" :rules="{required:isIOSConfigRequired}">
                <el-input :value="viewModel[PlatformEnum.IOS].teamId" @input="onInput('teamId', $event, PlatformEnum.IOS)" autocomplete="off"></el-input>
            </cly-inline-form-field>
            <cly-inline-form-field :label="i18n('push-notification.bundle-id')" :rules="{required:isIOSConfigRequired}">
                <el-input :value="viewModel[PlatformEnum.IOS].bundleId" @input="onInput('bundleId',$event,PlatformEnum.IOS)" autocomplete="off"></el-input>
            </cly-inline-form-field>
        </template>
        <template v-if="iosAuthConfigType === IOSAuthConfigTypeEnum.P12">
            <cly-inline-form-field :label="i18n('push-notification.passphrase')">
                    <el-input type="password" :value="viewModel[PlatformEnum.IOS].passphrase" @input="onInput('passphrase',$event,PlatformEnum.IOS)" autocomplete="off"></el-input>
            </cly-inline-form-field>
        </template>

        <div class="bu-is-flex bu-is-justify-content-space-between bu-mt-5 bu-ml-6 bu-mr-5">
            <h3>{{i18n('push-notification.android-settings')}} </h3>
            <el-button type="danger" @click="onDeleteKey(PlatformEnum.ANDROID)" :disabled="isKeyEmpty(PlatformEnum.ANDROID)">{{i18n('push-notification.delete')}}</el-button>
        </div>

        <cly-inline-form-field :label="i18n('push-notification.firebase-service-account-json')">
            <div class="bu-is-flex bu-is-flex-direction-column">
                <div class="bu-is-flex">
                    <el-input v-model="uploadedAndroidServiceAccountFilename" style="display:none" autocomplete="off"></el-input>
                    <el-upload
                        ref="serviceAccountFileUploader"
                        action=""
                        :multiple="false"
                        :on-change="onServiceAccountFileChange"
                        :auto-upload="false"
                        :show-file-list="false"
                        accept="p8, p12">
                        <el-button size="small" type="text" class="bu-p-0">{{i18n('push-notification.choose-file')}}</el-button>
                    </el-upload>
                    <div class="bu-ml-5">{{uploadedAndroidServiceAccountFilename}}</div>
                </div>
                <div v-if="viewModel[PlatformEnum.ANDROID].hasServiceAccountFile"> {{i18n('push-notification.service-account-file-already-uploaded')}} </div>
            </div>
        </cly-inline-form-field>

        <div class="bu-is-flex bu-is-justify-content-space-between bu-mt-5 bu-ml-6 bu-mr-5">
            <h3>{{i18n('push-notification.huawei-settings')}} </h3>
            <el-button type="danger" @click="onDeleteKey(PlatformEnum.HUAWEI)" :disabled="isKeyEmpty(PlatformEnum.HUAWEI)">{{i18n('push-notification.delete')}}</el-button>
        </div>
        <cly-inline-form-field :label="i18n('push-notification.huawei-app-id')" :rules="{required:isHuaweiConfigRequired, numeric: true}">
            <el-input :value="viewModel[PlatformEnum.HUAWEI].appId" @input="onInput('appId',$event,PlatformEnum.HUAWEI)" autocomplete="off"></el-input>
        </cly-inline-form-field>
        <cly-inline-form-field :label="i18n('push-notification.huawei-app-secret')" :rules="{required:isHuaweiConfigRequired}">
            <el-input :value="viewModel[PlatformEnum.HUAWEI].appSecret" @input="onInput('appSecret',$event,PlatformEnum.HUAWEI)" autocomplete="off"></el-input>
        </cly-inline-form-field>
        </form>
    </div>
    <div class="cly-vue-section bu-mr-4 cly-vue-section--has-default-skin">
        <div class="bu-is-flex bu-level bu-ml-6">
            <div class="bu-level">
                <h3 class="bu-my-4 "> {{i18n('push-notification.test-users')}}</h3>
                <cly-tooltip-icon :tooltip="i18n('push-notification.test-users-description')" icon="ion ion-help-circled" style="margin-left:8px"> </cly-tooltip-icon>
            </div>
            <el-button type="default" size="small" @click="onAddNewTestUser" class="is-light-blue"> {{i18n('push-notification.define-new-user')}}</el-button>
        </div>
        <cly-section class="cly-vue-section__content white-bg">
            <div class="bu-is-flex bu-level bu-p-3 bu-mx-1 config-section">
                <div class="bu-column">
                    <p class="bu-has-text-weight-medium">{{i18n('push-notification.user-definition')}}</p>
                    <p>{{i18n('push-notification.user-definition-description')}}</p>
                </div>
                <el-link type="primary" size="small" @click="onShowTestUserList">{{i18n('push-notification.see-user-list')}} </el-link>
            </div>
        </cly-section>
        <cly-drawer
            @submit="onSubmit"
            @open="onOpen"
            :requires-async-submit="true"
            v-bind="drawers.testUsersDrawer"
            :title="i18n('push-notification.define-new-user-title')"
            :saveButtonLabel="i18n('push-notification.add-test-users-label')">
            <template v-slot:default="formScope">
                <cly-form-step id="step1" name="Define new user">
                    <cly-form-field name="definition" :label="i18n('push-notification.definition-type')">
                        <div class="bu-is-flex bu-is-align-items-center">
                            <el-radio class="is-autosized bu-is-justify-content-center" v-model="formScope.editedObject.definitionType" :label="AddTestUserDefinitionTypeEnum.USER_ID" border>
                                <div class="text">{{i18n('push-notification.define-with-user-id')}}</div>
                            </el-radio>
                            <el-radio class="is-autosized bu-is-justify-content-center" v-model="formScope.editedObject.definitionType" :label="AddTestUserDefinitionTypeEnum.COHORT" border>
                                <div class="text">{{i18n('push-notification.define-with-cohort')}}</div>
                            </el-radio>
                        </div>
                    </cly-form-field>
                    <cly-form-field v-if="formScope.editedObject.definitionType === AddTestUserDefinitionTypeEnum.USER_ID" label="User ID" rules="required">
                        <el-select
                            v-model="formScope.editedObject.userIds"
                            multiple
                            filterable
                            remote
                            reserve-keyword
                            :arrow="false"
                            :remote-method="onSearchUsers"
                            :placeholder="i18n('push-notification.enter-user-id')"
                            :loading="isSearchUsersLoading"
                            style="width:100%">
                            <el-option
                                v-for="userIdOption in userIdOptions"
                                :key="userIdOption._id"
                                :label="userIdOption.did"
                                :value="userIdOption.uid">
                            </el-option>
                        </el-select>
                    </cly-form-field>
                    <cly-form-field v-if="formScope.editedObject.definitionType === AddTestUserDefinitionTypeEnum.COHORT">
                        <div>
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.select-one-or-more-cohorts')}}</div>
                            <div class="cly-vue-push-notification-drawer__input-description">{{i18n('push-notification.select-one-or-more-cohorts-description')}}</div>
                            <validation-provider vid="cohort" v-slot="validation" rules="required">
                                <el-select
                                    v-model="formScope.editedObject.cohorts"
                                    multiple
                                    filterable
                                    reserve-keyword
                                    :placeholder="i18n('push-notification.select-cohort')"
                                    :loading="isFetchCohortsLoading"
                                    :class="{'is-error': validation.errors.length > 0}"
                                    style="width:100%">
                                    <el-option
                                        v-for="item in cohortOptions"
                                        :key="item._id"
                                        :label="item.name"
                                        :value="item._id">
                                    </el-option>
                                </el-select>
                            </validation-provider>
                        </div>
                    </cly-form-field>
                </cly-form-step>
            </template>
        </cly-drawer>
        <cly-dialog
            width="720px"
            autoCentered
            :visible.sync="isDialogVisible">
            <template slot="title">
                <div class="bu-is-flex bu-is-align-items-center bu-ml-2">
                    <h3>{{i18n('push-notification.user-list')}}</h3>
                    <cly-tooltip-icon :tooltip="i18n('push-notification.test-users-description')" icon="ion ion-help-circled" style="margin-left:8px"> </cly-tooltip-icon>
                </div>
            </template>
            <el-select v-model="selectedTestUsersListOption" class="bu-my-3 bu-ml-4">
                <el-option v-for="item in testUsersListOptions" :key="item.label" :value="item.value" :label="item.label"></el-option>
            </el-select>
            <cly-datatable-n :rows="selectedTestUsersRows" v-loading="areRowsLoading || isUpdateTestUsersLoading" :force-loading="areRowsLoading || isUpdateTestUsersLoading" :hideTop="true">
                <template v-slot="scope">
                    <el-table-column :label="i18n('push-notification.username')" v-if="selectedTestUsersListOption === AddTestUserDefinitionTypeEnum.USER_ID">
                        <template slot-scope="rowScope">
                            <div class="bu-is-flex bu-is-align-items-center">
                                <img :src="rowScope.row.picture" width="16px" height="16px" class="bu-mr-2" style="border-radius: 50%;" />
                                <span class="has-ellipsis">{{rowScope.row.username}}</span>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column :label="i18n('push-notification.user-id')" prop="did"  v-if="selectedTestUsersListOption === AddTestUserDefinitionTypeEnum.USER_ID" ></el-table-column>
                    <el-table-column :label="i18n('push-notification.cohort-name')" v-if="selectedTestUsersListOption === AddTestUserDefinitionTypeEnum.COHORT">
                        <template v-slot="rowScope">
                            <span class="has-ellipsis">{{rowScope.row.name}}</span>
                        </template>
                    </el-table-column>
                    <el-table-column type="options">
                        <template slot-scope="scope">
                            <cly-more-options v-if="scope.row.hover" size="small" @command="onDeleteTestUser(scope.row)">
                                <el-dropdown-item>{{i18n('push-notification.delete')}}</el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-dialog>
    </div>
</div>
</template>

<script>
import { i18n, i18nMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify, confirm as CountlyConfirm } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDrawer from '../../../../../frontend/express/public/javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../../../frontend/express/public/javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyInlineFormField from '../../../../../frontend/express/public/javascripts/components/form/cly-inline-form-field.vue';
import ClyDialog from '../../../../../frontend/express/public/javascripts/components/dialog/cly-dialog.vue';

import countlyPushNotification from '../store/index.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';

var initialAppLevelConfig = {
    rate: "",
    period: ""
};
initialAppLevelConfig[countlyPushNotification.service.PlatformEnum.IOS] = {
    _id: "",
    keyId: "",
    p8KeyFile: "",
    p12KeyFile: "",
    teamId: "",
    bundleId: "",
    authType: countlyPushNotification.service.IOSAuthConfigTypeEnum.P8,
    passphrase: "",
    hasKeyFile: false,
    hasUploadedKeyFile: false,
};
initialAppLevelConfig[countlyPushNotification.service.PlatformEnum.ANDROID] = {
    _id: "",
    serviceAccountFile: "",
    type: "fcm",
    hasServiceAccountFile: false,
    hasUploadedServiceAccountFile: false,
};
initialAppLevelConfig[countlyPushNotification.service.PlatformEnum.HUAWEI] = {
    _id: "",
    type: "hms",
    appId: "",
    appSecret: ""
};

var keyFileReader = new FileReader();
var serviceAccountFileReader = new FileReader();

var initialTestUsersRows = {};
initialTestUsersRows[countlyPushNotification.service.AddTestUserDefinitionTypeEnum.USER_ID] = [];
initialTestUsersRows[countlyPushNotification.service.AddTestUserDefinitionTypeEnum.COHORT] = [];

export default {
    componentName: "AppSettingsContainerObservable",
    mixins: [i18nMixin, mixins.hasDrawers("testUsersDrawer")],
    components: {
        ClySection,
        ClyDrawer,
        ClyFormStep,
        ClyFormField,
        ClyDatatableN,
        ClyMoreOptions,
        ClyTooltipIcon,
        ClyInlineFormField,
        ClyDialog,
    },
    data: function() {
        return {
            PlatformEnum: countlyPushNotification.service.PlatformEnum,
            IOSAuthConfigTypeEnum: countlyPushNotification.service.IOSAuthConfigTypeEnum,
            iosAuthConfigType: countlyPushNotification.service.IOSAuthConfigTypeEnum.P8,
            iosAuthConfigTypeOptions: countlyPushNotification.service.iosAuthConfigTypeOptions,
            viewModel: JSON.parse(JSON.stringify(initialAppLevelConfig)),
            modelUnderEdit: Object.assign({}, { rate: "", period: ""}),
            uploadedIOSKeyFilename: '',
            uploadedAndroidServiceAccountFilename: '',
            isIOSConfigTouched: false,
            isHuaweiConfigTouched: false,
            AddTestUserDefinitionTypeEnum: countlyPushNotification.service.AddTestUserDefinitionTypeEnum,
            userIdOptions: [],
            cohortOptions: [],
            isSearchUsersLoading: false,
            isFetchCohortsLoading: false,
            isUpdateTestUsersLoading: false,
            isDialogVisible: false,
            areRowsLoading: false,
            testUsersRows: initialTestUsersRows,
            selectedKeyToDelete: null,
            selectedTestUsersListOption: countlyPushNotification.service.AddTestUserDefinitionTypeEnum.USER_ID,
            testUsersListOptions: [
                {label: i18n('push-notification.user-id'), value: countlyPushNotification.service.AddTestUserDefinitionTypeEnum.USER_ID},
                {label: i18n('push-notification.cohort-name'), value: countlyPushNotification.service.AddTestUserDefinitionTypeEnum.COHORT}
            ]
        };
    },
    computed: {
        isHuaweiConfigRequired: function() {
            return this.isHuaweiConfigTouched;
        },
        isIOSConfigRequired: function() {
            return this.isIOSConfigTouched;
        },
        selectedTestUsersRows: function() {
            return this.testUsersRows[this.selectedTestUsersListOption];
        },
        selectedAppId: function() {
            return this.$store.state.countlyAppManagement.selectedAppId;
        }
    },
    watch: {
        selectedAppId: function() {
            this.iosAuthConfigType = countlyPushNotification.service.IOSAuthConfigTypeEnum.P8;
            this.resetConfig();
            this.reconcilate();
        }
    },
    methods: {
        setModel: function(newModel) {
            Object.assign(this.modelUnderEdit, newModel);
        },
        setViewModel: function(newViewModel) {
            this.viewModel = JSON.parse(JSON.stringify(newViewModel));
        },
        resetConfig: function() {
            this.setViewModel(initialAppLevelConfig);
            this.setModel({rate: "", period: ""});
            this.$refs.keyFileUploader.clearFiles();
            this.isHuaweiConfigTouched = false;
            this.isIOSConfigTouched = false;
            this.uploadedIOSKeyFilename = '';
            this.uploadedAndroidServiceAccountFilename = '';
            this.cohortOptions = [];
        },
        onIOSAuthTypeChange: function(value) {
            this.iosAuthConfigType = value;
            this.$refs.keyFileUploader.clearFiles();
            this.uploadedIOSKeyFilename = '';
            this.isIOSConfigTouched = true;
            var appPluginConfigDto = countlyGlobal.apps[this.selectedAppId].plugins;
            var pushNotificationAppConfigDto = appPluginConfigDto && appPluginConfigDto.push;
            var model = countlyPushNotification.mapper.incoming.mapAppLevelConfig(pushNotificationAppConfigDto);
            if (model && model[this.PlatformEnum.IOS] && model[this.PlatformEnum.IOS].authType === value) {
                this.setModel(model);
                this.reconcilateViewModel(model);
            }
            else {
                this.resetIOSModelPlatform();
                this.resetIOSViewModelPlatform();
                this.dispatchAppLevelConfigChangeEvent('authType', this.PlatformEnum.IOS);
            }
        },
        setKeyFile: function(dataUrlFile) {
            this.initializeModelPlatformIfNotFound(this.PlatformEnum.IOS);
            if (this.iosAuthConfigType === this.IOSAuthConfigTypeEnum.P8) {
                this.modelUnderEdit[this.PlatformEnum.IOS].p8KeyFile = dataUrlFile;
            }
            else {
                this.modelUnderEdit[this.PlatformEnum.IOS].p12KeyFile = dataUrlFile;
            }
            this.modelUnderEdit[this.PlatformEnum.IOS].hasUploadedKeyFile = true;
            this.isIOSConfigTouched = true;
        },
        setServiceAccountFile: function(dataUrlFile) {
            this.initializeModelPlatformIfNotFound(this.PlatformEnum.ANDROID);
            this.modelUnderEdit[this.PlatformEnum.ANDROID].serviceAccountFile = dataUrlFile;
            this.modelUnderEdit[this.PlatformEnum.ANDROID].hasUploadedServiceAccountFile = true;
        },
        onKeyFileChange: function(file) {
            this.uploadedIOSKeyFilename = file.name;
            keyFileReader.readAsDataURL(file.raw);
        },
        onServiceAccountFileChange: function(file) {
            this.uploadedAndroidServiceAccountFilename = file.name;
            serviceAccountFileReader.readAsDataURL(file.raw);
        },
        resetIOSViewModelPlatform: function() {
            var platform = this.PlatformEnum.IOS;
            this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.viewModel[platform].authType = this.iosAuthConfigType;
        },
        resetIOSModelPlatform: function() {
            var platform = this.PlatformEnum.IOS;
            this.modelUnderEdit[this.PlatformEnum.IOS] = Object.assign({}, initialAppLevelConfig[platform]);
            this.modelUnderEdit[platform].authType = this.iosAuthConfigType;
        },
        initializeModelPlatformIfNotFound: function(platform) {
            if (!this.modelUnderEdit[platform]) {
                this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                if (platform === this.PlatformEnum.IOS) {
                    this.modelUnderEdit[platform].authType = this.iosAuthConfigType;
                }
            }
        },
        dispatchAppLevelConfigChangeEvent: function(property, platform) {
            if (platform) {
                var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
                var appConfigPlatformDto = countlyPushNotification.mapper.outgoing.mapAppLevelConfigByPlatform(this.modelUnderEdit, platform);
                this.$emit('change', 'push' + '.' + platformDto, appConfigPlatformDto);
            }
            else {
                this.$emit('change', 'push' + '.' + 'rate' + '.' + property, this.modelUnderEdit[property]);
            }
        },
        updateAllModelsOnInput: function(property, value, platform) {
            if (platform) {
                this.viewModel[platform][property] = value;
                this.modelUnderEdit[platform][property] = value;
            }
            else {
                this.viewModel[property] = value;
                this.modelUnderEdit[property] = value;
            }
        },
        setIsConfigTouchedByPlatform: function(platform) {
            if (platform === this.PlatformEnum.IOS) {
                this.isIOSConfigTouched = true;
            }
            if (platform === this.PlatformEnum.HUAWEI) {
                this.isHuaweiConfigTouched = true;
            }
        },
        onInput: function(property, value, platform) {
            if (platform) {
                this.initializeModelPlatformIfNotFound(platform);
                this.setIsConfigTouchedByPlatform(platform);
            }
            this.updateAllModelsOnInput(property, value, platform);
            this.dispatchAppLevelConfigChangeEvent(property, platform);
        },
        onDiscard: function() {
            this.resetConfig();
            this.reconcilate();
        },
        isKeyEmpty: function(platform) {
            if (platform === this.PlatformEnum.ANDROID) {
                return !this.viewModel[platform].serviceAccountFile;
            }
            if (platform === this.PlatformEnum.IOS) {
                if (this.iosAuthConfigType === countlyPushNotification.service.IOSAuthConfigTypeEnum.P8) {
                    return !(this.viewModel[platform].p8KeyFile || this.viewModel[platform].keyId || this.viewModel[platform].teamId || this.viewModel[platform].bundleId);
                }
                if (this.iosAuthConfigType === countlyPushNotification.service.IOSAuthConfigTypeEnum.P12) {
                    return !(this.viewModel[platform].p12KeyFile || this.viewModel[platform].passphrase);
                }
            }
            if (platform === this.PlatformEnum.HUAWEI) {
                return !(this.viewModel[platform].appId || this.viewModel[platform].appSecret);
            }
            throw new Error('Unknown key platform, received:' + platform);
        },
        onDeleteKey: function(platformKey) {
            this.selectedKeyToDelete = platformKey;
            CountlyConfirm('', 'danger', this.onConfirmCallback, [i18n('push-notification.cancel'), i18n('push-notification.i-understand-delete-key')], {title: i18n('push-notification.delete-key')});
        },
        deleteAndroidKey: function() {
            var platform = this.PlatformEnum.ANDROID;
            var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
            this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.$emit('change', 'push' + '.' + platformDto, null);
        },
        deleteIosKey: function() {
            var platform = this.PlatformEnum.IOS;
            var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
            this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.modelUnderEdit[platform].authType = this.iosAuthConfigType;
            this.viewModel[platform].authType = this.iosAuthConfigType;
            this.$emit('change', 'push' + '.' + platformDto, null);
            this.isIOSConfigTouched = false;
            this.uploadedIOSKeyFilename = "";
        },
        deleteHuaweiKey: function() {
            var platform = this.PlatformEnum.HUAWEI;
            var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
            this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
            this.$emit('change', 'push' + '.' + platformDto, null);
            this.isHuaweiConfigTouched = false;
        },
        deleteKeyOnCofirm: function() {
            if (this.selectedKeyToDelete === this.PlatformEnum.ANDROID) {
                this.deleteAndroidKey();
                return;
            }
            if (this.selectedKeyToDelete === this.PlatformEnum.IOS) {
                this.deleteIosKey();
                return;
            }
            if (this.selectedKeyToDelete === this.PlatformEnum.HUAWEI) {
                this.deleteHuaweiKey();
                return;
            }
            if (!this.selectedKeyToDelete) {
                return;
            }
            throw new Error('Unknown key platform to delete, received:' + this.selectedKeyToDelete);
        },
        onConfirmCallback: function(isConfirmed) {
            if (isConfirmed) {
                this.deleteKeyOnCofirm();
            }
            this.selectedKeyToDelete = null;
        },
        addSelectedAppEventListener: function(callback) {
            this.$on('selectedApp', callback);
        },
        addDiscardEventListener: function(callback) {
            this.$on('discard', callback);
        },
        addKeyFileReaderLoadListener: function(callback) {
            keyFileReader.addEventListener('load', callback);
        },
        removeKeyFileReaderLoadListener: function(callback) {
            keyFileReader.removeEventListener('load', callback);
        },
        onKeyFileReady: function() {
            this.setKeyFile(keyFileReader.result);
            if (this.iosAuthConfigType === this.IOSAuthConfigTypeEnum.P8) {
                this.dispatchAppLevelConfigChangeEvent('p8KeyFile', this.PlatformEnum.IOS);
            }
            else {
                this.dispatchAppLevelConfigChangeEvent('p12KeyFile', this.PlatformEnum.IOS);
            }
        },
        addServiceAccountFileReaderLoadListener: function(callback) {
            serviceAccountFileReader.addEventListener("load", callback);
        },
        removeServiceAccountFileReaderLoadListener: function(callback) {
            serviceAccountFileReader.removeEventListener("load", callback);
        },
        onServiceAccountFileReady: function() {
            this.setServiceAccountFile(serviceAccountFileReader.result);
            this.dispatchAppLevelConfigChangeEvent('serviceAccountFile', this.PlatformEnum.ANDROID);
        },
        reconcilateViewModel: function(newModel) {
            var self = this;
            Object.keys(this.PlatformEnum).forEach(function(platformKey) {
                var platform = self.PlatformEnum[platformKey];
                self.viewModel[platform] = newModel[platform] || Object.assign({}, initialAppLevelConfig[platform]);
            });
            this.viewModel.period = newModel.period;
            this.viewModel.rate = newModel.rate;
        },
        reconcilate: function() {
            var appPluginConfigDto = countlyGlobal.apps[this.selectedAppId].plugins;
            var pushNotificationAppConfigDto = appPluginConfigDto && appPluginConfigDto.push;
            if (pushNotificationAppConfigDto) {
                var model = countlyPushNotification.mapper.incoming.mapAppLevelConfig(pushNotificationAppConfigDto);
                this.reconcilateViewModel(model);
                this.setModel(model);
                if (model[this.PlatformEnum.IOS]) {
                    this.iosAuthConfigType = model[this.PlatformEnum.IOS].authType;
                }
            }
        },
        setUserIdOptions: function(userIds) {
            this.userIdOptions = userIds;
        },
        setCohortOptions: function(cohorts) {
            this.cohortOptions = cohorts;
        },
        setTestUserRows: function(testUsers) {
            this.testUsersRows = testUsers;
        },
        openTestUsersDialog: function() {
            this.isDialogVisible = true;
        },
        fetchCohortsIfNotFound: function() {
            var self = this, appId = this.selectedAppId;
            if (this.cohortOptions && this.cohortOptions.length) {
                return;
            }
            this.isFetchCohortsLoading = true;
            countlyPushNotification.service.fetchCohorts(undefined, undefined, self.selectedAppId)
                .then(function(cohorts) {
                    self.setCohortOptions(cohorts);
                }).catch(function(error) {
                    console.error(error);
                    self.setCohortOptions([]);
                }).finally(function() {
                    if (appId !== self.selectedAppId) {
                        self.setCohortOptions([]);
                        self.fetchCohortsIfNotFound();
                    }
                    else {
                        self.isFetchCohortsLoading = false;
                    }
                });
        },
        fetchTestUsers: function() {
            var self = this;
            var testUsers = this.getTestUsersFromAppConfig();
            var options = {};
            options.appId = this.selectedAppId;
            this.areRowsLoading = true;
            countlyPushNotification.service.fetchTestUsers(testUsers, options)
                .then(function(testUserRows) {
                    self.setTestUserRows(testUserRows);
                }).catch(function(error) {
                    console.error(error);
                    self.setTestUserRows([]);
                    notify({message: error.message, type: 'error'});
                }).finally(function() {
                    self.areRowsLoading = false;
                });
        },
        getTestUsersFromAppConfig: function() {
            var appConfig = countlyGlobal.apps[this.selectedAppId].plugins;
            var pushNotificationConfig = appConfig && appConfig.push || {};
            var result = {};
            if (pushNotificationConfig && pushNotificationConfig.test) {
                if (pushNotificationConfig.test.uids) {
                    result.uids = pushNotificationConfig.test.uids.split(',');
                }
                if (pushNotificationConfig.test.cohorts) {
                    result.cohorts = pushNotificationConfig.test.cohorts.split(',');
                }
            }
            return result;
        },
        onAddNewTestUser: function() {
            this.openDrawer('testUsersDrawer', countlyPushNotification.helper.getInitialTestUsersAppConfigModel());
        },
        onShowTestUserList: function() {
            this.openTestUsersDialog();
            this.fetchTestUsers();
        },
        onOpen: function() {
            this.fetchCohortsIfNotFound();
        },
        updateTestUsersAppConfig: function(editedObject) {
            var testDto = countlyPushNotification.mapper.outgoing.mapTestUsersEditedModelToDto(editedObject);
            countlyGlobal.apps[this.selectedAppId].plugins.push.test = testDto;
        },
        onDeleteTestUser: function(row) {
            var self = this;
            var actualTestUsers = this.getTestUsersFromAppConfig();
            if (this.selectedTestUsersListOption === this.AddTestUserDefinitionTypeEnum.USER_ID) {
                actualTestUsers.uids = actualTestUsers.uids.filter(function(uid) {
                    return uid !== row.uid && Boolean(uid);
                });
            }
            if (this.selectedTestUsersListOption === this.AddTestUserDefinitionTypeEnum.COHORT) {
                actualTestUsers.cohorts = actualTestUsers.cohorts.filter(function(cohortId) {
                    return cohortId !== row._id && Boolean(cohortId);
                });
            }
            var newTestUsersModel = {
                definitionType: this.selectedTestUsersListOption,
                cohorts: actualTestUsers.cohorts,
                userIds: actualTestUsers.uids,
            };
            var options = {};
            options.app_id = this.selectedAppId;
            this.isUpdateTestUsersLoading = true;
            countlyPushNotification.service.updateTestUsers(newTestUsersModel, options).
                then(function() {
                    self.updateTestUsersAppConfig(newTestUsersModel);
                    notify({message: i18n('push-notification.test-users-were-successfully-removed')});
                    self.fetchTestUsers();
                }).catch(function(error) {
                    console.error(error);
                    notify({message: error.message, type: 'error'});
                }).finally(function() {
                    self.isUpdateTestUsersLoading = false;
                });
        },
        onSubmit: function(editedObject, done) {
            var self = this;
            var actualTestUsersConfig = this.getTestUsersFromAppConfig();
            if (editedObject.definitionType === this.AddTestUserDefinitionTypeEnum.USER_ID) {
                editedObject.cohorts = actualTestUsersConfig.cohorts;
                editedObject.userIds = editedObject.userIds.concat(actualTestUsersConfig.uids);
            }
            if (editedObject.definitionType === this.AddTestUserDefinitionTypeEnum.COHORT) {
                editedObject.cohorts = editedObject.cohorts.concat(actualTestUsersConfig.cohorts);
                editedObject.userIds = actualTestUsersConfig.uids;
            }
            var options = {};
            options.app_id = this.selectedAppId;
            this.isUpdateTestUsersLoading = true;
            countlyPushNotification.service.updateTestUsers(editedObject, options).
                then(function() {
                    self.updateTestUsersAppConfig(editedObject);
                    done();
                    notify({message: i18n('push-notification.test-users-were-successfully-added')});
                }).catch(function(error) {
                    console.error(error);
                    notify({message: error.message, type: 'error'});
                    done(error);
                }).finally(function() {
                    self.isUpdateTestUsersLoading = false;
                });
        },
        onSearchUsers: function(query) {
            var self = this;
            this.isSearchUsersLoading = true;
            var options = {};
            options.appId = this.selectedAppId;
            countlyPushNotification.service.searchUsersById(query, options)
                .then(function(userIds) {
                    self.setUserIdOptions(userIds);
                }).catch(function(error) {
                    console.error(error);
                    self.setUserIdOptions([]);
                    notify({message: error.message, type: 'error'});
                }).finally(function() {
                    self.isSearchUsersLoading = false;
                });
        },
    },
    mounted: function() {
        this.addKeyFileReaderLoadListener(this.onKeyFileReady);
        this.addServiceAccountFileReaderLoadListener(this.onServiceAccountFileReady);
        this.addDiscardEventListener(this.onDiscard);
        this.reconcilate();
    },
    beforeDestroy: function() {
        this.removeKeyFileReaderLoadListener(this.onKeyFileReady);
        this.removeServiceAccountFileReaderLoadListener(this.onServiceAccountFileReady);
    }
};
</script>
