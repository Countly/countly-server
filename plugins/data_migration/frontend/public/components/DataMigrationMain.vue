<template>
<div class="data_migration__main">
    <cly-header
        :title="i18n('data-migration.page-title')"
        :tooltip="{description: 'Plugin allows migrating full data for application. Full rights are available only for global admin.'}"
    >
        <template v-slot:header-right>
            <cly-more-options v-if="canUserCreate" @command="handleCommand">
                <template v-slot:trigger>
                    <el-button type="success">
                        <i class="el-icon-circle-plus"></i>
                        {{ i18n('data-migration.import-export-button-title') }}
                    </el-button>
                </template>
                <el-dropdown-item command="export">{{ i18n('data-migration.export-data') }}</el-dropdown-item>
                <el-dropdown-item command="import">{{ i18n('data-migration.import-data') }}</el-dropdown-item>
            </cly-more-options>
        </template>
        <template v-slot:header-tabs>
            <cly-dynamic-tabs
                v-model="dynamicTab"
                skin="secondary"
                :tab="dynamicTab"
                :tabs="tabs">
                <template v-slot:tables="scope">
                    <span>{{ scope.tab.title }}</span>
                </template>
            </cly-dynamic-tabs>
        </template>
    </cly-header>
    <import-drawer :settings="drawerSettings.import" :controls="drawers.import"></import-drawer>
    <export-drawer :settings="drawerSettings.export" :controls="drawers.export"></export-drawer>
</div>
</template>

<script>
import { i18n, i18nMixin, mixins, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ImportDrawer from './ImportDrawer.vue';
import ExportDrawer from './ExportDrawer.vue';
import ImportsTab from './ImportsTab.vue';
import ExportsTab from './ExportsTab.vue';

var FEATURE_NAME = 'data_migration';

export default {
    components: {
        'import-drawer': ImportDrawer,
        'export-drawer': ExportDrawer
    },
    mixins: [
        i18nMixin,
        mixins.hasDrawers("import"),
        mixins.hasDrawers("export"),
        authMixin(FEATURE_NAME)
    ],
    data: function() {
        return {
            dynamicTab: "imports",
            tabs: [
                {
                    title: i18n('data-migration.imports'),
                    name: "imports",
                    component: ImportsTab
                },
                {
                    title: i18n('data-migration.exports'),
                    name: "exports",
                    component: ExportsTab
                }
            ],
            drawerSettings: {
                import: {
                    title: i18n('data-migration.import-data')
                },
                export: {
                    title: i18n('data-migration.export-data')
                }
            }
        };
    },
    methods: {
        create: function(type) {
            if (typeof type === "undefined") {
                type = "import";
            }
            var initialDrawerObject = {
                import: {
                    import_file: "",
                    from_server: 1
                },
                export: {
                    target_path: "",
                    server_address: "",
                    server_token: "",
                    apps: [],
                    only_export: 0,
                    aditional_files: 0,
                    redirect_traffic: 0
                }
            };

            this.openDrawer(type, initialDrawerObject[type]);
        },
        handleCommand: function(command) {
            this.create(command);
        }
    }
};
</script>
