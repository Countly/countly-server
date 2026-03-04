export const PROXY_CONNECTION_TIMEOUT = 5000;
/**
 *
 */
export const DBMAP_MESSAGING_ENABLED = 'm';
/**
 *
 */
export const MEDIA_MAX_SIZE = 1024 * 1024;
/**
 *
 */
export const MEDIA_MIME_TYPE_ANDROID = [
    'image/gif',
    'image/png',
    'image/jpg',
    'image/jpeg',
];
/**
 *
 */
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
/**
 *
 */
export const MEDIA_MIME_TYPE_ALL = MEDIA_MIME_TYPE_IOS;
