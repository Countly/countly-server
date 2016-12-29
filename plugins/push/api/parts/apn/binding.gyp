{
	"targets": [ {
		"target_name": "apns",
		"sources": [ "apns.cc", "h2.cc", "log.cc" ],
		"libraries": [
			"-lnghttp2"
		],	
		"include_dirs": [
			"<!(node -e \"require('nan')\")"
		],
		"cflags_cc!": [ "-fno-exceptions" ]
	}]
}
