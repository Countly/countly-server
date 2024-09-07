const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'testState.json');

function saveState(state) {
    const fullState = {
        API_KEY_ADMIN: state.API_KEY_ADMIN || '',
        API_KEY_USER: state.API_KEY_USER || '',
        TEMP_KEY: state.TEMP_KEY || '',
        APP_ID: state.APP_ID || '',
        USER_ID: state.USER_ID || '',
        ADMIN_ID: state.ADMIN_ID || ''
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(fullState));
}

function loadState() {
    if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        return {
            API_KEY_ADMIN: state.API_KEY_ADMIN || '',
            API_KEY_USER: state.API_KEY_USER || '',
            TEMP_KEY: state.TEMP_KEY || '',
            APP_ID: state.APP_ID || '',
            USER_ID: state.USER_ID || '',
            ADMIN_ID: state.ADMIN_ID || ''
        };
    }
    return null;
}

function clearState() {
    if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
    }
}

module.exports = {
    saveState,
    loadState,
    clearState
};
