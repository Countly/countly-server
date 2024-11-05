const plugins = require("../../plugins/pluginManager");
const request = require("countly-request")(plugins.getConfig("security"));
const host = '128.199.239.207' ; //'localhost:3001';
const appKey = 'b895ef5cca254395a1cc1f03b41bbc0ca7b6b52a';//'d4a4e3e1a4d241c2ea9d0c350bb86584c87a91cb';
let times = 2000;
const rating = [1, 2, 3, 4, 5];
const platform = ['Android', 'iOS'];
const version = ['0.2', '1.4', '2.0.4', '3.4', '5.2.1'];

function getRandomArbitrary(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}
while (times--) {
    const r = rating[getRandomArbitrary(0, 4)];
    const p = platform[getRandomArbitrary(0, 1)];
    const v = version[getRandomArbitrary(0, 4)];
    const time = getRandomArbitrary(new Date("2016-09-07").getTime(), new Date().getTime());
    const url = `http://${host}/i?events=[{"timestamp":${time} ,"key":"[CLY]_star_rating","count":1,"sum":1,"segmentation":{"rating":${r},"app_version":"${v}","platform":"${p}"}}]&app_key=${appKey}&device_id=321`;
    console.log(url);
    request.get(url);
}