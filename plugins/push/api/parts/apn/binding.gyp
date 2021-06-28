{
	'variables': {
		'node_shared_openssl%': 'true'
	},
	"targets": [ {
		"target_name": "apns",
		"sources": [ "apns.cc", "h2.cc", "log.cc" ],
		"libraries": [
			# "-llibnghttp2", "-L/usr/local/lib/"
			# "/usr/local/lib/libnghttp2.so.14.7.0",
			# "-lssl", 
			# "-lcrypto",
			"/usr/local/lib/libnghttp2.a"
		],	
		"include_dirs": [
			"<!(node -e \"require('nan')\")"
		],
		'cflags!': [ '-fno-exceptions' ],
		'cflags_cc!': [ '-fno-exceptions' ],
		'conditions': [
			['OS=="mac"', {
				'xcode_settings': {
					'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
				}
			}]
      	]

	}]
}