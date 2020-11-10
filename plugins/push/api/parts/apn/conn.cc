#include <node.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/ioctl.h>
#include <netinet/tcp.h>
#include <netinet/in.h>
#include <string>
#include <cstring>
#include <iterator>
#include <iomanip>

#include "h2.h"
#include "log.h"
#include "utils.cc"
// #include "trace.h"

// namespace sample {
//   auto ohhai = [](int n) {
//   LOG_INFO("CONN " << uv_thread_self() << ": in ohhai");

//     auto f = [&]() {
//   LOG_INFO("CONN " << uv_thread_self() << ": in f");
//       int *p = NULL;
// 	  *p = 1;
//       return p;
//     };

//     f();
//   };
// }

// void foo() {
//   LOG_INFO("CONN " << uv_thread_self() << ": in foo");
//   using namespace sample;
//   auto x = [&]() {
//     ohhai(0);
//   };
//   x();
// }

// FILE *outfile = stdout;

// void print_frame_attr_indent() { fprintf(outfile, "          "); }
// const char *ansi_escend() { return ""; }
// const char *ansi_esc(const char *code) { return ""; }

// void print_nv(nghttp2_nv *nv) {
//   fprintf(outfile, "%s%s%s: %s\n", ansi_esc("\033[1;34m"), nv->name,
//           ansi_escend(), nv->value);
// }
// void print_nv(nghttp2_nv *nva, size_t nvlen) {
//   auto end = nva + nvlen;
//   for (; nva != end; ++nva) {
//     print_frame_attr_indent();

//     print_nv(nva);
//   }
// }


namespace apns {
	void H2::conn_thread_run(void *arg) {
		H2 *obj = static_cast<H2*>(arg);

		LOG_DEBUG("CONN " << uv_thread_self() << ": going into conn_loop in " << uv_thread_self());
		LOG_DEBUG("CONN " << uv_thread_self() << ": conn_loop returned " << uv_run(obj->conn_loop, UV_RUN_DEFAULT) << " in " << uv_thread_self());

		free(obj->conn_loop);
		obj->conn_loop = NULL;
	}

	void H2::conn_thread_stop_loop(uv_async_t *async) {
		LOG_DEBUG("CONN " << uv_thread_self() << ": stopping conn_loop");
		H2 *obj = static_cast<H2*>(async->data);
		obj->conn_thread_stop();
		// uv_stop(obj->conn_loop);
	}

