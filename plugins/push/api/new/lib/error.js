class PushError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
/**
 * Being thrown in the `send()` functions inside platform files.
 */
class SendError extends PushError {
    /**
     * @param {string} message
     * @param {string=} response
     */
    constructor(message, response) {
        super(message);
        this.response = response;
    }
}
/**
 * Generic error when we cannot make any sense for the response
 * of the provider.
 */
class InvalidResponse extends SendError {}
/**
 * This error indicates that the device token needs to be cleaned
 * up from database.
 */
class InvalidDeviceToken extends SendError {}

/**
 * @type {{[name: string]: { status: number; message: string; mapsTo?: typeof InvalidDeviceToken; }}}
 */
const APNSErrors = {
    BadCollapseId:               { status: 400, message: "The collapse identifier exceeds the maximum allowed size." },
    BadDeviceToken:              { status: 400, mapsTo: InvalidDeviceToken, message: "The specified device token is invalid. Verify that the request contains a valid token and that the token matches the environment." },
    BadExpirationDate:           { status: 400, message: "The apns-expiration value is invalid." },
    BadMessageId:                { status: 400, message: "The apns-id value is invalid." },
    BadPriority:                 { status: 400, message: "The apns-priority value is invalid." },
    BadTopic:                    { status: 400, message: "The apns-topic value is invalid." },
    DeviceTokenNotForTopic:      { status: 400, mapsTo: InvalidDeviceToken, message: "The device token doesn’t match the specified topic." },
    DuplicateHeaders:            { status: 400, message: "One or more headers are repeated." },
    IdleTimeout:                 { status: 400, message: "Idle timeout." },
    InvalidPushType:             { status: 400, message: "The apns-push-type value is invalid." },
    MissingDeviceToken:          { status: 400, message: "The device token isn’t specified in the request :path. Verify that the :path header contains the device token." },
    MissingTopic:                { status: 400, message: "The apns-topic header of the request isn’t specified and is required. The apns-topic header is mandatory when the client is connected using a certificate that supports multiple topics." },
    PayloadEmpty:                { status: 400, message: "The message payload is empty." },
    TopicDisallowed:             { status: 400, message: "Pushing to this topic is not allowed." },
    BadCertificate:              { status: 403, message: "The certificate is invalid." },
    BadCertificateEnvironment:   { status: 403, message: "The client certificate is for the wrong environment." },
    ExpiredProviderToken:        { status: 403, message: "The provider token is stale and a new token should be generated." },
    Forbidden:                   { status: 403, message: "The specified action is not allowed." },
    InvalidProviderToken:        { status: 403, message: "The provider token is not valid, or the token signature can’t be verified." },
    MissingProviderToken:        { status: 403, message: "No provider certificate was used to connect to APNs, and the authorization header is missing or no provider token is specified." },
    UnrelatedKeyIdInToken:       { status: 403, message: "The key ID in the provider token isn’t related to the key ID of the token used in the first push of this connection. To use this token, open a new connection." },
    BadPath:                     { status: 404, message: "The request contained an invalid :path value." },
    MethodNotAllowed:            { status: 405, message: "The specified :method value isn’t POST." },
    ExpiredToken:                { status: 410, mapsTo: InvalidDeviceToken, message: "The device token has expired." },
    Unregistered:                { status: 410, mapsTo: InvalidDeviceToken, message: "The device token is inactive for the specified topic. There is no need to send further pushes to the same device token, unless your application retrieves the same device token, refer to https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns" },
    PayloadTooLarge:             { status: 413, message: "The message payload is too large. For information about the allowed payload size, refer to Create a POST request to APNs in https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns" },
    TooManyProviderTokenUpdates: { status: 429, message: "The provider’s authentication token is being updated too often. Update the authentication token no more than once every 20 minutes." },
    TooManyRequests:             { status: 429, message: "Too many requests were made consecutively to the same device token." },
    InternalServerError:         { status: 500, message: "An internal server error occurred." },
    ServiceUnavailable:          { status: 503, message: "The service is unavailable." },
    Shutdown:                    { status: 503, message: "The APNs server is shutting down." },
}
/**
 * @type {{[name: string]: { libraryKey: string; message: string; mapsTo?: typeof InvalidDeviceToken; }}}
 */
