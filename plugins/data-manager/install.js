console.log("Installing data manager plugin");
try {
    require('./install-extension.js')();
}
catch {
    // suppress
}
console.log("Finished Installing data manager plugin");