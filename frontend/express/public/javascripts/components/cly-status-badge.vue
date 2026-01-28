<template>
     <div :style="badgeStyles">
        <i v-if="showIcon" :class="currentConfig.icon" :style="iconStyles"></i>
        <span class="text-small" :style="fontStyles">{{ label }}</span>
    </div>
</template>

<script>
export default {
    props: {
        mode: {
            type: String,
            required: true,
            default: 'primary',
            validator: function(value) {
                return ['primary', 'secondary', 'info'].includes(value);
            }
        },
        label: {
            type: String,
            required: false,
            default: 'Status'
        },
        showIcon: {
            type: Boolean,
            required: false,
            default: true
        }
    },
    data: function() {
        return {
            modeConfig: {
                primary: { background: '#E2E4E8', color: '#81868D', icon: 'cly-is cly-is-status' },
                secondary: { background: '#EBFAEE', color: '#12AF51', icon: 'cly-is cly-is-status' },
                info: { background: '#E1EFFF', color: '#0166D6', icon: 'cly-is cly-is-status' },
                // Add more modes here if needed
            }
        };
    },
    computed: {
        currentConfig() {
            return this.modeConfig[this.mode];
        },
        badgeStyles() {
            return {
                height: '16px',
                borderRadius: '8px',
                backgroundColor: this.currentConfig.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 8px',
            };
        },
        iconStyles() {
            return {
                color: this.currentConfig.color,
                fontSize: '8px',
                marginRight: '4px',
            };
        },
        fontStyles() {
            return {
                color: this.currentConfig.color,
            };
        }
    },
}
</script>