<template>
<div class="bu-columns bu-is-multiline bu-is-gapless">
    <overview-component
        :title="onboardingEntry.walkthroughTitle"
        :description="onboardingEntry.walkthroughDescription"
        link="#/guides/walkthroughs/onboarding"
        type="walkthrough"
        :items="onboardingEntry.walkthroughs.slice(0, 2)"
    ></overview-component>
    <overview-component
        :title="newEntry.walkthroughTitle"
        :description="newEntry.walkthroughDescription"
        link="#/guides/walkthroughs/new"
        type="walkthrough"
        :items="newEntry.walkthroughs.slice(0, 2)"
    ></overview-component>
    <overview-component
        :title="suggestionsEntry.walkthroughTitle"
        :description="suggestionsEntry.walkthroughDescription"
        link="#/guides/walkthroughs/suggestions"
        type="walkthrough"
        :items="suggestionsEntry.walkthroughs.slice(0, 4)"
        :max="4"
    ></overview-component>
    <overview-component
        :title="promotedEntry.articleTitle"
        :description="promotedEntry.articleDescription"
        link="#/guides/articles/promoted"
        type="article"
        :items="promotedEntry.articles.slice(0, 3)"
        :max="3"
    ></overview-component>
</div>
</template>

<script>
import countlyGuides from '../store/index.js';
import OverviewComponent from './OverviewComponent.vue';

export default {
    components: {
        'overview-component': OverviewComponent
    },
    data: function() {
        return {
            onboardingEntry: { walkthroughs: [] },
            newEntry: { walkthroughs: [] },
            suggestionsEntry: { walkthroughs: [] },
            promotedEntry: { articles: [] },
        };
    },
    created: function() {
        var self = this;
        countlyGuides.fetchEntries({ sectionID: { $in: ["/overview/getting-started", "/overview/whats-new", "/overview/suggestions", "/overview/promoted"] } })
            .then(function() {
                self.onboardingEntry = countlyGuides.getEntry('/overview/getting-started') || { walkthroughs: [] };
                self.newEntry = countlyGuides.getEntry('/overview/whats-new') || { walkthroughs: [] };
                self.suggestionsEntry = countlyGuides.getEntry('/overview/suggestions') || { walkthroughs: [] };
                self.promotedEntry = countlyGuides.getEntry('/overview/promoted') || { articles: [] };
            })
            .catch(function() {
                // silent
            });
    }
};
</script>
