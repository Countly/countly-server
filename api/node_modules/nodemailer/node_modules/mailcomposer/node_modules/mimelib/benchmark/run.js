var mimelib = require("../index"),
    longTextSource = require("fs").readFileSync(__dirname + "/20000.txt"), 
    textLength = longTextSource.length,
    longText = longTextSource.toString("utf-8").replace(/\r?\n|\r/g, "\r\n"),
    encoded, decoded;


console.log("Benchmarking Quoted Printable encoding/decoding speed");
console.log("=====================================================");
console.log("");
console.log("Encoding...");
var encodeStart = Date.now();
encoded = mimelib.encodeQuotedPrintable(longText);
var encodeEnd = Date.now();
var encodeTime = (encodeEnd - encodeStart)/1000;

console.log("Decoding...");
var decodeStart = Date.now();
decoded = mimelib.decodeQuotedPrintable(encoded);
var decodeEnd = Date.now();
var decodeTime = (decodeEnd - decodeStart)/1000;
console.log("Ready.");
console.log("");
console.log("Results:");
console.log("--------");
console.log("Source file size:  " + textLength + " bytes");
console.log("Encoded file size: " + encoded.length+ " bytes");
console.log("Decoded == Source: " + (decoded == longText?"Yes":"No"));
console.log("Encoding speed:    " + encodeTime + " sec. ("+((textLength/encodeTime)/1024)+" kbytes/sec.)");
console.log("Decoding speed:    " + decodeTime + " sec. ("+((encoded.length/decodeTime)/1024)+" kbytes/sec.)");

console.log("");
console.log("");

console.log("Benchmarking Quoted Printable non utf-8 speed");
console.log("=============================================");
console.log("");
console.log("Encoding...");
var encodeStart = Date.now();
encoded = mimelib.encodeQuotedPrintable(longText, false, "latin-13");
var encodeEnd = Date.now();
var encodeTime = (encodeEnd - encodeStart)/1000;

console.log("Decoding...");
var decodeStart = Date.now();
decoded = mimelib.decodeQuotedPrintable(encoded, false, "latin-13");
var decodeEnd = Date.now();
var decodeTime = (decodeEnd - decodeStart)/1000;
console.log("Ready.");
console.log("");
console.log("Results:");
console.log("--------");
console.log("Source file size:  " + textLength + " bytes");
console.log("Encoded file size: " + encoded.length+ " bytes");
console.log("Decoded == Source: " + (decoded == longText?"Yes":"No")+" (\"No\" is OK)");
console.log("Encoding speed:    " + encodeTime + " sec. ("+((textLength/encodeTime)/1024)+" kbytes/sec.)");
console.log("Decoding speed:    " + decodeTime + " sec. ("+((encoded.length/decodeTime)/1024)+" kbytes/sec.)");

console.log("");
console.log("");

console.log("Benchmarking Base64 encoding/decoding speed");
console.log("=====================================================");
console.log("");
console.log("Encoding...");
var encodeStart = Date.now();
encoded = mimelib.encodeBase64(longText);
var encodeEnd = Date.now();
var encodeTime = (encodeEnd - encodeStart)/1000;

console.log("Decoding...");
var decodeStart = Date.now();
decoded = mimelib.decodeBase64(encoded);
var decodeEnd = Date.now();
var decodeTime = (decodeEnd - decodeStart)/1000;
console.log("Ready.");
console.log("");

console.log("Results:");
console.log("--------");
console.log("Source file size:  " + textLength + " bytes");
console.log("Encoded file size: " + encoded.length+ " bytes");
console.log("Decoded == Source: " + (decoded == longText?"Yes":"No"));
console.log("Encoding speed:    " + encodeTime + " sec. ("+((textLength/encodeTime)/1024)+" kbytes/sec.)");
console.log("Decoding speed:    " + decodeTime + " sec. ("+((encoded.length/decodeTime)/1024)+" kbytes/sec.)");