// const addon = require('./build/Release/apns');
const Connection = require('./index.js').Connection;

var count = 0, pointer = 0, 
	id = '573cc5b9bb8f50c63222f707', 
	date = ('' + Date.now()).substr(8),
	idParts = [id.substr(0, 7), id.substr(7, 4), id.substr(11, 4), id.substr(15, 4), id.substr(19, 5) + date];


try {

	var obj = new Connection('/media/psf/Home/Downloads/55e5a574211321492d42f021.p12', 'sanoma', 'com.sanomamdc.matexample', '', 'api.development.push.apple.com'),
	// var obj = new Connection('/media/psf/Home/Downloads/Certificates-1.p12', 'instalogo', 'com.adammeszaros.logo', '', 'api.development.push.apple.com'),
	// var obj = new Connection('/media/psf/Home/apns2/countly/568a8a19d275585013429e08.prod.p12', '123', '', '', 'api.push.apple.com'),
	// var obj = new Connection('/media/psf/Home/apns2/cert.p12', '', 'com.example.123.Test', '', 'api.development.push.apple.com'),
		id = '123a4567-e89b-12b3-a556-4266554400';

	obj.init().then(function(res){
		console.log('init promise done with %j', res);
		obj.resolve().then(function(res){
			console.log('resolve promise done with %j', res);
			obj.init_connection().then(function(res){
				console.log('connect promise done with %j', res);

				// obj.send(["{\"aps\": {\"alert\": \"First нах!\", \"sound\": \"default\"}}", "{\"test\": true}"], () => {
				obj.send(["{\"test\": true}"], () => {
					console.log('filling queue...', pointer, ' of ', data.length);
					setTimeout(() => {
						if (pointer < data.length) {

							var a = [
								// [idParts.join('-'), data[pointer], data[pointer] === 'a8620aa4c56892ef148a94ba14de1fcea5fdd48ce99f6a41e9a76dbfdcabbcff' ? 0 : 1],
								[idParts.join('-'), data[pointer], 0],
								// [id + (pointer + 1), data[pointer + 1], 1]
							];

							pointer += 2;

							console.log('calling feed with %j', a);
							obj.feed(a);
						} else {
							obj.feed([]);
						}
					}, 1000);
				}, (stats) => {
					console.log('stats clb: ', stats);
				}).then(function(res){
					console.log('!!!!!!!!!!!!!!!!!!!!!!!send promise done with: ', res);


						// var obj = new Connection('/media/psf/Home/apns2/cert.p12', '', 'com.example.123.Test', '', 'api.development.push.apple.com'),
						// 	id = '123a4567-e89b-12a3-a456-4266554400';

						// obj.init().then(function(res){
						// 	console.log('init promise done with %j', res);
						// 	obj.resolve().then(function(res){
						// 		console.log('resolve promise done with %j', res);
						// 		obj.init_connection().then(function(res){
						// 			console.log('connect promise done with %j', res);

						// 			obj.send(["{\"apn\": {\"alert\": \"First нах!\", \"sound\": \"default\"}}", "{\"test\": true}"], () => {
						// 				console.log('filling queue...', pointer, ' of ', data.length);
						// 				setTimeout(() => {
						// 					if (pointer < data.length) {

						// 						var a = [
						// 							[id + pointer, data[pointer], data[pointer] === 'a8620aa4c56892ef148a94ba14de1fcea5fdd48ce99f6a41e9a76dbfdcabbcff' ? 0 : 1],
						// 							// [id + (pointer + 1), data[pointer + 1], 1]
						// 						];

						// 						pointer += 2;

						// 						console.log('calling feed with %j', a);
						// 						obj.feed(a);
						// 					} else {
						// 						obj.feed([]);
						// 					}
						// 				}, 1000);
						// 			}, (stats) => {
						// 				console.log('stats clb: ', stats);
						// 			}).then(function(res){
						// 				console.log('send promise done with: ', res);
						// 			}, function(err){
						// 				console.log('send promise err: ', err);
						// 			});
						// 		}, function(err){
						// 			console.log('connect promise err: ', err);
						// 		});
						// 	}, function(err){
						// 		console.log('resolve promise err: ', err);
						// 	});
						// }, function(err){
						// 	console.log('init promise err: ', err);
						// });

				}, function(err){
					console.log('send promise err: ', err);
				});
			}, function(err){
				console.log('connect promise err: ', err);
			});
		}, function(err){
			console.log('resolve promise err: ', err);
		});
	}, function(err){
		console.log('init promise err: ', err);
	});
} catch (e) {
	console.error('Exception', e);
}

