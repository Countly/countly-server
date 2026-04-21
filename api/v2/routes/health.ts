import { createRequire } from 'module';
import express from 'express';
import type { Request } from 'express';
import {
    collectObservability,
    getAggregatorStatus,
    getKafkaStatus,
    getKafkaEvents,
    getKafkaEventsMeta,
} from '../../services/systemHealth.ts';

const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const { validateUser } = require('../../utils/rights.js');
const log = require('../../utils/log.js')('v2:health');

const router = express.Router();

// GET /v2/health/observability
router.get('/observability', async(req: Request, _res) => {
    const params = (req as any).countlyParams;
    try {
        await validateUser(params);
        const data = await collectObservability(params);
        common.returnOutput(params, data);
    }
    catch (err) {
        log.e('GET /v2/health/observability error: %j', err);
        common.returnMessage(params, 500, 'Error collecting observability data');
    }
});

// GET /v2/health/aggregator
router.get('/aggregator', async(req: Request, _res) => {
    const params = (req as any).countlyParams;
    try {
        await validateUser(params);
        const data = await getAggregatorStatus();
        common.returnOutput(params, data);
    }
    catch (err) {
        log.e('GET /v2/health/aggregator error: %j', err);
        common.returnMessage(params, 500, 'Error fetching aggregator status');
    }
});

// GET /v2/health/kafka
router.get('/kafka', async(req: Request, _res) => {
    const params = (req as any).countlyParams;
    try {
        await validateUser(params);
        const data = await getKafkaStatus();
        common.returnOutput(params, data);
    }
    catch (err) {
        log.e('GET /v2/health/kafka error: %j', err);
        common.returnMessage(params, 500, 'Error fetching Kafka stats');
    }
});

// GET /v2/health/kafka/events/meta  (must be before /kafka/events to avoid route clash)
router.get('/kafka/events/meta', async(req: Request, _res) => {
    const params = (req as any).countlyParams;
    try {
        await validateUser(params);
        const data = await getKafkaEventsMeta();
        common.returnOutput(params, data);
    }
    catch (err) {
        log.e('GET /v2/health/kafka/events/meta error: %j', err);
        common.returnMessage(params, 500, 'Error fetching Kafka events meta');
    }
});

// GET /v2/health/kafka/events
router.get('/kafka/events', async(req: Request, _res) => {
    const params = (req as any).countlyParams;
    try {
        await validateUser(params);
        const data = await getKafkaEvents(params.qstring);
        common.returnOutput(params, data);
    }
    catch (err) {
        log.e('GET /v2/health/kafka/events error: %j', err);
        common.returnMessage(params, 500, 'Error fetching Kafka consumer events');
    }
});

export default router;
