const fs = require('fs');
const path = require('path');

const { generateWidgetFixture } = require('./widgets');
const { generateWidgetsRatesFixture } = require('./widgetsRates');
const { generateAlertFixture } = require('./alerts');

const BASE_DIR = path.join(__dirname, '../generated');

const setupFolders = () => {
    if (fs.existsSync(BASE_DIR)) {
        fs.rmSync(BASE_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(BASE_DIR, 'widgets'), { recursive: true });
    fs.mkdirSync(path.join(BASE_DIR, 'widgetsRates'), { recursive: true });
    fs.mkdirSync(path.join(BASE_DIR, 'alerts'), { recursive: true });
};

const writeJson = (filePath, data) => {
    fs.writeFileSync(path.join(BASE_DIR, filePath), JSON.stringify(data, null, 2));

    console.log(`Successfully created ${path.parse(filePath).name} fixture.`);
};

(() => {
    setupFolders();

    writeJson('/widgets/widget.json', generateWidgetFixture());
    writeJson('/widgetsRates/widgetsRate.json', generateWidgetsRatesFixture());
    writeJson('/alerts/alert.json', generateAlertFixture());
})();

// node ./cypress/fixtures/generators/generateFixtures.js