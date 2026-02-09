/**
 * @typedef {import('../../../kafka/api/api.js').kafkajs.Kafka} Kafka
 * @typedef {import('../../../kafka/api/api.js').kafkajs.Admin} Admin
 * @typedef {import('../../../kafka/api/api.js').kafkajs.Producer} Producer
 * @typedef {import('../../../kafka/api/api.js').kafkajs.Consumer} Consumer
 */
const sinon = require("sinon");

function isKafkaPluginAvailable() {
    try {
        require.resolve('../../../kafka/api/lib/KafkaConsumer');
        require.resolve('../../../kafka/api/lib/kafkaClient');
        return true;
    }
    catch (e) {
        return false;
    }
}

function loadKafkajs() {
    return require('../../../kafka/node_modules/kafkajs');
}

function createMockedKafkajs() {
    const kafkajs = loadKafkajs();
    const sandbox = sinon.createSandbox();
    const producerInstance = sandbox.stub(/** @type {Producer} */({
        connect() {},
        send(_args) {}
    }));
    const consumerInstance = sandbox.stub(/** @type {Consumer} */({
        connect() {},
        subscribe(_args) {},
        run() {},
    }));
    const adminInstance = sandbox.stub(/** @type {Admin} */({
        connect() {},
        disconnect() {},
        createTopics(_args) {},
        deleteTopics(_args) {},
        listTopics() {},
    }));
    const kafkaInstance = sandbox.createStubInstance(kafkajs.Kafka, {
        producer: producerInstance,
        consumer: consumerInstance,
        admin: adminInstance,
    });
    const KafkaConstructor = /** @type {sinon.SinonStub<ConstructorParameters<typeof kafkajs.Kafka>, Kafka>} */(
        sandbox.stub().returns(kafkaInstance)
    );
    return {
        sandbox,
        adminInstance,
        producerInstance,
        consumerInstance,
        kafkaInstance,
        KafkaConstructor,
    };
}

module.exports = {
    createMockedKafkajs,
    isKafkaPluginAvailable,
    loadKafkajs
};