<template>
<div>
  <cly-drawer
    test-id="user-drawer"
    toggle-transition="stdt-fade"
    ref="userDrawer"
    :title="$props.settings.editMode ? $props.settings.editTitle : $props.settings.createTitle"
    @close="onClose"
    @submit="onSubmit"
    @open="onOpen"
    :requires-async-submit="true"
    :hasCancelButton="$props.settings.hasCancelButton"
    :cancelButtonLabel="$props.settings.cancelButtonLabel"
    :width="$props.settings.drawerWidth"
    :saveButtonLabel="$props.settings.editMode ? $props.settings.saveButtonLabel : $props.settings.createButtonLabel"
    v-bind="$props.controls">
    <template v-slot:default="drawerScope">
      <cly-form-step id="user-main" screen="full">
        <div class="user-management-drawer-content">
          <div class="bu-columns">
            <div class="bu-column">
              <div class="user-management-drawer-content__input-wrapper">
                <div class="user-management-drawer-content__label">
                  <div data-test-id="full-name-label" class="text-small text-heading">{{ i18n('management-users.full-name') }}</div>
                </div>
                <div class="user-management-drawer-content__input">
                  <validation-provider rules="required" v-slot="v">
                    <el-input test-id="full-name-input" v-model="drawerScope.editedObject.full_name" :placeholder="i18n('management-users.enter-full-name')"></el-input>
                  </validation-provider>
                </div>
              </div>
              <div class="user-management-drawer-content__input-wrapper bu-mt-5">
                <div class="user-management-drawer-content__label">
                  <div data-test-id="user-name-label" class="text-small text-heading">{{ i18n('management-users.username') }}</div>
                </div>
                <div class="user-management-drawer-content__input">
                  <validation-provider rules="required" v-slot="v">
                    <el-input test-id="user-name-input" v-model="drawerScope.editedObject.username" :placeholder="i18n('management-users.enter-username')"></el-input>
                  </validation-provider>
                </div>
              </div>
              <div class="user-management-drawer-content__input-wrapper bu-mt-5">
                <div class="user-management-drawer-content__label">
                  <div data-test-id="password-label" class="text-small text-heading">{{ i18n('management-users.password') }}</div>
                </div>
                <div v-if="!$props.settings.editMode" class="user-management-drawer-content__input">
                  <validation-provider rules="required" v-slot="v">
                    <el-input test-id="password-input" v-model="drawerScope.editedObject.password" :placeholder="i18n('management-users.enter-password')"></el-input>
                  </validation-provider>
                  <div data-test-id="generate-password-button" @click="generatePassword()" class="user-management-drawer-content__under-input-text bu-mt-1 bu-is-size-7">{{ i18n('management-users.generate-password') }}</div>
                </div>
                <div v-if="$props.settings.editMode" class="user-management-drawer-content__input">
                  <validation-provider v-if="changePasswordFlag" rules="required" v-slot="v">
                    <el-input v-model="drawerScope.editedObject.password" :placeholder="i18n('management-users.enter-password')"></el-input>
                  </validation-provider>
                  <div v-if="!changePasswordFlag" @click="changePasswordFlag = !changePasswordFlag" class="user-management-drawer-content__under-input-text bu-mt-1 bu-is-size-7">{{ i18n('management-users.change-password') }}</div>
                </div>
              </div>
              <div class="user-management-drawer-content__input-wrapper bu-mt-5">
                <div class="user-management-drawer-content__label">
                  <div data-test-id="email-label" class="text-small text-heading">{{ i18n('management-users.email') }}</div>
                </div>
                <div class="user-management-drawer-content__input">
                  <validation-provider rules="required|email" v-slot="v">
                    <el-input test-id="email-input" v-model="drawerScope.editedObject.email" oninput="this.value = this.value.toLowerCase();" :placeholder="i18n('management-users.enter-email')"></el-input>
                  </validation-provider>
                </div>
              </div>
              <component class="bu-mt-5" v-if="groupsInput.length > 0" :defaultGroups="groups" @group-change="onGroupChange" :is="groupsInput[0].component"></component>
            </div>
            <div class="bu-column user-management-drawer-content__profile-picture-area bu-ml-4">
              <div class="user-management-drawer-content__label">
                <div class="text-small text-heading">{{ i18n('management-users.profile-picture') }}</div>
              </div>
              <div class="bu-is-flex" v-if="!pictureEditMode && $props.settings.editMode">
                <img class="user-management-drawer-content__user-pp" :src="'/memberimages/' + drawerScope.editedObject._id + '.png?t=' + Date.now()"/>
                <cly-more-options class="user-management-drawer-content__pp-options" size="small" @command="handlePPCommand($event)">
                  <el-dropdown-item command="edit-pp">{{i18n('common.edit')}}</el-dropdown-item>
                </cly-more-options>
              </div>
              <cly-dropzone
                data-test-id="user-profile-picture-dropzone"
                v-if="pictureEditMode || !$props.settings.editMode"
                @vdropzone-removed-file="onFileRemoved"
                @vdropzone-file-added="onFileAdded"
                @vdropzone-sending="onSending"
                @vdropzone-thumbnail="thumbnail"
                @vdropzone-complete="onComplete"
                ref="userDrawerDropzone"
                id="user-drawer-dropzone"
                :useCustomSlot=true
                :options="dropzoneOptions">
                    <div class="dropzone-custom-content">
                      <img v-if="$props.settings.editMode" :src="'/memberimages/' + user._id + '.png?t=' + Date.now()" class="user-management-drawer-content__profile-picture-area__upload-section__img-box"/>
                      <div v-if="!$props.settings.editMode" class="user-management-drawer-content__profile-picture-area__upload-section__img-box"></div>
                      <div class="user-management-drawer-content__profile-picture-area__upload-section__description-box">
                        <p class="user-management-drawer-content__profile-picture-area__upload-section__description-box--bold">{{ i18n('management-users.drag-and-drop-or') }} <span class="user-management-drawer-content__profile-picture-area__upload-section__description-box--link"> {{ i18n('management-users.browser') }} </span> {{ i18n('management-users.files-to-add-picture') }}</p>
                        <p class="user-management-drawer-content__profile-picture-area__upload-section__size-warning">{{ i18n('management-users.pp-size-warning') }}</p>
                      </div>
                    </div>
              </cly-dropzone>
            </div>
          </div>
          <div v-if="groups.length === 0" class="user-management-drawer-content__bottom-section">
            <div class="user-management-drawer-content__drawer-sub-section bu-px-4 bu-pt-4 bu-pb-5">
              <div class="user-management-drawer-content__section-title">
                <div>
                  <span class="user-management-drawer-content__section-header">{{ i18n('management-users.role') }}</span>
                </div>
              </div>
              <div class="user-management-drawer-content__section-content user-management-drawer-content__role-section">
                <el-checkbox test-id="global-administrator" class="bu-mt-2" v-model="drawerScope.editedObject.global_admin">{{ i18n('management-users.global-administrator') }}</el-checkbox>
                <component v-for="roleInput in rolesInput" :is="roleInput.component" :user="drawerScope.editedObject" @role-change="onRoleChange" key="roleInput.key"></component>
              </div>
            </div>
            <div v-if="!drawerScope.editedObject.global_admin && groups.length === 0" class="user-management-drawer-content__drawer-sub-title bu-mt-2">
              {{ i18n('management-users.permission-settings') }}
            </div>
            <div v-if="!drawerScope.editedObject.global_admin && groups.length === 0" class="user-management-drawer-content__drawer-sub-section bu-px-4 bu-pt-4">
              <div class="user-management-drawer-content__section-title">
                <div>
                  <span class="user-management-drawer-content__section-header"> {{ i18n('management-users.grant-admin-access-to-apps') }} <cly-tooltip-icon icon="ion ion-help-circled"></cly-tooltip-icon></span>
                </div>
                <div>
                </div>
              </div>
              <div class="user-management-drawer-content__section-content">
                <div class="user-management-drawer-content__label user-management-drawer-content__label--pl-10">
                  <div class="user-management-drawer-content__help-text">{{ i18n('management-users.grant-admin-access-description') }}</div>
                </div>
                <div class="input" v-if="drawerScope.editedObject.permission">
                  <cly-select-x
                    test-id="admin-access-to-app-dropdown"
                    :collapse-tags="false"
                    :placeholder="i18n('token_manager.select-apps')"
                    mode="multi-check"
                    @input="onAdminAppsChanged"
                    v-model="drawerScope.editedObject.permission._.a"
                    class="user-management-drawer-content__app-selector bu-mb-5 bu-mt-4"
                    :options="apps">
                  </cly-select-x>
                </div>
              </div>
            </div>
            <div v-if="!drawerScope.editedObject.global_admin && groups.length === 0" :key="index" v-for="(set, index) in permissionSets" class="user-management-drawer-content__drawer-sub-section bu-mt-2 bu-mb-5">
              <div class="user-management-drawer-content__section-title bu-px-4 bu-pt-4">
                <div>
                  <span class="user-management-drawer-content__section-header">{{ i18n('management-users.grant-user-access-to-apps') }} <cly-tooltip-icon icon="ion ion-help-circled"></cly-tooltip-icon></span>
                </div>
                <div>
                  <cly-more-options class="user-management-drawer-content__custom-options" v-if="index > 0" size="small" @command="handleCommand($event, index)">
                    <el-dropdown-item command="remove-set">{{ i18n('management-users.remove-permission-set') }}</el-dropdown-item>
                  </cly-more-options>
                </div>
              </div>
              <div class="user-management-drawer-content__section-content">
                <div class="user-management-drawer-content__label user-management-drawer-content__label--pl-10">
                  <div class="user-management-drawer-content__help-text bu-px-4">{{ i18n('management-users.grant-user-access-to-apps-desc') }}</div>
                </div>
                <div class="user-management-drawer-content__input bu-px-4">
                  <cly-select-x
                    test-id="user-access-to-app-dropdown"
                    :collapse-tags="false"
                    :placeholder="i18n('token_manager.select-apps')"
                    mode="multi-check"
                    @change="onUserAppsChanged(index)"
                    v-model="drawerScope.editedObject.permission._.u[index]"
                    class="user-management-drawer-content__app-selector bu-mb-5 bu-mt-4"
                    :options="apps">
                  </cly-select-x>
                </div>
                <div class="user-management-drawer-content__permission-table-header bu-px-1">
                  <el-input v-model="filteredFeatures[index].searchQuery" :placeholder="i18n('management-users.search-placeholder')" class="user-management-drawer-content__feature-search" @input="search(index)">
                    <i slot="prefix" class="el-input__icon el-icon-search"></i>
                    <i slot="suffix" class="el-input__icon el-icon-circle-close" @click="clearSearch(index)"></i>
                  </el-input>
                  <div class="user-management-drawer-content__permission-type-cols">
                    <div class="user-management-drawer-content__permission-type">
                      <el-checkbox @change="setPermissionByType(index, 'c')" v-model="filteredFeatures[index].all.c">{{ i18n('management-users.create').toUpperCase() }}</el-checkbox>
                    </div>
                    <div class="user-management-drawer-content__permission-type">
                      <el-checkbox @change="setPermissionByType(index, 'r')" v-model="filteredFeatures[index].all.r">{{ i18n('management-users.read').toUpperCase() }}</el-checkbox>
                    </div>
                    <div class="user-management-drawer-content__permission-type">
                      <el-checkbox @change="setPermissionByType(index, 'u')" v-model="filteredFeatures[index].all.u">{{ i18n('management-users.update').toUpperCase() }}</el-checkbox>
                    </div>
                    <div class="user-management-drawer-content__permission-type">
                      <el-checkbox @change="setPermissionByType(index, 'd')" v-model="filteredFeatures[index].all.d">{{ i18n('management-users.delete').toUpperCase() }}</el-checkbox>
                    </div>
                  </div>
                </div>
                <div class="user-management-drawer-content__permission-table-content bu-px-1">
                  <div class="user-management-drawer-content__permission-row bu-mb-5" v-for="feature in filteredFeatures[index].features">
                    <div class="user-management-drawer-content__feature-name">{{featureBeautifier(feature)}}</div>
                    <div class="user-management-drawer-content__feature-permissions">
                      <div class="user-management-drawer-content__permission-box">
                        <el-checkbox @change="setPermissionByFeature(index, 'c', feature)" v-model="permissionSets[index].c.allowed[feature]"></el-checkbox>
                      </div>
                      <div class="user-management-drawer-content__permission-box">
                        <el-checkbox :disabled="feature === 'core'" @change="setPermissionByFeature(index, 'r', feature)" v-model="permissionSets[index].r.allowed[feature]"></el-checkbox>
                      </div>
                      <div class="user-management-drawer-content__permission-box">
                        <el-checkbox @change="setPermissionByFeature(index, 'u', feature)" v-model="permissionSets[index].u.allowed[feature]"></el-checkbox>
                      </div>
                      <div class="user-management-drawer-content__permission-box">
                        <el-checkbox @change="setPermissionByFeature(index, 'd', feature)" v-model="permissionSets[index].d.allowed[feature]"></el-checkbox>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!drawerScope.editedObject.global_admin && groups.length === 0" class="user-management-drawer-content__add-permission-set" @click="addPermissionSet">
              {{ i18n('management-users.add-permission-set') }}
            </div>
          </div>
        </div>
      </cly-form-step>
    </template>
  </cly-drawer>