var data = ["e33de6296a75497279bd12100c294a564fcfacaa394a9b0f2655b32bc163b692",
// "a8620aa4c56892ef148a94ba14de1fcea5fdd48ce99f6a41e9a76dbfdcabbcff",
// "a8620aa4c56892ef148a94ba14de1fcea5fdd48ce99f6a41e9a76dbfdcabbcff",
// "a8620aa4c56892ef148a94ba14de1fcea5fdd48ce99f6a41e9a76dbfdcabbcff",
// "e406d5cb8eca7597789cec678b09b693a37855b0a7d547c646f9610324cfc640",
// "b0030a3f1c333c17fcf94dc1bf9b5a110b1b55ac5429e49a222277186e2bba32",
// "8ae280bb5d148d75460c5012d7dcefec8cf61e7e8979c8c953f6d1c0b3746fdf",
// "9f5f26dce8c0efd6de07d916359a38da0064f611936a0dbb599a4f709e7dc921",
// "2f5239ea3c02f5ccae807b157e8aac0d4084af6cf14ef1940db56026a8e1cada",
// "b20eab084ca3ee94cc1633a0a2c9adbe0d73ed17e24bffb9cf2ef5f055d465ba",
// "a8462b8d637a1df202d0bf9cd9d896149e61a5a534c88034fbf8c5209cc80f29",
// "5a8651aeab8f96d304275553dd7c8a028eec46d2e31ecddab235df5a8c810c23",
// "2059051b0ed67b94ee1e823cf2ca84851baf9d1c127774ec1da0e4d716dcfe79",
// "0380757c5f56e20a52c92cf61f32e6c96b209c3e4f4a98290bac3ff24e99964c",
// "173367bd32849463989b87ba10125e26cfb84bc7620e5d4fb7411b633020ccbf",
// "712facdf3bfd90c4d104eaa70f20075592673cf9027c13fc6617cb81bd2a8da9",
// "129b60aded21d6666f6e9b170bce087432aa712d854ced76d2e72eb0253fd40b",
// "5dee10c0a72b78084c21ea4c61b63bd33aca43ca5166bfde298e35f01d8813aa",
// "1350254d78816591c8f17ab3643abf59e901a867fdd94e8c0d7c62f294fc337c",
// "086e0abe71aad0e37cb400af42c5d0fe8c0eb231ffcf84242481155e4fe0d4e5",
// "9a04727cfb37afb28c5284c319d07fa5c5c9efbd1358140ea9948512571d5934",
// "cd00bced6ad8c456dbdba76f53c07b2282e22bc498141bb11fba0bf14340251f",
// "37990c94d7edc1f3e175c832ae3e6976be9faaf836ec55e4a766be4707c4e762",
// "e4d8671a9aedb78dbddf0bade212b0dff2dcc7a02163995e9d180520d4a597dc",
// "a5c89e1d68bea282396f19441fb1de4169ddc3dec0fc10073718e011fa1a9f74",
// "bc9e475e107d37d9d34c6ff244d58d9549989750851ad1ce278f36242b73d49e",
// "b7de33eb6c9d4e411e96a74c07d6b58d4ee9b09b24a649f8df39b0535956b4bc",
// "8b2b423f8e2553299969ee12d43dd8b9d8e1f3733cafdb571f685ec3c629aaa4",
// "60c21bd63c4dbe7c37627d61ca3b2fd13aa2533b04fd1730041f5667de8538d6",
// "dcfd44d08d69415caccff364c0004b99daa37a1c6e1219877a0e9df88a6e1a10",
// "e91930e78e8fb2738b35727b31a52fe651a120d44c2ae8128c7172b47c6947d5"
];
// console.log(obj.connect());

// obj.promise(200).then(function(){
// 	console.log('promise done');
// }, function(err){
// 	console.log('err: ', err);
// })


// addon.send('/media/psf/Home/apns2/cert.p12', '', 'api.development.push.apple.com', function() {
// 	return count++ > 10 ? ['', '', ''] : ['objectid + messageid', 'token', 'message content'];
// }, function(status, id) {
// 	console.log('status: %d, %j', status, id);
// }, function(err) {
// 	console.log('error: ', err);
// 	process.exit();
// });

// console.log('Async task started.')


// const addon = require('./build/Release/addon');

// console.log(addon(() => {
// 	console.log('done');
// })); // 'world'