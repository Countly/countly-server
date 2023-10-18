const fs = require('fs');
const path = require('path');

const { generateWidgetFixture } = require('./widgets');

const BASE_DIR = path.join(__dirname, '../generated');

const setupFolders = () => {
  if (fs.existsSync(BASE_DIR)) {
    fs.rmSync(BASE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(BASE_DIR, 'widgets'), { recursive: true });
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(path.join(BASE_DIR, filePath), JSON.stringify(data, null, 2));

  console.log(`Successfully created ${path.parse(filePath).name} fixture.`);
};

(() => {
  setupFolders();

  writeJson('/widgets/widget.json', generateWidgetFixture());

})();