import { createRequire } from 'module';
import assert from 'assert';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { createSilentLogModule } from '../../mock/logger.ts';
import * as mockData from '../../mock/data.ts';

// Silence push logs (event-emitter.ts calls common.log via createRequire which
// esmock cannot intercept — monkey-patch before importing).
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

const { emitPushSentEvents, __setEventSinkForTesting } = await import('../../../api/lib/event-emitter.ts');

interface BulkInsertOne {
    insertOne: { document: any };
}

describe('emitPushSentEvents', () => {
    const sinkWrite = sinon.stub().resolves({ overall: { success: true, written: 1 } });
    const mockSink = { write: sinkWrite };

    beforeEach(() => {
        __setEventSinkForTesting(mockSink);
        sinkWrite.resetHistory();
    });

    afterEach(() => {
        __setEventSinkForTesting(null);
    });

    function makeResult(overrides: Partial<any> = {}): any {
        return {
            ...mockData.resultEvent(),
            uid: 'u1',
            userProfile: {
                _uid: 'app-user-id',
                did: 'device-1',
                up: { p: 'Android', la: 'en', d: 'Pixel 8' },
                custom: { plan: 'pro' },
                cmp: { utm: 'spring' },
            },
            ...overrides,
        };
    }

    it('returns early for an empty array without touching the sink', async() => {
        await emitPushSentEvents([]);
        assert.strictEqual(sinkWrite.callCount, 0);
    });

    it('produces a drill_events-shaped document per result', async() => {
        const appId = new ObjectId();
        const messageId = new ObjectId();
        const scheduleId = new ObjectId();
        const sentAt = new Date('2026-01-02T03:04:05Z');

        const result = makeResult({
            appId,
            messageId,
            scheduleId,
            uid: 'u1',
            sentAt,
            token: 'tok-abc',
            platform: 'a',
            env: 'p',
            language: 'en',
            appTimezone: '180',
        });
        await emitPushSentEvents([result]);

        const doc = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document;
        assert.strictEqual(doc._id, `${appId}_u1_${sentAt.getTime()}_${messageId}`);
        assert.strictEqual(doc.a, appId.toString());
        assert.strictEqual(doc.e, '[CLY]_push_sent');
        assert.strictEqual(doc.n, '[CLY]_push_sent');
        assert.strictEqual(doc.uid, 'u1');
        assert.strictEqual(doc._uid, 'app-user-id');
        assert.strictEqual(doc.did, 'device-1');
        assert.strictEqual(doc.ts, sentAt.getTime());
        assert(doc.cd instanceof Date);
        assert.strictEqual(doc.c, 1);
        assert.strictEqual(doc.s, 0);
        assert.strictEqual(doc.dur, 0);
    });

    it('puts all requested push fields into segmentation (with JSON-stringified objects)', async() => {
        const appId = new ObjectId();
        const messageId = new ObjectId();
        const scheduleId = new ObjectId();
        const credentials = mockData.androidCredential({ hash: 'creds-hash-xyz' });
        const payload = { data: { 'c.i': 'abc' } };
        const platformConfiguration = { rejectUnauthorized: false };
        const trigger = { kind: 'plain' as const, start: new Date('2026-01-01') };
        const sendBefore = new Date('2026-02-01T00:00:00Z');

        const result = makeResult({
            appId,
            messageId,
            scheduleId,
            uid: 'u1',
            token: 'tok-xyz',
            platform: 'a',
            env: 'p',
            language: 'en',
            appTimezone: '180',
            credentials,
            payload,
            platformConfiguration,
            trigger,
            sendBefore,
            response: 'ok',
        });
        delete result.error;

        await emitPushSentEvents([result]);

        const sg = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document.sg;
        assert.strictEqual(sg.messageId, messageId.toString());
        assert.strictEqual(sg.scheduleId, scheduleId.toString());
        assert.strictEqual(sg.token, 'tok-xyz');
        assert.strictEqual(sg.platform, 'a');
        assert.strictEqual(sg.env, 'p');
        assert.strictEqual(sg.language, 'en');
        assert.strictEqual(sg.credentialHash, 'creds-hash-xyz');
        assert.strictEqual(sg.appTimezone, '180');
        assert.strictEqual(sg.sendBefore, sendBefore.toISOString());
        assert.strictEqual(sg.triggerKind, 'plain');
        assert.strictEqual(sg.success, true);
        assert.strictEqual(sg.payload, JSON.stringify(payload));
        assert.strictEqual(sg.platformConfiguration, JSON.stringify(platformConfiguration));
        assert.strictEqual(sg.trigger, JSON.stringify(trigger));
        assert.strictEqual(sg.response, 'ok');
    });

    it('records error details and success=false when a send failed', async() => {
        const result = makeResult({
            error: { name: 'SendError', message: 'quota exceeded', stack: 'SendError: quota exceeded\n    at send (sender.ts:42)' },
        });
        delete result.response;

        await emitPushSentEvents([result]);

        const sg = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document.sg;
        assert.strictEqual(sg.success, false);
        assert.strictEqual(sg.errorName, 'SendError');
        assert.strictEqual(sg.errorMessage, 'quota exceeded');
        assert.strictEqual(sg.errorStack, 'SendError: quota exceeded\n    at send (sender.ts:42)');
    });

    it('populates up/custom/cmp from result.userProfile', async() => {
        await emitPushSentEvents([makeResult({
            platform: 'i',
            userProfile: {
                _uid: 'uid-x',
                did: 'd-1',
                up: { p: 'iOS', la: 'fr', d: 'iPhone' },
                custom: { plan: 'enterprise' },
                cmp: { source: 'email' },
            },
        })]);

        const doc = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document;
        assert.strictEqual(doc._uid, 'uid-x');
        assert.strictEqual(doc.did, 'd-1');
        assert.strictEqual(doc.up.p, 'iOS');
        assert.strictEqual(doc.up.la, 'fr');
        assert.strictEqual(doc.up.d, 'iPhone');
        assert.deepStrictEqual(doc.custom, { plan: 'enterprise' });
        assert.deepStrictEqual(doc.cmp, { source: 'email' });
    });

    it('falls back to result.platform for up.p when userProfile has no p', async() => {
        await emitPushSentEvents([makeResult({
            platform: 'h',
            userProfile: { up: { la: 'de' } },
        })]);

        const doc = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document;
        assert.strictEqual(doc.up.p, 'h');
        assert.strictEqual(doc.up.la, 'de');
    });

    it('handles missing userProfile gracefully', async() => {
        const result = makeResult({ platform: 'a' });
        delete result.userProfile;
        await emitPushSentEvents([result]);

        const doc = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document;
        assert.strictEqual(doc.up.p, 'a');
        assert.strictEqual(doc._uid, undefined);
        assert.strictEqual(doc.did, undefined);
        assert.deepStrictEqual(doc.custom, {});
        assert.deepStrictEqual(doc.cmp, {});
    });

    it('swallows errors — never re-throws to the kafka consumer', async() => {
        sinkWrite.rejects(new Error('sink broken'));
        await emitPushSentEvents([makeResult()]);
        // no throw means success
    });

    it('logs a sink-level error when overall.success is false', async() => {
        sinkWrite.resolves({ overall: { success: false, error: 'kafka lag' } });
        await emitPushSentEvents([makeResult()]);
        assert.strictEqual(sinkWrite.callCount, 1);
    });

    it('strips undefined sg fields so drill does not see sparse keys', async() => {
        const result = makeResult();
        delete result.error;
        delete result.response;
        delete result.sendBefore;

        await emitPushSentEvents([result]);

        const sg = (sinkWrite.firstCall.firstArg as BulkInsertOne[])[0].insertOne.document.sg;
        assert.strictEqual('errorName' in sg, false);
        assert.strictEqual('errorMessage' in sg, false);
        assert.strictEqual('errorStack' in sg, false);
        assert.strictEqual('response' in sg, false);
        assert.strictEqual('sendBefore' in sg, false);
    });
});
