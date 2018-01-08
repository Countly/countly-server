// h2.cc
#include <node.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <netinet/tcp.h>
#include <netinet/in.h>
#include <string>
#include <cstring>
#include <iterator>
#include <iomanip>

#include "h2.h"
#include "log.h"
#include "conn.cc"

template <typename TimePoint> std::chrono::milliseconds millis_delta(const TimePoint &a, const TimePoint &b) {
  return std::chrono::duration_cast<std::chrono::milliseconds>(a - b);
}

std::chrono::milliseconds millis() {
  return millis_delta(std::chrono::steady_clock::now(), base_time);
}

namespace apns {

	using v8::Function;
	using v8::FunctionCallbackInfo;
	using v8::FunctionTemplate;
	using v8::Isolate;
	using v8::Handle;
	using v8::HandleScope;
	using v8::Local;
	using v8::Number;
	using v8::Object;
	using v8::Persistent;
	using v8::String;
	using v8::Value;
	using ResolverPersistent = Nan::Persistent<v8::Promise::Resolver>;

	Nan::Persistent<Function> H2::constructor;

	struct PeristentHandle {
		ResolverPersistent *resolver;
		H2 *conn;
		std::string error;
	};

	H2::H2(std::string cert, std::string pass, std::string top, std::string exp, std::string host) {
		certificate = cert;
		passphrase = pass;
		hostname = host;
		topic = top;
		expiration = exp.empty() ? timestr(60 * 60 * 24 * 7) : exp;
		max_data_size = 0;

		stats = {};
	
		auto tmp = new std::string("POST");
		headers[0] = MAKE_NV(":method", (*tmp), NGHTTP2_NV_FLAG_NO_COPY_NAME | NGHTTP2_NV_FLAG_NO_COPY_VALUE);
		tmp = new std::string("https");
		headers[1] = MAKE_NV(":scheme", (*tmp), NGHTTP2_NV_FLAG_NO_COPY_NAME | NGHTTP2_NV_FLAG_NO_COPY_VALUE);
		tmp = new std::string("https");
		headers[2] = MAKE_NV(":path", (*tmp), NGHTTP2_NV_FLAG_NO_INDEX);
		headers[3] = MAKE_NV("host", hostname, NGHTTP2_NV_FLAG_NO_COPY_NAME | NGHTTP2_NV_FLAG_NO_COPY_VALUE);
		headers[4] = MAKE_NV("apns-expiration", expiration, NGHTTP2_NV_FLAG_NO_COPY_NAME | NGHTTP2_NV_FLAG_NO_COPY_VALUE);

		// a bit hacky here, but easier...  NGHTTP2_NV_FLAG_NO_INDEX for this header means "do not send me", see h2::transmit in conn
		headers[5] = MAKE_NV("apns-topic", topic, NGHTTP2_NV_FLAG_NONE);

		if (certificate.empty()) {
			LOG_DEBUG("no certificate, using " << passphrase);
			headers[6] = MAKE_NV("authorization", passphrase, NGHTTP2_NV_FLAG_NONE);
		} else {
			headers[6] = MAKE_NV("authorization", passphrase, NGHTTP2_NV_FLAG_NO_INDEX);
		}

		global_data.source.fd = 0;
		global_data.source.ptr = &hostname;
		global_data.read_callback = conn_thread_h2_get_data;

		bufpool = (bufpool_t *)malloc(sizeof(*bufpool));
		bufpool_init(bufpool);

		session = NULL;

		// stats.state = 0;
		// stats.sent = 0;
		// stats.sending = 0;
		// stats.sending_max = 0;
		// stats.queued = 0;
		// stats.feeding = 0;
		// stats.feed_total = 0;
		// stats.feed_last = 0;
		// stats.rate_total_in = 0;
		// stats.rate_total_out = 0;
		// stats.rate_10s_in = 0;
		// stats.rate_10s_out = 0;
		// stats.rate_10s_in_counter = 0;
		// stats.rate_10s_out_counter = 0;
		// stats.error_connection = "";

		// deflater = new nghttp2_hd_deflater;
		// h2handle->session = (nghttp2_session*)malloc(1000);

		loop = uv_default_loop();
		conn_loop = uv_loop_new();
		// uv_loop_init(conn_loop);
		// uv_loop_configure(conn_loop, UV_LOOP_BLOCK_SIGNAL, 0);

		conn_timer = new uv_timer_t;
		uv_timer_init(conn_loop, conn_timer);

		service_timer = new uv_timer_t;
		uv_timer_init(conn_loop, service_timer);

		service_ping_timer = new uv_timer_t;
		uv_timer_init(conn_loop, service_ping_timer);

		conn_async = new uv_async_t;
		uv_async_init(conn_loop, conn_async, conn_thread_initiate);

		service_async = new uv_async_t;
		uv_async_init(conn_loop, service_async, conn_thread_service);
	
		h2_async = new uv_async_t;
		uv_async_init(conn_loop, h2_async, conn_thread_initiate_h2);
	
		stop_async = new uv_async_t;
		uv_async_init(conn_loop, stop_async, conn_thread_stop_loop);
	
		main_async = new uv_async_t;
		uv_async_init(loop, main_async, call_main);

		main_mutex = new uv_mutex_t;
		uv_mutex_init(main_mutex);

		feed_mutex = new uv_mutex_t;
		uv_mutex_init(feed_mutex);

		conn_thread = new uv_thread_t;
		uv_thread_create(conn_thread, conn_thread_run, this);
	}

