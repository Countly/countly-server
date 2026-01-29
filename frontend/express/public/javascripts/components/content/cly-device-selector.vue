<template>
    <div class="cly-vue-device-selector bu-is-flex bu-is-justify-content-space-between" :style="{ width: width }">
        <div v-if="showMobile"
             @click="selectedDevice = 'mobile'"
             :style="{ backgroundColor: selectedDevice === 'mobile' ? selectedBackground : 'transparent' }"
             :class="[selectedDevice === 'mobile' ? 'color-white' : '']"
             class="cly-vue-device-selector__device bu-p-2" data-test-id="small-devices-button">
            <i class="cly-io cly-io-device-mobile"></i>
        </div>
        <div v-if="showTablet"
             @click="selectedDevice = 'tablet'"
             :style="{ backgroundColor: selectedDevice === 'tablet' ? selectedBackground : 'transparent' }"
             :class="[selectedDevice === 'tablet' ? 'color-white' : '']"
             class="cly-vue-device-selector__device bu-p-2" data-test-id="medium-devices-button">
            <i class="cly-io cly-io-device-tablet"></i>
        </div>
        <div v-if="showDesktop"
             @click="selectedDevice = 'desktop'"
             :style="{ backgroundColor: selectedDevice === 'desktop' ? selectedBackground : 'transparent' }"
             :class="[selectedDevice === 'desktop' ? 'color-white' : '']"
             class="cly-vue-device-selector__device bu-p-2" data-test-id="large-devices-button">
            <i class="cly-io cly-io-desktop-computer"></i>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        value: {
            type: String,
            default: null
        },
        selectedBackground: {
            type: String,
            default: '#383A3F'
        },
        width: {
            type: String,
            default: '108px'
        },
        showDesktop: {
            type: Boolean,
            default: true
        },
        showTablet: {
            type: Boolean,
            default: true
        },
        showMobile: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        selectedDevice: {
            get() {
                return this.value;
            },
            set(newValue) {
                this.$emit('input', newValue);
            }
        }
    }
};
</script>
