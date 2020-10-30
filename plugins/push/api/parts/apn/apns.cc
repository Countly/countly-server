#include <nan.h>
#include "h2.h"

namespace apns {

	using v8::Local;
	using v8::Value;
	using v8::Object;
	using v8::Context;

	void InitAll(Local<Object> exports, v8::Local<v8::Object> module) {
		H2::Init(exports);
	}

	NODE_MODULE(addon, InitAll)

}  // namespace demo

