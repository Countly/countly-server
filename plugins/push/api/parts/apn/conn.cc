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
#include "utils.cc"

namespace apns {
	void H2::conn_thread_run(void *arg) {
		H2 *obj = static_cast<H2*>(arg);

		LOG_DEBUG("going into conn_loop in " << uv_thread_self());
		LOG_DEBUG("conn_loop returned " << uv_run(obj->conn_loop, UV_RUN_DEFAULT) << " in " << uv_thread_self());

		free(obj->conn_loop);
		obj->conn_loop = NULL;
	}

	void H2::conn_thread_stop_loop(uv_async_t *async) {
		LOG_DEBUG("stopping conn_loop");
		H2 *obj = static_cast<H2*>(async->data);
		obj->conn_thread_stop();
		// uv_stop(obj->conn_loop);
	}

	void H2::conn_thread_stop() {
		LOG_INFO("Disconnecting: " << stats.state);

		if (tcp && (stats.state & ST_CONNECTED)) {
			stats.state &= ~ST_CONNECTED;
			
			if (uv_is_active((uv_handle_t *)service_ping_timer)) {
				LOG_DEBUG("disconnecting, stopping ping timer " << stats.state);
				uv_timer_stop(service_ping_timer);
			}

			uv_async_send(main_async);
			uv_read_stop((uv_stream_t *)tcp);


			uv_close((uv_handle_t *)tcp, [](uv_handle_t* handle){
				H2* obj = static_cast<H2 *>(handle->data);

				if (obj->ssl) {
					SSL_free(obj->ssl);
					obj->ssl = nullptr;
				}
				if (obj->fd) {
					close(obj->fd);
					obj->fd = 0;
				}

				delete obj->tcp;
				obj->tcp = NULL;

				LOG_INFO("freed tcp & ssl for " << obj->hostname);

				if (obj->send_sem) {
					LOG_INFO("releasing send semaphore");
					uv_sem_post(obj->send_sem);
				} else {
					if (obj->h2_sem) {
						LOG_INFO("releasing h2 semaphore");
						uv_sem_post(obj->h2_sem);
					} else if (obj->tcp_init_sem) { 
						LOG_INFO("releasing tcp semaphore");
						uv_sem_post(obj->tcp_init_sem);
					}
				}
				obj->stats.state = ST_INITIAL;

				uv_stop(obj->conn_loop);
				LOG_INFO("uv_loop_close: " << uv_loop_close(obj->conn_loop));
				delete obj->conn_loop;

				exit(0);
			});
		}
	}

	void H2::conn_thread_timeout(uv_timer_t* handle) {
		H2 *obj = static_cast<H2*>(handle->data);

		uv_timer_stop(obj->conn_timer);
		LOG_WARNING("-------------------- TIMEOUT -------------------------");
		if (!(obj->stats.state & ST_CONNECTED)) {
		LOG_WARNING("------------------ NOT CONNECTED -------------------------");
			if (obj->tcp) {
				uv_read_stop((uv_stream_t *)obj->tcp);

				LOG_WARNING("has next address ? " << !!obj->address->ai_next);

				uv_close((uv_handle_t *)obj->tcp, [](uv_handle_t* handle){
					H2* obj = static_cast<H2 *>(handle->data);
					LOG_WARNING(obj->hostname);

					if (obj->ssl) {
						SSL_free(obj->ssl);
						obj->ssl = nullptr;
					}
					if (obj->fd) {
						close(obj->fd);
						obj->fd = 0;
					}

					LOG_WARNING("freed tcp & ssl for " << obj->hostname);
					if (obj->address->ai_next) {
						LOG_WARNING("going to try next address");
						obj->address = obj->address->ai_next;
						obj->conn_async->data = obj;
						uv_async_send(obj->conn_async);
					} else {
						LOG_WARNING("no more addresses, quit");
						obj->stats.error_connection = "Timeout on all resolved servers";
						if (obj->tcp_init_sem) {
							uv_sem_post(obj->tcp_init_sem);
						}
						if (obj->h2_sem) {
							uv_sem_post(obj->h2_sem);
						}
					}
				});
			} else {
				if (obj->ssl) {
					SSL_free(obj->ssl);
					obj->ssl = nullptr;
				}
				if (obj->fd) {
					close(obj->fd);
					obj->fd = 0;
				}

				obj->conn_async->data = obj;
				uv_async_send(obj->conn_async);
			}
		// } else if (!(obj->stats.state & ST_RESOLVED)) {
		// LOG_DEBUG("------------------ STREAM -------------------------");
		}
		// LOG_ERROR("timeout in state " << obj->stats.state);
	}