	H2::~H2() {
		if (ssl_ctx) {
  			SSL_CTX_free(ssl_ctx);
		}
	}

	void H2::Init(Local<Object> exports) {
		Nan::HandleScope scope;

		// Prepare constructor template
		v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
		tpl->SetClassName(Nan::New("Connection").ToLocalChecked());
		tpl->InstanceTemplate()->SetInternalFieldCount(1);

		// Prototype
		Nan::SetPrototypeMethod(tpl, "init", init);
		Nan::SetPrototypeMethod(tpl, "resolve", resolve);
		Nan::SetPrototypeMethod(tpl, "init_connection", init_connection);
		Nan::SetPrototypeMethod(tpl, "send", send);
		Nan::SetPrototypeMethod(tpl, "close_connection", close_connection);
		Nan::SetPrototypeMethod(tpl, "feed", feed);

		constructor.Reset(tpl->GetFunction());
		exports->Set(Nan::New("Connection").ToLocalChecked(), tpl->GetFunction());
	}

	void H2::New(const Nan::FunctionCallbackInfo<Value>& info) {
		H2* obj = new H2(argString(info[0]), argString(info[1]), argString(info[2]), argString(info[3]), argString(info[4]));
		obj->Wrap(info.This());
		info.GetReturnValue().Set(info.This());
	}

	void H2::send_error(std::string error) {
		stats.error_connection = error;
		LOG_ERROR(stats.error_connection);
	}

