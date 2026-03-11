import sinon from 'sinon';

type Kafka = any;
type Admin = any;
type Producer = any;
type Consumer = any;

export function isKafkaPluginAvailable(): boolean {
    try {
        require.resolve('../../../kafka/api/lib/KafkaConsumer');
        require.resolve('../../../kafka/api/lib/kafkaClient');
        return true;
    }
    catch (e) {
        return false;
    }
}

export function loadKafkajs() {
    return require('../../../kafka/node_modules/kafkajs');
}

export function createMockedKafkajs() {
    const kafkajs = loadKafkajs();
    const sandbox = sinon.createSandbox();
    const producerInstance = sandbox.stub({
        connect() {},
        send(_args: any) {}
    } as Producer);
    const consumerInstance = sandbox.stub({
        connect() {},
        subscribe(_args: any) {},
        run() {},
    } as Consumer);
    const adminInstance = sandbox.stub({
        connect() {},
        disconnect() {},
        createTopics(_args: any) {},
        deleteTopics(_args: any) {},
        listTopics() {},
    } as Admin);
    const kafkaInstance = sandbox.createStubInstance(kafkajs.Kafka, {
        producer: producerInstance,
        consumer: consumerInstance,
        admin: adminInstance,
    });
    const KafkaConstructor = sandbox.stub().returns(kafkaInstance) as sinon.SinonStub<ConstructorParameters<typeof kafkajs.Kafka>, Kafka>;
    return {
        sandbox,
        adminInstance,
        producerInstance,
        consumerInstance,
        kafkaInstance,
        KafkaConstructor,
    };
}
