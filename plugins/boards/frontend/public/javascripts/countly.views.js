/* global countlyCommon, countlyGlobal */
(function(countlyVue3) {
    /* ------------------------------------------------------------------
    *  OPTIONS API USAGE
    * ----------------------------------------------------------------*/

    var BoardsNextComponent = {
        template: `<div>
                        <h5>Hello <span v-html="message"></span> </h5>
                        <br>
                        <el-space direction="vertical" size="large">
                            <el-button type="primary">Button 1</el-button>
                            <el-button type="success">Button 2</el-button>
                            <el-button type="warning">Button 3</el-button>
                        </el-space>
                        <br>
                    </div>`,
        data: function() {
            return {
                message: 'This is the <em> boards </em> plugin of ' + this.appName + ' application that sredirected by the vue-router',
                appName: null,
            };
        },
        props: ['id'],
        beforeCreate: function() {
            this.appName = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name;
        },
        mounted: function() {
            // console.log('BoardsNextComponent mounted', this.id);
        }
    };

    /* ------------------------------------------------------------------
    *   COMPOSITION API USAGE
    * ----------------------------------------------------------------*/
    // var BoardsNextComponent = {
    //     template: `<div>
    //                     <h5>Hello <span v-html="message"></span> </h5>
    //                     <br>
    //                     <el-space direction="vertical" size="large">
    //                         <el-button type="primary">Button 1</el-button>
    //                         <el-button type="success">Button 2</el-button>
    //                         <el-button type="warning">Button 3</el-button>
    //                     </el-space>
    //                     <br>
    //                 </div>`,
    //     props: ['id'],
    //     setup(props) {
    //         const { onMounted, onBeforeMount, ref } = window.Vue;

    //         const message = ref('');
    //         const appName = ref(null);

    //         onBeforeMount(() => {
    //             appName.value = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name;
    //             message.value = `This is the <em> boards </em> plugin of ${appName.value} application that redirected by the vue-router`;
    //         });

    //         onMounted(() => {
    //             // console.log('BoardsNextComponent mounted', props.id);
    //         });

    //         return {
    //             message,
    //             appName
    //         };
    //     }
    // };

    countlyVue3.addRoute({
        name: 'boardsWithId',
        path: '/:id/experimental/boards',
        component: BoardsNextComponent,
        props: true
    });

    countlyVue3.addMenu(
        {
            "app_type": "web",
            "category": "understand",
            "name": "Boards",
            "priority": 11,
            "title": "Boards",
            "url": "#/:id/experimental/boards",
            "permission": "core",
            "next": true,
            "node": {
                "code": "overview",
                "permission": "core",
                "url": "#/:id/experimental/boards",
                "text": "Boards",
                "priority": 3
            }
        }
    );


})(window.countlyVue3 = window.countlyVue3 || {});