	void H2::init(const Nan::FunctionCallbackInfo<Value>& info) {
		H2* obj = ObjectWrap::Unwrap<H2>(info.Holder());
		// LOG_DEBUG("initializing with " << obj->certificate);

		v8::Local<v8::Function> tpl = v8::Local<v8::Function>::Cast(info[0]);
		obj->errorer.Reset(tpl);

		auto resolver = v8::Promise::Resolver::New(info.GetIsolate());
		auto promise = resolver->GetPromise();
		auto persistent = new ResolverPersistent(resolver);
		auto persistentHandle = new PeristentHandle;
		persistentHandle->resolver = persistent;
		persistentHandle->conn = obj;

		uv_work_t* handle = new uv_work_t;
		handle->data = persistentHandle;

		auto init_l = [](uv_work_t *handle) -> void {
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto obj = persistentHandle->conn;

			obj->ssl_ctx = SSL_CTX_new(SSLv23_client_method());
			if (!obj->ssl_ctx) {
				persistentHandle->error = ERR_error_string(ERR_get_error(), NULL);
				LOG_ERROR(persistentHandle->error);
				return;
			}
			SSL_CTX_set_options(obj->ssl_ctx,
							  (SSL_OP_ALL & ~SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS) | SSL_OP_NO_SSLv2 | SSL_OP_NO_SSLv3 |
								  SSL_OP_NO_COMPRESSION |
								  SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION);
			SSL_CTX_set_mode(obj->ssl_ctx, SSL_MODE_AUTO_RETRY);
			SSL_CTX_set_mode(obj->ssl_ctx, SSL_MODE_RELEASE_BUFFERS);

			// LOG_DEBUG("loading certificate from " << obj->certificate);

			if (obj->certificate.empty()) {
				LOG_DEBUG("no certificate, using bearer " << obj->passphrase);
			} else {
				STACK_OF(X509) *ca = NULL;
				PKCS12 *p12;
				EVP_PKEY *key;
				X509 *cert;
				unsigned char *buffer;
				size_t length;

				base64_decode(obj->certificate.c_str(), &buffer, &length);

				BIO *bio = BIO_new_mem_buf(buffer, length);


				SSL_load_error_strings();
				SSL_library_init();
				OpenSSL_add_all_algorithms();
				ERR_load_crypto_strings();

				p12 = d2i_PKCS12_bio(bio, NULL);
				// p12 = d2i_PKCS12_fp(fp, NULL);
				// std::fclose(fp);
				
				if (!p12) {
					persistentHandle->error = "Error reading PKCS#12 file";
					LOG_ERROR(persistentHandle->error);
					return;
				}

				if (!PKCS12_parse(p12, obj->passphrase.c_str(), &key, &cert, &ca)) {
					persistentHandle->error = "Invalid passphrase";
					LOG_DEBUG(persistentHandle->error);
					return;
				}

				PKCS12_free(p12);

				if (SSL_CTX_use_certificate(obj->ssl_ctx, cert) != 1) {
					persistentHandle->error = ERR_error_string(ERR_get_error(), NULL);
					LOG_ERROR(persistentHandle->error);
					return;
				}
				if (SSL_CTX_use_PrivateKey(obj->ssl_ctx, key) != 1) {
					persistentHandle->error = ERR_error_string(ERR_get_error(), NULL);
					LOG_ERROR(persistentHandle->error);
					return;
				}
			}

			auto res = std::vector<unsigned char>(NGHTTP2_H2_ALPN.size());
			auto p = std::begin(res);
			p = std::copy_n(std::begin(NGHTTP2_H2_ALPN), NGHTTP2_H2_ALPN.size(), p);

		    SSL_CTX_set_alpn_protos(obj->ssl_ctx, res.data(), res.size());
		};

		auto init_done_l = [](uv_work_t *handle, int status) -> void {
			Nan::HandleScope scope;
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto persistent = persistentHandle->resolver;
			auto obj = persistentHandle->conn;
			auto resolver = Nan::New(*persistent);


			if (persistentHandle->error.empty()) {
				obj->stats.state |= ST_SSL;
				resolver->Resolve(Nan::New("some init result").ToLocalChecked());
			} else {
				obj->stats.state |= ST_SSL | ST_ERROR_NONRECOVERABLE;
				resolver->Reject(Nan::New(persistentHandle->error).ToLocalChecked());
			}

			persistent->Reset();
			delete persistentHandle;
			delete persistent;
			delete handle;
		};
		uv_queue_work(uv_default_loop(), handle, init_l, init_done_l);

		info.GetReturnValue().Set(promise);
	}