	void H2::conn_thread_connect() {
		LOG_INFO("looping adresses of " << hostname << " in " << uv_thread_self());
		send_error("looping addresses");

		session = NULL;
		h2_sem = NULL;
		tcp_init_sem = NULL;

		stats.init_eofs = 0;

		while (address && !(stats.state & ST_CONNECTED) && stats.init_eofs < H2_MAX_EOFS) {
			tcp_init_sem = new uv_sem_t;
			uv_sem_init(tcp_init_sem, 0);

			conn_async->data = this;
			uv_async_send(conn_async);

			uv_sem_wait(tcp_init_sem);

			if (tcp_init_sem) {
				uv_sem_destroy(tcp_init_sem);
				delete tcp_init_sem;
				tcp_init_sem = nullptr;
			}

			if (stats.error_connection.empty()) {
				LOG_INFO("done connecting to " << hostname);

				const unsigned char *next_proto = nullptr;
				unsigned int next_proto_len;
				SSL_get0_next_proto_negotiated(ssl, &next_proto, &next_proto_len);
				for (int i = 0; i < 2; ++i) {
					if (next_proto) {
						std::string negotiated = std::string((const char *)next_proto, next_proto_len);
						LOG_DEBUG("The negotiated protocol: " << negotiated << " while wating for " << NGHTTP2_H2);
						if (NGHTTP2_H2.compare(negotiated) != 0) {
							next_proto = nullptr;
						}
						break;
					}
					SSL_get0_alpn_selected(ssl, &next_proto, &next_proto_len);
				}

				if (!next_proto) {
					stats.error_connection = "HTTP/2 protocol was not selected";
				}
			}

			if (stats.error_connection.empty()) {
				// uv_freeaddrinfo(address);
				// address = nullptr;
				stats.connected = millis();

				LOG_INFO("starting HTTP/2 stack");
				h2_sem = new uv_sem_t;
				uv_sem_init(h2_sem, 0);
				h2_async->data = this;
				uv_async_send(h2_async);
				uv_sem_wait(h2_sem);

				if (h2_sem) {
					uv_sem_destroy(h2_sem);
					delete h2_sem;
					h2_sem = nullptr;
				}

				uv_timer_stop(conn_timer);
				stats.state &= ~(ST_ERROR_RECOVERABLE | ST_ERROR_NONRECOVERABLE);
				stats.state |= ST_CONNECTED;

				LOG_INFO("done with HTTP/2 stack");
			} else {
				LOG_WARNING("failed to connect, trying next server");
				
				if (tcp) {
					uv_read_stop((uv_stream_t*)tcp);
					tcp = nullptr;
				}

				if (ssl) {
					SSL_free(ssl);
				}

				// BIO_free(read_bio);
				// BIO_free(write_bio);

				if (fd) {
					close(fd);
					fd = 0;
				}

				address = address->ai_next;
			}

		}

		LOG_INFO("looping done: " << stats.error_connection);
	}