const FCMErrors = {
    'messaging/invalid-argument':                  { libraryKey: "INVALID_ARGUMENT", message: 'Invalid argument provided.' },
    'messaging/invalid-recipient':                 { libraryKey: "INVALID_RECIPIENT", message: 'Invalid message recipient provided.' },
    'messaging/invalid-payload':                   { libraryKey: "INVALID_PAYLOAD", message: 'Invalid message payload provided.' },
    'messaging/invalid-data-payload-key':          { libraryKey: "INVALID_DATA_PAYLOAD_KEY", message: 'The data message payload contains an invalid key. See the reference documentation for the DataMessagePayload type for restricted keys.' },
    'messaging/payload-size-limit-exceeded':       { libraryKey: "PAYLOAD_SIZE_LIMIT_EXCEEDED", message: 'The provided message payload exceeds the FCM size limits. See the error documentation for more details.' },
    'messaging/invalid-options':                   { libraryKey: "INVALID_OPTIONS", message: 'Invalid message options provided.' },
    'messaging/invalid-registration-token':        { libraryKey: "INVALID_REGISTRATION_TOKEN", mapsTo: InvalidDeviceToken, message: 'Invalid registration token provided. Make sure it matches the registration token the client app receives from registering with FCM.' },
    'messaging/registration-token-not-registered': { libraryKey: "REGISTRATION_TOKEN_NOT_REGISTERED", mapsTo: InvalidDeviceToken, message: 'The provided registration token is not registered. A previously valid registration token can be unregistered for a variety of reasons. See the error documentation for more details. Remove this registration token and stop using it to send messages.' },
    'messaging/mismatched-credential':             { libraryKey: "MISMATCHED_CREDENTIAL", message: 'the credential used to authenticate this sdk does not have permission to send messages to the device corresponding to the provided registration token. make sure the credential and registration token both belong to the same firebase project.' },
    'messaging/invalid-package-name':              { libraryKey: "INVALID_PACKAGE_NAME", message: 'The message was addressed to a registration token whose package name does not match the provided "restrictedPackageName" option.' },
    'messaging/device-message-rate-exceeded':      { libraryKey: "DEVICE_MESSAGE_RATE_EXCEEDED", message: 'The rate of messages to a particular device is too high. Reduce the number of messages sent to this device and do not immediately retry sending to this device.' },
    'messaging/topics-message-rate-exceeded':      { libraryKey: "TOPICS_MESSAGE_RATE_EXCEEDED", message: 'The rate of messages to subscribers to a particular topic is too high. Reduce the number of messages sent for this topic, and do not immediately retry sending to this topic.' },
    'messaging/message-rate-exceeded':             { libraryKey: "MESSAGE_RATE_EXCEEDED", message: 'Sending limit exceeded for the message target.' },
    'messaging/third-party-auth-error':            { libraryKey: "THIRD_PARTY_AUTH_ERROR", message: 'A message targeted to an iOS device could not be sent because the required APNs SSL certificate was not uploaded or has expired. Check the validity of your development and production certificates.' },
    'messaging/too-many-topics':                   { libraryKey: "TOO_MANY_TOPICS", message: 'The maximum number of topics the provided registration token can be subscribed to has been exceeded.' },
    'messaging/authentication-error':              { libraryKey: "AUTHENTICATION_ERROR", message: 'An error occurred when trying to authenticate to the FCM servers. Make sure the credential used to authenticate this SDK has the proper permissions. See https://firebase.google.com/docs/admin/setup for setup instructions.' },
    'messaging/server-unavailable':                { libraryKey: "SERVER_UNAVAILABLE", message: 'The FCM server could not process the request in time. See the error documentation for more details.' },
    'messaging/internal-error':                    { libraryKey: "INTERNAL_ERROR", message: 'An internal error has occurred. Please retry the request.' },
    'messaging/unknown-error':                     { libraryKey: "UNKNOWN_ERROR", message: 'An unknown server error was returned.' },
}

module.exports = {
    SendError,
    InvalidResponse,
    InvalidDeviceToken,

    APNSErrors,
    FCMErrors,
}