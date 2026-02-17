<template>
<div class="walkthrough-wrapper bu-column">
    <div :class="['walkthrough', gradientClass]" :id="'walkthrough__'+value.id" @click="openDialog()">
        <div class="walkthrough__title">
            {{ value.title }}
        </div>
        <div class="walkthrough__button">
            <img :src="'images/icons/arrow_drop_right.svg'" alt="Icon" class="walkthrough__button__icon"/>
            <div class="walkthrough__button__text">{{ i18n('guides.take-the-tour') }}</div>
        </div>
    </div>
    <el-dialog
        :visible.sync="isDialogIframeVisible"
        :show-close="false"
        custom-class="iframe-dialog"
        lock-scroll
        append-to-body
    >
        <div @click="closeDialog" class="close-icon">
            <img :src="'images/icons/close-icon-white.svg'" alt="Icon"/>
        </div>
        <iframe
            :src="value.url"
            :title="value.title"
            class="iframe"
            frameborder="0"
            loading="lazy"
            webkitallowfullscreen
            mozallowfullscreen
            allowfullscreen
        >
        </iframe>
    </el-dialog>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        value: { type: Object, required: true },
        index: { type: Number, required: true }
    },
    data: function() {
        return {
            isDialogIframeVisible: false
        };
    },
    computed: {
        gradientClass: function() {
            var idx = this.index % 4;
            var color = 'blue';
            switch (idx) {
            case 0: color = 'blue'; break;
            case 1: color = 'green'; break;
            case 2: color = 'orange'; break;
            case 3: color = 'purple'; break;
            }
            return 'walkthrough--' + color;
        }
    },
    methods: {
        openDialog: function() {
            this.isDialogIframeVisible = true;
        },
        closeDialog: function() {
            this.isDialogIframeVisible = false;
        }
    }
};
</script>