	void H2::resolve_cb(uv_getaddrinfo_t* handle, int status, struct addrinfo* response) {
		Nan::HandleScope scope;
		auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
		auto persistent = persistentHandle->resolver;
		auto obj = persistentHandle->conn;
		auto resolver = Nan::New(*persistent);

		if (status != 0) {
			if (obj->stats.state & ST_RESOLVED) {
				obj->stats.state  = obj->stats.state & (~ST_ERROR_NONRECOVERABLE);
				obj->stats.state |= ST_RESOLVED | ST_ERROR_NONRECOVERABLE;
				obj->stats.error_connection = uv_err_name(status);
				LOG_ERROR("dns resolve error, no more retrying after " << obj->stats.error_connection);
				resolver->Reject(Nan::New(obj->stats.error_connection).ToLocalChecked());
				persistent->Reset();
				delete persistentHandle;
				delete persistent;
				delete handle;
			} else {
				obj->stats.state |= ST_RESOLVED | ST_ERROR_RECOVERABLE;
				LOG_WARNING("dns resolve error, let's retry once " << uv_err_name(status));
		
				struct addrinfo hints;
				hints.ai_family = AF_INET;
				hints.ai_socktype = SOCK_STREAM;
				hints.ai_protocol = 0;
				hints.ai_flags = AI_ADDRCONFIG;
				uv_getaddrinfo(uv_default_loop(), handle, resolve_cb, obj->hostname.c_str(), "443", &hints);
			}
		} else {
			obj->stats.state &= ~(ST_ERROR_NONRECOVERABLE | ST_ERROR_RECOVERABLE);
			obj->stats.state |= ST_RESOLVED;
			char addr[17] = {'\0'};
			uv_ip4_name((struct sockaddr_in*) response->ai_addr, addr, 16);
			LOG_INFO("dns resolved: " << addr << ", has next? " << !!response->ai_next);
			resolver->Resolve(Nan::New(addr).ToLocalChecked());
			persistentHandle->conn->address = response;

			persistent->Reset();
			delete persistentHandle;
			delete persistent;
			delete handle;
			// free(handle);
			// uv_freeaddrinfo(response);
		}
	}
	void H2::resolve(const Nan::FunctionCallbackInfo<Value>& info) {
		H2* obj = ObjectWrap::Unwrap<H2>(info.Holder());
		LOG_INFO("resolving " << obj->hostname);

		auto resolver = v8::Promise::Resolver::New(info.GetIsolate());
		auto promise = resolver->GetPromise();
		auto persistent = new ResolverPersistent(resolver);
		auto persistentHandle = new PeristentHandle;
		persistentHandle->resolver = persistent;
		persistentHandle->conn = obj;

		obj->handle_resolve = new uv_getaddrinfo_t;
		obj->handle_resolve->data = persistentHandle;

		struct addrinfo hints;
		hints.ai_family = AF_UNSPEC;
		hints.ai_socktype = SOCK_STREAM;
		hints.ai_protocol = 0;
		hints.ai_flags = AI_ADDRCONFIG;

		uv_getaddrinfo(uv_default_loop(), obj->handle_resolve, resolve_cb, obj->hostname.c_str(), "443", &hints);

		info.GetReturnValue().Set(promise);
	}

	void H2::init_connection(const Nan::FunctionCallbackInfo<Value>& info) {
		H2* obj = ObjectWrap::Unwrap<H2>(info.Holder());
		LOG_INFO("init_connection to " << obj->hostname << " in " << uv_thread_self());

		auto resolver = v8::Promise::Resolver::New(info.GetIsolate());
		auto promise = resolver->GetPromise();
		auto persistent = new ResolverPersistent(resolver);
		auto persistentHandle = new PeristentHandle;
		persistentHandle->resolver = persistent;
		persistentHandle->conn = obj;

		obj->handle_conn = new uv_work_t;
		obj->handle_conn->data = persistentHandle;

		obj->conn_sem = new uv_sem_t;
		uv_sem_init(obj->conn_sem, 0);

		auto init_l = [](uv_work_t *handle) -> void {
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto obj = persistentHandle->conn;

			obj->conn_thread_connect();
		};

		auto init_done_l = [](uv_work_t *handle, int status) -> void {
			Nan::HandleScope scope;
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto obj = persistentHandle->conn;
			auto persistent = persistentHandle->resolver;
			auto resolver = Nan::New(*persistent);

			LOG_DEBUG("init_done_l: " << obj->stats.error_connection);

			if (obj->stats.error_connection.empty()) {
				resolver->Resolve(Nan::New("some init result").ToLocalChecked());
			} else {
				resolver->Reject(Nan::New(obj->stats.error_connection).ToLocalChecked());
			}

			persistent->Reset();
			delete persistent;
			delete persistentHandle;
			delete handle;
		};

		uv_queue_work(obj->loop, obj->handle_conn, init_l, init_done_l);
		// 

		info.GetReturnValue().Set(promise);
	}

