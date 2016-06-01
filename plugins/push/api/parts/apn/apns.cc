#include <nan.h>
#include "h2.h"

namespace apns {

	using v8::Local;
	using v8::Object;

	void InitAll(Local<Object> exports) {
		H2::Init(exports);
	}

	NODE_MODULE(addon, InitAll)

}  // namespace demo

