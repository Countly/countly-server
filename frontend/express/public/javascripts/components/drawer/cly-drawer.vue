<template>
    <transition :name="toggleTransition" @enter="onViewEntered">
        <div
            class="cly-vue-drawer"
            tabindex="0"
            v-show="isOpened"
            @keydown.esc="escKeyEvent"
            ref="rootEl"
            :id="id"
            :class="rootClasses"
        >
            <div class="cly-vue-drawer__sidecars-view" v-show="hasSidecars">
                <slot name="sidecars" v-bind="passedScope"></slot>
            </div>
            <div class="cly-vue-drawer__steps-view">
                <div class="cly-vue-drawer__steps-wrapper">
                    <div class="bu-container bu-pt-3 bu-is-fluid bu-p-0" v-if="currentScreenMode === 'full'">
                        <div class="bu-columns bu-is-gapless">
                            <div class="bu-column bu-is-12 bu-is-flex bu-is-justify-content-flex-end">
                                <span :data-test-id="testId + '-close-button'" class="cly-vue-drawer__close-button" @click="doClose">
                                    <i class="ion-ios-close-empty"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="cly-vue-drawer__header" :class="{ 'is-full-screen': currentScreenMode === 'full'}">
                        <div class="cly-vue-drawer__title">
                            <div
                                v-if="currentScreenMode !== 'full'"
                                class="cly-vue-drawer__title-container bu-is-flex bu-is-justify-content-space-between"
                                :class="{ 'bu-is-align-items-center': !hasBackLink }"
                            >
                                <a
                                    v-if="hasBackLink"
                                    :data-test-id="testId + '-drawer-back-link'"
                                    style="cursor: pointer;"
                                    @click="doClose"
                                >
                                    <span class="text-medium bu-is-capitalized">
                                        <i class="fas fa-arrow-left bu-pr-3" />
                                        {{ $i18n('plugins.back') }}
                                    </span>
                                </a>
                                <h3
                                    class="cly-vue-drawer__title-header"
                                    :data-test-id="testId + '-header-title'"
                                    :style="hasBackLink.style"
                                >
                                    {{ title }}
                                </h3>
                                <div
                                    class="cly-vue-drawer__close-button"
                                    :data-test-id="testId + '-close-button'"
                                    @click="doClose"
                                >
                                    <i class="ion-ios-close-empty" />
                                </div>
                            </div>
                            <div v-if="isMultiStep" class="bu-columns bu-is-gapless bu-is-mobile cly-vue-drawer__subtitle">
                                <div class="bu-column bu-is-12 bu-is-flex bu-is-align-items-center bu-is-justify-content-left">
                                    <div class="cly-vue-drawer__steps-header" :data-test-id="testId + '-steps-header-container'">
                                        <template v-for="(currentContent, i) in stepContents">
                                            <div
                                                :key="'label_' + i"
                                                @click="setStepSafe(i, 'header-click')"
                                                class="cly-vue-drawer__step-label"
                                                :data-test-id="testId + '-step-' + (i + 1) + '-label'"
                                                :class="{'is-locked': i > lastValidIndex, 'is-active': i === currentStepIndex, 'is-passed': i < currentStepIndex}"
                                            >
                                                <div class="bu-is-flex" :data-test-id="testId + '-step-sign-container'">
                                                    <div class="cly-vue-drawer__step-sign" :data-test-id="testId + '-step-sign'">
                                                        <span class="index text-small" :data-test-id="testId + '-current-step-index-' + (i + 1)" :class="{'color-white': i === currentStepIndex}">{{i + 1}}</span>
                                                        <span class="done-icon text-small color-white bu-pt-0" :data-test-id="testId + '-current-step-index-img-container' + (i + 1)">
                                                            <img :data-test-id="testId + '-step-' + (i + 1)" src="/images/icons/check-icon.svg">
                                                        </span>
                                                    </div>
                                                    <div :data-test-id="testId + '-' + (currentContent && currentContent.name ? currentContent.name.toLowerCase().replaceAll(/[\s&]+/g, '-') + '-label' : 'content-label')" class="cly-vue-drawer__step-title text-small font-weight-bold color-cool-gray-40">{{currentContent.name}}</div>
                                                </div>
                                            </div>
                                            <div :data-test-id="testId + '-seperator-' + i" :key="'sep_' + i" class="cly-vue-drawer__step-separator" v-if="i < stepContents.length - 1"></div>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cly-vue-drawer__steps-container" v-scroll-shadow :class="{'is-multi-step':isMultiStep}">
                        <div class="bu-columns bu-is-gapless bu-is-mobile" v-if="currentScreenMode === 'full'">
                            <div class="bu-column bu-is-12" :data-test-id="testId + '-header-title'">
                                <h3>{{title}}</h3>
                            </div>
                        </div>
                        <div class="bu-columns bu-is-gapless bu-is-mobile cly-vue-drawer__body-container" :class="{ 'bu-pb-5 bu-pt-4 bu-mb-2 bu-mt-1': currentScreenMode !== 'full' }">
                            <div class="bu-column bu-is-12">
                                <slot name="default" v-bind="passedScope"></slot>
                            </div>
                        </div>
                    </div>
                    <div class="cly-vue-drawer__footer" v-if="isMultiStep || hasCancelButton || saveButtonLabel">
                        <div class="cly-vue-drawer__controls-left-pc">
                            <slot name="controls-left" v-bind="passedScope"></slot>
                            <slot name="notification" v-bind="passedScope"></slot>
                        </div>
                        <div class="cly-vue-drawer__buttons is-multi-step is-single-step bu-is-justify-content-flex-end bu-is-flex" v-if="isMultiStep">
                            <el-button :data-test-id="testId + '-cancel-button'" type="secondary" @click="doClose" size="small" v-if="currentStepIndex === 0 && hasCancelButton" :disabled="isSubmitPending">{{cancelButtonLabel}}</el-button>
                            <el-button :data-test-id="testId + '-previous-step-button'" type="secondary" @click="prevStep" size="small" v-if="currentStepIndex > 0" :disabled="isSubmitPending">{{$i18n('common.drawer.previous-step')}}</el-button>
                            <el-button :data-test-id="testId + '-next-step-button'" type="success" :key="isLastStep" @click="nextStep" size="small" v-if="!isLastStep" :class="{'is-disabled':!isCurrentStepValid}" :disabled="isSubmitPending">{{$i18n('common.drawer.next-step')}}</el-button>
                            <el-button :data-test-id="testId + '-save-button'" type="success" :key="isLastStep" @click="submit" :loading="isSubmitPending" size="small" v-if="isLastStep" :class="{'is-disabled':!isSubmissionAllowed}" :disabled="isSubmitPending">{{saveButtonLabel}}</el-button>
                        </div>
                        <div class="cly-vue-drawer__buttons is-single-step is-single-step bu-is-justify-content-flex-end bu-is-flex" v-if="!isMultiStep">
                            <el-button :data-test-id="testId + '-cancel-button'" type="secondary" @click="doClose" size="small" v-if="hasCancelButton" :disabled="isSubmitPending">{{cancelButtonLabel}}</el-button>
                            <el-button :data-test-id="testId + '-save-button'" type="success" v-if="saveButtonLabel" @click="submit" :loading="isSubmitPending" size="small" :class="{'is-disabled':!isSubmissionAllowed}" :disabled="isSubmitPending">{{saveButtonLabel}}</el-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
