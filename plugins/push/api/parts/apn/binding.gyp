{
	"targets": [ {
		"target_name": "apns",
		"sources": [ "apns.cc", "h2.cc", "log.cc" ],
		"libraries": [
			# "-llibnghttp2", "-L/usr/local/lib/"
			# "/usr/local/lib/libnghttp2.so.14.7.0",
			"-Wl,-z,notext",
			"/usr/local/lib/libnghttp2.a"
		],	
		"include_dirs": [
			"<!(node -e \"require('nan')\")", "/usr/local/include"
		],
		"cflags_cc!": [ "-fno-exceptions" ]
	}]
}
