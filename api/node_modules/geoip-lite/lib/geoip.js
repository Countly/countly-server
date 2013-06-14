var fs   = require('fs'),
    path = require('path'),
    net = require('net');

var lookup4, lookup6, geodatadir;

if (typeof global.geodatadir === 'undefined'){
	geodatadir = path.join(__dirname, '/../data/');
} else {
	geodatadir = global.geodatadir;
}

(function() {
var ifile, ifd, sz, recsz, buff, lrecsz, lbuff;

try {
	ifile = path.join(geodatadir, 'geoip-city-names.dat');
	ifd = fs.openSync(ifile, "r");
	sz = fs.fstatSync(ifd).size;
	lrecsz = 32;

	lbuff = new Buffer(sz);
	fs.readSync(ifd, lbuff, 0, sz, 0);
	fs.closeSync(ifd);

	ifile = path.join(geodatadir, 'geoip-city.dat');
	ifd = fs.openSync(ifile, "r");
	sz = fs.fstatSync(ifd).size;
	recsz = 12;
}
catch(err) {
	if(err.code != 'ENOENT' && err.code != 'EBADF') {
		throw err;
	}
	ifile = path.join(geodatadir, 'geoip-country.dat');
	ifd = fs.openSync(ifile, "r");
	sz = fs.fstatSync(ifd).size;
	recsz = 10;
}

buff = new Buffer(sz);
fs.readSync(ifd, buff, 0, sz, 0);
fs.closeSync(ifd);

var lastline = sz/recsz-1;
var lastip = buff.readUInt32BE(lastline*recsz+4);
var firstip = buff.readUInt32BE(0);

var private_ranges = [
		[aton4("10.0.0.0"), aton4("10.255.255.255")],
		[aton4("172.16.0.0"), aton4("172.31.255.255")],
		[aton4("192.168.0.0"), aton4("192.168.255.255")]
	];

lookup4 = function(ip) {
	var fline=0, floor=lastip, cline=lastline, ceil=firstip, line, locId, cc, rg, city, lat, lon, i;

	// outside IPv4 range
	if(ip > lastip || ip < firstip) {
		return null;
	}
	
	// private IP
	for(i=0; i<private_ranges.length; i++) {
		if(ip >= private_ranges[i][0] && ip <= private_ranges[i][1]) {
			return null;
		}
	}

	do {
		line = Math.round((cline-fline)/2)+fline;
		floor = buff.readUInt32BE(line*recsz);
		ceil  = buff.readUInt32BE(line*recsz+4);

		if(floor <= ip && ceil >= ip) {
			if(recsz == 10) {
				cc = buff.toString('utf8', line*recsz+8, line*recsz+10);
				rg = city = "";
				lat = lon = 0;
			}
			else {
				locId = buff.readUInt32BE(line*recsz+8)-1;
				cc = lbuff.toString('utf8', locId*lrecsz+0, locId*lrecsz+2).replace(/\u0000.*/, '');
				rg = lbuff.toString('utf8', locId*lrecsz+2, locId*lrecsz+4).replace(/\u0000.*/, '');
				lat = lbuff.readInt32BE(locId*lrecsz+4)/10000;
				lon = lbuff.readInt32BE(locId*lrecsz+8)/10000;
				city = lbuff.toString('utf8', locId*lrecsz+12, locId*lrecsz+lrecsz).replace(/\u0000.*/, '');
			}

			return {
				range: [floor, ceil],
				country: cc,
				region: rg,
				city: city,
				ll: [ lat, lon ]
			};
		}
		else if(fline == cline) {
			return null;
		}
		else if(fline == cline-1) {
			if(line == fline)
				fline = cline;
			else
				cline = fline;
		}
		else if(floor > ip) {
			cline = line;
		}
		else if(ceil < ip) {
			fline = line;
		}
	} while(1);
}

})();

function aton4(a) {
	a = a.split(/\./);
	return ((parseInt(a[0], 10)<<24)>>>0) + ((parseInt(a[1], 10)<<16)>>>0) + ((parseInt(a[2], 10)<<8)>>>0) + (parseInt(a[3], 10)>>>0);
}

