const kafka = require("kafkajs");
const sinon = require("sinon");

function mockKafkaJs() {
    const ProducerInstance = sinon.stub(/** @type {kafka.Producer} */({
        connect(){},
        send(args){}
    }));
    const ConsumerInstance = sinon.stub(/** @type {kafka.Consumer} */({
        connect(){},
        subscribe(args){},
        run(){},
    }));
    const KafkaInstance = sinon.createStubInstance(kafka.Kafka, {
        producer: ProducerInstance,
        consumer: ConsumerInstance
    });
    const KafkaConstructor = sinon.stub(kafka, "Kafka")
        .callsFake((args) => KafkaInstance);
    return {
        reset() {
            ProducerInstance.connect.resetHistory();
            ProducerInstance.send.resetHistory();
            ConsumerInstance.connect.resetHistory();
            ConsumerInstance.subscribe.resetHistory();
            ConsumerInstance.run.resetHistory();
            KafkaInstance.producer.resetHistory();
            KafkaInstance.consumer.resetHistory();
            KafkaConstructor.resetHistory();
        },
        restore() {
            return KafkaConstructor.restore()
        },
        ProducerInstance,
        ConsumerInstance,
        KafkaInstance,
        KafkaConstructor,
    }
}

module.exports = {
    mockKafkaJs
}