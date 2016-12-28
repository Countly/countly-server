// h2.h
#ifndef H2_H
#define H2_H

#include <nan.h>
#include <string>
#include <chrono>
#include <queue>
#include <unordered_map>
#include <uv.h>

#include <openssl/err.h>
#include <openssl/conf.h>
#include <openssl/pem.h>
#include <openssl/pkcs12.h>
#include <openssl/ssl.h>
#include <openssl/bio.h>
#include <nghttp2/nghttp2.h>
#include <openssl/objects.h>
#include <openssl/x509.h>
#include <openssl/x509v3.h>

#define H2_QUEUE_SIZE 10000
#define H2_SENDING_BATCH_SIZE 500
#define H2_STATUSES_BATCH_SIZE 500
#define H2_TIMEOUT 30000
#define H2_PING_TIMEOUT 3000
#define H2_MAX_EOFS 3
static std::string H2_APN_PATH("/3/device/");

#define ST_INITIAL 				0					// 0
#define ST_ERROR 				1					// 1

#define ST_SSL 					2					// 1 << 1
#define ST_RESOLVED 			4					// 1 << 2
#define ST_CONNECTED 			8					// 1 << 3
#define ST_DONE 				16					// 1 << 4

#define ST_ERROR_RECOVERABLE 	ST_ERROR | 1 << 6	// 65
#define ST_ERROR_NONRECOVERABLE ST_ERROR | 1 << 7	// 129


static std::string NGHTTP2_H2_ALPN = std::string("\x2h2");
static std::string NGHTTP2_H2 = std::string("h2");

#define BUFPOOL_CAPACITY 1000
#define DUMMY_BUF_SIZE 100000
#define BUF_SIZE 100000

typedef struct bufpool_s bufpool_t;

struct bufpool_s {
    void *bufs[BUFPOOL_CAPACITY];
    int size;
};

typedef struct bufbase_s bufbase_t;

struct bufbase_s {
    bufpool_t *pool;
    int len;
};

namespace apns {
	class H2;
}

static auto base_time = std::chrono::steady_clock::now();

template <typename TimePoint> std::chrono::milliseconds millis_delta(const TimePoint &a, const TimePoint &b);
std::chrono::milliseconds millis();

namespace apns {

	typedef struct {
		std::string id;
		std::string path;
		std::string *data;
		std::string response;
		uint32_t data_written = 0;
		int32_t stream_id = 0;
		int32_t status = 0;
		H2 *obj;
	} h2_stream;

	typedef struct {
		std::string mid;
		unsigned int state = 0;
		unsigned int sent = 0;
		unsigned int sending = 0;
		unsigned int sending_max = 0;
		unsigned int queued = 0;
		unsigned int feed_total = 0;
		unsigned int feed_last = 0;
		unsigned int rate_total_in = 0;
		unsigned int rate_total_out = 0;
		unsigned int rate_10s_in = 0;
		unsigned int rate_10s_out = 0;
		unsigned int rate_10s_in_counter = 0;
		unsigned int rate_10s_out_counter = 0;
		unsigned int service_timeouts = 0;
		unsigned int init_eofs = 0;
		bool feeding = false;
		bool transmitting = false;
		bool reading = false;
		std::chrono::milliseconds connected = millis();
		std::chrono::milliseconds started = millis();
		std::chrono::milliseconds tick10s = millis();
		std::chrono::milliseconds done = millis();
		std::string error_connection;
	} h2_stats;

	class H2 : public Nan::ObjectWrap {
	public:
		static void Init(v8::Local<v8::Object> exports);

	private:
		H2(std::string cert, std::string pass, std::string topic, std::string exp, std::string host);
		~H2();

		static void sending_thread_run(void *arg);
		static void New(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static void init(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static void resolve(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static void init_connection(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static void send(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static void close_connection(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static void feed(const Nan::FunctionCallbackInfo<v8::Value>& info);
		static Nan::Persistent<v8::Function> constructor;
		
		Nan::Persistent<v8::Function> errorer;
		Nan::Persistent<v8::Function> feeder;
		Nan::Persistent<v8::Function> statuser;
		bool feeding;
		int lastFeed;

		std::string certificate;
		std::string passphrase;
		std::string hostname;
		std::string topic;
		std::string expiration;
		std::vector<std::string *> messages;
		struct addrinfo *address;

		uv_loop_t* loop;
		int fd;
		uv_tcp_t* tcp;
		uv_sem_t* send_sem;
		uv_write_t *tcp_write;
		uv_async_t *main_async;
		uv_mutex_t *main_mutex;
		uv_mutex_t *feed_mutex;
		BIO* read_bio;
		BIO* write_bio;

		std::vector<uint8_t> buffer_in; // app data in
		std::vector<uint8_t> buffer_out; // app data out
		
		SSL *ssl;
		SSL_CTX* ssl_ctx;

		nghttp2_data_provider global_data;
		std::queue <h2_stream *> queue;							// stream_id = 0 until request is sent (it's not in queue at that time)					
		std::unordered_map <int32_t, h2_stream *> requests;		// requests in socket, key is stream_id
		std::vector<std::tuple<std::string, int, std::string>> statuses;		// buffer for statuses
		h2_stats stats;

		uv_timer_t *conn_timer;
		uv_timer_t *service_timer;
		uv_timer_t *service_ping_timer;
		uv_getaddrinfo_t* handle_resolve;
		uv_work_t* handle_conn;
		bufpool_t *bufpool;

		uv_thread_t *conn_thread;
		uv_loop_t *conn_loop;
		uv_sem_t* tcp_init_sem;
		uv_sem_t* conn_sem;
		uv_sem_t* h2_sem;
		uv_async_t *conn_async;
		uv_async_t *service_async;
		uv_async_t *h2_async;
		uv_async_t *stop_async;
		nghttp2_session *session;
		nghttp2_hd_deflater *deflater;
		nghttp2_hd_inflater *inflater;
		nghttp2_nv headers[6];
		bool first;
		void send_error(std::string error);
		static void resolve_cb(uv_getaddrinfo_t* handle, int status, struct addrinfo* response);
		static void conn_thread_run(void *arg);
		static void conn_thread_stop_loop(uv_async_t *async);
		void conn_thread_stop();
		static void conn_thread_timeout(uv_timer_t* handle);
		static void service_timeout(uv_timer_t* handle);
		static void service_ping(uv_timer_t* handle);
		void conn_thread_connect();
		static void conn_thread_initiate(uv_async_t *async);
		static void conn_thread_service(uv_async_t *async);
		static void conn_thread_uv_on_alloc(uv_handle_s*, long unsigned int size, uv_buf_t *buf);
		static void conn_thread_uv_on_read(uv_stream_s*, long int size, const uv_buf_t* buf);
		static void conn_thread_uv_on_write(uv_write_t* req, int status);
		static void conn_thread_initiate_h2(uv_async_t *async);
		static long conn_thread_h2_get_data(nghttp2_session *session, int32_t stream_id, uint8_t *buf, size_t length, uint32_t *data_flags, nghttp2_data_source *source, void *user_data);
		static void call_main(uv_async_t *handle);

		void conn_thread_ssl_flush_read_bio();
		void conn_thread_ssl_handle_error(int result);

		void conn_thread_uv_write_to_socket(char* buf, size_t len);
		void conn_thread_uv_check_out(bool flush);

		void conn_thread_uv_on_event();

		void service();
		void transmit();

	};

}  // namespace apns

#endif