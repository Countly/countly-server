<template>
    <div class="cly-vue-json-editor" v-show="opened">
        <slot name="title"><h3 class="bu-pl-4 color-cool-gray-100">{{displayTitle}}</h3></slot>
        <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center bu-px-4 bu-pb-1">
            <div>
                <div class="text-smallish" v-if="jsonstr && jsonerror"><i class="ion-alert-circled color-danger bu-mr-1"></i>{{$i18n("remote-config.json.invalid")}}</div>
                <div class="text-smallish" v-if="!jsonerror"><i class="ion-checkmark-circled color-success bu-mr-1"></i>{{$i18n("remote-config.json.valid")}}</div>
            </div>
            <el-button class="color-cool-gray-100" @click="prettyFormat" type="text">{{$i18n("remote-config.json.format")}}</el-button>
        </div>
        <textarea
            @input="validateJson"
            v-model="jsonstr"
            rows="15"
            class="cly-vue-json-editor__textarea bu-p-4"
            ref="jsonText">
        </textarea>
        <slot name="footer">
            <div class="bu-p-4 bu-is-justify-content-flex-end bu-is-flex">
                <el-button size="small" @click="cancel" class="text-smallish font-weight-bold bg-warm-gray-20" type="default">{{displayCancelLabel}}</el-button>
                <el-button size="small" @click="submit" class="text-smallish font-weight-bold color-white" type="success">{{displaySaveLabel}}</el-button>
            </div>
        </slot>
    </div>
</template>

<script>
export default {
    data: function() {
        return {
            jsonerror: "",
            jsonstr: "",
            isOpen: this.isOpened
        };
    },
    computed: {
        opened: {
            get: function() {
                this.validateJson();
                return this.isOpen;
            },
            set: function(val) {
                this.isOpen = val;
            }
        },
        displaySaveLabel: function() {
            return this.saveLabel || this.$i18n("common.save");
        },
        displayCancelLabel: function() {
            return this.cancelLabel || this.$i18n("common.cancel");
        },
        displayTitle: function() {
            return this.title || this.$i18n("common.json-editor");
        }
    },
    props: {
        value: String,
        isOpened: { type: Boolean, required: true },
        emitClose: { type: Boolean, required: false, default: false },
        saveLabel: { type: String, required: false, default: '' },
        cancelLabel: { type: String, required: false, default: '' },
        title: { type: String, required: false, default: '' }
    },
    watch: {
        value: {
            immediate: true,
            handler: function(newValue) {
                this.jsonstr = newValue;
            }
        }
    },
    methods: {
        validateJson: function() {
            this.jsonerror = "";
            try {
                if (this.jsonstr) {
                    JSON.parse(this.jsonstr);
                }
            }
            catch (e) {
                this.jsonerror = JSON.stringify(e.message);
            }
        },
        prettyFormat: function() {
            var jsonValue = "";
            try {
                jsonValue = JSON.parse(this.jsonstr);
                this.jsonstr = JSON.stringify(jsonValue, null, 2);
            }
            catch (e) {
                // Do nothing
            }
        },
        submit: function() {
            this.$emit("input", this.jsonstr);
            this.opened = false;
            if (this.emitClose) {
                this.$emit("closed");
            }
        },
        cancel: function() {
            this.opened = false;
            if (this.emitClose) {
                this.$emit("closed");
            }
        }
    }
};
</script>
