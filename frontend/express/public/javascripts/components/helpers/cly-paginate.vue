<template>
    <div>
        <slot v-bind="passedScope"></slot>
        <slot name="controls">
            <div v-if="hasMultiplePages">
                <el-button-group class="bu-p-4">
                    <el-button size="small" :disabled="!prevAvailable" @click="goToPrevPage" icon="el-icon-caret-left"></el-button>
                    <el-button size="small" :disabled="!nextAvailable" @click="goToNextPage" icon="el-icon-caret-right"></el-button>
                </el-button-group>
            </div>
        </slot>
    </div>
</template>

<script>
export default {
    watch: {
        lastPage: function() {
            this.checkPageBoundaries();
        },
        value: function(newVal) {
            this.page = newVal;
            this.checkPageBoundaries();
        }
    },
    data: function() {
        return {
            page: 1
        };
    },
    methods: {
        setPage: function(target) {
            this.$emit("input", target);
            this.page = target;
        },
        checkPageBoundaries: function() {
            if (this.lastPage > 0 && this.page > this.lastPage) {
                this.goToLastPage();
            }
            if (this.page < 1) {
                this.goToFirstPage();
            }
        },
        goToFirstPage: function() {
            this.setPage(1);
        },
        goToLastPage: function() {
            this.setPage(this.lastPage);
        },
        goToPrevPage: function() {
            if (this.prevAvailable) {
                this.setPage(this.page - 1);
            }
        },
        goToNextPage: function() {
            if (this.nextAvailable) {
                this.setPage(this.page + 1);
            }
        }
    },
    computed: {
        currentItems: function() {
            return this.items.slice((this.page - 1) * this.perPage, this.page * this.perPage);
        },
        totalPages: function() {
            return Math.ceil(this.items.length / this.perPage);
        },
        lastPage: function() {
            return this.totalPages;
        },
        hasMultiplePages: function() {
            return this.totalPages > 1;
        },
        prevAvailable: function() {
            return this.page > 1;
        },
        nextAvailable: function() {
            return this.totalPages > this.page;
        },
        passedScope: function() {
            return {
                page: this.page,
                currentItems: this.currentItems,
                totalPages: this.totalPages,
                prevAvailable: this.prevAvailable,
                nextAvailable: this.nextAvailable
            };
        }
    },
    props: {
        value: {
            default: 1,
            type: Number,
            validator: function(value) {
                return value > 0;
            }
        },
        items: {
            type: Array,
            required: true
        },
        perPage: {
            type: Number,
            default: 10
        }
    }
};
</script>
