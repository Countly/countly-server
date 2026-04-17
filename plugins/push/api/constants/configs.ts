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