	void H2::conn_thread_stop() {
		LOG_INFO("CONN " << uv_thread_self() << ": Disconnecting: " << stats.state);

		if (tcp && (stats.state & ST_CONNECTED)) {
			stats.state &= ~ST_CONNECTED;
			
			if (uv_is_active((uv_handle_t *)service_ping_timer)) {
				LOG_DEBUG("CONN " << uv_thread_self() << ": disconnecting, stopping ping timer " << stats.state);
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

				LOG_INFO("CONN " << uv_thread_self() << ": freed tcp & ssl for " << obj->hostname);

				if (obj->send_sem) {
					LOG_INFO("CONN " << uv_thread_self() << ": releasing send semaphore");
					uv_sem_post(obj->send_sem);
				} else {
					if (obj->h2_sem) {
						LOG_INFO("CONN " << uv_thread_self() << ": releasing h2 semaphore");
						uv_sem_post(obj->h2_sem);
					} else if (obj->tcp_init_sem) { 
						LOG_INFO("CONN " << uv_thread_self() << ": releasing tcp semaphore");
						uv_sem_post(obj->tcp_init_sem);
					}
				}
				obj->stats.state = ST_INITIAL;

				uv_stop(obj->conn_loop);
				LOG_INFO("CONN " << uv_thread_self() << ": uv_loop_close: " << uv_loop_close(obj->conn_loop));
				delete obj->conn_loop;

				exit(0);
			});
		}
	}

	void H2::conn_thread_timeout(uv_timer_t* handle) {
		H2 *obj = static_cast<H2*>(handle->data);

		uv_timer_stop(obj->conn_timer);
		LOG_WARNING("CONN " << uv_thread_self() << ": -------------------- TIMEOUT -------------------------");
		if (!(obj->stats.state & ST_CONNECTED)) {
		LOG_WARNING("CONN " << uv_thread_self() << ": ------------------ NOT CONNECTED -------------------------");
			if (obj->tcp) {
				uv_read_stop((uv_stream_t *)obj->tcp);

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

					LOG_WARNING("CONN " << uv_thread_self() << ": freed tcp & ssl for " << obj->hostname);
					LOG_WARNING("CONN " << uv_thread_self() << ": going to try next address");
					obj->conn_async->data = obj;
					uv_async_send(obj->conn_async);
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
		// LOG_ERROR("CONN " << uv_thread_self() << ": timeout in state " << obj->stats.state);
	}

	void H2::conn_thread_connect() {
		LOG_INFO("CONN " << uv_thread_self() << ": looping adresses of " << hostname << " in " << uv_thread_self());
		send_error("looping addresses");

		session = NULL;
		h2_sem = NULL;
		tcp_init_sem = NULL;

		stats.init_eofs = 0;

		while (!(stats.state & ST_CONNECTED) && stats.init_eofs < H2_MAX_EOFS) {
			LOG_INFO("CONN " << uv_thread_self() << ": connection attempt ");
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
				LOG_INFO("CONN " << uv_thread_self() << ": done connecting to " << hostname);

				const unsigned char *next_proto = nullptr;
				unsigned int next_proto_len;
				SSL_get0_next_proto_negotiated(ssl, &next_proto, &next_proto_len);
				for (int i = 0; i < 2; ++i) {
					if (next_proto) {
						std::string negotiated = std::string((const char *)next_proto, next_proto_len);
						LOG_DEBUG("CONN " << uv_thread_self() << ": The negotiated protocol: " << negotiated << " while wating for " << NGHTTP2_H2);
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

				LOG_INFO("CONN " << uv_thread_self() << ": starting HTTP/2 stack");
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

				if (stats.error_connection.empty()) {
					stats.state &= ~(ST_ERROR_RECOVERABLE | ST_ERROR_NONRECOVERABLE);
					stats.state |= ST_CONNECTED;

					LOG_INFO("CONN " << uv_thread_self() << ": done with HTTP/2 stack");
				} else {
					LOG_INFO("CONN " << uv_thread_self() << ": failed to connect (\"" << stats.error_connection << "\"), will reconnect");
					if (tcp) {
						uv_read_stop((uv_stream_t*)tcp);
						tcp = nullptr;
					}

					if (ssl) {
						SSL_free(ssl);
						ssl = nullptr;
					}

					// BIO_free(read_bio);
					// BIO_free(write_bio);

					if (fd) {
						close(fd);
						fd = 0;
					}
				}

				// foo();
			} else {
				LOG_WARNING("CONN " << uv_thread_self() << ": failed to connect, trying next server");
				
				if (tcp) {
					uv_read_stop((uv_stream_t*)tcp);
					tcp = nullptr;
				}

				if (ssl) {
					SSL_free(ssl);
					ssl = nullptr;
				}

				// BIO_free(read_bio);
				// BIO_free(write_bio);

				if (fd) {
					close(fd);
					fd = 0;
				}
			}

		}

		LOG_INFO("CONN " << uv_thread_self() << ": looping done: " << stats.error_connection);
	}

	void H2::conn_thread_initiate(uv_async_t *async) {
		H2* obj = static_cast<H2 *>(async->data);

		LOG_DEBUG("CONN " << uv_thread_self() << ": Starting connect timer");
		if (uv_is_active((uv_handle_t *)obj->conn_timer)) {
			uv_timer_again(obj->conn_timer);
		} else {
			obj->conn_timer->data = obj;
			uv_timer_start(obj->conn_timer, conn_thread_timeout, H2_TIMEOUT, 0);
		}

		auto item = obj->addresses.begin();
		std::advance(item, std::rand() % (obj->addresses.size() - 1));
		auto str = item->first;
		struct addrinfo *i_addrinfo = obj->addresses[str]; 
		LOG_DEBUG("CONN " << uv_thread_self() << ": connecting to " << obj->hostname << " (" << str << ") in " << uv_thread_self());

		obj->stats.error_connection = "";
		obj->tcp = nullptr;

		// obj->fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
		// LOG_DEBUG("CONN " << uv_thread_self() << ": socket " << obj->fd);
		// if (obj->fd == -1) {
		// 	std::ostringstream out;
		// 	out << "socket creation failed: " << strerror(errno);
		// 	obj->send_error(out.str());
		// 	return;
		// }

		int val = 1;

		obj->fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
		LOG_DEBUG("CONN " << uv_thread_self() << ": socket " << obj->fd);
		if (obj->fd == -1) {
			std::ostringstream out;
			out << "socket creation failed: " << strerror(errno);
			obj->send_error(out.str());
			return;
		}

		if (setsockopt(obj->fd, IPPROTO_TCP, TCP_NODELAY, reinterpret_cast<char *>(&val), sizeof(val)) == -1) {
			close(obj->fd);
			obj->fd = 0;
			std::ostringstream out;
			out << "socket creation failed: " << strerror(errno);
			obj->send_error(out.str());
			return;
		}

		if (obj->proxyport != 0) {
		// } else {
			// obj->fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
			// LOG_DEBUG("CONN " << uv_thread_self() << ": socket " << obj->fd);
			// if (obj->fd == -1) {
			// 	std::ostringstream out;
			// 	out << "socket creation failed: " << strerror(errno);
			// 	obj->send_error(out.str());
			// 	return;
			// }

			val = connect(obj->fd, i_addrinfo->ai_addr, i_addrinfo->ai_addrlen);
			LOG_DEBUG("PROXY " << uv_thread_self() << ": CONN " << uv_thread_self() << ": connect " << val);
			if (val != 0 && errno != EINPROGRESS) {
				std::ostringstream out;
				out << "connect() failed: " << errno << ", " << strerror(errno);
				obj->send_error(out.str());
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			}

			fd_set set;
			struct timeval timeout;

			FD_ZERO (&set);
			FD_SET (obj->fd, &set);

			timeout.tv_sec = 4;
			timeout.tv_usec = 0;

			/* select returns 0 if timeout, 1 if input available, -1 if error. */
			val = select(FD_SETSIZE, NULL, &set, NULL, &timeout);
			if (val == 0) {
				obj->send_error("Proxy connect timeout");
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			} else if (val < 0) {
				std::ostringstream out;
				out << "Cannot connect to proxy server: " << strerror(val);
				obj->send_error(out.str());
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			}

			std::ostringstream out;
			out << "CONNECT " << obj->hostname << ":443 HTTP/1.1\r\n";

			if (!obj->proxyauth.empty()) {
				out << "Proxy-Authorization: " << obj->proxyauth << "\r\n";
			}

			out << "\r\n";

			auto req = out.str();
			LOG_DEBUG("PROXY " << uv_thread_self() << ": SENDING " << req);
			
			val = write(obj->fd, req.c_str(), req.size());
			if (val < 0) {
				obj->send_error("Cannot reach proxy server");
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			}

			/* select returns 0 if timeout, 1 if input available, -1 if error. */
			val = select(FD_SETSIZE, &set, NULL, NULL, &timeout);
			if (val == 0) {
				obj->send_error("Proxy server timeout");
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			} else if (val < 0) {
				std::ostringstream out;
				out << "Proxy server response error: " << strerror(val);
				obj->send_error(out.str());
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			}


			int len = 0;
			char buffer[10240];

			ioctl(obj->fd, FIONREAD, &len);
			LOG_DEBUG("PROXY " << uv_thread_self() << ": READING " << len);
			if (len > 0) {
				len = read(obj->fd, buffer, len);
				std::string resp(buffer, len);
				// LOG_DEBUG("PROXY " << uv_thread_self() << ": READ " << len << " " << resp);

				if (resp.find("HTTP/1.1 407") != std::string::npos) {
					obj->send_error("Proxy Authentication error");
					if (obj->tcp_init_sem) {
						uv_sem_post(obj->tcp_init_sem);
					}
					close(obj->fd);
					obj->fd = 0;
					return;
				}
				if (resp.find(" 200 ") == std::string::npos) {
					std::ostringstream out;
					out << "Bad response from proxy server: " << resp;
					obj->send_error(out.str());
					if (obj->tcp_init_sem) {
						uv_sem_post(obj->tcp_init_sem);
					}
					close(obj->fd);
					obj->fd = 0;
					return;
				}
			} else {
				std::ostringstream out;
				out << "Cannot read from proxy server: " << strerror(len);
				obj->send_error(out.str());
				if (obj->tcp_init_sem) {
					uv_sem_post(obj->tcp_init_sem);
				}
				close(obj->fd);
				obj->fd = 0;
				return;
			}

			// if (fcntl(obj->fd, F_SETFL, fcntl(obj->fd, F_GETFL) | O_NONBLOCK) < 0) {
			//     std::ostringstream out;
			//     out << "fcntl() failed: " << strerror(val);
			//     obj->send_error(out.str());
			//     SSL_free(obj->ssl);
			//     obj->ssl = nullptr;
			//     close(obj->fd);
			//     obj->fd = 0;
			//     return;
			// }
		}

		LOG_DEBUG("CONN " << uv_thread_self() << ": setsockopt ");

		obj->ssl = SSL_new(obj->ssl_ctx);
		LOG_DEBUG("CONN " << uv_thread_self() << ": ssl " << obj->ssl);
		if (!obj->ssl) {
			std::ostringstream out;
			out << "SSL_new() failed: " << ERR_error_string(ERR_get_error(), nullptr);
			obj->send_error(out.str());
			return;
		}

		SSL_set_fd(obj->ssl, obj->fd);
		SSL_set_connect_state(obj->ssl);
		SSL_set_tlsext_host_name(obj->ssl, obj->hostname.c_str());

		if (obj->proxyport == 0) {
			val = connect(obj->fd, i_addrinfo->ai_addr, i_addrinfo->ai_addrlen);
			LOG_DEBUG("CONN " << uv_thread_self() << ": CONN " << uv_thread_self() << ": connect " << val);
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
		}

		obj->tcp = new uv_tcp_t;
		obj->tcp->data = obj;
		val = uv_tcp_init(obj->conn_loop, obj->tcp);
		LOG_DEBUG("CONN " << uv_thread_self() << ": CONN " << uv_thread_self() << ": uv_tcp_init " << val);
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
		LOG_DEBUG("CONN " << uv_thread_self() << ": uv_tcp_open " << val);
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
		LOG_DEBUG("CONN " << uv_thread_self() << ": uv_tcp_nodelay " << val);
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
		// 	LOG_DEBUG("CONN " << uv_thread_self() << ":  < " << size << "bytes: " << buf->base);
		// };

		// auto alloc_l = [](uv_handle_s*, long unsigned int size, uv_buf_t *buf) -> void {
		// 	LOG_DEBUG("CONN " << uv_thread_self() << ": allocating " << size << "-byte buffer");
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

		LOG_INFO("CONN " << uv_thread_self() << ": waiting for SSL handshake to complete for " << str << " in " << uv_thread_self());
	}

	void H2::conn_thread_uv_on_event() {
		if (stats.reading) {
			// LOG_DEBUG("CONN " << uv_thread_self() << ": already reading, won't run conn_thread_uv_on_event");
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
					// LOG_DEBUG("CONN " << uv_thread_self() << ": SSL error " << s);
					conn_thread_ssl_handle_error(s);
				} else if(s > 0) {
					// LOG_DEBUG("CONN " << uv_thread_self() << ": read " << s << " bytes from SSL");
					
					if (buffer_in.size() > 0) {
						// LOG_DEBUG("CONN " << uv_thread_self() << ": copying " << s << " bytes to the end of buffer of " << buffer_in.size());
						std::copy(buf, buf + s, std::back_inserter(buffer_in));

						if (session) {
							ng = nghttp2_session_mem_recv(session, (const uint8_t *)buffer_in.data(), buffer_in.size());
							if (ng < 0) {
								std::ostringstream out;
								out << "error in nghttp2_session_mem_recv(): " << nghttp2_strerror(ng);
								send_error(out.str());
							} else {
								buffer_in.erase(buffer_in.begin(), buffer_in.begin() + ng);
								// LOG_DEBUG("CONN " << uv_thread_self() << ": erased " << ng << " from buffer, now " << buffer_in.size());
							}
						} else {
							// LOG_DEBUG("CONN " << uv_thread_self() << ": just copying to the back of buffer: " << s);
							std::copy(buf, buf + s, std::back_inserter(buffer_in));
						}
					} else {
						if (session) {
							ng = nghttp2_session_mem_recv(session, (const uint8_t *)buf, s);
							// LOG_DEBUG("CONN " << uv_thread_self() << ": buffer empty, reading from memory: " << ng);
							if (ng < 0) {
								std::ostringstream out;
								out << "error in nghttp2_session_mem_recv() 2: " << nghttp2_strerror(ng);
								send_error(out.str());
							} else if (ng < s) {
								std::copy(buf + ng, buf + s, std::back_inserter(buffer_in));
							}
						} else {
							// LOG_DEBUG("CONN " << uv_thread_self() << ": just copying to the back of buffer: " << s);
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
		// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_on_read " << buf->len << " bytes in " << uv_thread_self() << ": " << nread);
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
			if (c->h2_sem) {
				c->stats.init_eofs++;
				std::ostringstream out;
				out << c->stats.init_eofs << "-EOF";
				c->stats.error_connection = out.str();
				LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_on_read h2_sem");
				uv_sem_post(c->h2_sem);
			} else if (c->tcp_init_sem) {
				LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_on_read tcp_init_sem " << out.str());
				c->stats.init_eofs++;
				std::ostringstream out;
				out << c->stats.init_eofs << "-EOF";
				c->stats.error_connection = out.str();
				LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_on_read tcp_init_sem");
				uv_sem_post(c->tcp_init_sem);
			} else {
				c->stats.error_connection = "EOF";
				LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_on_read stopping the loop");
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
		// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_on_alloc");
		int len;
		void *ptr = bufpool_acquire(obj->bufpool, &len);
		*buf = uv_buf_init((char *)ptr, len);
		// static char storage[1024 * 10];
		// *buf = uv_buf_init(storage, sizeof(storage));
	}

	void H2::conn_thread_ssl_flush_read_bio() {
		char buf[1024*16];
		int bytes_read = 0;
		while((bytes_read = BIO_read(write_bio, buf, sizeof(buf))) > 0) {
			// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_ssl_flush_read_bio " << bytes_read);
			conn_thread_uv_write_to_socket(buf, bytes_read);
		}
	}

	void H2::conn_thread_uv_write_to_socket(char* buf, size_t len) {
		if(len <= 0) {
			return;
		}
		uv_buf_t uvbuf;
		uvbuf.base = buf;
		uvbuf.len = len;
		tcp_write = new uv_write_t;
		// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_write_to_socket: " << len);
		int r = uv_write(tcp_write, (uv_stream_t*)tcp, &uvbuf, 1, conn_thread_uv_on_write);
		// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_uv_write_to_socket result: " << r);
		if (r < 0) {
			delete tcp_write;
			std::ostringstream out;
			out << "error in uv_write " << r << ": " << uv_strerror(r);
			send_error(out.str());
		}
	}

	void H2::conn_thread_ssl_handle_error(int result) {
		// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_ssl_handle_error");
		if (result != 0) {
			int error = SSL_get_error(ssl, result);
			if (error == SSL_ERROR_WANT_READ) { // wants to read from bio
				// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_ssl_handle_error wants read");
				conn_thread_ssl_flush_read_bio();
			} else {
				std::ostringstream out;
				out << "error on SSL_read of conn_thread_uv_on_event " << result << "/ " << error << ": " << ERR_error_string(ERR_get_error(), nullptr);
				send_error(out.str());
			}
		}
	}

	void H2::conn_thread_uv_check_out(bool flush) {    
		// LOG_DEBUG("CONN " << uv_thread_self() << ": outing data for SSL finished ? " << SSL_is_init_finished(ssl) << " buffer size " << buffer_out.size() << " flush? " << flush);
		if (SSL_is_init_finished(ssl) && buffer_out.size() > 0) {
			// std::copy(buffer_out.begin(), buffer_out.end(), std::ostream_iterator<char>(std::cout,""));
			int r = 0;
			while ((r = SSL_write(ssl, &buffer_out[0], buffer_out.size())) > 0) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": written " << r);
				if (r == (int)buffer_out.size()) {
					buffer_out.clear();
					// conn_thread_ssl_flush_read_bio();
				} else if (r > 0) {
					buffer_out.erase(buffer_out.begin(), buffer_out.begin() + r);
					// conn_thread_ssl_flush_read_bio();
				}
			}
			if (r < 0) {
				LOG_DEBUG("CONN " << uv_thread_self() << ": SSL Error " << r);
				conn_thread_ssl_handle_error(r);
			} else {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": flushing bio, buffer is " << buffer_out.size());
				conn_thread_ssl_flush_read_bio();
			}
		} else if (SSL_is_init_finished(ssl) && tcp_init_sem) {
			if (tcp_init_sem) {
				LOG_DEBUG("CONN " << uv_thread_self() << ": SSL handshake done");
				uv_sem_post(tcp_init_sem);
			}
		}
	}






	long H2::conn_thread_h2_get_data(nghttp2_session *session, int32_t stream_id, uint8_t *buf, size_t length, uint32_t *data_flags, nghttp2_data_source *source, void *user_data) {
		h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, stream_id);
		std::string string = stream->data;
		H2* obj = (H2 *)user_data;

		// LOG_DEBUG("CONN " << uv_thread_self() << ": outing data for stream " << stream_id << " (" << stream->stream_id << "): " << stream->data << ", " << string << ", written " << stream->data_written);

		int32_t strsize = string.size();
		if (strsize > obj->max_data_size) {
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 conn_thread_h2_get_data: setting max_data_size to " << string.size());
			obj->max_data_size = string.size();
		}

		if (stream->data_written > 0) {
			uint32_t copy = string.size() - stream->data_written;
			if (length < copy) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": !!!!!!!!!!!!!!!!!!! copying left " << length << " bytes while we have more :" << string.size() - stream->data_written << " for " << stream_id);
				copy = length;
			}
			if (copy > 0) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": copying left " << copy << " bytes" << " for " << stream_id);
				std::memcpy(buf, (uint8_t *)(string.data() + stream->data_written), copy);
				stream->data_written += copy;
			}
			if (stream->data_written  == string.size()) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": setting EOF");
				*data_flags |= NGHTTP2_DATA_FLAG_EOF;
			}
			// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_h2_get_data returns 1 " << copy << " for " << stream_id);
			return copy;
		} else {
			stream->data_written = string.size();
			if (stream->data_written > length) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": copying only " << length << " bytes out of " << stream->data_written << " for " << stream_id);
				stream->data_written = length;
			// } else {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": copying all " << stream->data_written << " bytes" << " for " << stream_id);
			}
			if (string.size() <= length) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": setting EOF");
				*data_flags |= NGHTTP2_DATA_FLAG_EOF;
			}
			std::memcpy(buf, (uint8_t *)string.data(), stream->data_written);
			// LOG_DEBUG("CONN " << uv_thread_self() << ": conn_thread_h2_get_data returns 2 " << stream->data_written << " for " << stream_id);
			return stream->data_written;
		}
	}

	void H2::conn_thread_initiate_h2(uv_async_t *async) {
		H2 *obj = static_cast<H2*>(async->data);
		// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: conn_thread_initiate_h2 in " << uv_thread_self() << " hostname " << obj->hostname);

		// silence any debug output
 		nghttp2_set_debug_vprintf_callback([](const char *format, va_list args) -> void {
		});

		nghttp2_session_callbacks *callbacks;

		nghttp2_session_callbacks_new(&callbacks);
		
		nghttp2_session_callbacks_set_send_callback(callbacks, [](nghttp2_session *session, const uint8_t *data, size_t length, int flags, void *user_data) -> ssize_t { 
			H2* obj = (H2 *)user_data;
			unsigned char *ch = (unsigned char *)data;

			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: send " << length << " bytes (now " << obj->buffer_out.size() << ")");
			obj->buffer_out.insert(obj->buffer_out.end(), ch, ch + length);

			obj->conn_thread_uv_check_out(!(obj->stats.state & ST_CONNECTED));
			// LOG_DEBUG("CONN " << uv_thread_self() << ": send_callback returns " << length);
			return length;
		});

		nghttp2_session_callbacks_set_on_frame_recv_callback(callbacks, [](nghttp2_session *session, const nghttp2_frame *frame, void *user_data){
			H2* obj = (H2 *)user_data;
			// LOG_DEBUG("CONN " << uv_thread_self() << ": < " << (frame->hd.type == NGHTTP2_SETTINGS ? "settings" : frame->hd.type == NGHTTP2_HEADERS ? "headers" : "other"));
			// verbose_on_frame_recv_callback(session, frame, user_data);
			switch (frame->hd.type) {
				case NGHTTP2_SETTINGS:
					for (size_t i = 0; i < frame->settings.niv; ++i) {
						// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: got setting " << frame->settings.iv[i].settings_id << ": " << frame->settings.iv[i].value << " in " << uv_thread_self());
						if (frame->settings.iv[i].settings_id == NGHTTP2_SETTINGS_MAX_CONCURRENT_STREAMS) {
							if (frame->settings.iv[i].value <= 100 || obj->stats.sending > 0) {
								obj->stats.sending_max = frame->settings.iv[i].value;
								LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: set sending_max to " << obj->stats.sending_max << "(" << obj->stats.sending << ")" << " in " << uv_thread_self());
							} else {
								LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: won't sending_max to " << frame->settings.iv[i].value << "(" << obj->stats.sending << ")" << " in " << uv_thread_self());
							}
						}
					}
					if (obj->h2_sem) {
						uv_sem_post(obj->h2_sem);
					}
					break;
				case NGHTTP2_HEADERS:
					// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: headers frame");
					if (frame->headers.cat == NGHTTP2_HCAT_RESPONSE) {
						// session_data->stream_data->stream_id == frame->hd.stream_id) {
						// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: All headers received");
					} else if (frame->headers.cat == NGHTTP2_HCAT_HEADERS) {
						if ((frame->hd.flags & NGHTTP2_FLAG_END_STREAM) == 0) {
							nghttp2_submit_rst_stream(session, NGHTTP2_FLAG_NONE, frame->hd.stream_id, NGHTTP2_PROTOCOL_ERROR);
							return 0;
						}
					}
					break;
				case NGHTTP2_GOAWAY:
					LOG_DEBUG("CONN " << uv_thread_self() << ":  ========================== GOAWAY! ============================");

					nghttp2_goaway *goaway = (nghttp2_goaway *) frame;
					LOG_DEBUG("CONN " << uv_thread_self() << ":  error_code: " << goaway->error_code);
					LOG_DEBUG("CONN " << uv_thread_self() << ":  last_stream_id: " << goaway->last_stream_id);

					std::string str((const char*)goaway->opaque_data, goaway->opaque_data_len);
					LOG_DEBUG("CONN " << uv_thread_self() << ":  opaque_data: " << str);

					break;
			}
			return 0;
		});

		nghttp2_session_callbacks_set_error_callback(callbacks, [](nghttp2_session *session, const char *msg, size_t len, void *user_data) -> int {
			std::string str(msg, len);
			LOG_DEBUG("CONN " << uv_thread_self() << ": >>>>>>>>>>>>>> ERROR: " << str);
			return 0;
		});

		nghttp2_session_callbacks_set_on_invalid_frame_recv_callback(callbacks, [](nghttp2_session *session, const nghttp2_frame *frame, int lib_error_code, void *user_data) -> int {
			LOG_DEBUG("CONN " << uv_thread_self() << ": >>>>>>>>>>>>>> ERROR INVALID FRAME: " << lib_error_code);
			return 0;
		});


		nghttp2_session_callbacks_set_on_frame_send_callback(callbacks, [](nghttp2_session *session, const nghttp2_frame *frame, void *user_data){
			// LOG_DEBUG("CONN " << uv_thread_self() << ": > " << (frame->hd.type == NGHTTP2_SETTINGS ? "settings" : frame->hd.type == NGHTTP2_HEADERS ? "headers" : "other"));
    		// verbose_on_frame_send_callback(session, frame, user_data);
    		return 0;
		});

		nghttp2_session_callbacks_set_on_data_chunk_recv_callback(callbacks, [](nghttp2_session *session, uint8_t flags, int32_t stream_id, const uint8_t *data, size_t len, void *user_data){
			h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, stream_id);
			std::string str((const char *)data, len);
			stream->response = str;
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: DATA chunk received for stream " << stream_id << ": " << str);
			return 0;
		});

		nghttp2_session_callbacks_set_on_stream_close_callback(callbacks, [](nghttp2_session *session, int32_t stream_id, uint32_t error_code, void *user_data) -> int {
			h2_stream *stream = (h2_stream *)nghttp2_session_get_stream_user_data(session, stream_id);

			uv_mutex_lock(stream->obj->main_mutex);
			{
				std::string cpid(stream->id);
				std::string cpresp(stream->response);
				stream->obj->statuses.push_back(std::make_tuple(cpid, stream->status, cpresp));
			}
			uv_mutex_unlock(stream->obj->main_mutex);

			stream->obj->requests.erase(stream->stream_id);
			stream->obj->stats.sending--;
			stream->obj->stats.sent++;
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: -------- stream " << stream_id << " " << stream->id << " closed: " << stream->status << ", " << stream->response << ", " << stream->obj->stats.sending << " left");
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
							int status = std::atoi(status_string.c_str());
							if (status != 200 && status != 410) {
								LOG_DEBUG("CONN " << stream->id << " returned " << status);
							}
							if (status == 410) {
								status = -200;
							}
							stream->status = status;
						} catch (const std::invalid_argument &e) {
							stream->status = -1;
						}


						// // LOG_DEBUG("CONN " << uv_thread_self() << ": nghttp2_session_callbacks_set_on_header_callback block ");
						// uv_mutex_lock(stream->obj->main_mutex);
						// {
						// 	// LOG_DEBUG("CONN " << uv_thread_self() << ": nghttp2_session_callbacks_set_on_header_callback in ");
						// 	if (strncmp((const char *)value, "200", MIN(valuelen, 3)) == 0) {
						// 		// LOG_DEBUG("CONN " << uv_thread_self() << ": :status 200 for " << stream->id);
						// 		stream->obj->statuses.push_back(make_pair(stream->id, 1));
						// 	} else if (strncmp((const char *)value, "410", MIN(valuelen, 3)) == 0) {
						// 		// LOG_DEBUG("CONN " << uv_thread_self() << ": :status 410 for " << stream->id);
						// 		stream->obj->statuses.push_back(make_pair(stream->id, 0));
						// 	} else {
						// 		// LOG_DEBUG("CONN " << uv_thread_self() << ": :status " << std::string((const char *)value, valuelen) << " for " << stream->id);
						// 		std::string code_str((const char *)value, valuelen);
						// 		int code_int = std::stoi(code_str);
						// 		stream->obj->statuses.push_back(make_pair(stream->id, -1 * code_int));
						// 	}
						// 	// LOG_DEBUG("CONN " << uv_thread_self() << ": nghttp2_session_callbacks_set_on_header_callback out ");
						// }
						// uv_mutex_unlock(stream->obj->main_mutex);
						// LOG_DEBUG("CONN " << uv_thread_self() << ": nghttp2_session_callbacks_set_on_header_callback unblock ");
					} else {
						// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: Header received for stream " << frame->hd.stream_id << ": " << std::string((const char *)name, namelen) << " = " << std::string((const char *)value, valuelen));
					}
					if ((frame->hd.flags & NGHTTP2_FLAG_END_STREAM) == 0) {
						// LOG_DEBUG("CONN " << uv_thread_self() << ": stream ended with headers");
						stream->obj->conn_thread_uv_on_event();
					}
					return 0;
			}
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 recv: something for stream " << frame->hd.stream_id << ": " << std::string((const char *)name, namelen) << " = " << std::string((const char *)value, valuelen));
			return 0;

		});

		nghttp2_session_client_new(&obj->session, callbacks, obj);

		nghttp2_session_callbacks_del(callbacks);

		nghttp2_settings_entry iv[] = {
			{NGHTTP2_SETTINGS_MAX_CONCURRENT_STREAMS, 100},
			{NGHTTP2_SETTINGS_INITIAL_WINDOW_SIZE, NGHTTP2_INITIAL_WINDOW_SIZE}
			// {NGHTTP2_SETTINGS_HEADER_TABLE_SIZE, 4096},
			// {NGHTTP2_SETTINGS_ENABLE_PUSH, 0}
		};
		obj->stats.sending_max = 100;

		// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: sending SETTINGS");
		int rv = nghttp2_submit_settings(obj->session, NGHTTP2_FLAG_NONE, iv, 1);
		if (rv != 0) {
			obj->stats.error_connection = nghttp2_strerror(rv);
			LOG_ERROR("CONN " << uv_thread_self() << ": H2: Couldn't submit HTTP/2 SETTINGS");
			uv_sem_post(obj->h2_sem);
			return;
		}

		// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: sending session");
		rv = nghttp2_session_send(obj->session);
		if (rv != 0) {
			obj->stats.error_connection = nghttp2_strerror(rv);
			LOG_ERROR("CONN " << uv_thread_self() << ": H2: Couldn't submit HTTP/2 SETTINGS");
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
	// 		LOG_DEBUG("CONN " << uv_thread_self() << ": H2: -------- stream " << stream_id << " closed, " << stream->obj->stats.sending << " left");
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
			LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service one of first timeouts, servicing again");
			obj->service();
		} else {
			LOG_DEBUG("CONN " << uv_thread_self() << ": H2 serviced last timeout, should stop");
			obj->conn_thread_stop();
		}
	}

	void H2::service_ping(uv_timer_t* handle) {
		H2 *obj = static_cast<H2*>(handle->data);

		LOG_DEBUG("CONN " << uv_thread_self() << ": pinging H2 state " << obj->stats.state);
		if (obj->stats.state & ST_CONNECTED) {
			obj->service();
		} else {
			LOG_DEBUG("CONN " << uv_thread_self() << ": not connected anymore, stopping ping timer " << obj->stats.state);
			uv_timer_stop(obj->service_ping_timer);
		}
	}

	void H2::service() {
		// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service " << stats.state);

		if (stats.state == 0) {
			return;
		}

		if (uv_is_active((uv_handle_t *)service_timer)) {
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service active");
			uv_timer_stop(service_timer);
		// } else {
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service inactive");
		}
		service_timer->data = this;
		uv_timer_start(service_timer, service_timeout, H2_TIMEOUT, 0);

		LOG_DEBUG(uv_thread_self() << " H2 service: state " << stats.state << " sent " << stats.sent << " (statuses " << statuses.size() << ") sending " << stats.sending << " queue " << queue.size() << " feed_last " << stats.feed_last << " feeding " << stats.feeding << ", H2 state is " << nghttp2_session_want_read(session) << ", " << nghttp2_session_want_write(session));
		if (queue.size() == 0 && stats.feed_last == 0 && stats.sending == 0) {
			if (!(stats.state & ST_DONE)) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service: done sending");
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
				// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service: need to feed");
				uv_async_send(main_async);
			} else 
			if (((stats.state & ST_DONE) && statuses.size()) || statuses.size() > H2_STATUSES_BATCH_SIZE) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service: need to dump stats");
				uv_async_send(main_async);
			}

			if ((stats.state & ST_CONNECTED) && !(stats.state & ST_DONE) && stats.sending < stats.sending_max && queue.size() > 0) {
				// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service: transmit");
				transmit();
			}
		}

		if (nghttp2_session_want_write(session) > 0) {
			int rv = 0;
			const uint8_t *ptr;
			while ((rv = nghttp2_session_mem_send(session, &ptr)) > 0) {
				buffer_out.insert(buffer_out.end(), (unsigned char *)ptr, (unsigned char *)ptr + rv);
				int32_t left = nghttp2_session_get_remote_window_size(session) - buffer_out.size();
				// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 transmit nghttp2_session_mem_send " << rv << " left " << left);
				if (left < max_data_size * 10) {
					// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 transmit break since buffer size 2 * " << max_data_size << " > " << left);
					stats.transmitting = false;
					uv_mutex_unlock(main_mutex);
					return;
				}
			}
			if (rv < 0) {
				std::ostringstream out;
				// out << "H2: Couldn't submit nghttp2_session_mem_send: " << nghttp2_strerror(rv);
				LOG_ERROR("CONN " << uv_thread_self() << ": " << out);
				send_error(out.str());
				conn_thread_stop();
				return;
			}
		}

		// int limit;
		// int rv;
		// const uint8_t *ptr;
		// while ((limit = nghttp2_session_get_remote_window_size(session)) > 1000 && (rv = nghttp2_session_mem_send(session, &ptr)) > 0) {
		// 	LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service nghttp2_session_mem_send " << rv << " while limit is " << limit);
		// 	buffer_out.insert(buffer_out.end(), (unsigned char *)ptr, (unsigned char *)ptr + rv);
		// }

		// int rv = 0;
		// const uint8_t *ptr;
		// while (nghttp2_session_want_read(session) == 0 && (rv = nghttp2_session_mem_send(session, &ptr)) > 0) {
		// 	LOG_DEBUG("CONN " << uv_thread_self() << ": H2 service nghttp2_session_mem_send " << rv);
		// 	buffer_out.insert(buffer_out.end(), (unsigned char *)ptr, (unsigned char *)ptr + rv);
		// }
		// if (rv < 0) {
		// 	std::ostringstream out;
		// 	out << "H2: Couldn't submit HTTP/2 session: " << nghttp2_strerror(rv);
		// 	send_error(out.str());
		// 	conn_thread_stop();
		// 	return;
		// }

		conn_thread_uv_on_event();
	}

	void H2::transmit() {
		if (stats.transmitting) {
			LOG_DEBUG("CONN " << uv_thread_self() << ": H2: already transmitting");
			return;
		}

		// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: locking for transmission");
		uv_mutex_lock(main_mutex);
		stats.transmitting = true;
		{
			// LOG_DEBUG("CONN " << uv_thread_self() << ": H2: locking for transmission in ");
			uint32_t count = stats.sending_max - stats.sending;
			uint32_t batch = 0;
			int32_t bufsize = buffer_out.size();
			int32_t left = nghttp2_session_get_remote_window_size(session) - bufsize;
			if (queue.size() < count) { count = queue.size(); }
			// LOG_INFO("CONN " << uv_thread_self() << ": transmiting " << ¨count << " notification(s)");
			while (stats.sending < stats.sending_max && queue.size() > 0 && batch < H2_SENDING_BATCH_SIZE / 2 && left > max_data_size * 20 && batch < 10) {
				// if (stats.sending  + stats.sent > 200) {
				// 	if (stats.sending == 0) {
				// 		int a = 5;
				// 		int b = 0;
				// 		int c = a/b;
				// 		LOG_DEBUG("CONN " << uv_thread_self() << ": H2: division by 0 " << c);
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


				// LOG_DEBUG("CONN " << uv_thread_self() << ": :path: " << stream->path << " / " << (sizeof(stream->path.c_str()) - 1) << " / " << stream->path.size());
				headers[2].value = (uint8_t *) stream->path.c_str();
				headers[2].valuelen = stream->path.size();
				// headers[2] = MAKE_NV(":path", (*tmp), NGHTTP2_NV_FLAG_NO_INDEX);

				if ((stats.sending + stats.sent) == 2) {
					headers[4].flags = NGHTTP2_NV_FLAG_NO_INDEX;
					// headers[4] = MAKE_NV("apns-expiration", expiration, NGHTTP2_NV_FLAG_NO_COPY_NAME | NGHTTP2_NV_FLAG_NO_COPY_VALUE);
				} 

				if (stream->alert) {
					headers[5].value = PUSH_TYPE_ALERT;
					headers[5].valuelen = PUSH_TYPE_ALERT_LEN;
				} else {
					headers[5].value = PUSH_TYPE_BG;
					headers[5].valuelen = PUSH_TYPE_BG_LEN;
				}
				// static uint8_t buf[200];
				// ssize_t size = nghttp2_hd_deflate_hd(deflater, buf, 200, headers, ARRLEN(headers));


				// fprintf(stderr, "Request headers:\n");
				// print_nv(headers, headers[7].flags == NGHTTP2_NV_FLAG_NO_INDEX ? 7 : 8);
				// int len = headers[7].flags == NGHTTP2_NV_FLAG_NO_INDEX ? 7 : 8;
				// for (int i = 0; i < len; i++) {
				// 	LOG_DEBUG("header " << i << ": " << headers[i]);
				// }
				// LOG_DEBUG("CONN " << uv_thread_self() << ": headers " << nghttp2_strerror(stream->stream_id));
				stream->stream_id = nghttp2_submit_request(session, NULL, headers, headers[7].flags == NGHTTP2_NV_FLAG_NO_INDEX ? 7 : 8, &global_data, stream);
				LOG_DEBUG("CONN " << uv_thread_self() << ": H2: sending " << stream->stream_id << " to " << stream->id << ": " << stream->path << ": " << stream->data);

				if (stream->stream_id < 0) {
					LOG_DEBUG("CONN " << uv_thread_self() << ": H2: Couldn't nghttp2_submit_request " << nghttp2_strerror(stream->stream_id));
					stream->stream_id = 0;
					stats.sending--;
					queue.push(stream);
				} else {
					requests[stream->stream_id] = stream;
	
					int rv = 0;
					const uint8_t *ptr;
					while ((rv = nghttp2_session_mem_send(session, &ptr)) > 0) {
						// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 transmit nghttp2_session_mem_send " << rv);
						buffer_out.insert(buffer_out.end(), (unsigned char *)ptr, (unsigned char *)ptr + rv);
						left = nghttp2_session_get_remote_window_size(session) - buffer_out.size();
						if (left < max_data_size * 20) {
							// LOG_DEBUG("CONN " << uv_thread_self() << ": H2 transmit break since buffer size 2 * " << max_data_size << " > " << left);
							stats.transmitting = false;
							uv_mutex_unlock(main_mutex);
							return;
						}
					}
					if (rv < 0) {
						std::ostringstream out;
						out << "H2: Couldn't submit nghttp2_session_mem_send in transmit: " << nghttp2_strerror(rv);
						LOG_ERROR("CONN " << uv_thread_self() << ": " << out);
						send_error(out.str());
						conn_thread_stop();
						return;
					}

					// int rv = nghttp2_session_send(session);
					// if (rv != 0) {
					// 	stats.error_connection = nghttp2_strerror(rv);
					// 	LOG_DEBUG("CONN " << uv_thread_self() << ": H2: Couldn't submit HTTP/2 requests");
					// 	return;
					// }
				}

				// stream_id = nghttp2_submit_request(session_data->session, NULL, hdrs,
				//                                    );
				// if (stream_id < 0) {
				//   errx(1, "Could not submit HTTP request: %s", nghttp2_strerror(stream_id));
				// }

				// stream_data->stream_id = stream_id;
				bufsize = buffer_out.size();
				left = nghttp2_session_get_remote_window_size(session) - bufsize;
				// LOG_ERROR("CONN " << uv_thread_self() << ": left " << left);
			}
			LOG_DEBUG("CONN " << uv_thread_self() << ": sent " << batch << " messages");
		}
		stats.transmitting = false;
		uv_mutex_unlock(main_mutex);
		// LOG_DEBUG("CONN " << uv_thread_self() << ": unlocked transmission: sending " << stats.sending << " out of max allowed " << stats.sending_max << " while queue is " << queue.size() << ", H2 state is " << nghttp2_session_want_read(session) << ", " << nghttp2_session_want_write(session) << " in " << uv_thread_self() );
	}


}