	void H2::send(const Nan::FunctionCallbackInfo<Value>& info) {
		H2* obj = ObjectWrap::Unwrap<H2>(info.Holder());
		LOG_INFO("sending in " << uv_thread_self() << ": " << obj->stats.state);

		obj->messages.clear();

		v8::Local<v8::Array> input = v8::Local<v8::Array>::Cast(info[0]);
		for (unsigned int i = 0; i < input->Length(); i++) {
			auto str = new std::string(*v8::String::Utf8Value(input->Get(i)));
			LOG_DEBUG("message " << i << ": " << str << ", " << *str);
			obj->messages.push_back(str);
			// delete ch;
		}

		v8::Local<v8::Function> feederTpl = v8::Local<v8::Function>::Cast(info[1]);
		obj->feeder.Reset(feederTpl);

		v8::Local<v8::Function> statuserTpl = v8::Local<v8::Function>::Cast(info[2]);
		obj->statuser.Reset(statuserTpl);

		// obj->feeder = Nan::Persistent<v8::Function>::New(callbackFunction);
		// Nan::Persistent<v8::Function> pf(callbackFunction);
		// obj->feeder = pf;
		// obj->feeder = new Nan::Persistent<v8::Function>(info.GetIsolate(), info[0].As<v8::Function>())

		obj->stats.started = millis();
		obj->stats.tick10s = millis();
		obj->stats.feed_last = -1;
		obj->stats.feed_total = 0;
		obj->stats.feeding = false;

		obj->service_ping_timer->data = obj;
		uv_timer_start(obj->service_ping_timer, service_ping, H2_PING_TIMEOUT, H2_PING_TIMEOUT);

		obj->main_async->data = obj;
		obj->service_async->data = obj;

		auto resolver = v8::Promise::Resolver::New(info.GetIsolate());
		auto promise = resolver->GetPromise();
		auto persistent = new ResolverPersistent(resolver);
		auto persistentHandle = new PeristentHandle;
		persistentHandle->resolver = persistent;
		persistentHandle->conn = obj;

		uv_work_t* handle = new uv_work_t;
		handle->data = persistentHandle;

		// this thread does sending supervising
		auto send_l = [](uv_work_t *handle) -> void {
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto obj = persistentHandle->conn;

			LOG_DEBUG("preparing to send in " << uv_thread_self() << ": " << obj->stats.sending_max);

			// while (true) {
			// 	LOG_DEBUG(". in " << uv_thread_self() << ": " << obj->stats.sending_max);

			// 	if (obj->stats.state & ST_DONE) {
			// 		break;
			// 	} else {
			// 		if (!obj->stats.feeding && (H2_QUEUE_SIZE - obj->queue.size()) > H2_QUEUE_SIZE / 2) {
			// 			obj->stats.feeding = true;
			// 			uv_async_send(obj->main_async);
			// 		} else if (((obj->stats.state & ST_DONE) && obj->statuses.size()) || obj->statuses.size() > H2_STATUSES_BATCH_SIZE) {
			// 			uv_async_send(obj->main_async);
			// 		}

			// 		uv_async_send(obj->service_async);
			// 		usleep(1000000);
			// 	}
			// 	// LOG_DEBUG("step done in " << uv_thread_self());
			// }

			obj->send_sem = new uv_sem_t;
			uv_sem_init(obj->send_sem, 0);

			uv_async_send(obj->service_async);
			// block until:
			// 1) all messages are processed = queue is empty
			// 2) and feeder returns no new messages
			// --- or ---
			// 1) unrecoverable error happens
			uv_sem_wait(obj->send_sem);
			// uv_sem_post(obj->send_sem);

			LOG_DEBUG("done sending in " << uv_thread_self() << ": " << obj->stats.state);
			uv_sem_destroy(obj->send_sem);
			delete obj->send_sem;
			obj->send_sem = nullptr;
		};

		auto send_done_l = [](uv_work_t *handle, int status) -> void {
			Nan::HandleScope scope;
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto persistent = persistentHandle->resolver;
			auto resolver = Nan::New(*persistent);
			// auto obj = persistentHandle->conn;

			if (persistentHandle->error.empty()) {
				resolver->Resolve(Nan::New("some send result").ToLocalChecked());
			} else {
				resolver->Reject(Nan::New(persistentHandle->error).ToLocalChecked());
			}

			persistent->Reset();
			delete persistentHandle;
			delete persistent;
			delete handle;

			
		};

		uv_queue_work(uv_default_loop(), handle, send_l, send_done_l);

		info.GetReturnValue().Set(promise);
	}

