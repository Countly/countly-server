<template>
    <div class="cly-list-drawer">
        <div class="cly-list-drawer__text-clickable bu-pt-4 bu-pb-3 bu-has-text-weight-medium" @click="toggleList">
            {{ dropdownText }}
            <i class="cly-io-16 cly-io cly-io-chevron-down" :class="{ 'rotate-icon': isOpen }"></i>
        </div>
        <div v-if="isOpen" class="cly-list-drawer__list">
            <vue-scroll :ops="options">
                <div>
                    <ul>
                        <li v-for="(ev, index) in list" :key="index">{{ev}}</li>
                    </ul>
                </div>
            </vue-scroll>
        </div>
    </div>
</template>

<script>
import vuescroll from 'vuescroll';

export default {
    components: {
        'vue-scroll': vuescroll
    },
    props: {
        list: {
            type: Array,
            required: true
        },
        dropdownText: {
            type: String,
            default: 'Listed item(s) will be affected by this action',
            required: false
        }
    },
    data: function() {
        return {
            isOpen: false,
            options: {
                vuescroll: {
                    sizeStrategy: 'number'
                },
                scrollPanel: {
                    initialScrollX: false
                },
                rail: {
                    gutterOfSide: "4px",
                    gutterOfEnds: "16px",
                    keepShow: false
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    keepShow: false
                }
            }
        };
    },
    methods: {
        toggleList: function() {
            this.isOpen = !this.isOpen;
        }
    }
};
</script>
