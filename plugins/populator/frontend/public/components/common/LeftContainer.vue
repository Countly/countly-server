<template>
<div>
    <div v-for="(item, index) in steps">
        <div class="bu-is-flex bu-mb-4">
            <div class="bu-mr-3 populator-template__active-bar" :style="[item.isActive ? {'background-color': activeColorCode} : {}]"></div>
            <div>
                <div class="text-medium bu-has-text-weight-medium bu-mb-1" @click="scrollToSection(index)" :style="[item.isActive ? {'color': activeColorCode} : {'cursor': 'pointer'}]">{{item.header}}</div>
                <div class="text-smallish color-cool-gray-50">{{i18n("populator-template.settings-of-your", item.header.toLowerCase())}}</div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        data: {
            type: Array,
            default: function() {
                return [];
            }
        },
        activeColorCode: {
            type: String,
            default: '#0166D6'
        }
    },
    data: function() {
        return {
            steps: [],
            sectionThresholds: {
                "section-0": 0,
                "section-1": 0,
                "section-2": 0,
                "section-3": 0,
                "section-4": 0
            },
        };
    },
    methods: {
        scrollToSection(index) {
            const sectionId = "section-" + index + '-title';
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.steps[index].isActive = true;
                this.steps.map((item, i) => {
                    if (i !== index) {
                        item.isActive = false;
                    }
                });
            }
        },
        handleScroll: function() {
            const headerHeight = 79;
            const windowHeight = window.innerHeight - headerHeight;
            const pageCenter = windowHeight / 2;

            for (let index = 0; index < Object.keys(this.sectionThresholds).length; index++) {
                const elementId = Object.keys(this.sectionThresholds)[index];
                const element = document.getElementById(elementId);

                if (!element) {
                    return;
                }

                const elementDimension = element.getBoundingClientRect();
                const elementTop = elementDimension.top;
                const elementHeight = elementDimension.height;

                if (elementTop <= pageCenter && elementTop + elementHeight >= pageCenter) {

                    this.steps[index].isActive = true;
                    this.steps.forEach((item, i) => {
                        if (i !== index) {
                            item.isActive = false;
                        }
                    });

                    return;
                }
            }
        }
    },
    mounted: function() {
        window.addEventListener('mousewheel', this.handleScroll);
    },
    created: function() {
        this.steps = this.data;
    },
    destroyed: function() {
        window.removeEventListener('mousewheel', this.handleScroll);
    }
};
</script>