function ntoa4(n) {
	n = "" + (n>>>24&0xff) + "." + (n>>>16&0xff) + "." + (n>>>8&0xff) + "." + (n&0xff);
	return n;
}

(function() {
	var ifile = path.join(geodatadir, 'geoip-country6.dat');
	var ifd = fs.openSync(ifile, "r");
	var sz = fs.fstatSync(ifd).size;
	var recsz = 34;
	
	var buff = new Buffer(sz);
	fs.readSync(ifd, buff, 0, sz, 0);
	fs.closeSync(ifd);
	
	var lastline = sz/recsz-1;
	// XXX We only use the first 8 bytes of an IPv6 address
	// This identifies the network, but not the host within
	// the network.  Unless at some point of time we have a
	// global peace treaty and single subnets span multiple
	// countries, this should not be a problem.
	function readip(line, offset) {
		var ii=0, ip=[];
		for(ii=0; ii<2; ii++)
			ip.push(buff.readUInt32BE(line*recsz+offset*16+ii*4));
		return ip;
	}
	
	var lastip=readip(lastline, 1), firstip=readip(0, 0);
	
	lookup6 = function(ip) {
		var fline=0, floor=lastip, cline=lastline, ceil=firstip, line;

		if(cmp6(ip, lastip) > 0 || cmp6(ip, firstip) < 0) {
			return null;
		}
	
		do {
			line = Math.round((cline-fline)/2)+fline;
			floor = readip(line, 0);
			ceil  = readip(line, 1);
	
			if(cmp6(floor, ip) <= 0 && cmp6(ceil, ip) >= 0) {
				var cc = buff.toString('utf8', line*recsz+32, line*recsz+34);
				return { range: [floor, ceil], country: cc, region: "", city: "", ll: [0, 0] };	// We do not currently have region/city info for IPv6
			}
			else if(fline == cline) {
				return null;
			}
			else if(fline == cline-1) {
				if(line == fline)
					fline = cline;
				else
					cline = fline;
			}
			else if(cmp6(floor, ip) > 0) {
				cline = line;
			}
			else if(cmp6(ceil, ip) < 0) {
				fline = line;
			}
		} while(1);
	};
	
})();

//lookup4 = gen_lookup('geoip-country.dat', 4);
//lookup6 = gen_lookup('geoip-country6.dat', 16);

function cmp6(a, b) {
	for(var ii=0; ii<2; ii++) {
		if(a[ii] < b[ii]) return -1;
		if(a[ii] > b[ii]) return 1;
	}
	return 0;
}

function aton6(a) {
	var l, i;
	a = a.replace(/"/g, '').split(/:/);
	l = a.length-1;
	if(a[l] === "")
		a[l] = 0;
	if(l < 7) {
		a.length=8;
		for(i=l; i>=0 && a[i] !== ""; i--) {
			a[7-l+i] = a[i];
		}
	}
	for(i=0; i<8; i++) {
		if(!a[i])
			a[i]=0;
		else
			a[i] = parseInt(a[i], 16);
	}

	var r = [];
	for(i=0; i<4; i++) {
		r.push(((a[2*i]<<16)+a[2*i+1])>>>0);
	}

	return r;
}

function ntoa6(n) {
	var a = "[";
	for(var i=0; i<n.length; i++) {
		a+=(n[i]>>>16).toString(16) + ":";
		a+=(n[i]&0xffff).toString(16) + ":";
	}
	a=a.replace(/:$/, ']').replace(/:0+/g, ':').replace(/::+/, '::');

	return a;
}


exports.lookup = function(ip) {
	if(!ip)
		return null;
	if(typeof ip == 'number')
		return lookup4(ip);
	if(net.isIP(ip) === 4)
		return lookup4(aton4(ip));
	if(net.isIP(ip) === 6)
		return lookup6(aton6(ip));
	return null;
};

exports.pretty = function(n) {
	if(typeof n == 'string')
		return n;
	if(typeof n == 'number')
		return ntoa4(n);
	if(n instanceof Array)
		return ntoa6(n);

	return n;
}

exports.cmp = function(a, b) {
	if(typeof a == 'number' && typeof b == 'number')
		return (a<b?-1:(a>b?1:0));
	if(a instanceof Array && b instanceof Array)
		return cmp6(a, b);
	return null;
}

