<template>
    <component
        v-model="section"
        class="cly-content-builder-sidebar-step"
        :is="wrapperComponent"
    >
        <div
            v-if="!collapsible"
            class="cly-content-builder-sidebar-step__header"
            :data-test-id="dataTestId"
        >
            {{ header }}
        </div>
        <component
            v-bind="bodyComponentProps"
            class="cly-content-builder-sidebar-step__body"
            :is="bodyComponent"
        >
            <slot name="step-body">
                <template v-for="input in formattedInputs">
                    <div
                        v-if="input.hasSubHeader"
                        class="cly-content-builder-sidebar-step__sub-header"
                        :key="`${input.id}-sub-header`"
                        :data-test-id="input.dataTestId"
                    >
                        {{ input.subHeader }}
                    </div>
                    <cly-content-builder-sidebar-input
                        v-bind="input"
                        class="cly-content-builder-sidebar-step__input"
                        :key="input.id"
                        @add-asset="onAddAsset({ input, payload: $event })"
                        @delete-asset="onDeleteAsset({ input, payload: $event })"
                        @input="onInputChange({ input, payload: $event })"
                    />
                </template>
            </slot>
        </component>
    </component>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK = 'list-block';

export default {
    mixins: [BaseComponentMixin],
    props: {
        header: {
            default: null,
            type: String
        },
        collapsible: {
            default: false,
            type: Boolean
        },
        inputs: {
            default: () => [],
            type: Array
        }
    },
    data() {
        return {
            section: ['body']
        };
    },
    computed: {
        bodyComponent() {
            return this.collapsible ? 'el-collapse-item' : 'div';
        },
        bodyComponentProps() {
            if (!this.collapsible) {
                return null;
            }

            return {
                name: 'body',
                testId: this.dataTestId,
                title: this.header
            };
        },
        dataTestId() {
            return `content-drawer-sidebar-step-${this.header.toLowerCase().replaceAll(' ', '-')}`;
        },
        formattedInputs() {
            if (this.inputs.length) {
                return this.inputs.map(input => ({
                    ...input,
                    ...!!input.subHeader && {
                        hasSubHeader: true,
                        dataTestId: `content-drawer-sidebar-step-${input.subHeader.toLowerCase().replaceAll(' ', '-')}-label`
                    }
                }));
            }

            return [];
        },
        wrapperComponent() {
            return this.collapsible ? 'el-collapse' : 'div';
        }
    },
    methods: {
        onAddAsset(payload) {
            const { input, payload: eventPayload } = payload || {};
            const { id, key, type } = input || {};

            if (type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK) {
                this.$emit('add-asset', eventPayload);
            }
            else {
                this.$emit('add-asset', { id, key });
            }
        },
        onDeleteAsset(payload) {
            const { input, payload: eventPayload } = payload || {};
            const { id, key, type } = input || {};

            if (type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK) {
                this.$emit('delete-asset', eventPayload);
            }
            else {
                this.$emit('delete-asset', { id, key });
            }
        },
        onUploadAsset(payload) {
            this.$emit('upload-asset', payload);
        },
        onInputChange(payload) {
            const { input, payload: inputPayload } = payload || {};
            const { id, key, type } = input || {};

            if (type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK) {
                this.$emit('input-value-change', inputPayload);
            }
            else {
                this.$emit('input-value-change', {
                    id,
                    key,
                    value: inputPayload
                });
            }
        }
    }
};
</script>
