export const FEATURE_NAME = "push";

export const KAFKA_SESSION_TIMEOUT = 30000;
export const SEND_TIMEOUT = 10000;
export const PROXY_CONNECTION_TIMEOUT = SEND_TIMEOUT;

export const DBMAP_MESSAGING_ENABLED = 'm';

export const MEDIA_MAX_SIZE = 1024 * 1024;

export const MEDIA_MIME_TYPE_ANDROID = [
    'image/gif',
    'image/png',
    'image/jpg',
    'image/jpeg',
];

export const MEDIA_MIME_TYPE_IOS = [
    ...MEDIA_MIME_TYPE_ANDROID,

    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',

    'video/mp4',
    'video/mpeg',
    'video/quicktime'
];

export const MEDIA_MIME_TYPE_ALL = MEDIA_MIME_TYPE_IOS;

export const KAFKA_CONSUMER_GROUP_ID = "countly-push-consumers";

export const KAFKA_TOPICS = {
    SEND: {
        name: "CLY_PUSH_MESSAGE_SEND",
        partitions: 10,
        config: {},
    },
    SCHEDULE: {
        name: "CLY_PUSH_MESSAGE_SCHEDULE",
        partitions: 2,
        config: {
            "cleanup.policy": "compact",
        },
    },
    COMPOSE: {
        name: "CLY_PUSH_MESSAGE_COMPOSE",
        partitions: 3,
        config: {},
    },
    RESULT: {
        name: "CLY_PUSH_MESSAGE_RESULT",
        partitions: 4,
        config: {},
    },
    AUTO_TRIGGER: {
        name: "CLY_PUSH_MESSAGE_AUTO_TRIGGER",
        partitions: 6,
        config: {},
    },
} as const;
