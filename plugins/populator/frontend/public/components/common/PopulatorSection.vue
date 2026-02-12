<template>
<div class="bu-is-flex bu-is-flex-direction-column">
    <div class="bu-mb-2">
        <el-switch v-if="hasSwitch" v-model="isSectionActive" class="bu-mr-2"></el-switch>
        <span class="text-big bu-has-text-weight-medium" :id="'section-' + sectionIndex + '-title'">{{title}}</span>
    </div>
    <div class="text-smallish color-cool-gray-50 bu-mb-4">{{description}}</div>
    <component :is-open="isSectionActive" v-model="value" :parent-data="parentData" @input="(payload) => { $emit('input', payload) }" :is="type" @deleted-index="setDeletedIndex" :deleted-index="deletedIndex" :section-activity="sectionActivity" >
        <template slot="default">
            <slot name="default"></slot>
        </template>
    </component>
</div>
</template>

<script>
import { i18n } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import UserSection from './UserSection.vue';
import EventsSection from './EventsSection.vue';
import ViewsSection from './ViewsSection.vue';
import SequencesSection from './SequencesSection.vue';
import BehaviorSection from './BehaviorSection.vue';

export default {
    props: {
        type: {
            type: String,
            default: '',
            required: true
        },
        hasSwitch: {
            type: Boolean,
            default: false,
            required: false
        },
        sectionActivity: {
            type: [Object, Boolean],
            required: false
        },
        title: {
            type: String,
            default: '',
            required: true
        },
        value: {
            type: [Object, Array],
        },
        parentData: {
            type: [Object, Array],
        },
        deletedIndex: {
            type: String,
        },
    },
    data: function() {
        return {
            isSectionActive: true,
            descriptionEnum: {
                "userSection": "user",
                "eventsSection": "event",
                "viewsSection": "view",
                "sequencesSection": "sequence",
                "behaviorSection": "behavior",
            },
            description: '',
            userProperties: [],
            sectionIndex: -1,
        };
    },
    watch: {
        isSectionActive: {
            handler: function(newValue) {
                if (this.hasSwitch) {
                    this.$emit('section-activity-change', newValue);
                }
            }
        }
    },
    methods: {
        setDeletedIndex: function(index) {
            this.$emit('deleted-index', index);
        }
    },
    created: function() {
        this.description = i18n('populator-template.select-settings', this.descriptionEnum[this.type], '');
        if (this.descriptionEnum[this.type] === 'sequence') {
            this.description = i18n('populator-template.select-settings', this.descriptionEnum[this.type], i18n('populator-template.select-settings-' + this.descriptionEnum[this.type]));
        }
        const keys = Object.keys(this.descriptionEnum);
        this.sectionIndex = keys.indexOf(this.type);
    },
    components: {
        userSection: UserSection,
        eventsSection: EventsSection,
        sequencesSection: SequencesSection,
        viewsSection: ViewsSection,
        behaviorSection: BehaviorSection
    }
};
</script>