	void H2::conn_thread_initiate(uv_async_t *async) {
		H2* obj = static_cast<H2 *>(async->data);

		LOG_DEBUG("Starting connect timer");
		if (uv_is_active((uv_handle_t *)obj->conn_timer)) {
			uv_timer_again(obj->conn_timer);
		} else {
			obj->conn_timer->data = obj;
			uv_timer_start(obj->conn_timer, conn_thread_timeout, H2_TIMEOUT, 0);
		}

		struct sockaddr_in *i_addr = (struct sockaddr_in *)obj->address->ai_addr; 
		char *addr = inet_ntoa((struct in_addr)i_addr->sin_addr);
		// inet_ntop(p->ai_family, addr, ipstr, sizeof ipstr); 
		// char addr[17] = {'\0'};
		// uv_ip4_name((struct sockaddr_in*) obj->address->ai_addr, addr, 16);
		LOG_DEBUG("connecting to " << obj->hostname << " (" << addr << ": " << obj->address->ai_family << " (" << AF_INET << "), " << obj->address->ai_protocol << ") in " << uv_thread_self());

		obj->stats.error_connection = "";
		obj->tcp = nullptr;

		obj->fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
		LOG_DEBUG("socket " << obj->fd);
		if (obj->fd == -1) {
			std::ostringstream out;
			out << "socket creation failed: " << strerror(errno);
			obj->send_error(out.str());
			return;
		}

		int val = 1;
		if (setsockopt(obj->fd, IPPROTO_TCP, TCP_NODELAY, reinterpret_cast<char *>(&val), sizeof(val)) == -1) {
			close(obj->fd);
			obj->fd = 0;
			std::ostringstream out;
			out << "socket creation failed: " << strerror(errno);
			obj->send_error(out.str());
			return;
		}

		LOG_DEBUG("setsockopt ");

		obj->ssl = SSL_new(obj->ssl_ctx);
		LOG_DEBUG("ssl " << obj->ssl);
		if (!obj->ssl) {
			std::ostringstream out;
			out << "SSL_new() failed: " << ERR_error_string(ERR_get_error(), nullptr);
			obj->send_error(out.str());
			return;
		}

		SSL_set_fd(obj->ssl, obj->fd);
		SSL_set_connect_state(obj->ssl);
		SSL_set_tlsext_host_name(obj->ssl, obj->hostname.c_str());

		val = connect(obj->fd, obj->address->ai_addr, obj->address->ai_addrlen);
		LOG_DEBUG("connect " << val);
		if (val != 0 && errno != EINPROGRESS) {
			std::ostringstream out;
			out << "connect() failed: " << strerror(val);
			obj->send_error(out.str());
			SSL_free(obj->ssl);
			obj->ssl = nullptr;
			close(obj->fd);
			obj->fd = 0;
			return;
		}

		obj->tcp = new uv_tcp_t;
		obj->tcp->data = obj;
		val = uv_tcp_init(obj->conn_loop, obj->tcp);
		LOG_DEBUG("uv_tcp_init " << val);
		if (val) {
			std::ostringstream out;
			out << "uv_tcp_init() failed: " << uv_strerror(val);
			obj->send_error(out.str());
			SSL_free(obj->ssl);
			obj->ssl = nullptr;
			close(obj->fd);
			obj->fd = 0;
			return;
		}

		val = uv_tcp_open(obj->tcp, obj->fd);
		LOG_DEBUG("uv_tcp_open " << val);
		if (val) {
			std::ostringstream out;
			out << "uv_tcp_open() failed: " << uv_strerror(val);
			obj->send_error(out.str());
			SSL_free(obj->ssl);
			obj->ssl = nullptr;
			close(obj->fd);
			obj->fd = 0;
			return;
		}

		val = uv_tcp_nodelay(obj->tcp, 1);
		LOG_DEBUG("uv_tcp_nodelay " << val);
		if (val) {
			std::ostringstream out;
			out << "uv_tcp_nodelay() failed: " << uv_strerror(val);
			obj->send_error(out.str());
			SSL_free(obj->ssl);
			obj->ssl = nullptr;
			close(obj->fd);
			obj->fd = 0;
			return;
		}


		// // TLS & ALPN parts are handled here,
		// // then packets are passed back and forth in H2:service on an established connection
		// auto read_l = [](uv_stream_s*, long int size, const uv_buf_t* buf) -> void {
		// 	LOG_DEBUG(" < " << size << "bytes: " << buf->base);
		// };

		// auto alloc_l = [](uv_handle_s*, long unsigned int size, uv_buf_t *buf) -> void {
		// 	LOG_DEBUG("allocating " << size << "-byte buffer");
		// 	buf->base = (char*)malloc(size);
		// };

		val = uv_read_start((uv_stream_t*)obj->tcp, conn_thread_uv_on_alloc, conn_thread_uv_on_read);
		if (val) {
			std::ostringstream out;
			out << "uv_read_start() failed: " << uv_strerror(val);
			obj->send_error(out.str());
			SSL_free(obj->ssl);
			obj->ssl = nullptr;
			close(obj->fd);
			obj->fd = 0;
			return;
		}

		obj->read_bio = BIO_new(BIO_s_mem());
		obj->write_bio = BIO_new(BIO_s_mem());
		SSL_set_bio(obj->ssl, obj->read_bio, obj->write_bio);
		SSL_set_connect_state(obj->ssl);

		val = SSL_do_handshake(obj->ssl);
		obj->conn_thread_uv_on_event();

		LOG_INFO("waiting for SSL handshake to complete for " << addr << " in " << uv_thread_self());
	}

	void H2::conn_thread_uv_on_event() {
		if (stats.reading) {
			// LOG_DEBUG("already reading, won't run conn_thread_uv_on_event");
			return;
		}

		stats.reading = true;

		char buf[1024 * 10];

		if(!SSL_is_init_finished(ssl)) {
			int r = SSL_connect(ssl);
			if(r < 0) {
				conn_thread_ssl_handle_error(r);
			}
			conn_thread_uv_check_out(true);
		} else {
			// connect, check if there is encrypted data, or we need to send app data
			int s;
			do {
				int ng = 0;

				s = SSL_read(ssl, buf, sizeof(buf));

				if (s < 0) {
					// LOG_DEBUG("SSL error " << s);
					conn_thread_ssl_handle_error(s);
				} else if(s > 0) {
					// LOG_DEBUG("read " << s << " bytes from SSL");
					
					if (buffer_in.size() > 0) {
						// LOG_DEBUG("copying " << s << " bytes to the end of buffer of " << buffer_in.size());
						std::copy(buf, buf + s, std::back_inserter(buffer_in));

						if (session) {
							ng = nghttp2_session_mem_recv(session, (const uint8_t *)buffer_in.data(), buffer_in.size());
							if (ng < 0) {
								std::ostringstream out;
								out << "error in nghttp2_session_mem_recv(): " << nghttp2_strerror(ng);
								send_error(out.str());
							} else {
								buffer_in.erase(buffer_in.begin(), buffer_in.begin() + ng);
								// LOG_DEBUG("erased " << ng << " from buffer, now " << buffer_in.size());
							}
						} else {
							// LOG_DEBUG("just copying to the back of buffer: " << s);
							std::copy(buf, buf + s, std::back_inserter(buffer_in));
						}
					} else {
						if (session) {
							ng = nghttp2_session_mem_recv(session, (const uint8_t *)buf, s);
							// LOG_DEBUG("buffer empty, reading from memory: " << ng);
							if (ng < 0) {
								std::ostringstream out;
								out << "error in nghttp2_session_mem_recv() 2: " << nghttp2_strerror(ng);
								send_error(out.str());
							} else if (ng < s) {
								std::copy(buf + ng, buf + s, std::back_inserter(buffer_in));
							}
						} else {
							// LOG_DEBUG("just copying to the back of buffer: " << s);
							std::copy(buf, buf + s, std::back_inserter(buffer_in));
						}
					}

					// std::copy(buf, buf+r, std::back_inserter(buffer_in));
					// std::copy(buffer_in.begin(), buffer_in.end(), std::ostream_iterator<char>(std::cout));
					// buffer_in.clear();
					// if ()
				}
			} while (s > 0);

			conn_thread_uv_check_out(false);

			if (tcp_init_sem) {
				uv_sem_post(tcp_init_sem);
			}
		}

		stats.reading = false;
	}

