<template>
    <div class="cly-vue-data-manager__mci bg-white">
        <div class="cly-vue-data-manager__mci--block bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center bu-px-4"
            v-if="!editing">
            <div class="text-medium">{{unescapeHtml(category.name)}}</div>
            <div class="bu-is-flex">
                <div @click="removeCategory" class="bu-mr-3"><i class="el-icon-delete color-cool-gray-50 bu-is-clickable"></i></div>
                <div @click="editCategory"><i class="el-icon-edit color-cool-gray-50 bu-is-clickable"></i></div>
            </div>
        </div>
        <div class="cly-vue-data-manager__mci--block bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center bu-px-4"
            v-if="editing">
            <el-input class="bu-mr-3" v-model="categoryName">
            </el-input>
            <div class="bu-is-flex">
                <el-button
                    size="small"
                    @click="saveCategory">
                    {{ i18n('common.done') }}
                </el-button>
                <el-button
                    size="small"
                    @click="cancelEdit">
                    {{ i18n('common.cancel') }}
                </el-button>
            </div>
        </div>
    </div>
</template>

<script>
import { i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin, commonFormattersMixin],
    props: {
        value: { type: Object },
        label: { type: String },
        removable: { type: Boolean, default: true },
        categoryIndex: { type: Number, default: -1 }
    },
    data: function() {
        return {
            editing: false,
            editedCategoryName: null
        };
    },
    computed: {
        category: function() {
            return this.value;
        },
        categoryName: {
            get: function() {
                return (this.editedCategoryName === null) ? this.category.name : this.editedCategoryName;
            },
            set: function(val) {
                this.editedCategoryName = val;
            },
            cache: false
        }
    },
    methods: {
        removeCategory: function() {
            this.$emit("remove-me");
        },
        editCategory: function() {
            this.editing = true;
        },
        saveCategory: function() {
            if (this.editedCategoryName) {
                this.category.name = this.editedCategoryName;
                this.category.edited = true;
                this.editing = false;
                this.editedCategoryName = null;
            }
        },
        cancelEdit: function() {
            this.editedCategoryName = null;
            this.editing = false;
        }
    }
};
</script>
