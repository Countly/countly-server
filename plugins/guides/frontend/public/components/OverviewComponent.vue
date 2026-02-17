<template>
<div class="bu-column" :class="customClass" v-if="items.length > 0">
    <div class="overview">
        <div class="bu-level">
            <div class="bu-level-left">
                <div class="bu-level-item bu-is-flex bu-is-flex-direction-column bu-is-align-items-start">
                    <div class="title">{{ titleContent }}</div>
                    <div class="description">{{ descriptionContent }}</div>
                </div>
            </div>
            <div class="bu-level-right" v-if="link">
                <div class="bu-level-item">
                    <a class="link" :href="link">
                        <span class="bu-mr-1">{{ i18n('guides.see-all') }}</span>
                        <i class="ion-android-arrow-forward"></i>
                    </a>
                </div>
            </div>
        </div>
        <div>
            <div class="bu-columns">
                <walkthrough-component
                    v-if="type === 'walkthrough'"
                    v-for="(item, index) in items"
                    :value="items[index]"
                    :style="wrapperStyle"
                    :key="items[index].id"
                    :index="index"
                >
                </walkthrough-component>
                <article-component
                    v-if="type === 'article'"
                    v-for="(item, index) in items"
                    :value="items[index]"
                    :index="index"
                    :style="wrapperStyle"
                    :key="items[index].id"
                >
                </article-component>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyCMS from '../../../../../frontend/express/public/javascripts/countly/countly.cms.js';
import WalkthroughComponent from './WalkthroughComponent.vue';
import ArticleComponent from './ArticleComponent.vue';

export default {
    mixins: [i18nMixin],
    components: {
        'walkthrough-component': WalkthroughComponent,
        'article-component': ArticleComponent
    },
    props: {
        title: { type: String, required: false },
        description: { type: String, required: false },
        link: { type: String, required: false },
        items: { type: Array, required: false },
        type: { type: String, required: true, default: 'walkthroughs' },
        max: { type: Number, required: false, default: 2 }
    },
    data: function() {
        return {
            guideConfig: {}
        };
    },
    computed: {
        titleContent: function() {
            return this.title || (this.type === 'walkthroughs' ? this.guideConfig.walkthroughTitle : this.guideConfig.articleTitle);
        },
        descriptionContent: function() {
            return this.description || (this.type === 'walkthroughs' ? this.guideConfig.walkthroughDescription : this.guideConfig.articleDescription);
        },
        customClass: function() {
            return this.max <= 2 ? 'bu-is-half' : 'bu-is-full';
        },
        wrapperStyle: function() {
            return this.max > 0 ? 'max-width:' + (100 / this.max) + '%;' : 'max-width:50%;';
        }
    },
    created: function() {
        var self = this;
        countlyCMS.fetchEntry("server-guide-config").then(function(config) {
            self.guideConfig = (config && config.data && config.data[0] && config.data[0]) || {};
        });
    },
};
</script>
