<template>
    <div>
        <div class="cly-vue-drawer-step__section">
                <div class="text-big text-heading cly-vue-hook-drawer__no-margin">
                 {{i18n('hooks.ScheduledTrigger')}}<span class="ion ion-help-circled cly-vue-hook-drawer__small-icon cly-vue-tooltip-icon" v-tooltip.top-center=""/>
                </div>
                <div class="cly-vue-drawer-hook_description">
                {{i18n('hooks.scheduled-trigger-intro')}}
                </div>
        </div>

        <div class="cly-vue-drawer-step__section bu-pt-1">
                <div class="text-medium text-heading cly-vue-hook-drawer__no-margin">
                 Frequency <span class="ion ion-help-circled cly-vue-hook-drawer__small-icon cly-vue-tooltip-icon" v-tooltip.top-center=""/>
                </div>
                <div class="cly-vue-drawer-hook_description">
                    Recurring hook trigger will be run on periods your select below. The time will base on your Countly Server time (mostly are UTC time).
                </div>
                <cly-select-x
                   placeholder="Select Period"
                   mode="single-list"
                   v-model="value.period1"
                   :class="{'cly-vue-hook-drawer__is-full-line':true}"
                   :options="period1Options">
                </cly-select-x>

        </div>

        <div class="cly-vue-drawer-step__section bu-mt-2" v-if="value.period1 === 'month'">
                <div class="text-medium text-heading cly-vue-hook-drawer__no-margin">
                 Day of the Month<span class="ion ion-help-circled cly-vue-hook-drawer__small-icon cly-vue-tooltip-icon" v-tooltip.top-center=""/>
                </div>
                <div class="cly-vue-drawer-hook_description">
                 Choose the day of the month you want to be triggered every month
                </div>
                <validation-provider name="trigger-schedule-day" rules="required">
                <cly-select-x
                   placeholder="Select Period"
                   mode="single-list"
                   v-model="value.period2"
                   :class="{'cly-vue-hook-drawer__is-full-line':true}"
                   :options="periodDaysOptions">
                </cly-select-x>
                </validation-provider>
        </div>

        <div class="cly-vue-drawer-step__section bu-mt-2" v-if="value.period1 === 'week'">
                <div class="text-medium text-heading cly-vue-hook-drawer__no-margin">
                 Day of the week<span class="ion ion-help-circled cly-vue-hook-drawer__small-icon cly-vue-tooltip-icon" v-tooltip.top-center=""/>
                </div>
                <div class="cly-vue-drawer-hook_description">
                 Choose the day of the week you want to be triggered every week
                </div>
                <validation-provider name="trigger-schedule-week" rules="required">
                <cly-select-x
                   placeholder="Select Period"
                   mode="single-list"
                   :class="{'cly-vue-hook-drawer__is-full-line':true}"
                   v-model="value.period2"
                   :options="periodWeekOptions">
                </cly-select-x>
                </validation-provider>
        </div>

        <div class="cly-vue-drawer-step__section bu-mt-2" v-if="value.period1 !== null">
                <div class="text-medium text-heading cly-vue-hook-drawer__no-margin">
                 Time<span class="ion ion-help-circled cly-vue-hook-drawer__small-icon cly-vue-tooltip-icon" v-tooltip.top-center=""/>
                </div>
                <div class="cly-vue-drawer-hook_description">
                    Hook will be triggered in chosen time
                </div>
                <validation-provider name="trigger-schedule-time" rules="required">
                <cly-select-x
                   placeholder="Select Time"
                   mode="single-list"
                   :class="{'cly-vue-hook-drawer__is-full-line':true}"
                   v-model="value.period3"
                   :options="periodHoursOptions">
                </cly-select-x>
                </validation-provider>
        </div>

        <div class="cly-vue-drawer-step__section bu-mt-2">
                <div class="text-medium text-heading cly-vue-hook-drawer__no-margin">
                 Timezone <span class="ion ion-help-circled cly-vue-hook-drawer__small-icon cly-vue-tooltip-icon" v-tooltip.top-center=""/>
                </div>
                <div class="cly-vue-drawer-hook_description">
                    Hook will be triggered in chosen timezone
                </div>
                <validation-provider name="trigger-schedule-timezone" rules="required">
                <cly-select-x
                   placeholder="Select Period"
                   mode="single-list"
                   v-model="value.timezone2"
                   :class="{'cly-vue-hook-drawer__is-full-line':true}"
                   :options="timezoneOptions">

                    <template v-slot:option-prefix="option">
                        <div class="hook-app-selector-image" :style="option.image">
                        </div>
                    </template>
                </cly-select-x>
                </validation-provider>

        </div>
        <span class="cly-vue-hook-drawer__is-hidden">{{cron}}</span>

    </div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import ClySelectX from '../../../../../../frontend/express/public/javascripts/components/input/select-x.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClySelectX,
    },
    data: function() {
        var zones = [];
        for (var country in countlyGlobal.timezones) {
            var c = countlyGlobal.timezones[country];
            c && c.z && c.z.forEach(function(item) {
                for (var zone in item) {
                    zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone, image: "background-image:url(" + countlyGlobal.path + "/images/flags/" + country.toLowerCase() + ".png)"});
                }
            });
        }

        return {
            period1Options: [
                {value: 'month', label: 'Every Month'},
                {value: 'week', label: 'Every Week'},
                {value: 'day', label: 'Every Day'},
            ],
            periodDaysOptions: Array.from(Array(31).keys()).map(function(item, idx) {
                return {value: idx + 1, label: idx + 1};
            }),

            periodHoursOptions: Array.from(Array(24).keys()).map(function(item, idx) {
                return {value: idx, label: idx < 10 ? '0' + idx + ':00' : idx + ":00"};
            }),

            periodWeekOptions: Array.from(Array(7).keys()).map(function(item, idx) {
                return {value: idx, label: ['Sunday', 'Monday', 'Tursday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx]};
            }),
            timezoneOptions: zones,
        };
    },
    props: {
        value: {
            type: Object
        }
    },
    computed: {
        cron: function() {
            var cron = null;

            var period1 = this.value.period1;
            var period2 = this.value.period2;
            var period3 = this.value.period3;

            switch (period1) {
            case "month":
                cron = ["23", period3, period2, "*", "*"];
                break;
            case "week":
                cron = ["0", period3, "*", "*", period2];
                break;
            case "day":
                cron = ["0", period3, "*", "*", "*"];
                break;
            default:
                this.value.cron = null;
                return null;
            }

            this.value.cron = cron.join(" ");
            return cron.join(" ");
        }
    }
};
</script>
