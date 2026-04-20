import { createRequire } from 'module';
import express from 'express';
import type { ApiError } from '../../../../web/src/shared/types/api.js';

const require = createRequire(import.meta.url);
const plugins = require('../../../plugins/pluginManager.js');
const common = require('../../utils/common.js');
const { validateUser } = require('../../utils/rights.js');
const log = require('../../utils/log.js')('v2:security');

interface SecurityConfig {
    password_min: number;
    password_char: boolean;
    password_number: boolean;
    password_symbol: boolean;
    password_expiration: number;
    password_rotation: number;
    password_autocomplete: boolean;
}

const router = express.Router();

// GET /v2/security/password-rules/public (public — no auth required)
router.get('/password-rules/public', async(req, res) => {
    const params = req.countlyParams;

    try {
        const security: SecurityConfig = plugins.getConfig("security");

        common.returnOutput(params, {
            passwordMin: security.password_min,
            passwordChar: security.password_char,
            passwordNumber: security.password_number,
            passwordSymbol: security.password_symbol,
            passwordAutocomplete: security.password_autocomplete,
        });
    }
    catch (err) {
        log.e('GET /v2/security/password-rules/public error: %j', err);
        const body: ApiError = { error: { code: 'CONFIG_READ_ERROR', message: 'Failed to retrieve password rules' } };
        res.status(500).json(body);
    }
});

// GET /v2/security/password-rules (private — auth required)
router.get('/password-rules', async(req, res) => {
    const params = req.countlyParams;

    try {
        await validateUser(params);

        const security: SecurityConfig = plugins.getConfig("security");

        common.returnOutput(params, {
            passwordMin: security.password_min,
            passwordChar: security.password_char,
            passwordNumber: security.password_number,
            passwordSymbol: security.password_symbol,
            passwordExpiration: security.password_expiration,
            passwordRotation: security.password_rotation,
            passwordAutocomplete: security.password_autocomplete,
        });
    }
    catch (err) {
        log.e('GET /v2/security/password-rules error: %j', err);
        const body: ApiError = { error: { code: 'CONFIG_READ_ERROR', message: 'Failed to retrieve password rules' } };
        res.status(500).json(body);
    }
});

export default router;
