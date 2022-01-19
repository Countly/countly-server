const { Base, READY, util, ERROR, SendError, PushError, ConnectionError, ValidationError } = require('./std'),
    { FRAME, encode, decode } = require('./proto'),
    { Pool } = require('./pool'),
    { pools } = require('./pools'),
    { extract, guess, PLATFORM, platforms, FIELDS, FIELDS_TITLES, PLATFORMS_TITLES, field, fields, allAppUserFields } = require('./platforms'),
    { Audience } = require('./audience'),
    DATA = require('./data');

/*
 * A bit of disambiguation to wrap one's head around :allthethings:
 * 
 * Message = Message class = db.messages record = a set of fields defining a message
 * Push = db.push_APPID record, that is a row in push queue = non-important(d = date, n = Note id, _id = id in the queue, etc) + Personalization (p) + Overrides (o)
 * 
 * Payload = a string which is sent to a push provider
 * Compile = a function that generates Payload
 *    function(Template, Personalization, Overrides, Extras) -> String
 * Stream = a class extending Note with LRU cache of Template objects
 *    Class(Note)
 * Template = Payload in object form to quickly override its contents 
 *    Class { payloadObject, get payloadJSON() { this.lazily_cached || this.lazily_cached = JSON.stringify(payloadObject) } }
 * Transform = a function which transforms given data object in Note format to a platform-specific Template
 *    function(data) -> Template
 * Personalizable = a pair of a string and a set of rules as an Object, defining instructions on where to put which user / event fields; the only personalizables are message title & message itself (per locale)
 *    String, Object
 * Personalization = a mandatory object in Push (p) which contains all available user props required for all Personalizables & Extras in a (Note + Overrides) (at least la = language + any data required for Personalize/Extras)
 *    Object
 * Personalize = a function which applies Personalizable instructions onto its string with Personalization data
 *    function(Personalizable, Personalization) -> String
 * Extras = an optional array of fields in a Push (p) with any extra data to be included into Payload
 *    Object?
 * Overrides = an optional object in a Push (o) with overrides of Note's fields, for tx notifications; 
 *             allows overriding any sendable field of Note, i.e. badge, sound, buttons, message/title, etc
 *    Object?
 * Override = function 
 *    function(Template, Overrides, Personalization)
 *         forany Personalizable in Overrides
 *             Overrides[Personalizable] = Personalize(Personalizable, Personalization)
 *         ret = clone(Template)
 *         for key in Overrides
 *             ret[key] = 
 * 
 * 
 * Note = plains + title? + message? + pedata?
 */

module.exports = Object.assign({
    FRAME,
    encode,
    decode,
    READY,
    util,
    Base,
    Pool,
    pools,
    ERROR,
    SendError,
    PushError,
    ConnectionError,
    ValidationError,
    Audience,
    extract,
    guess,
    PLATFORM,
    platforms,
    PLATFORMS_TITLES,
    FIELDS,
    FIELDS_TITLES,
    field,
    fields,
    allAppUserFields
}, DATA);
