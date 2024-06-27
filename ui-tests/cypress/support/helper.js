import moment from 'moment';
const addDataApi = require('../api/addData');
const { faker } = require('@faker-js/faker');
const getApiKey = require('../api/getApiKey');
const getApps = require('../api/getApps');

function capitalize(text) {
    text = text.toLowerCase();
    return text[0].toUpperCase() + text.slice(1);
}

function toSlug(text) {
    return text.toLowerCase().replaceAll('\'', '').replaceAll('/', '').replaceAll(' ', '-');
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const rgbColor = 'rgb(' + r + ', ' + g + ', ' + b + ')';

    return rgbColor;
}

function calculatePercentageRatings(...ratings) {
    const counts = [0, 0, 0, 0, 0];
    const totalRatingCount = ratings.length;

    ratings.forEach(rating => {
        if (rating >= 1 && rating <= 5) {
            counts[rating - 1]++;
        }
    });

    const percentages = counts.map(count => (count * 100) / totalRatingCount);

    return {
        totalRatingCount,
        counts,
        percentages
    };
}

function getCurrentDate() {
    return moment().format('ddd, D MMM YYYY');
}

function getCurrentMonth() {
    return moment().format('MMM');
}

const addData = ({
    username,
    password,
    appName,
    appVersion = faker.number.float({ min: 1, max: 10, fractionDigits: 2 }) + "." + faker.number.int(10),
    os = "Android",
    events = '[{"key":"[CLY]_view","count":1,"segmentation":{"visit":1,"name":"' + faker.lorem.words({ min: 1, max: 5 }) + '"}}]'
}) => {

    let apiKey;
    let appKey;

    getApiKey.request(username, password)
        .then((response) => {
            apiKey = response;
            return getApps.request(apiKey);
        })
        .then((response) => {
            for (const key in response.admin_of) {
                if (response.admin_of[key].name === appName) {
                    appKey = response.admin_of[key].key;
                }
            }
            return addDataApi.request({ appKey, appVersion, os: os, events });
        });
};

export default {
    capitalize,
    toSlug,
    hexToRgb,
    calculatePercentageRatings,
    getCurrentDate,
    getCurrentMonth,
    addData
};