	void H2::conn_thread_uv_on_read(uv_stream_s *stream, long int nread, const uv_buf_t* buf) {
		// LOG_DEBUG("conn_thread_uv_on_read " << buf->len << " bytes in " << uv_thread_self() << ": " << nread);
		H2* c = static_cast<H2*>(stream->data);
		c->stats.service_timeouts = 0;
		if (nread == -1) { // disconnected (?)
			char plain_buf[1024*10];
			int r = SSL_read(c->ssl, plain_buf, sizeof(plain_buf));
			if(r < 0) {
				std::ostringstream out;
				out << "error in SSL_read of uv_on_read: " << ERR_error_string(ERR_get_error(), nullptr);
				c->send_error(out.str());
				c->conn_thread_ssl_handle_error(r);
			} else if(r > 0) {
				std::copy(plain_buf, plain_buf+r, std::back_inserter(c->buffer_in));
			}
			std::copy(c->buffer_in.begin(), c->buffer_in.end(), std::ostream_iterator<char>(std::cout));
			c->stats.error_connection = uv_err_name(nread);
			c->conn_thread_stop();
			// ::exit(0);
		} else if (nread < 0) {
			std::ostringstream out;
			out << "error in uv_on_read: " << uv_err_name(nread);
			c->send_error(out.str());
			if (c->tcp_init_sem) {
				c->stats.init_eofs++;
				std::ostringstream out;
				out << c->stats.init_eofs << "-EOF";
				c->stats.error_connection = out.str();
				uv_sem_post(c->tcp_init_sem);
			} else {
				c->stats.error_connection = "EOF";
				c->conn_thread_stop();
			}
		} else if (nread > 0) {
			int r = BIO_write(c->read_bio, buf->base, nread);     
			if (r <= 0) {
				std::ostringstream out;
				out << "error in BIO_write " << r << ": " << ERR_error_string(ERR_get_error(), nullptr);
				c->send_error(out.str());
			} else if (r != nread) {
				std::ostringstream out;
				out << "BIO_write returned less than expected " << r << ", not " << nread << ": " << uv_err_name(nread);
				c->send_error(out.str());
			}
			c->conn_thread_uv_on_event();
		}
		bufpool_release(buf->base);
	}

	void H2::conn_thread_uv_on_write(uv_write_t* req, int status) {
		delete req;
	}

	void H2::conn_thread_uv_on_alloc(uv_handle_s* handle, long unsigned int size, uv_buf_t *buf) {
		H2* obj = static_cast<H2*>(handle->data);
		// LOG_DEBUG("conn_thread_uv_on_alloc");
		int len;
		void *ptr = bufpool_acquire(obj->bufpool, &len);
		*buf = uv_buf_init((char *)ptr, len);
		// static char storage[1024 * 10];
		// *buf = uv_buf_init(storage, sizeof(storage));
	}

	void H2::conn_thread_ssl_flush_read_bio() {
		// LOG_DEBUG("conn_thread_ssl_flush_read_bio");
		char buf[1024*16];
		int bytes_read = 0;
		while((bytes_read = BIO_read(write_bio, buf, sizeof(buf))) > 0) {
			conn_thread_uv_write_to_socket(buf, bytes_read);
		}
	}

	void H2::conn_thread_uv_write_to_socket(char* buf, size_t len) {
		// LOG_DEBUG("conn_thread_uv_write_to_socket");
		if(len <= 0) {
			return;
		}
		uv_buf_t uvbuf;
		uvbuf.base = buf;
		uvbuf.len = len;
		tcp_write = new uv_write_t;
		int r = uv_write(tcp_write, (uv_stream_t*)tcp, &uvbuf, 1, conn_thread_uv_on_write);
		if (r < 0) {
			delete tcp_write;
			std::ostringstream out;
			out << "error in uv_write " << r << ": " << uv_strerror(r);
			send_error(out.str());
		}
	}

	void H2::conn_thread_ssl_handle_error(int result) {
		// LOG_DEBUG("conn_thread_ssl_handle_error");
		if (result != 0) {
			int error = SSL_get_error(ssl, result);
			if (error == SSL_ERROR_WANT_READ) { // wants to read from bio
				conn_thread_ssl_flush_read_bio();
			} else {
				std::ostringstream out;
				out << "error on SSL_read of conn_thread_uv_on_event " << result << "/ " << error << ": " << ERR_error_string(ERR_get_error(), nullptr);
				send_error(out.str());
			}
		}
	}