</div>
</template>

<script>
import { i18nMixin, i18n } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import * as countlyAuth from '../../../javascripts/countly/countly.auth.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import countlyUserManagement from '../store/index.js';

import ClyDrawer from '../../../javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../javascripts/components/form/cly-form-field.vue';
import ClySelectX from '../../../javascripts/components/input/select-x.vue';
import ClyTooltipIcon from '../../../javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';

var groupsModelRef = null;
if (countlyGlobal.plugins.includes("groups")) {
    import('../../../../../../plugins/groups/frontend/public/store/index.js')
        .then(function(mod) { groupsModelRef = mod.default; })
        .catch(function() { /* groups plugin not available */ });
}

export default {
    components: {
        ClyDrawer,
        ClyFormStep,
        ClyFormField,
        ClySelectX,
        ClyTooltipIcon,
        ClyMoreOptions
    },
    props: {
        settings: Object,
        controls: Object,
        features: {
            type: Array,
            default: function() { return []; }
        },
        featuresPermissionDependency: {
            type: Object,
            default: function() { return {}; }
        },
        inverseFeaturesPermissionDependency: {
            type: Object,
            default: function() { return {}; }
        },
        editMode: {
            type: Boolean,
            default: false
        },
        user: {
            type: Object,
            default: function() { return {}; }
        }
    },
    mixins: [
        i18nMixin,
        dataMixin({"groupsInput": "groups/input", "rolesInput": "user/roles"}),
    ],
    data: function() {
        return {
            pictureEditMode: false,
            changePasswordFlag: false,
            apps: [],
            permissionSets: [],
            adminAppSelector: '',
            filteredFeatures: [],
            dropzoneOptions: {
                member: null,
                url: "/member/icon",
                autoProcessQueue: false,
                acceptedFiles: 'image/*',
                maxFiles: 1,
                thumbnailWidth: 100,
                thumbnailHeight: 100,
                addRemoveLinks: true,
                dictRemoveFile: i18n('management-users.remove-image'),
                previewTemplate: this.template(),
                paramName: "member_image",
                params: { _csrf: countlyGlobal.csrf_token }
            },
            uploadCompleted: false,
            fileAdded: false,
            groups: [],
            roles: {}
        };
    },
    methods: {
        toggleFilteredAll: function(index) {
            var self = this;
            var crudTypes = ['c', 'r', 'u', 'd'];
            var remCrudTypes = ['c', 'r', 'u', 'd'];
            var all = this.filteredFeatures[index].all;

            if (self.filteredFeatures[index].features.length === 0) {
                crudTypes.forEach(function(type) {
                    all[type] = false;
                });
            }
            else {
                self.filteredFeatures[index].features.forEach(function(feature) {
                    crudTypes.forEach(function(type) {
                        if (!self.permissionSets[index][type].allowed[feature]) {
                            var idx = remCrudTypes.indexOf(type);
                            if (idx !== -1) {
                                remCrudTypes.splice(idx, 1);
                            }
                            all[type] = false;
                        }
                    });
                    if (remCrudTypes.length === 0) {
                        return;
                    }
                });
                remCrudTypes.forEach(function(type) {
                    all[type] = true;
                });
            }
        },
        search: function(index) {
            var self = this;
            var query = self.filteredFeatures[index].searchQuery;
            if (query && query !== "") {
                query = query.toLowerCase();
                self.filteredFeatures[index].features = self.features.filter(function(feature) {
                    return self.featureBeautifier(feature).toLowerCase().includes(query);
                });
            }
            else {
                self.filteredFeatures[index].features = self.features;
            }
            this.toggleFilteredAll(index);
        },
        clearSearch: function(index) {
            this.filteredFeatures[index].searchQuery = '';
            this.filteredFeatures[index].features = this.features;
            this.toggleFilteredAll(index);
        },
        featureBeautifier: countlyAuth.featureBeautifier,
        generatePassword: function() {
            var generatedPassword = CountlyHelpers.generatePassword(countlyGlobal.security.password_min);
            this.$refs.userDrawer.editedObject.password = generatedPassword;
        },
        template: function() {
            var tmpl = '<div class="dz-preview dz-file-preview">';
            tmpl += '<div class="dz-image">';
            tmpl += '<div data-dz-thumbnail-bg></div>';
            tmpl += '</div>';
            tmpl += '<div class="user-management-drawer-content__profile-picture-area__upload-section__description-box">';
            tmpl += '<p class="user-management-drawer-content__profile-picture-area__upload-section__description-box--bold">' + i18n('management-users.drag-and-drop-or') + " " + '<span class="user-management-drawer-content__profile-picture-area__upload-section__description-box--link">' + i18n('management-users.browser') + ' ' + '</span>' + i18n('management-users.files-to-add-picture') + '</p>';
            tmpl += '<p class="user-management-drawer-content__profile-picture-area__upload-section__size-warning">' + i18n('management-users.pp-size-warning') + '</p>';
            tmpl += '</div>';
            tmpl += '</div>';
            return tmpl;
        },
        thumbnail: function(file, dataUrl) {
            var j, len, ref, thumbnailElement;
            if (file.previewElement) {
                file.previewElement.classList.remove("dz-file-preview");
                ref = file.previewElement.querySelectorAll("[data-dz-thumbnail-bg]");
                for (j = 0, len = ref.length; j < len; j++) {
                    thumbnailElement = ref[j];
                    thumbnailElement.alt = file.name;
                    thumbnailElement.style.backgroundImage = 'url("' + dataUrl + '")';
                }
                return setTimeout(((function() {
                    return function() {
                        return file.previewElement.classList.add("dz-image-preview");
                    };
                })(this)), 1);
            }
        },
        onFileAdded: function() {
            this.fileAdded = true;
        },
        onFileRemoved: function() {
            this.fileAdded = false;
        },
        onSending: function(file, xhr, formData) {
            formData.append('member_image_id', this.dropzoneOptions.member._id);
        },
        onComplete: function() {
            this.uploadCompleted = true;
        },
        onAdminAppsChanged: function() {
            var adminApps = this.$refs.userDrawer.editedObject.permission._.a;
            var userApps = this.$refs.userDrawer.editedObject.permission._.u;
            var conflictIndex = -1;
            var conflictSetIndex = -1;

            for (var i0 = 0; i0 < adminApps.length; i0++) {
                for (var j0 = 0; j0 < userApps.length; j0++) {
                    for (var k0 = 0; k0 < userApps[j0].length; k0++) {
                        if (adminApps[i0] === userApps[j0][k0]) {
                            conflictIndex = k0;
                            conflictSetIndex = j0;
                        }
                    }
                }
            }

            if (conflictSetIndex !== -1) {
                var conflictedAppId = this.$refs.userDrawer.editedObject.permission._.u[conflictSetIndex][conflictIndex];
                var types = ["c", "r", "u", "d"];
                for (var index in types) {
                    delete this.$refs.userDrawer.editedObject.permission[types[index]][conflictedAppId];
                }
                this.$set(this.$refs.userDrawer.editedObject.permission, this.$refs.userDrawer.editedObject.permission._.u[conflictSetIndex].splice(conflictIndex, 1));
            }
        },
        onUserAppsChanged: function(index) {
            var userApps = this.$refs.userDrawer.editedObject.permission._.u;
            var appsInThisSet = userApps[index];
            var adminApps = this.$refs.userDrawer.editedObject.permission._.a;
            var conflictIndex = -1;
            var conflictSetIndex = -1;
            var adminConflictIndex = -1;
            var types = ["c", "r", "u", "d"];

            for (var i = 0; i < appsInThisSet.length; i++) {
                for (var j = 0; j < adminApps.length; j++) {
                    if (appsInThisSet[i] === adminApps[j]) {
                        adminConflictIndex = j;
                    }
                }
            }

            if (adminConflictIndex === -1) {
                for (var i0 = 0; i0 < appsInThisSet.length; i0++) {
                    for (var j0 = 0; j0 < userApps.length; j0++) {
                        for (var k0 = 0; k0 < userApps[j0].length; k0++) {
                            if (j0 === index) {
                                continue;
                            }
                            if (appsInThisSet[i0] === userApps[j0][k0]) {
                                conflictIndex = k0;
                                conflictSetIndex = j0;
                            }
                        }
                    }
                }
            }

            if (adminConflictIndex !== -1) {
                this.$set(this.$refs.userDrawer.editedObject.permission._.a, this.$refs.userDrawer.editedObject.permission._.a.splice(adminConflictIndex, 1));
            }
            else if (conflictIndex !== -1) {
                this.$set(this.$refs.userDrawer.editedObject.permission._.u, this.$refs.userDrawer.editedObject.permission._.u[conflictSetIndex].splice(conflictIndex, 1));
            }

            for (var appKey in countlyGlobal.apps) {
                var appId = countlyGlobal.apps[appKey]._id;
                if (userApps.indexOf(appId) === -1 && adminApps.indexOf(appId)) {
                    for (var typeIndex in types) {
                        delete this.$refs.userDrawer.editedObject.permission[types[typeIndex]][appId];
                    }
                }
            }
        },
        addPermissionSet: function() {
            var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
            var types = ['c', 'r', 'u', 'd'];

            for (var type in types) {
                for (var feature in this.features) {
                    if (!(types[type] === 'r' && this.features[feature] === 'core')) {
                        permissionSet[types[type]].allowed[this.features[feature]] = false;
                    }
                }
            }

            this.permissionSets.push(permissionSet);
            this.filteredFeatures.push({
                searchQuery: '',
                features: this.features,
                all: {
                    c: false,
                    r: false,
                    u: false,
                    d: false
                }
            });
        },
        removePermissionSet: function(index) {
            if (this.$refs.userDrawer.editedObject.permission._.u[index]) {
                for (var i = 0; i < this.$refs.userDrawer.editedObject.permission._.u[index].length; i++) {
                    var app_id = this.$refs.userDrawer.editedObject.permission._.u[index][i];
                    this.$refs.userDrawer.editedObject.permission.c[app_id] = undefined;
                    this.$refs.userDrawer.editedObject.permission.r[app_id] = undefined;
                    this.$refs.userDrawer.editedObject.permission.u[app_id] = undefined;
                    this.$refs.userDrawer.editedObject.permission.d[app_id] = undefined;
                }
            }
            this.permissionSets.splice(index, 1);
            this.filteredFeatures.splice(index, 1);
            this.$set(this.$refs.userDrawer.editedObject.permission._.u, this.$refs.userDrawer.editedObject.permission._.u.splice(index, 1));
        },
        setPermissionByDependency: function(index, type, feature) {
            var self = this;
            var crudTypes = {
                'c': 'Create',
                'r': 'Read',
                'u': 'Update',
                'd': 'Delete'
            };
            var permissionSets = this.permissionSets[index];
            var singleFeaturePermDependency = this.featuresPermissionDependency[feature];
            var featuresPermDependency = this.featuresPermissionDependency;
            var inverseFeaturesPermissionDependency = this.inverseFeaturesPermissionDependency[feature];

            var setPermission = function(permType) {
                var preReqfeatures = singleFeaturePermDependency[permType];
                Object.keys(preReqfeatures).forEach(function(preReqfeature) {
                    var msg = [];
                    preReqfeatures[preReqfeature].forEach(function(preReqfeaturePerm) {
                        if (!permissionSets[preReqfeaturePerm].allowed[preReqfeature]) {
                            permissionSets[preReqfeaturePerm].allowed[preReqfeature] = true;
                            msg.push(crudTypes[preReqfeaturePerm]);
                        }
                    });
                    if (msg.length) {
                        CountlyHelpers.notify({
                            message: msg.join(', ') + ' permission(s) granted automatically for' + ' ' + self.featureBeautifier(preReqfeature),
                            type: 'info'
                        });
                    }
                });
            };

            if (permissionSets[type].allowed[feature] && singleFeaturePermDependency && singleFeaturePermDependency[type]) {
                if (type !== 'r' && singleFeaturePermDependency.r) {
                    setPermission('r');
                }
                setPermission(type);
            }
            else if (!permissionSets[type].allowed[feature] && inverseFeaturesPermissionDependency && inverseFeaturesPermissionDependency[type]) {
                var invPreReqfeatures = inverseFeaturesPermissionDependency[type];
                Object.keys(invPreReqfeatures).forEach(function(invPreReqfeature) {
                    if (featuresPermDependency[invPreReqfeature]) {
                        var invMsg = [];
                        Object.keys(featuresPermDependency[invPreReqfeature]).forEach(function(typeKey) {
                            var preReqPerms = featuresPermDependency[invPreReqfeature][typeKey][feature];
                            if (preReqPerms && preReqPerms.indexOf(type) !== -1) {
                                if (permissionSets[typeKey].allowed[invPreReqfeature]) {
                                    permissionSets[typeKey].allowed[invPreReqfeature] = false;
                                    invMsg.push(crudTypes[typeKey]);
                                    if (typeKey === 'r') {
                                        for (var cudType of ['c', 'u', 'd']) {
                                            if (permissionSets[cudType].allowed[invPreReqfeature]) {
                                                permissionSets[cudType].allowed[invPreReqfeature] = false;
                                                invMsg.push(crudTypes[cudType]);
                                            }
                                        }
                                    }
                                }
                            }
                        });
                        if (invMsg.length) {
                            CountlyHelpers.notify({
                                message: self.featureBeautifier(invPreReqfeature) + ' ' + invMsg.join(', ') + ' permission(s) disabled automatically due to dependency permission being disabled',
                                type: 'info'
                            });
                        }
                    }
                });
            }
        },
        setPermissionByFeature: function(index, type, feature) {
            var types = ['c', 'r', 'u', 'd'];
            if (type !== 'r' && !(this.permissionSets[index].r.all || this.permissionSets[index].r.allowed[feature])) {
                this.permissionSets[index].r.allowed[feature] = true;
                CountlyHelpers.notify({
                    message: i18n('management-users.read-permission-given-feature') + ' ' + this.featureBeautifier(feature),
                    type: 'info'
                });
            }
            if (type === 'r' && !this.permissionSets[index].r.allowed[feature]) {
                for (var _type in types) {
                    this.permissionSets[index][types[_type]].allowed[feature] = false;
                    if (this.permissionSets[index][types[_type]].all) {
                        this.permissionSets[index][types[_type]].all = false;
                        for (var _feature in this.features) {
                            if (this.features[_feature] !== feature) {
                                this.permissionSets[index][types[_type]].allowed[this.features[_feature]] = true;
                            }
                        }
                    }
                }
                CountlyHelpers.notify({
                    message: i18n('management-users.other-permissions-for') + ' ' + this.featureBeautifier(feature) + ' ' + i18n('management-users.removed-because-disabled'),
                    type: 'info'
                });
            }
            if (!this.permissionSets[index][type].allowed[feature] && this.permissionSets[index][type].all) {
                this.permissionSets[index][type].all = false;
            }
            this.setPermissionByDependency(index, type, feature);
            this.toggleFilteredAll(index);
        },
        setPermissionByType: function(index, type) {
            var types = ['c', 'r', 'u', 'd'];
            var features = this.filteredFeatures[index].features;
            var all = this.filteredFeatures[index].all;

            if (all[type] && type !== 'r' && !all.r) {
                all.r = true;
                if (features.length === this.features.length) {
                    this.permissionSets[index].r.all = true;
                }
                for (var feature in features) {
                    if (features[feature] !== 'core') {
                        this.permissionSets[index].r.allowed[features[feature]] = all[type];
                    }
                }
                CountlyHelpers.notify({
                    message: i18n('management-users.read-permission-all'),
                    type: 'info'
                });
            }
            if (type === 'r' && !all.r) {
                for (var _type in types) {
                    all[types[_type]] = false;
                    if (features.length === this.features.length) {
                        this.permissionSets[index][types[_type]].all = false;
                    }
                    for (var feature1 in features) {
                        if (!(types[_type] === 'r' && features[feature1] === 'core')) {
                            this.permissionSets[index][types[_type]].allowed[features[feature1]] = false;
                        }
                    }
                }
                CountlyHelpers.notify({
                    message: i18n('management-users.other-permissions-removed'),
                    type: 'info'
                });
            }
            for (var feature2 in features) {
                if (!(type === 'r' && features[feature2] === 'core')) {
                    this.permissionSets[index][type].allowed[features[feature2]] = all[type];
                }
                this.setPermissionByDependency(index, type, features[feature2]);
            }

            if (!all[type]) {
                this.permissionSets[index][type].all = all[type];
            }
            else {
                if (features.length === this.features.length) {
                    this.permissionSets[index][type].all = true;
                }
                else {
                    var isTrue = true;
                    for (var featName of this.features) {
                        if (!this.permissionSets[index][type].allowed[featName]) {
                            isTrue = false;
                            break;
                        }
                    }
                    if (isTrue) {
                        this.permissionSets[index][type].all = true;
                    }
                }
            }

            if (all[type]) {
                CountlyHelpers.notify({
                    message: i18n('management-users.future-plugins'),
                    type: 'info'
                });
            }
            this.toggleFilteredAll(index);
        },
        handleCommand: function(command, index) {
            switch (command) {
            case "remove-set":
                this.removePermissionSet(index);
                break;
            }
        },
        handlePPCommand: function(command) {
            switch (command) {
            case "edit-pp":
                this.pictureEditMode = true;
                break;
            }
        },
        addRolesToUserUnderEdit: function(userUnderEdit) {
            var self = this;
            Object.keys(this.roles).forEach(function(roleName) {
                userUnderEdit[roleName] = self.roles[roleName].value;
            });
        },
        onClose: function() {},
        onSubmit: function(submitted, done) {
            if (submitted._id === countlyGlobal.member._id && countlyGlobal.member.global_admin && !submitted.global_admin) {
                CountlyHelpers.notify({
                    message: i18n('management-users.cannot-revoke-own-admin'),
                    type: 'error'
                });
                done(i18n('management-users.cannot-revoke-own-admin'));
                return;
            }

            var atLeastOneAppSelected = false;

            for (var i = 0; i < submitted.permission._.u.length; i++) {
                if (submitted.permission._.u[i].length > 0) {
                    atLeastOneAppSelected = true;
                }
            }

            if (!atLeastOneAppSelected && submitted.permission._.a.length === 0 && !submitted.global_admin && this.groups.length === 0) {
                CountlyHelpers.notify({
                    message: i18n('management-users.at-least-one-app-required'),
                    type: 'error'
                });
                done(i18n('management-users.at-least-one-app-required'));
                return;
            }

            var self = this;
            this.addRolesToUserUnderEdit(submitted);
            if (this.settings.editMode) {
                if (this.groups.length === 0) {
                    submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                }
                countlyUserManagement.editUser(this.user._id, submitted, function(res) {
                    if (res.result && typeof res.result === "string") {
                        if (self.groupsInput.length) {
                            var group_id = self.groups;
                            groupsModelRef.saveUserGroup({ email: submitted.email, group_id: group_id }, function() {});
                        }
                        self.$emit('refresh-table');
                        self.group = {};
                        if (self.$refs.userDrawerDropzone && self.$refs.userDrawerDropzone.getAcceptedFiles() && self.$refs.userDrawerDropzone.getAcceptedFiles().length > 0) {
                            self.dropzoneOptions.member = { _id: self.user._id };
                            self.$refs.userDrawerDropzone.processQueue();
                            var checkUploadProcess = setInterval(function() {
                                if (self.uploadCompleted) {
                                    CountlyHelpers.notify({
                                        message: i18n('management-users.updated-message'),
                                        type: 'success'
                                    });
                                    clearCheck();
                                    done();
                                }
                            }, 1000);

                            var clearCheck = function() {
                                clearInterval(checkUploadProcess);
                            };
                        }
                        else {
                            CountlyHelpers.notify({
                                message: i18n('management-users.updated-message'),
                                type: 'success'
                            });
                            done();
                        }
                    }
                    else if (typeof res === "object") {
                        for (var i2 = 0; i2 < res.length; i2++) {
                            CountlyHelpers.notify({
                                message: res[i2],
                                type: 'error'
                            });
                        }
                        self.$refs.userDrawer.isSubmitPending = false;
                    }
                    else {
                        CountlyHelpers.notify({
                            message: i18n('management-applications.plugins.smth') + ": " + res,
                            type: 'error'
                        });
                        self.$refs.userDrawer.isSubmitPending = false;
                    }
                });
            }
            else {
                submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                countlyUserManagement.createUser(submitted, function(res) {
                    if (res.full_name) {
                        if (self.groups.length > 0) {
                            groupsModelRef.saveUserGroup({ email: submitted.email, group_id: self.groups }, function() {});
                        }
                        self.group = {};
                        self.$emit('refresh-table');
                        if (self.$refs.userDrawerDropzone && self.$refs.userDrawerDropzone.getAcceptedFiles() && self.$refs.userDrawerDropzone.getAcceptedFiles().length > 0) {
                            self.dropzoneOptions.member = { _id: res._id };
                            self.$refs.userDrawerDropzone.processQueue();
                            var checkUploadProcess = setInterval(function() {
                                if (self.uploadCompleted) {
                                    CountlyHelpers.notify({
                                        message: i18n('management-users.created-message'),
                                        type: 'success'
                                    });
                                    clearCheck();
                                    done();
                                }
                            }, 1000);

                            var clearCheck = function() {
                                clearInterval(checkUploadProcess);
                            };
                        }
                        else {
                            CountlyHelpers.notify({
                                message: i18n('management-users.created-message'),
                                type: 'success'
                            });
                            done();
                        }
                    }
                    else if (res.length) {
                        for (var i1 = 0; i1 < res.length; i1++) {
                            CountlyHelpers.notify({
                                message: res[i1],
                                type: 'error'
                            });
                        }
                        self.$refs.userDrawer.isSubmitPending = false;
                    }
                    else {
                        CountlyHelpers.notify({
                            message: i18n('management-applications.plugins.smth'),
                            type: 'error'
                        });
                        self.$refs.userDrawer.isSubmitPending = false;
                    }
                });
            }
        },
        onOpen: function() {
            this.patchUserPermission();
            this.changePasswordFlag = false;
            var types = ['c', 'r', 'u', 'd'];

            this.filteredFeatures = [];
            this.permissionSets = [];
            this.groups = [];

            if (this.settings.editMode) {
                if (this.user.group_id && this.user.group_id.length && countlyGlobal.plugins.indexOf('groups') > -1) {
                    if (Array.isArray(this.user.group_id)) {
                        this.groups = this.user.group_id;
                    }
                    else {
                        this.groups = [this.user.group_id];
                    }
                    this.permissionSets.push({ c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
                }
                else {
                    if (!this.user.global_admin && this.user.permission._.u[0].length > 0) {
                        var userAppsSets = this.user.permission._.u;

                        for (var set in userAppsSets) {
                            var appFromSet = userAppsSets[set][0];
                            var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
                            for (var type in types) {
                                for (var feature in this.features) {
                                    if (this.user.permission[types[type]] && this.user.permission[types[type]][appFromSet]) {
                                        permissionSet[types[type]].all = typeof this.user.permission[types[type]][appFromSet].all === "boolean" ? this.user.permission[types[type]][appFromSet].all : false;
                                    }
                                    else {
                                        permissionSet[types[type]].all = false;
                                    }

                                    if (!(types[type] === "r" && this.features[feature] === 'core')) {
                                        if (permissionSet[types[type]].all) {
                                            permissionSet[types[type]].allowed[this.features[feature]] = permissionSet[types[type]].all;
                                        }
                                        else if (this.user.permission[types[type]] && this.user.permission[types[type]][appFromSet] && this.user.permission[types[type]][appFromSet].allowed) {
                                            permissionSet[types[type]].allowed[this.features[feature]] = (typeof this.user.permission[types[type]][appFromSet].allowed[this.features[feature]] !== "undefined" ? this.user.permission[types[type]][appFromSet].allowed[this.features[feature]] : false);
                                        }
                                        else {
                                            permissionSet[types[type]].allowed[this.features[feature]] = false;
                                        }
                                    }
                                }
                            }
                            this.permissionSets.push(permissionSet);
                        }
                    }
                    else {
                        this.permissionSets.push({ c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
                    }
                }
            }
            else {
                if (this.features.length === 0) {
                    CountlyHelpers.notify({
                        message: 'Somethings went wrong when fetching feature list.',
                        type: 'error'
                    });
                    return;
                }

                var permissionSet_ = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};

                for (var type_ in types) {
                    for (var feature_ in this.features) {
                        if (this.features[feature_] !== 'core') {
                            permissionSet_[types[type_]].allowed[this.features[feature_]] = false;
                        }
                    }
                }

                this.permissionSets.push(permissionSet_);
            }

            for (var ii = 0; ii < this.permissionSets.length; ii++) {
                this.filteredFeatures.push({
                    features: this.features,
                    searchQuery: '',
                    all: {
                        c: this.permissionSets[ii].c.all,
                        r: this.permissionSets[ii].r.all,
                        u: this.permissionSets[ii].u.all,
                        d: this.permissionSets[ii].d.all
                    }
                });
            }

        },
        onGroupChange: function(groupVal) {
            this.groups = groupVal;
            if (groupVal.length === 0) {
                this.$refs.userDrawer.editedObject.permission._.u = [[]];
                this.$refs.userDrawer.editedObject.permission._.a = [];
                this.$refs.userDrawer.editedObject.permission.c = {};
                this.$refs.userDrawer.editedObject.permission.r = {};
                this.$refs.userDrawer.editedObject.permission.u = {};
                this.$refs.userDrawer.editedObject.permission.d = {};
            }
        },
        onRoleChange: function(role) {
            this.roles[role.name] = role;
        },
        patchUserPermission: function() {
            if (this.user && this.user.permission && this.user.permission._ && this.user.permission._.u) {
                var appIdReducer = function(acc, curr) {
                    if (curr.length > 0) {
                        acc.push(curr);
                    }
                    return acc;
                };

                var _u = this.user.permission._.u.reduce(function(acc, curr) {
                    if (curr.length > 0) {
                        var appIds = curr.reduce(appIdReducer, []);

                        if (appIds.length > 0) {
                            acc.push(appIds);
                        }
                    }
                    return acc;
                }, []);

                this.user.permission._.u = _u;
                this.$refs.userDrawer.editedObject.permission._.u = _u;
            }
        },
    },
    watch: {
        'groups': function() {
            if (this.groups.length > 0 && groupsModelRef) {
                var groupHasGlobalAdmin = false;

                this.groups.forEach(function(grpId) {
                    var group = groupsModelRef.data().find(function(grp) {
                        return grpId === grp._id;
                    });

                    if (group && group.global_admin === true) {
                        groupHasGlobalAdmin = true;
                    }
                });

                this.$refs.userDrawer.editedObject.global_admin = groupHasGlobalAdmin;
            }

            if (this.groups.length === 0) {
                this.$refs.userDrawer.editedObject.global_admin = this.user.global_admin;
            }
        }
    },
    created: function() {
        for (var appKey in countlyGlobal.apps) {
            this.apps.push({value: countlyGlobal.apps[appKey]._id, label: countlyGlobal.apps[appKey].name });
        }

        this.apps.sort(function(a, b) {
            var aLabel = (a && a.label) || '';
            var bLabel = (b && b.label) || '';
            var locale = countlyCommon.BROWSER_LANG || 'en';

            if (aLabel && bLabel) {
                return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
            }

            if (!aLabel && bLabel) {
                return 1;
            }

            if (aLabel && !bLabel) {
                return -1;
            }

            return 0;
        });
    }
};
</script>