	void H2::feed(const Nan::FunctionCallbackInfo<Value>& info) {
		LOG_DEBUG("H2::feed");
		H2* obj = ObjectWrap::Unwrap<H2>(info.Holder());
		
		if (obj->queue.size() >= H2_QUEUE_SIZE) {
			LOG_DEBUG("queue is too big, won't feed any more devices");
			info.GetReturnValue().Set(v8::Integer::New(info.GetIsolate(), -1));
			return;
		}

		int fed = 0;

		uv_mutex_lock(obj->main_mutex);
		{
			v8::Local<v8::Array> input = v8::Local<v8::Array>::Cast(info[0]);
			obj->stats.feed_last = input->Length();

			if (obj->stats.feed_last == 0) {
				LOG_DEBUG("done feeding, waiting for queue to become empty");
			} else {
				LOG_DEBUG("feeding " << obj->stats.feed_last << ": " << obj->stats.feeding);
				
				for (unsigned int i = 0; i < obj->stats.feed_last; i++) {
					auto array = Local<Object>::Cast(input->Get(i));
					h2_stream *stream = new h2_stream;
					stream->obj = obj;

					stream->id = std::string(*v8::String::Utf8Value(array->Get(0)));
					stream->path = H2_APN_PATH + std::string(*v8::String::Utf8Value(array->Get(1)));

					// v8::String::Utf8Value str1(array->Get(0));
					// stream.id = (char *)malloc(str1.length() + 1);
					// strcpy(stream.id, *str1);

					// v8::String::Utf8Value str2(array->Get(1));
					// stream.path = (char *)malloc(str2.length() + 1);
					// strcpy(stream.path, *str2);

					// LOG_DEBUG("for " << stream->id << " data is " << array->Get(2)->IntegerValue());
					auto data = obj->messages[(uint8_t)array->Get(2)->IntegerValue()];
					stream->data = data;
					// LOG_DEBUG("for " << stream->id << " data became " << stream->data << ", " << *stream->data);
					stream->stream_id = 0;
					stream->response = EMPTY_STR;
					obj->queue.push(stream);

					fed++;
					// LOG_DEBUG("feed:pushed " << str.obj << " / "  << str.id << " / "  << str.path << " / "  << str.data_id << " / "  << str.stream_id);
					// LOG_DEBUG(array->Get(0)->ToString() << " / "  << array->Get(1)->ToString() << " / "  << array->Get(2)->ToString());
				}

				if (obj->certificate.empty()) {
					LOG_DEBUG("feed token was " << obj->passphrase);
					obj->passphrase = std::string(*v8::String::Utf8Value(info[1]));
					obj->headers[6] = MAKE_NV("authorization", obj->passphrase, NGHTTP2_NV_FLAG_NONE);
					LOG_DEBUG("feed token now " << obj->passphrase);
				}
				// LOG_DEBUG("feed unblock " << obj->stats.feed_last);
			}

			// obj->stats.feeding = false;
		}
		uv_mutex_unlock(obj->main_mutex);

		obj->stats.feeding = false;
		uv_mutex_unlock(obj->feed_mutex);

		LOG_DEBUG("feed mutex unlocked last " << obj->stats.feed_last << ", fed " << fed << ", now " << obj->queue.size());

		uv_async_send(obj->service_async);
		
		// info.GetReturnValue().Set(Nan::Null());
		info.GetReturnValue().Set(Nan::New(fed));
		// info.GetReturnValue().Set(v8::Integer::New(info.GetIsolate(), fed));
	}

