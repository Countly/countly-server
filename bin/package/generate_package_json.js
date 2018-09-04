var fs = require("fs");

var packageFile = fs.readFileSync("./package.json", "utf8");

var packageJson = JSON.parse(packageFile);

var apiConf = {
  "bin": "api.js",
  "pkg": {
    "scripts": [
      "../plugins/plugins.json",
      "**/config.js",
      "../plugins/**/api/api.js",
      "../plugins/**/config.js",
      "../plugins/**/api/jobs/**",
      "**/countly_marked_version.json",
      "countly_marked_version.json",
      "**/build/Release/apns",
      "**/apns",
      "jobs/**"
    ]
  }
};


var appConf = {
  "bin": "app.js",
  "pkg": {
    "scripts": [
      "../../plugins/plugins.json",
      "**/config.js",
      "**/time.node",
      "../../plugins/**/api/api.js",
      "../../plugins/**/frontend/app.js",
      "../../plugins/**/*.json",
      "../../plugins/**/config.js",
      "../../plugins/**/api/jobs/**",
      "**/countly_marked_version.json",
      "**/build/Release/apns",
      "**/apns"
    ]
  }
};

fs.writeFileSync("./dist/api/package.json", JSON.stringify(Object.assign({}, packageJson, apiConf), null, 2));

fs.writeFileSync("./dist/frontend/express/package.json", JSON.stringify(Object.assign({}, packageJson, appConf), null, 2));
