<template>
    <div style="height: 420px; overflow: auto">
        <div class="text-big font-weight-bold bu-my-4">{{ i18n('data-manager.add-category') }}</div>
        <div class="bu-mb-5">
            <div class="text-small font-weight-bold bu-mb-1">{{ i18n('data-manager.category-name') }}</div>
            <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center bu-mb-3">
                <el-input v-model="newCategoryName"></el-input>
                <el-button
                    class="text-smallish font-weight-bold color-blue-100"
                    size="small bu-mx-3"
                    type="text"
                    :disabled="!newCategoryAllowed"
                    @click="addNewCategory">
                    {{ i18n('data-manager.add-category') }}
                </el-button>
            </div>
        </div>
        <div v-if="categories.length" class="bu-mb-4">
            <div class="text-big font-weight-bold bu-mb-1 bu-pt-2">{{ i18n('data-manager.manage-categories') }}</div>
            <data-manager-manage-category-input
                ref="categoryInput"
                v-for="(category, i) in categories"
                @remove-me="removeCategoryAtIndex(i)"
                :removable="categories.length > 1"
                :key="i"
                :segment-index="i"
                :max-categories="maxCategories"
                v-model="categories[i]">
            </data-manager-manage-category-input>
        </div>
    </div>
</template>

<script>
import { i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ManageCategoryInput from './ManageCategoryInput.vue';

export default {
    mixins: [i18nMixin, commonFormattersMixin],
    components: {
        "data-manager-manage-category-input": ManageCategoryInput
    },
    props: {
        value: { type: Array },
        deletedCategories: { type: Array },
        maxCategories: { type: Number, default: 10 },
        focusedItemIdentifier: { type: [String, Number], default: '' }
    },
    data: function() {
        return {
            newCategoryName: null
        };
    },
    computed: {
        newCategoryAllowed: function() {
            return this.categories.length < this.maxCategories;
        },
        categories: {
            get: function() {
                return this.value;
            },
            set: function(value) {
                this.$emit("input", value);
            }
        }
    },
    methods: {
        addNewCategory: function() {
            if (this.newCategoryAllowed && this.newCategoryName) {
                this.categories.push({name: this.newCategoryName});
                this.newCategoryName = null;
            }
        },
        removeCategoryAtIndex: function(index) {
            if (this.categories[index]._id) {
                this.deletedCategories.push(this.categories[index]);
            }
            this.$delete(this.categories, index);
        }
    }
};
</script>
