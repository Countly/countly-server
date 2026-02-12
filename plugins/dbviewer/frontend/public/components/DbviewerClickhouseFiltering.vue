<template>
<div class="dbviewer-filter__container">
    <validation-observer v-slot="observer">
        <div class="bu-columns bu-is-gapless bu-is-multiline">
            <div class="bu-column bu-is-12">
                <label class="text-small">{{ i18n('dbviewer.filter-query') }}</label>
                <vue-scroll ref="filterScroll" :ops="scrollOps" class="dbviewer-filter__scroll">
                    <div class="bu-columns bu-is-gapless bu-is-multiline">
                        <div class="bu-column bu-is-12">
                            <dbviewer-filter-row
                                class="bu-mt-2"
                                v-for="(row, idx) in rows"
                                :key="row.id"
                                :row="row"
                                :is-first-row="idx === 0"
                                :fields="fields"
                                :disabled="disabled"
                                :allow-delete-first-row="allowDeleteFirstRow"
                                @update-row="onUpdateRow"
                                @delete-row="onDeleteRow"
                            />
                        </div>
                    </div>
                </vue-scroll>
            </div>

            <div class="bu-column bu-is-12 bu-mt-2">
                <el-button
                    class="is-light-blue"
                    @click="addRow"
                    size="small"
                    :disabled="observer.invalid || disabled"
                >
                    + Add Filter
                </el-button>
            </div>
        </div>
    </validation-observer>
</div>
</template>

<script>
import DbviewerFilterRow from './DbviewerFilterRow.vue';
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    components: {
        'dbviewer-filter-row': DbviewerFilterRow
    },
    props: {
        value: { type: Object, default: () => ({ rows: [] }) },
        fields: { type: Array, required: true },
        disabled: { type: Boolean, default: false },
        allowDeleteFirstRow: { type: Boolean, default: true }
    },
    data() {
        return {
            rows: [],
            isEmitting: false,
            scrollOps: {
                vuescroll: {},
                scrollPanel: {
                    initialScrollX: false,
                    scrollingX: false,
                    scrollingY: true
                },
                rail: { gutterOfSide: '1px', gutterOfEnds: '15px' },
                bar: { background: '#A7AEB8', size: '6px', specifyBorderRadius: '3px', keepShow: false }
            }
        };
    },
    created() {
        this.syncFromValue(this.value);
    },
    watch: {
        value(v) {
            if (this.isEmitting) {
                return;
            }
            this.syncFromValue(v);
        }
    },
    methods: {
        syncFromValue(v) {
            var arr = Array.isArray(v && v.rows) ? v.rows : [];
            this.rows = arr.length ? arr.map(function(r) {
                return {
                    id: r.id || Date.now() + Math.random(),
                    field: r.field || '',
                    operator: r.operator || '',
                    value: r.value || '',
                    conjunction: r.conjunction || 'AND'
                };
            }) : [this.makeEmptyRow()];
        },
        emitModelChange() {
            var payload = {
                rows: this.rows
            };
            this.isEmitting = true;
            this.$emit('input', payload);
            this.$emit('change', payload);
            this.$nextTick(() => {
                this.isEmitting = false;
            });
        },
        addRow() {
            this.rows.push(this.makeEmptyRow());
            this.emitModelChange();
            this.scrollToBottom();
        },
        onDeleteRow(id) {
            var i = this.rows.findIndex(function(r) {
                return r.id === id;
            });
            if (i > -1) {
                this.rows.splice(i, 1);
            }
            if (!this.rows.length) {
                this.rows.push(this.makeEmptyRow());
            }
            this.emitModelChange();
        },
        onUpdateRow(patch) {
            var i = this.rows.findIndex(function(r) {
                return r.id === patch.id;
            });
            if (i === -1) {
                return;
            }

            var prev = this.rows[i];
            var next = Object.assign({}, prev, patch);
            if (
                prev.field === next.field &&
                prev.operator === next.operator &&
                prev.value === next.value &&
                prev.conjunction === next.conjunction
            ) {
                return;
            }
            this.$set(this.rows, i, next);
            this.emitModelChange();
        },
        makeEmptyRow() {
            return {
                id: Date.now() + Math.random(),
                field: '',
                operator: '',
                value: '',
                conjunction: 'AND'
            };
        },
        scrollToBottom() {
            var scroller = this.$refs.filterScroll;
            if (scroller && typeof scroller.scrollTo !== 'undefined') {
                this.$nextTick(() => {
                    scroller.scrollTo({ y: '100%' }, 300);
                });
            }
        }
    }
};
</script>
