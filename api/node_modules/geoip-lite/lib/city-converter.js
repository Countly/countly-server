var fs = require('fs'),
    LineInputStream = require('line-input-stream');

var bfile = process.argv[2];
var ofile = process.argv[3];
var lfile = bfile.replace(/-Blocks.csv/, '-Location.csv');

if(!bfile || !ofile) {
	console.warn("Usage: %s <blocks file> <output file>", require('path').basename(process.argv[1]));
	process.exit();
}

var lastline = {'location': "", 'block': ""};
var process_data = {};

var locations = [];

process_data['block'] = function(line, i, a) {
	if(line.match(/^Copyright/) || !line.match(/\d/)) {
		return;
	}
	var fields = line.replace(/"/g, '').split(/, */);
	var sip, eip, locId, b, bsz, vsz=4, i=0;

	// IPv4
	bsz = 8;

	sip = parseInt(fields[0], 10);
	eip = parseInt(fields[1], 10);
	locId = parseInt(fields[2], 10);

	b = new Buffer(bsz+vsz);
	b.fill(0);
	b.writeUInt32BE(sip>>>0, 0);
	b.writeUInt32BE(eip>>>0, 4);
	b.writeUInt32BE(locId>>>0, 8);

	fs.writeSync(ofd, b, 0, b.length, null);
};

process_data['location'] = function(line, i, a) {
	if(line.match(/^Copyright/) || !line.match(/\d/)) {
		return;
	}
	var fields = line.replace(/"/g, '').split(/, */);
	var cc, rg, city, lat, lon, b, sz=32;
	cc = fields[1];
	rg = fields[2];
	city = fields[3];
	lat = Math.round(parseFloat(fields[5])*10000);
	lon = Math.round(parseFloat(fields[6])*10000);

	b = new Buffer(sz);
	b.fill(0);
	b.write(cc, 0);
	b.write(rg, 2);
	b.writeInt32BE(lat, 4);
	b.writeInt32BE(lon, 8);
	b.write(city, 12);

	fs.writeSync(lfd, b, 0, b.length, null);
};

var ofd = fs.openSync(ofile, "w");
var lfd = fs.openSync(ofile.replace(/\.dat/, '-names.dat'), "w");
var lstream = LineInputStream(fs.createReadStream(lfile), /[\r\n]+/);
lstream.setEncoding('utf8');
var bstream = LineInputStream(fs.createReadStream(bfile), /[\r\n]+/);
bstream.setEncoding('utf8');
lstream.on('line', process_data['location']);
bstream.on('line', process_data['block']);


