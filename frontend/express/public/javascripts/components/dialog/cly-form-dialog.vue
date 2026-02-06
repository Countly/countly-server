<template>
    <transition :name="toggleTransition" @enter="onViewEntered">
        <div class="cly-vue-formdialog" tabindex="0" v-show="isOpened" v-click-outside="onClickOutside" @keydown.esc="escKeyEvent" ref="rootEl" :class="rootClasses">
            <div class="cly-vue-formdialog__header bu-p-4">
                <h3 :data-test-id="testId + '-form-dialog-title'" class="color-cool-gray-100">{{title}}</h3>
            </div>
            <div class="cly-vue-formdialog__steps-container bu-px-4 bg-warm-gray-10" v-scroll-shadow :class="{'is-multi-step':isMultiStep}">
                <div class="bu-columns bu-is-gapless bu-is-mobile">
                    <div class="bu-column bu-is-12">
                        <slot name="default"
                            v-bind="passedScope">
                        </slot>
                    </div>
                </div>
            </div>
            <div class="cly-vue-formdialog__footer bu-p-4">
                <div class="cly-vue-formdialog__controls-left-pc">
                    <slot name="controls-left"
                        v-bind="passedScope">
                    </slot>
                </div>
                <div class="cly-vue-formdialog__buttons is-multi-step bu-is-justify-content-flex-end bu-is-flex" v-if="isMultiStep">
                    <el-button @click="doClose" type="secondary" :data-test-id="testId + '-form-dialog-multi-close-button'" size="small" v-if="hasCancelButton && currentStepIndex === 0" :disabled="isSubmitPending">{{cancelButtonLabel}}</el-button>
                    <el-button @click="prevStep" type="secondary" :data-test-id="testId + '-form-dialog-multi-previous-button'" size="small" v-if="currentStepIndex > 0" :disabled="isSubmitPending">{{$i18n('common.drawer.previous-step')}}</el-button>
                    <el-button @click="nextStep" size="small" type="success" v-if="!isLastStep" :data-test-id="testId + '-form-dialog-multi-next-button'" :class="{'is-disabled':!isCurrentStepValid}" :disabled="isSubmitPending">{{$i18n('common.drawer.next-step')}}</el-button>
                    <el-button @click="submit" :loading="isSubmitPending" size="small" v-if="isLastStep" :data-test-id="testId + '-form-dialog-multi-submit-button'" :class="{'is-disabled':!isSubmissionAllowed}" type="success" :disabled="isSubmitPending">{{saveButtonLabel}}</el-button>
                </div>
                <div class="cly-vue-formdialog__buttons is-single-step bu-is-justify-content-flex-end bu-is-flex" v-if="!isMultiStep">
                    <el-button @click="doClose" type="secondary" size="small" v-if="hasCancelButton" :data-test-id="testId + '-form-dialog-single-close-button'" :disabled="isSubmitPending">{{cancelButtonLabel}}</el-button>
                    <el-button @click="submit" :loading="isSubmitPending" size="small" type="success" :data-test-id="testId + '-form-dialog-single-submit-button'" :class="{'is-disabled':!isSubmissionAllowed}" :disabled="isSubmitPending">{{saveButtonLabel}}</el-button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
import { MultiStepFormMixin } from '../form/mixins.js';
import { ModalMixin } from '../drawer/mixins.js';
import { scrollShadowDirective } from '../../countly/vue/directives/scroll-shadow.js';

export default {
    directives: {
        'scroll-shadow': scrollShadowDirective
    },
    inheritAttrs: false,
    mixins: [
        MultiStepFormMixin,
        ModalMixin
    ],
    props: {
        isOpened: {type: Boolean, required: true},
        name: {type: String, required: true},
        title: {type: String, required: true},
        saveButtonLabel: {type: String, required: true, default: ""},
        cancelButtonLabel: {type: String, required: false, default: 'Cancel'},
        closeFn: {type: Function},
        hasCancelButton: {type: Boolean, required: false, default: true},
        toggleTransition: {
            type: String,
            default: 'stdt-fade'
        },
        testId: {
            type: String,
            default: 'cly-vue-formdialog-test-id',
            required: false,
        }
    },
    computed: {
        rootClasses: function() {
            return {
                'is-mounted': this.isMounted,
                'is-open': this.isOpened
            };
        }
    },
    data: function() {
        return {
            isToggleable: true
        };
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
    methods: {
        doClose: function() {
            this.$emit("close", this.name);
            if (this.closeFn) {
                this.closeFn();
            }
        },
        onClickOutside: function() {
            this.doClose();
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
