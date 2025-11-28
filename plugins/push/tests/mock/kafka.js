const kafkajs = require("kafkajs");
const sinon = require("sinon");

function createMockedKafkajs() {
    const sandbox = sinon.createSandbox();
    const producerInstance = sandbox.stub(/** @type {kafkajs.Producer} */({
        connect() {},
        send(_args) {}
    }));
    const consumerInstance = sandbox.stub(/** @type {kafkajs.Consumer} */({
        connect() {},
        subscribe(_args) {},
        run() {},
    }));
    const kafkaInstance = sandbox.createStubInstance(kafkajs.Kafka, {
        producer: producerInstance,
        consumer: consumerInstance
    });
    const KafkaConstructor = /** @type {sinon.SinonStub<ConstructorParameters<typeof kafkajs.Kafka>, kafkajs.Kafka>} */(
        sandbox.stub().returns(kafkaInstance)
    );
    return {
        sandbox,
        producerInstance,
        consumerInstance,
        kafkaInstance,
        KafkaConstructor,
    };
}

module.exports = {
    createMockedKafkajs,
};