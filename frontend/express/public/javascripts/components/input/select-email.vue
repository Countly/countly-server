<template>
    <cly-select-x
        v-on="$listeners"
        v-bind="$attrs"
        :options="options"
        :placeholder="placeholder"
        :value="value"
        :searchable="false"
        hideAllOptionsTab
        mode="multi-check"
        ref="selectx"
        :noMatchFoundPlaceholder="$i18n('common.no-email-addresses')"
        class="cly-vue-select-email"
        :test-id="testId"
        @input="handleInput"
    >
        <template v-slot:header="selectScope">
            <el-input
                test-id="search-email-input"
                v-model="currentInput"
                :class="{'is-error': hasError}"
                :placeholder="$i18n('common.email-example')"
                oninput="this.value = this.value.toLowerCase();"
                @keyup.enter.native="tryPush"
            ></el-input>
            <div class="bu-mt-2 color-red-100 text-small" v-show="hasError && showError">
                {{ $i18n("common.invalid-email-address", currentInput) }}
            </div>
        </template>
    </cly-select-x>
</template>

<script>
const REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
const SIMPLE_EMAIL = new RegExp('^' + REGEX_EMAIL + '$', 'i');
const NAMED_EMAIL = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');

export default {
    props: {
        value: {
            type: Array
        },
        placeholder: {
            type: String,
            default: function() {
                return this.$i18n('common.enter-email-addresses');
            },
            required: false
        },
        testId: {
            type: String,
            default: 'cly-select-email-test-id',
            required: false
        },
        showError: {
            type: Boolean,
            default: true
        }
    },
    data: function() {
        return {
            currentInput: ''
        };
    },
    computed: {
        options: function() {
            return this.value.map(function(val) {
                return { value: val, label: val };
            });
        },
        parsedValue: function() {
            var input = this.currentInput;
            if (!input) {
                return false;
            }
            else if (SIMPLE_EMAIL.test(input)) {
                return { value: input, label: input };
            }
            else {
                var match = input.match(NAMED_EMAIL);
                if (match) {
                    return { value: match[2], label: match[2] };
                }
            }
        },
        hasError: function() {
            return !this.parsedValue && this.currentInput;
        }
    },
    methods: {
        handleInput: function(value) {
            this.$emit("input", value);
        },
        pushAddress: function(address) {
            if (!this.value.includes(address.value)) {
                this.handleInput(this.value.concat([address.value]));
            }
        },
        tryPush: function() {
            if (this.parsedValue) {
                this.pushAddress(this.parsedValue);
                this.currentInput = "";
            }
        },
        updateDropdown: function() {
            this.$refs && this.$refs.selectx && this.$refs.selectx.updateDropdown();
        }
    },
    watch: {
        value: function() {
            this.updateDropdown();
        },
        hasError: function() {
            this.updateDropdown();
        }
    }
};
</script>