	void H2::conn_thread_uv_check_out(bool flush) {    
		// LOG_DEBUG("outing data for SSL finished ? " << SSL_is_init_finished(ssl) << " buffer size " << buffer_out.size() << " flush? " << flush);
		if (SSL_is_init_finished(ssl) && buffer_out.size() > 0) {
			// std::copy(buffer_out.begin(), buffer_out.end(), std::ostream_iterator<char>(std::cout,""));
			int r = 0;
			while ((r = SSL_write(ssl, &buffer_out[0], buffer_out.size())) > 0) {
				// LOG_DEBUG("written " << r);
				if (r == (int)buffer_out.size()) {
					buffer_out.clear();
					// conn_thread_ssl_flush_read_bio();
				} else if (r > 0) {
					buffer_out.erase(buffer_out.begin(), buffer_out.begin() + r);
					// conn_thread_ssl_flush_read_bio();
				}
			}
			if (r < 0) {
				// LOG_DEBUG("SSL Error " << r);
				conn_thread_ssl_handle_error(r);
			} else {
				// LOG_DEBUG("flushed socket, now " << buffer_out.size());
				conn_thread_ssl_flush_read_bio();
			}
		} else if (SSL_is_init_finished(ssl) && tcp_init_sem) {
			if (tcp_init_sem) {
				LOG_DEBUG("SSL handshake done");
				uv_sem_post(tcp_init_sem);
			}
		}
	}






	long H2::conn_thread_h2_get_data(nghttp2_session *session, int32_t stream_id, uint8_t *buf, size_t length, uint32_t *data_flags, nghttp2_data_source *source, void *user_data) {
		h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, stream_id);
		std::string string = *stream->data;

		// LOG_DEBUG("outing data for stream " << stream_id << " (" << stream->stream_id << "): " << stream->data << ", " << string << ", written " << stream->data_written);

