<template>
<div v-bind:class="[componentId]" class="app-management-view">
    <cly-header
        :title="i18n('management-applications.title')"
    >
        <template v-if="!firstApp" v-slot:header-right>
            <el-button v-if="isGlobalAdmin" type="success" icon="el-icon-circle-plus" @click="createNewApp" data-test-id="add-new-app-button">{{i18n('common.add-new-app-button')}}</el-button>
        </template>
    </cly-header>
    <cly-main class="bu-pt-4">
        <div class="bu-columns bu-is-gapless">
            <div v-if="!firstApp" class="bu-column bu-is-3 bu-mr-5 app-management-list">
                <cly-listbox
                    skin="jumbo"
                    test-id="app-list"
                    height="624"
                    :searchPlaceholder="appListCount"
                    :options="appList"
                    :searchable="true"
                    v-model="selectedSearchBar">
                        <template v-slot:option-prefix="option">
                            <div class="cly-vue-sidebar__app-image bu-mt-1 bu-mr-1" :style="{backgroundImage: 'url(' + apps[option.value].image + ')'}"></div>
                        </template>
                    </cly-listbox>
            </div>
            <div v-if="firstApp" class="bu-column bu-is-1"></div>
            <div v-if="firstApp" class="bu-column bu-is-3 bu-mr-5">
                <h1 data-test-id="empty-page-create-first-app-title">{{i18n("management-applications.create-first-app-title")}}</h1>
                <p data-test-id="empty-page-create-first-app-description">{{i18n("management-applications.create-first-app-description")}}</p>
            </div>
            <div v-if="firstApp" class="bu-column bu-is-1"></div>
            <div :class="{'bu-column':true, 'bu-is-6':firstApp, 'bu-is-9':!firstApp}">
                <cly-more-options test-id="app-management" v-if="!newApp && isGlobalAdmin" size="small" class="bu-is-pulled-right" @command="handleMenuCommand">
                    <el-dropdown-item :data-test-id="`app-management-more-button-option-item-${idx}`"  :disabled="isDisabled()" :class="{'el-dropdown-menu__item--divided__fix-broken':item.divided, 'add-border':!item.value}" :key="idx" v-for="(item, idx) in topOptions" :divided="item.divided" :command="item.value">
                        <el-link :disabled="isDisabled()" class="bu-ml-1">{{item.label}}</el-link>
                    </el-dropdown-item>
                </cly-more-options>
                <el-switch
                    test-id="set-app-lock"
                    v-if="!newApp && isGlobalAdmin"
                    v-model="apps[selectedApp].locked"
                    :active-text="apps[selectedApp].locked ? i18n('common.locked') : i18n('common.unlocked')"
                    @change="setAppLock"
                    class="bu-is-pulled-right bu-mr-4 bu-mt-1"
                    v-tooltip.top-start="apps[selectedApp].locked ? {content: i18n('management-applications.application-tooltip-locked-text')}
                    : {content: i18n('management-applications.application-tooltip-unlocked-text')}">
                </el-switch>
                <h2 class="bu-mb-4" data-test-id="selected-app-name-title"> {{apps[selectedApp] ? apps[selectedApp].name : i18n('common.add-new-app')}} </h2>
                <cly-section>
                    <div class="bu-columns bu-m-0">
                        <div class="bu-column bu-is-8 bu-py-5">
                            <cly-form
                                :initial-edited-object="apps[selectedApp] || newApp"
                                @submit="save"
                                ref="appForm">
                                <template v-slot="formScope">
                                    <cly-form-step :id="formId" class="app-section">
                                        <div style="display: flex;justify-content: space-between; line-height: 30px;" data-test-id="app-information-label">
                                            APP INFORMATION
                                            <el-button data-test-id="edit-button" v-show="edited && (isGlobalAdmin || isAppAdmin)" @click="edit()" class="bu-mr-2" type="text">Edit</el-button>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.application-name')" test-id="app-name">
                                                {{formScope.editedObject.name}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-else rules="required" :label="i18n('management-applications.application-name')" prop="name" test-id="empty-page-app-name">
                                                <el-input
                                                    test-id="empty-page-app-name-input"
                                                    :disabled="isDisabled()"
                                                    :placeholder="i18n('management-applications.application-name')"
                                                    v-model="formScope.editedObject.name">
                                                </el-input>
                                            </cly-inline-form-field>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.type')" :help="i18n('management-applications.type.hint')" test-id="app-type">
                                                {{formScope.editedObject.type}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-else rules="required" :label="i18n('management-applications.type')" :help="i18n('management-applications.type.hint')" prop="type" test-id="empty-page-app-type">
                                                <el-select
                                                    test-id="empty-page-app-type"
                                                    :disabled="isDisabled()"
                                                    :placeholder="i18n('management-applications.type')"
                                                    v-model="formScope.editedObject.type">
                                                    <el-option :key="type" :value="type" :label="i18n('management-applications.types.' + type)" v-for="(item, type) in types"></el-option>
                                                </el-select>
                                            </cly-inline-form-field>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('countries.table.country')" :help="i18n('management-applications.country.hint')" test-id="country">
                                                {{formScope.editedObject.country}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-else rules="required" :label="i18n('countries.table.country')" prop="country" :help="i18n('management-applications.country.hint')" test-id="empty-page-country">
                                                <cly-select-x
                                                    test-id="empty-page-country-select"
                                                    :disabled="isDisabled()"
                                                    :placeholder="i18n('countries.table.country')"
                                                    v-model="formScope.editedObject.country"
                                                    :options="countries">
                                                </cly-select-x>
                                            </cly-inline-form-field>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.time-zone')" :help="i18n('management-applications.time-zone.hint')" test-id="timezone">
                                                {{formScope.editedObject.timezone}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-else rules="required" :label="i18n('management-applications.time-zone')" prop="timezone"  :help="i18n('management-applications.time-zone.hint')" test-id="empty-page-timezone">
                                                <cly-select-x
                                                    test-id="empty-page-timezone-select"
                                                    :disabled="isDisabled()"
                                                    :placeholder="i18n('management-applications.time-zone')"
                                                    v-model="formScope.editedObject.timezone"
                                                    :options="timezones">
                                                </cly-select-x>
                                            </cly-inline-form-field>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.checksum-salt')" :help="i18n('management-applications.checksum-salt.hint')" test-id="salt-for-checksum">
                                                {{formScope.editedObject.salt}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-else :label="i18n('management-applications.checksum-salt')" prop="salt"  :help="i18n('management-applications.checksum-salt.hint')" test-id="empty-page-salt-for-checksum">
                                                <el-input
                                                    test-id="empty-page-salt-for-checksum-input"
                                                    :disabled="isDisabled()"
                                                    :placeholder="i18n('management-applications.checksum-salt')"
                                                    v-model="formScope.editedObject.salt">
                                                </el-input>
                                            </cly-inline-form-field>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.app-id')" :help="i18n('management-applications.app-id.hint')" test-id="app-id">
                                                {{formScope.editedObject._id}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-if="!newApp && !edited" :label="i18n('management-applications.app-id')" prop="_id"  :help="i18n('management-applications.app-id.hint')" test-id="empty-page-app-id">
                                                <el-input
                                                    test-id="empty-page-app-id-input"
                                                    readonly
                                                    onclick="select()"
                                                    :placeholder="i18n('management-applications.app-id')"
                                                    v-model="formScope.editedObject._id">
                                                </el-input>
                                            </cly-inline-form-field>
                                        </div>
                                        <div>
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.app-key')" :help="i18n('management-applications.app-key.hint')" test-id="app-key">
                                                {{formScope.editedObject.key}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field
                                                v-else
                                                prop="key"
                                                test-id="empty-page-app-key"
                                                :rules="rules(formScope.editedObject)"
                                                :custom-messages="customMessages()"
                                                :label="i18n('management-applications.app-key')"
                                                :help="i18n('management-applications.app-key.hint')"
                                            >
                                                <el-input
                                                    test-id="empty-page-app-key-input"
                                                    :readonly="isDisabled()"
                                                    onclick="select()"
                                                    :placeholder="i18n(newApp ? 'management-applications.app-key.generate' : 'management-applications.app-key')"
                                                    v-model="formScope.editedObject.key">
                                                </el-input>
                                            </cly-inline-form-field>
                                        </div>
                                        <div v-if="formScope.editedObject.type === 'web'">
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.app-domain')" test-id="app-domain">
                                                {{formScope.editedObject.app_domain}}
                                            </cly-inline-form-field>
                                            <cly-inline-form-field v-else :label="i18n('management-applications.app-domain')" prop="app_domain">
                                                <el-input
                                                    :disabled="isDisabled()"
                                                    :placeholder="i18n('management-applications.app-domain')"
                                                    v-model="formScope.editedObject.app_domain">
                                                </el-input>
                                            </cly-inline-form-field>
                                        </div>
										<div v-if="!newApp && apps[selectedApp] && apps[selectedApp].redirect_url">
                                            <cly-inline-form-field v-if="edited" :label="i18n('management-applications.redirect_url')" :help="i18n('management-applications.redirect_url.help')" test-id="redirect-url">
                                                {{formScope.editedObject.redirect_url}}
											</cly-inline-form-field>
											<cly-inline-form-field v-else rules="" :label="i18n('management-applications.redirect_url')" prop="redirect_url" :help="i18n('management-applications.redirect_url.help')">
												<el-switch
													:active-value="apps[selectedApp].redirect_url"
													inactive-value=" "
													:active-text = "apps[selectedApp].redirect_url"
													v-model="formScope.editedObject.redirect_url">
												</el-switch>
                                            </cly-inline-form-field>
                                        </div>
                                    </cly-form-step>
                                    <div v-if="newApp" class="bu-level-right">
                                        <el-button
                                            @click="handleCancelForm"
                                            data-test-id="create-new-app-cancel-button"
                                            type="secondary"
                                        >
                                            {{i18n('common.cancel')}}
                                        </el-button>
                                        <div class="bu-ml-2" @mouseenter="formScope.validate()">
                                            <el-button
                                                :disabled="isDisabled() || !formScope.isSubmissionAllowed"
                                                @click="formScope.submit()"
                                                data-test-id="empty-page-create-new-app-button"
                                                type="primary">{{i18n( newApp ? 'common.create' : 'common.apply')}}
                                            </el-button>
                                        </div>
                                    </div>
                                    <cly-diff-helper
                                        v-if="!edited"
                                        :diff="compare(formScope.editedObject,apps[selectedApp])"
                                        @discard="discardForm()"
                                        @save="save(formScope.editedObject)"
                                        :disabled="isSaveDisabled(formScope.editedObject)"
                                        :isModal="true"
                                    >
                                    <template v-slot:main>
                                        <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                                            <span class="selected-count-blue bu-pl-1 text-medium">
                                                <span data-test-id="number-of-changes" style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{compare(formScope.editedObject,apps[selectedApp]).length}}</span>
                                                <span v-if="compare(formScope.editedObject,apps[selectedApp]).length>1" data-test-id="changes-has-been-made-label" class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made") }}</span>
                                                <span v-else class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made-single") }}</span>
                                                <span v-if="compare(formScope.editedObject,apps[selectedApp]).length>1"  data-test-id="do-you-wanna-keep-label" class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep") }}</span>
                                                <span v-else class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep-single") }}</span>
                                            </span>
                                            <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                            <el-button data-test-id="save-changes-button" skin="red" class="bu-mr-2" size="small" type="default" @click="save(formScope.editedObject)">
                                                <i class="cly-io-16 cly-io cly-io-save-disc" style="font-size: larger;"></i>
                                                <span class="bu-ml-1">
                                                    {{ i18n('dashboards.save-changes') }}
                                                </span>
                                            </el-button>
                                            <el-button class="x-button" @click="discardForm">
                                                <i data-test-id="close-button" class="cly-io-16 cly-io cly-io-x color-cool-gray-50"></i>
                                            </el-button>
                                        </div>
                                    </template>
                                    </cly-diff-helper>
                                </template>
                            </cly-form>
                        </div>
                        <div v-if="!firstApp" class="account-settings-avatar-box bu-is-3 bu-column">
                            <div v-if="!newApp" class="bu-is-vcentered">
                                <p class="bu-has-text-weight-medium bu-mb-6" style="margin: 0px;font-size: 14px;" data-test-id="app-icon-label">{{i18n('management-applications.icon')}}</p>
                                <div>
                                    <div class="account-settings-avatar" :style="app_icon" data-test-id="avatar-app-icon"></div>
                                </div>
                                <p>&nbsp;</p>
                                    <el-upload
                                    v-if="!isDisabled() && (isGlobalAdmin || isAppAdmin)"
                                    action="apps/icon"
                                    :on-success="handleUploadSuccess"
                                    :data="uploadData"
                                    :show-file-list="showFileList"
                                    :limit="1"
                                    name="app_image"
                                    accept="image/png, image/jpeg, image/gif">
                                        <el-button size="small" type="text" data-test-id="add-icon-button">Add Icon</el-button>
                                    </el-upload>
                                <p class="account-upload-instructions" data-test-id="account-upload-instructions-label">{{i18n('management-applications.icon-error')}}</p>
                            </div>
                        </div>
                    </div>
                </cly-section>
                <cly-section>
                    <el-collapse v-if="!newApp" class="app-management-details" @change="loadDetails">
                        <el-collapse-item :title="i18n('management-applications.app-details')" name="1">
                            <div v-if="appDetails">
                                <cly-inline-form-field :label="i18n('management-applications.app-creator')">
                                    <div v-if="appDetails.app.owner === '' || appDetails.app.owner_id === ''">{{i18n("common.unknown")}}</div>
                                    <a v-else :href="'#/manage/users/' + appDetails.app.owner_id">{{appDetails.app.owner}}</a>
                                </cly-inline-form-field>
                                <cly-inline-form-field :label="i18n('management-applications.app-created-at')">
                                    <div v-html="appDetails.app.created"></div>
                                </cly-inline-form-field>
                                <cly-inline-form-field :label="i18n('management-applications.app-edited-at')">
                                    <div v-html="appDetails.app.edited"></div>
                                </cly-inline-form-field>
                                <cly-inline-form-field :label="i18n('management-applications.app-last-data')">
                                    {{appDetails.app.last_data}}
                                </cly-inline-form-field>
                                <h6 class="bu-mt-5 bu-ml-6 text-uppercase">{{i18n("management-applications.app-users")}}</h6>
                                <cly-inline-form-field :label="i18n('management-applications.global_admins')">
                                    {{ joinNameList(appDetails.global_admin) }}
                                </cly-inline-form-field>
                                <cly-inline-form-field :label="i18n('management-applications.admins')">
                                    {{ joinNameList(appDetails.admin) }}
                                </cly-inline-form-field>
                                <cly-inline-form-field :label="i18n('management-applications.users')">
                                    {{ joinNameList(appDetails.user) }}
                                </cly-inline-form-field>
                            </div>
                            <div v-else v-loading="true" style="height: 500px;"></div>
                        </el-collapse-item>
                    </el-collapse>
                </cly-section>
                <h3 class="bu-mb-2" v-if="!newApp && hasAppAdminRights">{{i18n('management-applications.plugins')}}</h3>
                <cly-section v-if="!newApp && hasAppAdminRights" >
                    <validation-observer ref="configObserver" v-slot="v">
                        <el-collapse class="app-management-details">
                            <el-collapse-item :title="value.title" :name="id" :key="id" v-for="(value, id) in appSettings">
                                <component v-if="value.component" v-bind:is="value.component" @change="onChange"></component>
                                <cly-inline-form-field v-else :key="key" :label="getLabelName(key)" v-for="(conf, key) in value.inputs">
                                        <el-input
                                            v-if="conf.input === 'el-input'"
                                            @input="onChange(key, $event)"
                                            :value="conf.value"
                                            v-bind="conf.attrs"
                                            >
                                        </el-input>
                                    <el-color-picker
                                        v-else-if="conf.input === 'el-color-picker'"
                                        @change="onChange(key, $event)"
                                        :value="conf.value"
                                        v-bind="conf.attrs">
                                    </el-color-picker>
                                    <cly-colorpicker
                                        class="feedback-settings__colorpicker"
                                        v-else-if="conf.input === 'cly-colorpicker'"
                                        v-model="conf.value"
                                        @change="onChange(key, conf.value)"
                                        :value="conf.value"
                                        v-bind="conf.attrs"
                                        style="display:inline">
                                    </cly-colorpicker>
                                    <el-upload
                                        class="feedback-settings__upload"
                                        v-else-if="conf.input === 'image'"
                                        :show-file-list="false"
                                        :data="{'id':selectedApp, 'auth_token': authToken, 'name': 'feedback_logo'+selectedApp}"
                                        :before-upload="conf.before"
                                        :on-success="conf.success"
                                        :on-error="conf.error"
                                        v-bind="conf.attrs">
                                    <div :class="conf.image_size">
                                        <div v-if="conf.value" class="image-delete bu-is-flex">
                                            <el-button
                                                size="small"
                                                type="text"
                                                @click.stop="onChange(key, '')"
                                                class="bu-p-0 feedback-settings__button">{{i18n('feedback.delete-logo')}}</el-button>
                                            <img :src="'/feedback/preview/' + conf.value + '?' + Date.now()">
                                        </div>
                                        <div v-else class="bu-is-flex">
                                            <el-button type="default" style="display:flex;margin:auto;">{{i18n('feedback.choose-file')}}</el-button>
                                            <el-button type="default" disabled style="width: 165px;height: 50px;cursor: default;">{{i18n('feedback.logo-preview')}}</el-button>
                                        </div>
                                    </div>
                                    <span class="config-error">{{conf.errorMessage || ""}}</span>
                                </el-upload>
                                        <el-select
                                            v-else-if="conf.input === 'el-select'"
                                            @change="onChange(key, $event)"
                                            :value="conf.value"
                                            v-bind="conf.attrs">
                                            <el-option :key="option.value" :value="option.value" :label="option.label" v-for="option in conf.list"></el-option>
                                        </el-select>
                                        <cly-select-x
                                            v-else-if="conf.input === 'cly-select-x'"
                                            @change="onChange(key, $event)"
                                            :value="conf.value"
                                            :options="conf.list"
                                            v-bind="conf.attrs">
                                        </cly-select-x>
                                        <el-slider
                                            v-else-if="conf.input === 'el-slider'"
                                            @change="onChange(key, $event)"
                                            :value="conf.value"
                                            v-bind="conf.attrs">
                                        </el-slider>
                                        <el-button
                                            v-else-if="conf.input === 'el-button'"
                                            @click="conf.click()"
                                            v-bind="conf.attrs">
                                            {{conf.label}}
                                        </el-button>
                                        <el-switch
                                            v-else-if="conf.input === 'el-switch'"
                                            @change="onChange(key, $event)"
                                            :value="conf.value"
                                            v-bind="conf.attrs">
                                        </el-switch>
                                        <el-input-number
                                            v-else-if="conf.input === 'el-input-number'"
                                            @change="onChange(key, $event)"
                                            :max='2147483647'
                                            :min='0'
                                            :value="conf.value"
                                            v-bind="conf.attrs">
                                        </el-input-number>
                                        <el-input
                                            v-else
                                            @input="onChange(key, $event)"
                                            :value="conf.value">
                                        </el-input>
                                </cly-inline-form-field>
                            </el-collapse-item>
                        </el-collapse>
                        <cly-diff-helper :diff="changeKeys" @discard="onDiscard" @save="saveSettings" :disabled="v.invalid" :emitSaveWhenDisabled="true" :isModal="true">
                            <template v-slot:main>
                                <div class="bu-mr-0 bu-is-flex bu-is-justify-content-flex-end bu-is-align-items-center cly-vue-user-selected" style="height: 100%;">
                                    <span class="selected-count-blue bu-pl-1 text-medium">
                                        <span style="background-color:#0166D6; color:white; padding:3px 7px; border-radius:4px;">{{changeKeys.length}}</span>
								        <span v-if="changeKeys.length>1" class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made") }}</span>
										<span v-else class="bu-is-lowercase text-medium color-cool-gray-50 bu-pl-1">{{ i18n("common.diff-helper.changes-made-single") }}</span>
										<span v-if="changeKeys.length>1" class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep") }}</span>
										<span v-else class="text-medium color-cool-gray-50">{{ i18n("common.diff-helper.keep-single") }}</span>
                                    </span>
                                    <span class="vertical-divider bu-mr-4 bu-ml-4"></span>
                                    <el-button skin="red" class="bu-mr-2" size="small" type="default" @click="saveSettings">
                                        <i class="cly-io-16 cly-io cly-io-save-disc" style="font-size: larger;"></i>
                                        <span class="bu-ml-1">
                                            {{ i18n('dashboards.save-changes') }}
                                        </span>
                                    </el-button>
                                    <el-button class="x-button" @click="onDiscard">
                                        <i class="cly-io-16 cly-io cly-io-x color-cool-gray-50"></i>
                                    </el-button>
                                </div>
                            </template>
                        </cly-diff-helper>
                    </validation-observer>
                </cly-section>
                <el-card class="box-card color-cool-gray-100" v-if="!newApp && isCode">
                    <p>{{i18n('common.integrate-sdks')}}</p>
                    <p><a href='https://code.count.ly' target='_blank'>Countly Code Generator </a>{{i18n('common.integrate-sdks-text')}}</p>
                    <p class="select-platforms">{{i18n('common.integrate-sdks-platforms')}}</p>
                    <div v-if="sdks" class="sdks" style="text-align: right">
                        <a :href="'http://code.count.ly/integration-' + code + '.html?server=' + server + '&app_key=' + apps[selectedApp].key" target='_blank' v-for="(value, code) in sdks" class="el-button el-button--primary is-plain">
                            {{value.name.replace("SDK", "")}}
                        </a>&nbsp;
                    </div>
                </el-card>
            </div>
        </div>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyListbox from '../../../javascripts/components/input/listbox.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyForm from '../../../javascripts/components/form/cly-form.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyInlineFormField from '../../../javascripts/components/form/cly-inline-form-field.vue';
import ClySelectX from '../../../javascripts/components/input/select-x.vue';
import ClyDiffHelper from '../../../javascripts/components/helpers/cly-diff-helper.vue';
import ClyColorpicker from '../../../javascripts/components/input/colorpicker.vue';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm, alert as CountlyAlert, notify, goTo } from '../../../javascripts/countly/countly.helpers.js';
import app from '../../../javascripts/countly/countly.template.js';
import jQuery from 'jquery';
import moment from 'moment';
import _ from 'underscore';
import { validateGlobalAdmin, validateAppAdmin } from '../../../javascripts/countly/countly.auth.js';
import Emitter from 'element-ui/src/mixins/emitter';
import { initializeConfigs, getConfigsData } from '../../../../../../plugins/plugins/frontend/public/store/index.js';
import countlyLocation from '../../../javascripts/countly/countly.location.js';
import countlySession from '../../../javascripts/countly/countly.session.js';
import countlyDevice from '../../../javascripts/countly/countly.device.js';
import countlyCarrier from '../../../javascripts/countly/countly.carrier.js';
import countlyDeviceDetails from '../../../javascripts/countly/countly.device.detail.js';
import countlyAppVersion from '../../../javascripts/countly/countly.app.version.js';
import * as countlyEvent from '../../../javascripts/countly/countly.event.js';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyListbox,
        ClyMoreOptions,
        ClyForm,
        ClyFormStep,
        ClyInlineFormField,
        ClySelectX,
        ClyDiffHelper,
        ClyColorpicker,
    },
    mixins: [
        i18nMixin,
        Emitter,
    ],
    computed: {
        selectedSearchBar: {
            get: function() {
                return this.selectedApp;
            },
            set: function(value) {
                this.newApp = false;
                this.selectedApp = value;
                this.$store.dispatch('countlyAppManagement/setSelectedAppId', value);
                this.uploadData.app_image_id = countlyGlobal.apps[this.selectedApp]._id + "";
                this.app_icon["background-image"] = 'url("appimages/' + this.selectedApp + '.png?' + Date.now().toString() + '")';
                this.unpatch();
                app.onAppManagementSwitch(value, countlyGlobal.apps[value] && countlyGlobal.apps[value].type || "mobile");
                app.navigate("#/manage/apps/" + value);
                this.showFileList = false;
            }
        },
        isCode: function() {
            return countlyGlobal.config && countlyGlobal.config.code;
        },
        hasGlobalAdminRights: function() {
            return validateGlobalAdmin();
        },
        hasAppAdminRights: function() {
            return validateAppAdmin();
        },
        authToken: function() {
            return countlyGlobal.auth_token;
        }
    },
    data: function() {
        var countries = [];
        var timezones = [];
        for (var key in countlyGlobal.timezones) {
            countries.push({label: countlyGlobal.timezones[key].n, value: key});
            if (countlyGlobal.timezones[key].z) {
                for (var zone = 0; zone < countlyGlobal.timezones[key].z.length; zone++) {
                    var k = Object.keys(countlyGlobal.timezones[key].z[zone])[0];
                    timezones.push({value: countlyGlobal.timezones[key].z[zone][k], label: k});
                }
            }
        }
        countries.sort(function(a, b) {
            return a.label > b.label && 1 || -1;
        });
        timezones.sort(function(a, b) {
            return a.label > b.label && 1 || -1;
        });
        var appList = Object.keys(countlyGlobal.admin_apps).map(function(id) {
            countlyGlobal.apps[id].image = "appimages/" + id + ".png?" + Date.now().toString();
            countlyGlobal.apps[id].salt = countlyGlobal.apps[id].salt || countlyGlobal.apps[id].checksum_salt;
            return {
                label: countlyGlobal.apps[id].name,
                value: id
            };
        });
        var sortList = (countlyGlobal.member && countlyGlobal.member.appSortList) || [];
        if (sortList.length) {
            appList = this.sortBy(appList, sortList);
        }
        else {
            appList.sort(this.sortAppOptionsAlphabetically);
        }
        var app_id = this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID;
        return {
            showFileList: true,
            firstApp: this.checkIfFirst(),
            newApp: this.newApp || false,
            formId: "app-management-form",
            types: app.appTypes,
            countries: countries,
            timezones: timezones,
            zoneObject: countlyGlobal.timezones,
            selectedApp: app_id,
            apps: countlyGlobal.apps,
            adminApps: countlyGlobal.admin_apps || {},
            appList: appList,
            appListCount: "",
            diff: [],
            sdks: [],
            server: "",
            changes: {},
            changeKeys: [],
            app_icon: {'background-image': 'url("appimages/' + app_id + '.png?' + Date.now() + '")', "background-repeat": "no-repeat", "background-size": "auto 100px"},
            appDetails: false,
            uploadData: {
                _csrf: countlyGlobal.csrf_token,
                app_image_id: app_id
            },
            topOptions: [
                {value: "clear-1month", label: i18n("management-applications.clear-1month-data")},
                {value: "clear-3month", label: i18n("management-applications.clear-3month-data")},
                {value: "clear-6month", label: i18n("management-applications.clear-6month-data")},
                {value: "clear-1year", label: i18n("management-applications.clear-1year-data")},
                {value: "clear-2year", label: i18n("management-applications.clear-2year-data")},
                {value: "clear-all", label: i18n("management-applications.clear-all-data")},
                //{value: "clear", label: i18n("management-applications.clear-data")},
                {},
                {value: "reset", label: i18n("management-applications.clear-reset-data"), divided: true},
                {},
                {value: "delete", label: i18n("management-applications.delete-an-app"), divided: true},
            ],
            loadingDetails: false,
            appSettings: {},
            appManagementViews: app.appManagementViews,
            edited: true,
            isAppAdmin: validateAppAdmin(app_id),
            isGlobalAdmin: validateGlobalAdmin()
        };
    },
    watch: {
        'appManagementViews': {
            handler: function() {
                this.unpatch();
            },
            deep: true
        },
        appList: {
            handler: function() {
                this.appListCount = i18n('common.search') + " in " + this.appList.length + (this.appList.length > 1 ? " Apps" : " App");
            },
            immediate: true
        }
    },
    created: function() {
        var app_id = this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID;
        if (!countlyGlobal.apps[app_id]) {
            this.createNewApp();
        }
    },
    beforeCreate: function() {
        var self = this;
        if (countlyGlobal.config && countlyGlobal.config.code) {
            jQuery.getScript("sdks.js", function() {
                var server = (location.protocol || "http:") + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/" + countlyGlobal.path;
                if (server.substr(server.length - 1) === '/') {
                    server = server.substr(0, server.length - 1);
                }
                if (typeof window.sdks !== "undefined") {
                    self.sdks = window.sdks;
                    self.server = server;
                }
            });
        }
        return jQuery.when(initializeConfigs())
            .then(function() {
                if (countlyGlobal.apps[self.selectedApp]) {
                    self.unpatch();
                }
            }, function() {

            });
    },
    methods: {
        joinNameList: function(names) {
            return (names || []).map(function(user) {
                return user.full_name || user.username || user._id;
            }).join(", ");
        },
        edit: function() {
            this.edited = false;
        },
        checkIfFirst: function() {
            var isFirst = !Object.keys(countlyGlobal.apps).length;
            if (isFirst && !this.newApp) {
                this.createNewApp();
            }
            return isFirst;
        },
        createNewApp: function() {
            this.edited = false;
            this.selectedApp = "new";
            this.newApp = {};
            if (Intl && Intl.DateTimeFormat) {
                this.newApp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                var timezones = countlyGlobal.timezones;
                for (var countryCode in timezones) {
                    for (var i = 0; i < timezones[countryCode].z.length;i++) {
                        for (var countryTimezone in timezones[countryCode].z[i]) {
                            if (timezones[countryCode].z[i][countryTimezone] === this.newApp.timezone) {
                                this.newApp.country = countryCode;
                                break;
                            }
                        }
                    }
                }
            }
            this.newApp.key = this.generateAPIKey();
            app.navigate("#/manage/apps/new");
        },
        generateAPIKey: function() {
            var length = 40;
            var text = [];
            var chars = "abcdef";
            var numbers = "0123456789";
            var all = chars + numbers;

            //1 char
            text.push(chars.charAt(Math.floor(Math.random() * chars.length)));
            //1 number
            text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));

            var j, x, i;
            //5 any chars
            for (i = 0; i < Math.max(length - 2, 5); i++) {
                text.push(all.charAt(Math.floor(Math.random() * all.length)));
            }

            //randomize order
            for (i = text.length; i; i--) {
                j = Math.floor(Math.random() * i);
                x = text[i - 1];
                text[i - 1] = text[j];
                text[j] = x;
            }

            return text.join("");

        },
        otherAppKeys: function(id) {
            var keys = [];
            for (var appKey in countlyGlobal.apps) {
                if (countlyGlobal.apps[appKey]._id !== id) {
                    keys.push(countlyGlobal.apps[appKey].key);
                }
            }
            return keys;
        },
        rules: function(editedObject) {
            return {
                required: !this.newApp,
                excluded: this.otherAppKeys(editedObject._id)
            };
        },
        customMessages: function() {
            return {
                excluded: i18n('management-applications.app-key-unique')
            };
        },
        isSaveDisabled: function(editedObject) {
            return (!this.newApp && (!editedObject.key || editedObject.key === ""))
            || this.otherAppKeys(editedObject._id).includes(editedObject.key)
            || !editedObject.name || editedObject.name === "" ;
        },
        isDisabled: function() {
            return !this.newApp && (this.apps[this.selectedApp].locked || !this.adminApps[this.selectedApp]);
        },
        handleMenuCommand: function(command) {
            if (command === "delete") {
                this.deleteApp();
            }
            else {
                var self = this;
                var period;

                if (command === "reset") {
                    period = "reset";
                }
                else {
                    period = command.replace("clear-", "");
                }

                var helper_msg = jQuery.i18n.map["management-applications.clear-confirm-" + period] || jQuery.i18n.map["management-applications.clear-confirm-period"];
                var helper_title = jQuery.i18n.map["management-applications.clear-" + period + "-data"] || jQuery.i18n.map["management-applications.clear-all-data"];
                var image = "clear-" + period;

                if (period === "reset") {
                    image = "reset-the-app";
                }
                if (period === "all") {
                    image = "clear-all-app-data";
                }
                CountlyConfirm(helper_msg, "red", function(result) {
                    if (!result) {
                        return true;
                    }

                    var appId2 = self.selectedApp;

                    jQuery.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.apps.w + '/reset',
                        data: {
                            args: JSON.stringify({
                                app_id: appId2,
                                period: period
                            })
                        },
                        dataType: "json",
                        success: function(result1) {

                            if (!result1) {
                                CountlyAlert(jQuery.i18n.map["management-applications.clear-admin"], "red");
                                return false;
                            }
                            else {
                                jQuery(document).trigger("/i/apps/reset", { app_id: appId2, period: period });

                                if (period === "all" || period === "reset") {
                                    countlySession.reset();
                                    countlyLocation.reset();
                                    countlyDevice.reset();
                                    countlyCarrier.reset();
                                    countlyDeviceDetails.reset();
                                    countlyAppVersion.reset();
                                    countlyEvent.reset();
                                }
                                if (period === "reset") {
                                    CountlyAlert("", "black", {title: jQuery.i18n.map["management-applications.reset-success"]});
                                }
                                else {
                                    CountlyAlert("", "black", {title: jQuery.i18n.map["management-applications.clear-success"]});
                                }
                            }
                        }
                    });
                }, [jQuery.i18n.map["common.no-clear"], jQuery.i18n.map["management-applications.yes-clear-app"]], {title: helper_title + "?", image: image});
            }
        },
        handleUploadSuccess: function() {
            this.app_icon["background-image"] = 'url("appimages/' + this.selectedApp + '.png?' + Date.now() + '")';
            countlyGlobal.apps[this.selectedApp].image = "appimages/" + this.selectedApp + '.png?' + Date.now();
        },
        loadComponents: function() {
            var cc = dataMixin({
                'appSettingsComponents': '/app/settings'
            });
            cc = cc.data();
            var allComponents = cc.appSettingsComponents;
            for (var i = 0; i < allComponents.length; i++) {
                if (allComponents[i]._id && allComponents[i].title && allComponents[i].component) {
                    this.appSettings[allComponents[i]._id] = allComponents[i];
                }
            }
        },
        getAppListItemId: function(option) {
            if (!option) {
                return "";
            }

            return (option._id || option.value || option.id || option.app_id || "") + "";
        },
        sortAppOptionsAlphabetically: function(optionA, optionB) {
            var labelA = (optionA.label || "").toLowerCase();
            var labelB = (optionB.label || "").toLowerCase();

            if (labelA < labelB) {
                return -1;
            }

            if (labelA > labelB) {
                return 1;
            }

            var valueA = (optionA.value || "").toLowerCase();
            var valueB = (optionB.value || "").toLowerCase();

            if (valueA < valueB) {
                return -1;
            }

            if (valueA > valueB) {
                return 1;
            }

            return 0;
        },
        applyAppListOrdering: function() {
            if (!Array.isArray(this.appList)) {
                return;
            }

            var sortList = (countlyGlobal.member && countlyGlobal.member.appSortList) || [];
            var currentList = this.appList.slice();
            var orderedList;

            if (sortList.length) {
                orderedList = this.sortBy(currentList, sortList);
            }
            else {
                orderedList = currentList.sort(this.sortAppOptionsAlphabetically);
            }

            this.appList = orderedList;
        },
        sortBy: function(arrayToSort, sortList) {
            if (!sortList.length) {
                return arrayToSort;
            }

            var tmpArr = [],
                retArr = [];
            var i;
            for (i = 0; i < arrayToSort.length; i++) {
                var objId = this.getAppListItemId(arrayToSort[i]);
                var desiredIndex = sortList.indexOf(objId);
                if (desiredIndex !== -1) {
                    tmpArr[desiredIndex] = arrayToSort[i];
                }
            }

            for (i = 0; i < tmpArr.length; i++) {
                if (tmpArr[i]) {
                    retArr[retArr.length] = tmpArr[i];
                }
            }

            for (i = 0; i < arrayToSort.length; i++) {
                if (retArr.indexOf(arrayToSort[i]) === -1) {
                    retArr[retArr.length] = arrayToSort[i];
                }
            }

            return retArr;
        },
        save: function(doc) {
            var self = this;
            self.edited = true;
            if (this.newApp) {
                jQuery.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/create',
                    data: {
                        args: JSON.stringify(doc)
                    },
                    dataType: "json",
                    success: function(data) {
                        if (data && data._id) {
                            data.locked = false;
                            countlyGlobal.apps[data._id] = data;
                            countlyGlobal.admin_apps[data._id] = data;
                            window.Backbone.history.appIds.push(data._id + "");
                            countlyGlobal.apps[data._id].image = "appimages/" + data._id + ".png?" + Date.now().toString();
                            self.apps[data._id].name = countlyCommon.unescapeHtml(data.name);
                            self.appList.push({
                                value: data._id + "",
                                label: data.name
                            });
                            self.applyAppListOrdering();
                            self.$store.dispatch("countlyCommon/addToAllApps", data);
                            // Use setActiveApp as single source of truth - it updates the store and persists
                            countlyCommon.setActiveApp(data._id);
                            if (self.firstApp) {
                                // Note: ACTIVE_APP_ID is now managed by the store via setActiveApp
                                app.onAppManagementSwitch(data._id + "", data && data.type || "mobile");
                                app.initSidebar();
                            }
                            self.firstApp = self.checkIfFirst();
                            setTimeout(function() {
                                self.selectedSearchBar = data._id + "";
                            }, 1);
                        }
                    },
                    error: function(xhr, status, error) {
                        notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: error || jQuery.i18n.map["configs.not-changed"],
                            type: "error"
                        });
                    }
                });
            }
            else if (countlyGlobal.apps[this.selectedApp].key !== doc.key) {
                var warningText = jQuery.i18n.map["management-applications.app-key-change-warning"];
                if (countlyGlobal.plugins.indexOf("drill") > -1) {
                    warningText = jQuery.i18n.map["management-applications.app-key-change-warning-EE"];
                }
                CountlyConfirm(warningText, "popStyleGreen popStyleGreenWide", function(result) {
                    if (result) {
                        self.saveApp(doc);
                    }
                }, [jQuery.i18n.map["common.no-dont-change"], jQuery.i18n.map["management-applications.app-key-change-warning-confirm"]], {title: jQuery.i18n.map["management-applications.app-key-change-warning-title"], image: "change-the-app-key"});
            }
            else {
                this.saveApp(doc);
            }
        },
        saveApp: function(doc) {
            doc.app_id = this.selectedApp;
            if (doc.redirect_url) {
                doc.redirect_url = doc.redirect_url.replace(" ", "");
            }

            delete doc._id;
            var self = this;
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.apps.w + '/update',
                data: {
                    args: JSON.stringify(doc),
                    app_id: doc.app_id
                },
                dataType: "json",
                success: function(data) {
                    for (var modAttr in data) {
                        countlyGlobal.apps[self.selectedApp][modAttr] = data[modAttr];
                        countlyGlobal.admin_apps[self.selectedApp][modAttr] = data[modAttr];
                    }
                    countlyGlobal.apps[self.selectedApp].label = data.name;
                    self.apps[self.selectedApp].name = countlyCommon.unescapeHtml(data.name);
                    for (var i = 0; i < self.appList.length; i++) {
                        if (self.appList[i].value === self.selectedApp) {
                            self.appList[i].label = data.name;
                            break;
                        }
                    }
                    self.applyAppListOrdering();
                    self.discardForm();
                    notify({
                        title: jQuery.i18n.map["configs.changed"],
                        message: jQuery.i18n.map["configs.saved"]
                    });
                },
                error: function(xhr, status, error) {
                    notify({
                        title: jQuery.i18n.map["configs.not-saved"],
                        message: error || jQuery.i18n.map["configs.not-changed"],
                        type: "error"
                    });
                }
            });
        },
        loadDetails: function() {
            this.loadingDetails = true;
            var self = this;
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.apps.r + '/details',
                data: {
                    app_id: self.selectedApp
                },
                dataType: "json",
                success: function(result) {
                    self.loadingDetails = false;
                    if (result && result.app) {
                        self.appDetails = result;
                        self.appDetails.app.created = (parseInt(result.app.created_at, 10) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.created_at);
                        self.appDetails.app.edited = (parseInt(result.app.edited_at, 10) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.edited_at);

                        var ts = self.appDetails.app.last_data;
                        if (Math.round(ts).toString().length === 10) {
                            ts *= 1000;
                        }
                        self.appDetails.app.last_data = (parseInt(result.app.last_data, 10) === 0) ? jQuery.i18n.map["common.unknown"] : moment(new Date(ts)).format("ddd, D MMM YYYY");
                    }
                    else {
                        CountlyAlert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                    }
                },
                error: function(e) {
                    self.loadingDetails = false;
                    if (e && e.status !== 0) {
                        CountlyAlert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                    }
                }
            });
        },
        setAppLock: function(value) {
            var args = {
                app_id: this.selectedApp,
                locked: value
            };

            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.apps.w + '/update',
                data: {
                    args: JSON.stringify(args),
                    app_id: args.app_id
                },
                dataType: "json",
                success: function(data) {
                    for (var modAttr in data) {
                        countlyGlobal.apps[args.app_id][modAttr] = data[modAttr];
                        countlyGlobal.admin_apps[args.app_id][modAttr] = data[modAttr];
                    }
                },
                error: function(xhr, status, error) {
                    CountlyAlert(error, "red");
                }
            });
        },
        deleteApp: function() {
            var self = this;
            CountlyConfirm(jQuery.i18n.map["management-applications.delete-confirm"], "red", function(result) {

                if (!result) {
                    return true;
                }
                var app_id = self.selectedApp;

                jQuery.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/delete',
                    data: {
                        args: JSON.stringify({
                            app_id: app_id
                        })
                    },
                    dataType: "json",
                    success: function() {
                        jQuery(document).trigger("/i/apps/delete", { app_id: app_id });
                        self.$store.dispatch("countlyCommon/removeFromAllApps", app_id);

                        var index = window.Backbone.history.appIds.indexOf(app_id + "");
                        if (index > -1) {
                            window.Backbone.history.appIds.splice(index, 1);
                        }

                        delete countlyGlobal.apps[app_id];
                        delete countlyGlobal.admin_apps[app_id];

                        if (_.isEmpty(countlyGlobal.apps)) {
                            self.firstApp = self.checkIfFirst();
                            app.navigate("#/manage/apps/new");
                        }

                        var index2;
                        for (var i = 0; i < self.appList.length; i++) {
                            if (self.appList[i].value === app_id) {
                                index2 = i;
                                break;
                            }
                        }

                        if (typeof index2 === "number") {
                            self.appList.splice(index2, 1);
                        }

                        if (!_.isEmpty(countlyGlobal.apps)) {

                            //find next app
                            var nextAapp = (self.appList[index2]) ? self.appList[index2].value : self.appList[0].value;
                            self.selectedApp = nextAapp;
                            self.uploadData.app_image_id = countlyGlobal.apps[self.selectedApp]._id + "";
                            self.app_icon["background-image"] = 'url("appimages/' + self.selectedApp + '.png?' + Date.now().toString() + '")';
                            app.navigate("#/manage/apps/" + self.selectedApp);

                            // Use setActiveApp as single source of truth if deleted app was the active one
                            if (countlyCommon.ACTIVE_APP_ID === app_id) {
                                countlyCommon.setActiveApp(nextAapp);
                            }
                        }
                    },
                    error: function(xhr) {
                        if (xhr.status === 403) {
                            CountlyAlert(jQuery.i18n.map["management-applications.app-locked"], "red");
                        }
                        else {
                            CountlyAlert(jQuery.i18n.map["management-applications.delete-admin"], "red");
                        }
                    }
                });
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["management-applications.yes-delete-app"]], {title: jQuery.i18n.map["management-applications.delete-an-app"] + "?", image: "delete-an-app"});
        },
        getLabelName: function(id) {
            return this.$store.getters['countlyConfigurations/getInputLabel'](id);
        },
        isChangeKeyFound: function(key) {
            return this.changeKeys.some(function(changedKey) {
                return changedKey === key;
            });
        },
        addChangeKey: function(key, value, parts) {
            var index = this.changeKeys.indexOf(key);
            if (index > -1) {
                this.changeKeys.splice(index, 1);
            }
            var pluginsData = countlyGlobal.apps[this.selectedApp].plugins;
            if (!pluginsData[parts[0]] || pluginsData[parts[0]][parts[1]] !== value) {
                this.changeKeys.push(key);
            }
        },
        compare: function(editedObject, selectedApp) {
            var differences = [];
            if (!this.selectedApp || this.selectedApp === "new") {
                return differences;
            }
            else {
                ["name", "category", "type", "key", "country", "timezone", "salt", "_id", "redirect_url", "app_domain"].forEach(function(currentKey) {
                    if (editedObject[currentKey] !== selectedApp[currentKey]) {
                        differences.push(currentKey);
                    }
                });
                return differences;
            }
        },
        discardForm: function() {
            this.edited = true;
            this.$refs.appForm.reload();
        },
        updateChangeByLevel: function(value, parts, change, currentLevel) {
            if (!currentLevel) {
                currentLevel = 0;
            }
            if (!change) {
                change = this.changes;
            }
            if (!change[parts[currentLevel]]) {
                change[parts[currentLevel]] = {};
            }
            if (currentLevel === (parts.length - 1)) {
                change[parts[currentLevel]] = value;
                return;
            }
            var nextChange = change[parts[currentLevel]];
            var nextLevel = currentLevel + 1;
            this.updateChangeByLevel(value, parts, nextChange, nextLevel);
        },
        updateAppSettings: function(key, value, parts) {
            if (!this.appSettings[parts[0]]) {
                this.appSettings[parts[0]] = {title: this.getLabelName(parts[0]), inputs: {}};
            }
            if (!this.appSettings[parts[0]].inputs) {
                this.appSettings[parts[0]].inputs = {};
            }
            if (!this.appSettings[parts[0]].inputs[key]) {
                this.appSettings[parts[0]].inputs[key] = {};
            }
            this.appSettings[parts[0]].inputs[key].value = value;
        },
        onChange: function(key, value, isInitializationCall) {
            var parts = key.split(".");
            this.updateAppSettings(key, value, parts);
            this.updateChangeByLevel(value, parts);
            if (!isInitializationCall) {
                this.addChangeKey(key, value, parts);
            }
            this.appSettings = Object.assign({}, this.appSettings);
        },
        resetChanges: function() {
            this.changes = {};
            this.changeKeys = [];
        },
        unpatch: function() {
            this.loadDetails();
            this.resetChanges();
            var pluginsData = getConfigsData();
            if (!countlyGlobal.apps[this.selectedApp].plugins) {
                countlyGlobal.apps[this.selectedApp].plugins = {};
            }
            var plugins = countlyGlobal.apps[this.selectedApp].plugins || {};
            this.appSettings = {};
            for (var i in app.appManagementViews) {
                if (app.appManagementViews[i].inputs) {
                    if (!this.appSettings[i]) {
                        this.appSettings[i] = app.appManagementViews[i];
                    }
                    for (var j in app.appManagementViews[i].inputs) {
                        if (j === 'consolidate') {
                            this.appSettings[i].inputs[j].value = this.getConsolidatedApps();
                            continue;
                        }
                        var parts = j.split(".");
                        if (parts.length === 2) {
                            if (plugins[parts[0]] && typeof plugins[parts[0]][parts[1]] !== "undefined") {
                                this.appSettings[i].inputs[j].value = plugins[parts[0]][parts[1]];
                            }
                            else if (pluginsData[parts[0]] && typeof pluginsData[parts[0]][parts[1]] !== "undefined") {
                                this.appSettings[i].inputs[j].value = pluginsData[parts[0]][parts[1]];
                            }
                            else {
                                this.appSettings[i].inputs[j].value = this.appSettings[i].inputs[j].defaultValue;
                            }
                        }
                        else if (parts.length === 1) {
                            if (typeof plugins[parts[0]] !== "undefined") {
                                this.appSettings[i].inputs[j].value = plugins[parts[0]];
                            }
                            else {
                                this.appSettings[i].inputs[j].value = this.appSettings[i].inputs[j].defaultValue;
                            }
                        }
                        else {
                            this.appSettings[i].inputs[j].value = this.appSettings[i].inputs[j].defaultValue;
                        }
                    }
                }
            }
            this.loadComponents();
        },
        onDiscard: function() {
            this.broadcast('AppSettingsContainerObservable', 'discard');
            this.unpatch();
        },
        saveSettings: function() {
            var self = this;
            this.$refs.configObserver.validate().then(function(isValid) {
                if (isValid) {
                    var appSettingKeys = Object.keys(app.appManagementViews);
                    for (var i = 0; i < appSettingKeys.length; i++) {
                        if (self.changes[appSettingKeys[i]]) {
                            if (appSettingKeys[i] === 'consolidate') {
                                self.changes[appSettingKeys[i]] = {
                                    selectedApps: self.changes[appSettingKeys[i]] || [],
                                    initialApps: self.getConsolidatedApps() || []
                                };
                            }
                            else {
                                var subKeys = Object.keys(app.appManagementViews[appSettingKeys[i]].inputs);
                                for (var j = 0; j < subKeys.length; j++) {
                                    if (!self.changes[appSettingKeys[i]][subKeys[j].split('.', 2)[1]]) {
                                        self.changes[appSettingKeys[i]][subKeys[j].split('.', 2)[1]] = app.appManagementViews[appSettingKeys[i]].inputs[subKeys[j]].value;
                                    }
                                }
                            }
                        }
                    }
                    jQuery.ajax({
                        type: "POST",
                        url: countlyCommon.API_PARTS.apps.w + '/update/plugins',
                        data: {
                            app_id: self.selectedApp,
                            args: JSON.stringify(self.changes)
                        },
                        dataType: "json",
                        success: function(result) {
                            if (result.result === 'Nothing changed') {
                                notify({type: 'warning', message: jQuery.i18n.map['management-applications.plugins.saved.nothing']});
                            }
                            else {
                                notify({title: jQuery.i18n.map['management-applications.plugins.saved.title'], message: jQuery.i18n.map['management-applications.plugins.saved']});
                            }
                            if (!countlyGlobal.apps[self.selectedApp].plugins) {
                                countlyGlobal.apps[self.selectedApp].plugins = {};
                            }
                            for (var key in self.changes) {
                                if (key === 'consolidate') {
                                    //self app can only be updated through other apps
                                    //countlyGlobal.apps[self.selectedApp].plugins[key] = self.changes[key].selectedApps;
                                    var removedSourceApps = self.changes.consolidate.selectedApps
                                        .filter(function(x) {
                                            return !self.changes.consolidate.initialApps.includes(x);
                                        })
                                        .concat(self.changes.consolidate.initialApps.filter(function(x) {
                                            return !self.changes.consolidate.selectedApps.includes(x);
                                        }));
                                    for (var removalAppKey of removedSourceApps) {
                                        if (!countlyGlobal.apps[removalAppKey].plugins || !countlyGlobal.apps[removalAppKey].plugins[key]) {
                                            continue;
                                        }
                                        var removalIndex = countlyGlobal.apps[removalAppKey].plugins[key].indexOf(self.selectedApp);
                                        if (removalIndex > -1) {
                                            countlyGlobal.apps[removalAppKey].plugins[key].splice(removalIndex, 1);
                                        }
                                    }
                                    for (var appKey of self.changes[key].selectedApps) {
                                        if (!countlyGlobal.apps[appKey].plugins) {
                                            countlyGlobal.apps[appKey].plugins = {};
                                        }
                                        if (!countlyGlobal.apps[appKey].plugins[key]) {
                                            countlyGlobal.apps[appKey].plugins[key] = [self.selectedApp];
                                        }
                                        if (!countlyGlobal.apps[appKey].plugins[key].includes(self.selectedApp)) {
                                            countlyGlobal.apps[appKey].plugins[key].push(self.selectedApp);
                                        }
                                    }
                                }
                                else {
                                    countlyGlobal.apps[self.selectedApp].plugins[key] = self.changes[key];
                                }
                            }
                            self.resetChanges();
                        },
                        error: function(resp, status, error) {
                            try {
                                resp = JSON.parse(resp.responseText);
                            }
                            catch (ignored) {
                                //ignored excep
                            }
                            notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: resp.errors || error || resp.result || jQuery.i18n.map['management-applications.plugins.error.server'],
                                type: "error"
                            });
                        }
                    });
                }
            });
        },
        getConsolidatedApps: function() {
            var self = this;
            return Object.keys(countlyGlobal.apps).filter(function(key) {
                if (key === self.selectedApp) {
                    return false;
                }
                if (countlyGlobal.apps[key].plugins && countlyGlobal.apps[key].plugins.consolidate && countlyGlobal.apps[key].plugins.consolidate.length) {
                    return countlyGlobal.apps[key].plugins.consolidate.includes(self.selectedApp);
                }
            }) || [];
        },
        handleCancelForm: function() {
            goTo({url: "/manage/apps"});
        }
    },
    mounted: function() {
        var appId = this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID;
        this.$store.dispatch('countlyAppManagement/setSelectedAppId', appId);
    }
};
</script>
