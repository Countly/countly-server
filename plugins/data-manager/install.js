console.log("Installing data manager plugin");
try {
    require('./install-extension.js')();
}
catch (e) {
    // suppress
}
console.log("Finished Installing data manager plugin");