		if (stream->data_written > 0) {
			uint32_t copy = string.size() - stream->data_written;
			if (length < copy) {
				// LOG_DEBUG("!!!!!!!!!!!!!!!!!!! copying left " << length << " bytes while we have more :" << string.size() - stream->data_written << " for " << stream_id);
				copy = length;
			}
			if (copy > 0) {
				// LOG_DEBUG("copying left " << copy << " bytes" << " for " << stream_id);
				std::memcpy(buf, (uint8_t *)(string.data() + stream->data_written), copy);
				stream->data_written += copy;
			}
			if (stream->data_written  == string.size()) {
				// LOG_DEBUG("setting EOF");
				*data_flags |= NGHTTP2_DATA_FLAG_EOF;
			}
			// LOG_DEBUG("conn_thread_h2_get_data returns 1 " << copy << " for " << stream_id);
			return copy;
		} else {
			stream->data_written = string.size();
			if (stream->data_written > length) {
				// LOG_DEBUG("copying only " << length << " bytes out of " << stream->data_written << " for " << stream_id);
				stream->data_written = length;
			// } else {
				// LOG_DEBUG("copying all " << stream->data_written << " bytes" << " for " << stream_id);
			}
			if (string.size() <= length) {
				// LOG_DEBUG("setting EOF");
				*data_flags |= NGHTTP2_DATA_FLAG_EOF;
			}
			std::memcpy(buf, (uint8_t *)string.data(), stream->data_written);
			// LOG_DEBUG("conn_thread_h2_get_data returns 2 " << stream->data_written << " for " << stream_id);
			return stream->data_written;
		}
	}

	void H2::conn_thread_initiate_h2(uv_async_t *async) {
		H2 *obj = static_cast<H2*>(async->data);
		// LOG_DEBUG("H2: conn_thread_initiate_h2 in " << uv_thread_self() << " hostname " << obj->hostname);
		nghttp2_session_callbacks *callbacks;

 
		nghttp2_session_callbacks_new(&callbacks);
		
		nghttp2_session_callbacks_set_send_callback(callbacks, [](nghttp2_session *session, const uint8_t *data, size_t length, int flags, void *user_data) -> ssize_t { 
			H2* obj = (H2 *)user_data;
			unsigned char *ch = (unsigned char *)data;

			// LOG_DEBUG("H2: send " << length << " bytes (now " << obj->buffer_out.size() << ")");
			obj->buffer_out.insert(obj->buffer_out.end(), ch, ch + length);

			obj->conn_thread_uv_check_out(!(obj->stats.state & ST_CONNECTED));
			LOG_DEBUG("send_callback returns " << length);
			return length;
		});

		nghttp2_session_callbacks_set_on_frame_recv_callback(callbacks, [](nghttp2_session *session, const nghttp2_frame *frame, void *user_data){
			H2* obj = (H2 *)user_data;
			// LOG_DEBUG("< " << (frame->hd.type == NGHTTP2_SETTINGS ? "settings" : frame->hd.type == NGHTTP2_HEADERS ? "headers" : "other"));
			// verbose_on_frame_recv_callback(session, frame, user_data);
			switch (frame->hd.type) {
				case NGHTTP2_SETTINGS:
					for (size_t i = 0; i < frame->settings.niv; ++i) {
						if (frame->settings.iv[i].settings_id == NGHTTP2_SETTINGS_MAX_CONCURRENT_STREAMS) {
							obj->stats.sending_max = frame->settings.iv[i].value - 10;
							LOG_DEBUG("H2 recv: set sending_max to " << obj->stats.sending_max << "(" << obj->stats.sending << ")" << " in " << uv_thread_self());
						}
					}
					if (obj->h2_sem) {
						uv_sem_post(obj->h2_sem);
					}
					break;
				case NGHTTP2_HEADERS:
					// LOG_DEBUG("H2 recv: headers frame");
					if (frame->headers.cat == NGHTTP2_HCAT_RESPONSE) {
						// session_data->stream_data->stream_id == frame->hd.stream_id) {
						// LOG_DEBUG("H2 recv: All headers received");
					} else if (frame->headers.cat == NGHTTP2_HCAT_HEADERS) {
						if ((frame->hd.flags & NGHTTP2_FLAG_END_STREAM) == 0) {
							nghttp2_submit_rst_stream(session, NGHTTP2_FLAG_NONE, frame->hd.stream_id, NGHTTP2_PROTOCOL_ERROR);
							return 0;
						}
					}
					break;
			}
			return 0;
		});


		nghttp2_session_callbacks_set_on_frame_send_callback(callbacks, [](nghttp2_session *session, const nghttp2_frame *frame, void *user_data){
			// LOG_DEBUG("> " << (frame->hd.type == NGHTTP2_SETTINGS ? "settings" : frame->hd.type == NGHTTP2_HEADERS ? "headers" : "other"));
    		// verbose_on_frame_send_callback(session, frame, user_data);
    		return 0;
		});

		nghttp2_session_callbacks_set_on_data_chunk_recv_callback(callbacks, [](nghttp2_session *session, uint8_t flags, int32_t stream_id, const uint8_t *data, size_t len, void *user_data){
			h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, stream_id);
			std::string str((const char *)data, len);
			stream->response = str;
			// LOG_DEBUG("H2: DATA chunk received for stream " << stream_id << ": " << str);
			return 0;
		});

		nghttp2_session_callbacks_set_on_stream_close_callback(callbacks, [](nghttp2_session *session, int32_t stream_id, uint32_t error_code, void *user_data) -> int {
			h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, stream_id);

			uv_mutex_lock(stream->obj->main_mutex);
			{
				stream->obj->statuses.push_back(std::make_tuple(stream->id, stream->status, stream->response));
			}
			uv_mutex_unlock(stream->obj->main_mutex);

			stream->obj->requests.erase(stream->stream_id);
			stream->obj->stats.sending--;
			stream->obj->stats.sent++;
			// LOG_DEBUG("H2: -------- stream " << stream_id << " " << stream->id << " closed: " << stream->status << ", " << stream->response << ", " << stream->obj->stats.sending << " left");
			uv_async_send(stream->obj->service_async);
			// stream->obj->service();
			delete stream;
			return 0;
		});

		nghttp2_session_callbacks_set_on_header_callback(callbacks, [](nghttp2_session *session, const nghttp2_frame *frame, const uint8_t *name, size_t namelen, const uint8_t *value, size_t valuelen, uint8_t flags, void *user_data) -> int {
			// http2_session_data *session_data = (http2_session_data *)user_data;
			switch (frame->hd.type) {
				case NGHTTP2_HEADERS:
					h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, frame->hd.stream_id);
					if (strncmp((const char *)name, ":status", MIN(namelen, 7)) == 0) {
						std::string status_string((const char *)value, valuelen);
						try {
							int status = std::stoi(status_string);
							if (status == 410) {
								status = -200;
							}
							stream->status = status;
						} catch (const std::invalid_argument &e) {
							stream->status = -1;
						}

						// // LOG_DEBUG("nghttp2_session_callbacks_set_on_header_callback block ");
						// uv_mutex_lock(stream->obj->main_mutex);
						// {
						// 	// LOG_DEBUG("nghttp2_session_callbacks_set_on_header_callback in ");
						// 	if (strncmp((const char *)value, "200", MIN(valuelen, 3)) == 0) {
						// 		// LOG_DEBUG(":status 200 for " << stream->id);
						// 		stream->obj->statuses.push_back(make_pair(stream->id, 1));
						// 	} else if (strncmp((const char *)value, "410", MIN(valuelen, 3)) == 0) {
						// 		// LOG_DEBUG(":status 410 for " << stream->id);
						// 		stream->obj->statuses.push_back(make_pair(stream->id, 0));
						// 	} else {
						// 		// LOG_DEBUG(":status " << std::string((const char *)value, valuelen) << " for " << stream->id);
						// 		std::string code_str((const char *)value, valuelen);
						// 		int code_int = std::stoi(code_str);
						// 		stream->obj->statuses.push_back(make_pair(stream->id, -1 * code_int));
						// 	}
						// 	// LOG_DEBUG("nghttp2_session_callbacks_set_on_header_callback out ");
						// }
						// uv_mutex_unlock(stream->obj->main_mutex);
						// LOG_DEBUG("nghttp2_session_callbacks_set_on_header_callback unblock ");
					} else {
						// LOG_DEBUG("H2 recv: Header received for stream " << frame->hd.stream_id << ": " << std::string((const char *)name, namelen) << " = " << std::string((const char *)value, valuelen));
					}
					if ((frame->hd.flags & NGHTTP2_FLAG_END_STREAM) == 0) {
						// LOG_DEBUG("stream ended with headers");
						stream->obj->conn_thread_uv_on_event();
					}
					return 0;
			}
			// LOG_DEBUG("H2 recv: something for stream " << frame->hd.stream_id << ": " << std::string((const char *)name, namelen) << " = " << std::string((const char *)value, valuelen));
			return 0;

		});

		nghttp2_session_client_new(&obj->session, callbacks, obj);

		nghttp2_session_callbacks_del(callbacks);

		nghttp2_settings_entry iv[] = {
			{NGHTTP2_SETTINGS_MAX_CONCURRENT_STREAMS, 1000},
			{NGHTTP2_SETTINGS_INITIAL_WINDOW_SIZE, NGHTTP2_INITIAL_WINDOW_SIZE}
			// {NGHTTP2_SETTINGS_HEADER_TABLE_SIZE, 4096},
			// {NGHTTP2_SETTINGS_ENABLE_PUSH, 0}
		};
		obj->stats.sending_max = 1000;

		LOG_DEBUG("H2: sending SETTINGS");
		int rv = nghttp2_submit_settings(obj->session, NGHTTP2_FLAG_NONE, iv, 1);
		if (rv != 0) {
			obj->stats.error_connection = nghttp2_strerror(rv);
			LOG_ERROR("H2: Couldn't submit HTTP/2 SETTINGS");
			uv_sem_post(obj->h2_sem);
			return;
		}

		LOG_DEBUG("H2: sending session");
		rv = nghttp2_session_send(obj->session);
		if (rv != 0) {
			obj->stats.error_connection = nghttp2_strerror(rv);
			LOG_ERROR("H2: Couldn't submit HTTP/2 SETTINGS");
			uv_sem_post(obj->h2_sem);
			return;
		}
	}
















	// void H2::conn_thread_stream_closed(int32_t stream_id) {
	// 	auto iterator = requests.find(stream_id);
	// 	if (iterator == requests.end()) {
	// 	} else {
	// 		requests.erase(stream_id)
	// 		stream->obj->stats.sending--;
	// 		stream->obj->stats.sent++;
	// 		LOG_DEBUG("H2: -------- stream " << stream_id << " closed, " << stream->obj->stats.sending << " left");
	// 		stream->obj->service();
	// 		delete stream;
	// 	}

	// }

	void H2::conn_thread_service(uv_async_t *async) {
		H2* obj = static_cast<H2 *>(async->data);
		obj->service();
	}

	void H2::service_timeout(uv_timer_t* handle) {
		H2 *obj = static_cast<H2*>(handle->data);

		if ((obj->stats.state & ST_CONNECTED) && obj->stats.service_timeouts++ <= 0) {
			LOG_DEBUG("H2 service one of first timeouts, servicing again");
			obj->service();
		} else {
			LOG_DEBUG("H2 serviced last timeout, should stop");
			obj->conn_thread_stop();
		}
	}

	void H2::service_ping(uv_timer_t* handle) {
		H2 *obj = static_cast<H2*>(handle->data);

		LOG_DEBUG("pinging H2 state " << obj->stats.state);
		if (obj->stats.state & ST_CONNECTED) {
			obj->service();
		} else {
			LOG_DEBUG("not connected anymore, stopping ping timer " << obj->stats.state);
			uv_timer_stop(obj->service_ping_timer);
		}
	}

	void H2::service() {
		// LOG_DEBUG("H2 service " << stats.state);

		if (stats.state == 0) {
			return;
		}

		if (uv_is_active((uv_handle_t *)service_timer)) {
			// LOG_DEBUG("H2 service active");
			uv_timer_stop(service_timer);
		// } else {
			// LOG_DEBUG("H2 service inactive");
		}
		service_timer->data = this;
		uv_timer_start(service_timer, service_timeout, H2_TIMEOUT, 0);

		LOG_DEBUG(uv_thread_self() << " H2 service: state " << stats.state << " sent " << stats.sent << " (statuses " << statuses.size() << ") sending " << stats.sending << " queue " << queue.size() << " feed_last " << stats.feed_last << " feeding " << stats.feeding << ", H2 state is " << nghttp2_session_want_read(session) << ", " << nghttp2_session_want_write(session));
		if (queue.size() == 0 && stats.feed_last == 0 && stats.sending == 0) {
			if (!(stats.state & ST_DONE)) {
				// LOG_DEBUG("H2 service: done sending");
				stats.state |= ST_DONE;
				uv_timer_stop(service_timer);
				// uv_sem_post(send_sem);
				// uv_sem_destroy(send_sem);
				// delete send_sem;
				// send_sem = nullptr;
				uv_async_send(main_async);
				// conn_thread_stop();
			}
		} else {
			if (!stats.feeding && stats.feed_last != 0 && queue.size() < H2_QUEUE_SIZE / 2) {
				// LOG_DEBUG("H2 service: need to feed");
				uv_async_send(main_async);
			} else 
			if (((stats.state & ST_DONE) && statuses.size()) || statuses.size() > H2_STATUSES_BATCH_SIZE) {
				// LOG_DEBUG("H2 service: need to dump stats");
				uv_async_send(main_async);
			}

			if ((stats.state & ST_CONNECTED) && !(stats.state & ST_DONE) && stats.sending < stats.sending_max && queue.size() > 0) {
				// LOG_DEBUG("H2 service: transmit");
				transmit();
			}
		}

		int rv;
		const uint8_t *ptr;
		while ((rv = nghttp2_session_mem_send(session, &ptr)) > 0) {
			buffer_out.insert(buffer_out.end(), (unsigned char *)ptr, (unsigned char *)ptr + rv);
		}
		if (rv < 0) {
			std::ostringstream out;
			out << "H2: Couldn't submit HTTP/2 session: " << nghttp2_strerror(rv);
			send_error(out.str());
			conn_thread_stop();
			return;
		}

		conn_thread_uv_on_event();
	}

	void H2::transmit() {
		if (stats.transmitting) {
			// LOG_DEBUG("H2: already transmitting");
			return;
		}

		// LOG_DEBUG("H2: locking for transmission");
		uv_mutex_lock(main_mutex);
		stats.transmitting = true;
		{
			// LOG_DEBUG("H2: locking for transmission in ");
			uint32_t count = stats.sending_max - stats.sending;
			uint32_t batch = 0;
			if (queue.size() < count) { count = queue.size(); }
			// LOG_INFO("transmiting " << ¨count << " notification(s)");
			while (stats.sending < stats.sending_max && queue.size() > 0 && batch < H2_SENDING_BATCH_SIZE) {
				// if (stats.sending  + stats.sent > 200) {
				// 	if (stats.sending == 0) {
				// 		int a = 5;
				// 		int b = 0;
				// 		int c = a/b;
				// 		LOG_DEBUG("H2: division by 0 " << c);
				// 	} else {
				// 		break;
				// 	}
				// }
			// while ((stats.sending - batch) < stats.sending_max * 2 / 2 && stats.sending < stats.sending_max / 2 && queue.size() > 0 && batch < H2_SENDING_BATCH_SIZE) {
				stats.sending++;
				batch++;

				h2_stream *stream = queue.front();
				// stream->obj = this;
				queue.pop();


				// LOG_DEBUG(":path: " << stream->path << " / " << (sizeof(stream->path.c_str()) - 1) << " / " << stream->path.size());
				headers[2].value = (uint8_t *) stream->path.c_str();
				headers[2].valuelen = stream->path.size();
				// headers[2] = MAKE_NV(":path", (*tmp), NGHTTP2_NV_FLAG_NO_INDEX);

				if ((stats.sending + stats.sent) == 2) {
					headers[4].flags = NGHTTP2_NV_FLAG_NO_INDEX;
					// headers[4] = MAKE_NV("apns-expiration", expiration, NGHTTP2_NV_FLAG_NO_COPY_NAME | NGHTTP2_NV_FLAG_NO_COPY_VALUE);
				} 

				// static uint8_t buf[200];
				// ssize_t size = nghttp2_hd_deflate_hd(deflater, buf, 200, headers, ARRLEN(headers));


				// fprintf(stderr, "Request headers:\n");
				// print_nv(headers, 6);
				stream->stream_id = nghttp2_submit_request(session, NULL, headers, headers[5].flags == NGHTTP2_NV_FLAG_NO_INDEX ? 5 : 6, &global_data, stream);
				// LOG_DEBUG("H2: sending " << stream->stream_id << " to " << stream->id);

				if (stream->stream_id < 0) {
					LOG_DEBUG("H2: Couldn't nghttp2_submit_request " << nghttp2_strerror(stream->stream_id));
					stream->stream_id = 0;
					stats.sending--;
					queue.push(stream);
				} else {
					requests[stream->stream_id] = stream;
	
					// int rv = nghttp2_session_send(session);
					// if (rv != 0) {
					// 	stats.error_connection = nghttp2_strerror(rv);
					// 	LOG_DEBUG("H2: Couldn't submit HTTP/2 requests");
					// 	return;
					// }
				}

				// stream_id = nghttp2_submit_request(session_data->session, NULL, hdrs,
				//                                    );
				// if (stream_id < 0) {
				//   errx(1, "Could not submit HTTP request: %s", nghttp2_strerror(stream_id));
				// }

				// stream_data->stream_id = stream_id;
			}
			LOG_DEBUG("sent " << batch << " messages");
		}
		stats.transmitting = false;
		uv_mutex_unlock(main_mutex);
		// LOG_DEBUG("unlocked transmission: sending " << stats.sending << " out of max allowed " << stats.sending_max << " while queue is " << queue.size() << ", H2 state is " << nghttp2_session_want_read(session) << ", " << nghttp2_session_want_write(session) << " in " << uv_thread_self() );
	}


}
