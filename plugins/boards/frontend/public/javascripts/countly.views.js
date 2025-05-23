(function(countlyVue3) {
    var BoardsNextComponent = {
        template: `<div>Hello {{ message }} 
                        <el-button color="#626aef"> Default </el-button>
                        <el-button color="#626aef" plain> Plain </el-button>
                        <el-button color="#626aef" disabled> Disabled </el-button>
                        <el-button color="#626aef" disabled plain> Disabled Plain </el-button>
                    </div>`,
        data: function() {
            return {
                message: 'These are Element Plus buttons:'
            };
        }
    };

    countlyVue3.addRoute({
        name: 'boardsWithId',
        path: '/:id/boards',
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
            "url": "#/boards",
            "permission": "core",
            "next": true,
            "node": {
                "code": "overview",
                "permission": "core",
                "url": "#/boards",
                "text": "Boards",
                "priority": 3
            }
        }
    );

})(window.countlyVue3 = window.countlyVue3 || {});