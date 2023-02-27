try {
    require('./index.ee.js');
}
catch (e) {
    require('./category.js');
    console.log("running only CE edition tests");
}
