const spt = require('supertest');
const should = require('should');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
let API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
let APP_KEY = testUtils.get('APP_KEY');
let APP_ID = testUtils.get("APP_ID");
API_KEY_ADMIN = 'bb23e92ea1469ba8340a8e8da15c12de';
APP_KEY = 'test runner';
APP_ID = '6698fa7147d1ccc687dc75b7';
const AB_METHOD = 'ab';
let countlyDb;

describe('Ab Enroll Test', () => {
    const expIds = [];
    const experimentData1 = {
        name: "exp name",
        description: "exp desc",
        show_target_users: true,
        target_users: {
            byVal: [],
            byValText: "",
            percentage: "70",
            condition: {
                "up.av": {
                    "$in": ["1:0"]
                }
            },
            condition_definition: "App Version = 1:0"
        },
        goals: [{
            user_segmentation: JSON.stringify({
                query: {
                    "up.cc": {
                        "$in": ["us"]
                    }
                },
                queryText: "Country = us"
            }),
            steps: "[]"
        }],
        variants: [
            {
                name: "Control group",
                parameters: [{
                    name: "param_key_default",
                    description: "",
                    value: "1"
                }]
            },
            {
                name: "Variant A",
                parameters: [{
                    name: "param_key_default",
                    description: "",
                    value: "2"
                }]
            },
            {
                name: "Variant B",
                parameters: [{
                    name: "param_key_default",
                    description: "",
                    value: "3"
                }]
            }
        ],
        type: "remote-config"
    };
    before(async () => {
        // Create test experiment
        const resp1 = await request
            .post('/i/ab-testing/add-experiment')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY
            })
            .send({
                experiment: JSON.stringify(experimentData1)
            }).expect(200);
        
        expIds.push(resp1.body);
    });
    after(async() => {
        for (let idx = 0; idx < expIds?.length; idx += 1) {
            await request
                .post('/i/ab-testing/remove-experiment')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    app_key: APP_KEY,
                    experiment_id: expIds[idx],
                })
                .expect('Content-Type', /json/).expect(200);
        }
    });

    it('Should reject if there is no device_id', async () => {
        countlyDb = testUtils.client.db();
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: AB_METHOD,
            })
            .expect(400);
    });

    it('Should reject if there are no keys', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: AB_METHOD,
                device_id: 'device_0',
            })
            .expect(400);
    });

    // it('Should not enroll the user for the given keys', async() => {
    //     const resp = await request
    //         .get('/o/sdk')
    //         .query({
    //             api_key: API_KEY_ADMIN,
    //             app_id: APP_ID,
    //             app_key: APP_KEY,
    //             method: AB_METHOD,
    //             device_id: 'device_0',
    //             keys: JSON.stringify(['param_key_default'])
    //         })
    //         .expect(200);
        
    //     //TODO:return code 400?? if user not enrolled?
    //     const user = await countlyDb.collection('app_users' + APP_ID).findOne({ did: 'device_0' });
    //     console.log(user);
    //     //TODO: check app_user
    // });

    it('Should enroll the user for the given keys', async() => {

        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: AB_METHOD,
                device_id: 'device_0',
                keys: JSON.stringify(['header_color', 'background', 'showBanner']),
                oi: 1
            })
            .expect(200);
        const user = await countlyDb.collection('app_users' + APP_ID).findOne({ did: 'device_0' });
        console.log(user);
        //TODO: check app_user
    });


    
});

