const should = require("should");
const testUtils = require("../../../test/testUtils");
let request = require("supertest");
request = request(testUtils.url);

describe("Testing Category", function() {
    describe("Category Creation", () => {
        it("create a single category", async() => {
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const APP_ID = testUtils.get("APP_ID");
            const category = ['single cat & <>'];
            const response = await request
                .post('/i/data-manager/category/create')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&categories=${JSON.stringify(category)}`);
            response.status.should.equal(200);

            const categoriesResponse = await request
                .post('/o/data-manager/category')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`);
            categoriesResponse.status.should.equal(200);
            const categories = categoriesResponse.body.find((item) => item.name === category[0]);
            categories.should.have.property("name");
        });

        it("create multiple categories", async() => {
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const APP_ID = testUtils.get("APP_ID");
            const category = ['cat 1', 'another cat'];
            const response = await request
                .post('/i/data-manager/category/create')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&categories=${JSON.stringify(category)}`);
            response.status.should.equal(200);

            const categoriesResponse = await request
                .post('/o/data-manager/category')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`);
            categoriesResponse.status.should.equal(200);
            const categories = categoriesResponse.body.filter((item) => category.indexOf(item.name) !== -1);
            categories.should.length(category.length);
        });

        it("fail creating blank", async() => {
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const APP_ID = testUtils.get("APP_ID");
            const category = [];
            const response = await request
                .post('/i/data-manager/category/create')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&categories=${JSON.stringify(category)}`);
            response.status.should.equal(500);
        });

    });

    describe("assign category to event", () => {
        it("create a single category", async() => {
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const APP_ID = testUtils.get("APP_ID");
            const event = {
                segments: [],
                isEditMode: false,
                name: 'event name2',
                key: 'event key2',
                category: null,
            };
            const eventResponse = await request
                .post('/i/data-manager/event')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&event=${JSON.stringify(event)}`);
            eventResponse.status.should.equal(200);

            const category = ['single cat'];
            const categoryResponse = await request
                .post('/i/data-manager/category/create')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&categories=${JSON.stringify(category)}`);
            categoryResponse.status.should.equal(200);

            const categoriesResponse = await request
                .post('/o/data-manager/category')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`);
            categoriesResponse.status.should.equal(200);
            const categories = categoriesResponse.body.find((item) => item.name === category[0]);
            categories.should.have.property("name");

            const categoryChangeResponse = await request
                .post('/i/data-manager/event/change-category')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}&category=${JSON.stringify(categories._id)}`);
            categoryChangeResponse.status.should.equal(200);

            const allEventsResponse = await request
                .post('/o/data-manager/events-extended')
                .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`);

            const updatedEvent = allEventsResponse.body.find((item) => item.key === event.key);
            updatedEvent.category.should.equal(categories._id);
        });
    });
});