	void H2::call_main(uv_async_t *handle) {
		H2 *obj = static_cast<H2 *>(handle->data);
		LOG_DEBUG("call main state " << obj->stats.state << " statuses " << obj->statuses.size() << " feeding " << obj->stats.feeding);
		
		if (obj->queue.size() < H2_QUEUE_SIZE / 2 && obj->stats.feed_last != 0) {
			Isolate * isolate = Isolate::GetCurrent();
			if (uv_mutex_trylock(obj->feed_mutex) == 0) {
					// LOG_DEBUG("locked feed mutex");
					obj->stats.feeding = true;

					v8::HandleScope handleScope(isolate);
					int ask = H2_QUEUE_SIZE - obj->queue.size();
					Local<Value> argv[1] = { v8::Integer::New(isolate, ask) };
					auto local = Local<Function>::New(isolate, obj->feeder);
					local->Call(isolate->GetCurrentContext()->Global(), 1, argv);
					// LOG_DEBUG("feeding call done with queue " << obj->queue.size() << " asking for " << ask);
			} else {
				// LOG_DEBUG("won't feed for now - mutex locked");
			}
		}

		if (obj->statuses.size() > H2_STATUSES_BATCH_SIZE || (obj->statuses.size() && ( !obj->stats.state || (obj->stats.state & ST_DONE)))) {
			Isolate * isolate = Isolate::GetCurrent();
			// LOG_DEBUG("call main block 2");
			uv_mutex_lock(obj->main_mutex);
			{
				// LOG_DEBUG("call main in 2");
				v8::HandleScope handleScope(isolate);

				v8::Local<v8::Array> array = v8::Array::New(isolate);
				while (obj->statuses.size()) {
					std::tuple<std::string, int, std::string> status = obj->statuses.back();

					v8::Local<v8::Array> one = v8::Array::New(isolate);
					one->Set(0, Nan::New<String>(std::get<0>(status).c_str()).ToLocalChecked());
					one->Set(1, v8::Integer::New(isolate, std::get<1>(status)));
					one->Set(2, Nan::New<String>(std::get<2>(status).c_str()).ToLocalChecked());

					array->Set(array->Length(), one);

					obj->statuses.pop_back();
				}

				Local<Value> argv[1] = { array };
				auto local = Local<Function>::New(isolate, obj->statuser);
				local->Call(isolate->GetCurrentContext()->Global(), 1, argv);
				// LOG_DEBUG("status call done, sent " << array->Length());

			}
			uv_mutex_unlock(obj->main_mutex);
			// LOG_DEBUG("call main block 2 mutex unlocked");
		}

		if (obj->stats.state & ST_DONE) {
			obj->stats.state &= ~ST_DONE;
			// LOG_DEBUG("main: done sending, releasing " << obj->stats.state);
			if (uv_is_active((uv_handle_t *)obj->service_ping_timer)) {
				LOG_DEBUG("stopping ping timer " << obj->stats.state);
				uv_timer_stop(obj->service_ping_timer);
			}
			uv_sem_post(obj->send_sem);
		}
	}

	void H2::close_connection(const Nan::FunctionCallbackInfo<Value>& info) {
		H2* obj = ObjectWrap::Unwrap<H2>(info.Holder());
		LOG_DEBUG("closing " << obj->hostname);

		auto resolver = v8::Promise::Resolver::New(info.GetIsolate());
		auto promise = resolver->GetPromise();
		auto persistent = new ResolverPersistent(resolver);
		auto persistentHandle = new PeristentHandle;
		persistentHandle->resolver = persistent;
		persistentHandle->conn = obj;

		uv_work_t* handle = new uv_work_t;
		handle->data = persistentHandle;

		auto init_l = [](uv_work_t *handle) -> void {
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto obj = persistentHandle->conn;
			obj->stop_async->data = obj;
			uv_async_send(obj->stop_async);
		};

		auto init_done_l = [](uv_work_t *handle, int status) -> void {
			Nan::HandleScope scope;
			auto persistentHandle = static_cast<PeristentHandle*>(handle->data);
			auto persistent = persistentHandle->resolver;
			auto resolver = Nan::New(*persistent);
			auto obj = persistentHandle->conn;

			LOG_INFO("wating for conn_loop to stop");
			while (obj->conn_loop) {
				usleep(100000);
			}

			LOG_INFO("conn_loop stopped");
			uv_thread_join(obj->conn_thread);
			delete obj->conn_thread;
			LOG_INFO("conn_thread joined");

			if (persistentHandle->error.empty()) {
				resolver->Resolve(Nan::New("some close result").ToLocalChecked());
			} else {
				resolver->Reject(Nan::New(persistentHandle->error).ToLocalChecked());
			}

			persistent->Reset();
			delete persistentHandle;
			delete persistent;
			delete handle;
		};

		uv_queue_work(uv_default_loop(), handle, init_l, init_done_l);

		info.GetReturnValue().Set(promise);
	}

}  // namespace apns

