var fs = require('fs'),
    LineInputStream = require('line-input-stream');

var ifile = process.argv[2];
var ofile = process.argv[3];

if(!ifile || !ofile) {
	console.warn("Usage: %s <input file> <output file>", require('path').basename(process.argv[1]));
	process.exit();
}

function process_line(line) {
	var fields = line.split(/, */);
	if(fields.length < 6) {
		console.log("weird line: %s::", line);
		return;
	}
	var sip, eip, cc, b, bsz, i;
	cc  = fields[4].replace(/"/g, '');

	if(fields[0].match(/:/)) {
		// IPv6
		bsz = 34;
		sip = aton6(fields[0]);
		eip = aton6(fields[1]);

		b = new Buffer(bsz);
		for(i=0; i<sip.length; i++)
			b.writeUInt32BE(sip[i], i*4);
		for(i=0; i<eip.length; i++)
			b.writeUInt32BE(eip[i], 16+i*4);
	}
	else {
		// IPv4
		bsz = 10;

		sip = parseInt(fields[2].replace(/"/g, ''), 10);
		eip = parseInt(fields[3].replace(/"/g, ''), 10);

		b = new Buffer(bsz);
		b.fill(0);
		b.writeUInt32BE(sip, 0);
		b.writeUInt32BE(eip, 4);
	}

	b.write(cc, bsz-2);

	fs.writeSync(ofd, b, 0, bsz, null);
}

function aton6(ip) {
	var l, i;
	ip = ip.replace(/"/g, '').split(/:/);
	l = ip.length-1;
	if(ip[l] === "")
		ip[l] = 0;
	if(l < 7) {
		ip.length=8;
		for(i=l; i>=0 && ip[i] !== ""; i--) {
			ip[7-l+i] = ip[i];
		}
	}
	for(i=0; i<8; i++) {
		if(!ip[i])
			ip[i]=0;
		else
			ip[i] = parseInt(ip[i], 16);
	}

	var r = [];
	for(i=0; i<4; i++) {
		r.push(((ip[2*i]<<16)+ip[2*i+1])>>>0);
	}

	return r;
}

var ofd = fs.openSync(ofile, "w");
var istream = LineInputStream(fs.createReadStream(ifile), /[\r\n]+/);
istream.setEncoding('utf8');
istream.on('line', process_line);




