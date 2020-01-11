{
	"targets": [ {
		"target_name": "apns",
		"sources": [ "apns.cc", "h2.cc", "log.cc" ],
		"libraries": [
			# "-llibnghttp2", "-L/usr/local/lib/"
			# "/usr/local/lib/libnghttp2.so.14.7.0",
			#"-Wl,-z,notext",
			"../../../../../../bin/scripts/nghttp2/lib/.libs/libnghttp2.a"
		],	
		"include_dirs": [
			"<!(node -e \"require('nan')\")", "../../../../../bin/scripts/nghttp2/lib/includes"
		],
		"cflags_cc!": [ "-fno-exceptions" ]
	}]
}
