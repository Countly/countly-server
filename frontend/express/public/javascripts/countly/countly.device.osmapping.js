/**
 * Object with os's as keys and pretty/marketing os names as values
 * @name countlyOsMapping
 * @global
 * @namespace countlyOsMapping
 */

var countlyOsMapping = {
    "webos": {short: "webos", name: "Webos"},
    "brew": {short: "brew", name: "Brew"},
    "unknown": {short: "unk", name: "Unknown"},
    "undefined": {short: "unk", name: "Unknown"},
    "tvos": {short: "atv", name: "Apple TV"},
    "apple tv": {short: "atv", name: "Apple TV"},
    "watchos": {short: "wos", name: "Apple Watch"},
    "unity editor": {short: "uty", name: "Unknown"},
    "qnx": {short: "qnx", name: "QNX"},
    "os/2": {short: "os2", name: "OS/2"},
    "amazon fire tv": {short: "aft", name: "Amazon Fire TV"},
    "amazon": {short: "amz", name: "Amazon"},
    "web": {short: "web", name: "Web"},
    "windows": {short: "mw", name: "Windows"},
    "microsoft windows": {short: "wmw", name: "Windows"},
    "open bsd": {short: "ob", name: "Open BSD"},
    "searchbot": {short: "sb", name: "SearchBot"},
    "sun os": {short: "so", name: "Sun OS"},
    "solaris": {short: "so", name: "Sun OS"},
    "beos": {short: "bo", name: "BeOS"},
    "mac osx": {short: "o", name: "Mac"},
    "macos": {short: "o", name: "Mac"},
    "mac": {short: "o", name: "Mac"},
    "osx": {short: "o", name: "Mac"},
    "linux": {short: "l", name: "Linux"},
    "unix": {short: "u", name: "UNIX"},
    "ios": {short: "i", name: "iOS"},
    "android": {short: "a", name: "Android"},
    "blackberry": {short: "b", name: "BlackBerry"},
    "windows phone": {short: "w", name: "Windows Phone"},
    "wp": {short: "w", name: "Windows Phone"},
    "roku": {short: "r", name: "Roku"},
    "symbian": {short: "s", name: "Symbian"},
    "chrome": {short: "c", name: "Chrome OS"},
    "debian": {short: "d", name: "Debian"},
    "nokia": {short: "n", name: "Nokia"},
    "firefox": {short: "f", name: "Firefox OS"},
    "tizen": {short: "t", name: "Tizen"},
    "arch": {short: "l", name: "Linux"}
};

/*global module*/
if (typeof module !== 'undefined' && module.exports) {
    module.exports = countlyOsMapping;
}