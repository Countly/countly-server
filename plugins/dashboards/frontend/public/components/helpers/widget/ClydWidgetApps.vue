<template>
<div class="clyd-apps">
    <hr>
    <div class="bu-is-flex bu-is-flex-wrap-wrap apps" data-test-id="widget-apps">
        <span class="bu-ml-1 text-small has-ellipsis bu-is-flex-shrink-1" v-if="isMultiple" v-tooltip="tooltip">
            {{ i18n("dashboards.multiple-apps-count", apps.length) }}
        </span>
        <div v-else class="bu-is-flex apps__single">
            <div v-if="app.avatar" class="apps__single--avatar bu-mr-1" :style="app.avatar">
                <span v-if="!app.image" class="has-ellipsis" data-test-id="widget-app-icon">{{getAppInitials(app.name)}}</span>
            </div>
            <span class="text-small has-ellipsis bu-is-flex-shrink-1" data-test-id="widget-app-name">{{app.name}}</span>
        </div>
    </div>
</div>
</template>

<script>
import { mixins } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../../../frontend/express/public/javascripts/countly/countly.common.js';

export default {
    mixins: [mixins.customDashboards.apps],
    props: {
        apps: {
            type: Array,
            default: function() {
                return [];
            }
        }
    },
    computed: {
        isMultiple: function() {
            return this.apps.length > 1;
        },
        app: function() {
            var appId = this.apps[0];
            if (!appId) {
                return null;
            }
            var image = this.getAppImage(appId);
            return {
                id: appId,
                name: countlyCommon.unescapeHtml(this.__getAppName(appId)),
                image: image,
                avatar: this.getAppAvatar(appId, image)
            };
        },
        tooltip: function() {
            var self = this;
            var content = this.apps.map(function(appId) {
                return self.__getAppName(appId);
            });
            return {
                content: content.join(", "),
                placement: "auto"
            };
        }
    },
    methods: {
        getAppInitials: function(name) {
            name = (name || "").trim().split(" ");
            if (name.length === 1) {
                return name[0][0] || "";
            }
            return (name[0][0] || "") + (name[name.length - 1][0] || "");
        },
        getAppImage: function(appId) {
            if (this.__allApps[appId] && this.__allApps[appId].has_image) {
                return this.__allApps[appId].image;
            }
            return null;
        },
        getAppAvatar: function(appId, image) {
            if (image) {
                return {'background-image': 'url("' + image + '")'};
            }
            else if (this.__allApps[appId]) {
                var position = (this.__allApps[appId].created_at % 12) * -100;
                return {
                    'background-image': 'url("images/avatar-sprite.png?v2")',
                    'background-position': position + 'px center',
                    'background-size': 'auto',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                };
            }
            else {
                return null;
            }
        },
    }
};
</script>