import { BaseComponentMixin, MultiStepFormMixin, ModalMixin } from './mixins.js';

export default {
    mixins: [BaseComponentMixin, MultiStepFormMixin, ModalMixin],
    inheritAttrs: false,
    props: {
        isOpened: { type: Boolean, required: true },
        name: { type: String, required: true },
        title: { type: String, required: true },
        saveButtonLabel: { type: String, required: false, default: "" },
        cancelButtonLabel: {
            type: String,
            required: false,
            default: function() {
                return this.$i18n ? this.$i18n("common.cancel") : "Cancel";
            }
        },
        closeFn: { type: Function },
        hasCancelButton: { type: Boolean, required: false, default: true },
        hasBackLink: {
            type: [Object, Boolean],
            default: false,
            required: false
        },
        toggleTransition: {
            type: String,
            default: 'stdt-slide-right'
        },
        size: {
            type: Number,
            default: 6,
            validator: function(value) {
                return value >= 1 && value <= 12;
            }
        },
        testId: {
            type: String,
            default: "drawer-test-id",
        },
        id: {
            type: String
        }
    },
    data: function() {
        return {
            isToggleable: true,
            sidecarContents: [],
            disableAutoClose: false,
        };
    },
    computed: {
        hasSidecars: function() {
            return this.sidecarContents.length > 0;
        },
        rootClasses: function() {
            var classes = {
                'is-mounted': this.isMounted,
                'is-open': this.isOpened,
                'has-sidecars': this.hasSidecars,
            };
            classes["cly-vue-drawer--" + this.currentScreenMode + "-screen"] = true;
            if (this.currentScreenMode === 'half') {
                classes["cly-vue-drawer--half-screen-" + this.size] = true;
            }
            return classes;
        }
    },
    watch: {
        isOpened: function(newState) {
            if (!newState) {
                this.reset();
            }
            else {
                this.$emit("open");
            }
            this.setModalState(newState);
        }
    },
    mounted: function() {
        this.sidecarContents = this.$children.filter(function(child) {
            return child.isContent && child.role === "sidecar";
        });
    },
    methods: {
        doClose: function() {
            if (this.disableAutoClose) {
                this.disableAutoClose = false;
                return;
            }
            this.$emit("close", this.name);
            if (this.closeFn) {
                this.closeFn();
            }
        },
        escKeyEvent: function() {
            this.doClose();
        },
        onViewEntered: function() {
            this.$refs.rootEl.focus();
        }
    }
};
</script>
