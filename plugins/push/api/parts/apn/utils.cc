// #include "utils.h"
#include <string>
#include <node.h>
#include <nghttp2/nghttp2.h>
#include <sstream>
#include <ctime>

static size_t calc_decode_length(const char* b64input) { //Calculates the length of a decoded string
    size_t len = strlen(b64input),
        padding = 0;

    if (b64input[len-1] == '=' && b64input[len-2] == '=') //last two chars are =
        padding = 2;
    else if (b64input[len-1] == '=') //last char is =
        padding = 1;

    return (len*3)/4 - padding;
}

static int base64_decode(const char* b64message, unsigned char** buffer, size_t* length) { //Decodes a base64 encoded string
    BIO *bio, *b64;

    size_t decodeLen = calc_decode_length(b64message);
    *buffer = (unsigned char*)malloc(decodeLen + 1);
    (*buffer)[decodeLen] = '\0';

    bio = BIO_new_mem_buf(b64message, -1);
    b64 = BIO_new(BIO_f_base64());
    bio = BIO_push(b64, bio);

    BIO_set_flags(bio, BIO_FLAGS_BASE64_NO_NL); //Do not use newlines to flush buffer
    *length = BIO_read(bio, *buffer, strlen(b64message));
    assert(*length == decodeLen); //length should equal decodeLen, else something went horribly wrong
    BIO_free_all(bio);

    return (0); //success
}

static std::string argString(v8::Local<v8::Value> value) {
	v8::String::Utf8Value param1(value->ToString());
	return std::string(*param1);
	// return tempString(*v8::String::Utf8Value(value));
}

static std::string timestr(int offset) {
	time_t t;
	time(&t);
	t += offset;
	std::stringstream strm;
	strm << t;
	return strm.str();
}

#define ARRLEN(x) (sizeof(x) / sizeof(x[0]))

#define MIN(X,Y) {X < Y ? X : Y}

// #define MAKE_NV(K, V, F) { (uint8_t *) K, (uint8_t *)V, sizeof(K) - 1, sizeof(V) - 1, F ? NGHTTP2_NV_FLAG_NONE : NGHTTP2_NV_FLAG_NO_INDEX }

#define MAKE_NV(K, V, F) { (uint8_t *) K, (uint8_t *) V.c_str(), sizeof(K) - 1, V.size(), F }



#define bufbase(ptr) ((bufbase_t *)((char *)(ptr) - sizeof(bufbase_t)))
#define buflen(ptr) (bufbase(ptr)->len)

void *bufpool_alloc(bufpool_t *pool, int len) {
    bufbase_t *base = (bufbase_t *)malloc(sizeof(bufbase_t) + len);
    if (!base) return 0;
    base->pool = pool;
    base->len = len;
    return (char *)base + sizeof(bufbase_t);
}


void *bufpool_grow(bufpool_t *pool) {
    int idx = pool->size;
    void *buf;
    if (idx == BUFPOOL_CAPACITY) return 0;
    buf = bufpool_alloc(pool, BUF_SIZE);
    if (!buf) return 0;
    pool->bufs[idx] = 0;
    pool->size = idx + 1;
    return buf;
}

void *bufpool_dequeue(bufpool_t *pool) {
    int idx;
    void *ptr;
    for (idx = 0; idx < pool->size; ++idx) {
        ptr = pool->bufs[idx];
        if (ptr) {
            pool->bufs[idx] = 0;
            return ptr;
        }
    }
    return bufpool_grow(pool);
}




void bufpool_free(void *ptr) {
    if (!ptr) return;
    free(bufbase(ptr));
}


void *bufpool_dummy() {
    return bufpool_alloc(0, DUMMY_BUF_SIZE);
}

void *bufpool_acquire(bufpool_t *pool, int *len) {
    void *buf = bufpool_dequeue(pool);
    if (!buf) buf = bufpool_dummy();
    *len = buf ? buflen(buf) : 0;
    return buf;
}



void bufpool_enqueue(bufpool_t *pool, void *ptr) {
    int idx;
    for (idx = 0; idx < pool->size; ++idx) {
        if (!pool->bufs[idx]) break;
    }
    assert(idx < pool->size);
    pool->bufs[idx] = ptr;
}

void bufpool_release(void *ptr) {
    bufbase_t *base;
    if (!ptr) return;
    base = bufbase(ptr);
    if (base->pool) bufpool_enqueue(base->pool, ptr);
    else free(base);
}


void bufpool_init(bufpool_t *pool) {
    pool->size = 0;
}

void bufpool_done(bufpool_t *pool) {
    int idx;
    for (idx = 0; idx < pool->size; ++idx) bufpool_free(pool->bufs[idx]);
}


// FILE *outfile = stdout;
// bool color_output = false;

// enum print_type { PRINT_SEND, PRINT_RECV };
// const char LOWER_XDIGITS[] = "0123456789abcdef";

// std::string ascii_dump(const uint8_t *data, size_t len) {
//   std::string res;

//   for (size_t i = 0; i < len; ++i) {
//     auto c = data[i];

//     if (c >= 0x20 && c < 0x7f) {
//       res += c;
//     } else {
//       res += '.';
//     }
//   }

//   return res;
// }
// std::string format_hex(const unsigned char *s, size_t len) {
//   std::string res;
//   res.resize(len * 2);

//   for (size_t i = 0; i < len; ++i) {
//     unsigned char c = s[i];

//     res[i * 2] = LOWER_XDIGITS[c >> 4];
//     res[i * 2 + 1] = LOWER_XDIGITS[c & 0x0f];
//   }
//   return res;
// }

// const char *ansi_esc(const char *code) { return color_output ? code : ""; }

// const char *ansi_escend() { return color_output ? "\033[0m" : ""; }

// const char *frame_name_ansi_esc(print_type ptype) {
//   return ansi_esc(ptype == PRINT_SEND ? "\033[1;35m" : "\033[1;36m");
// }

// void print_nv(nghttp2_nv *nv) {
//   fprintf(outfile, "%s%s%s: %s\n", ansi_esc("\033[1;34m"), nv->name,
//           ansi_escend(), nv->value);
// }

// void print_frame_hd(const nghttp2_frame_hd &hd) {
//   fprintf(outfile, "<length=%zu, flags=0x%02x, stream_id=%d>\n", hd.length,
//           hd.flags, hd.stream_id);
// }

// static void print_frame_attr_indent() { fprintf(outfile, "          "); }

// void print_nv(nghttp2_nv *nva, size_t nvlen) {
//   auto end = nva + nvlen;
//   for (; nva != end; ++nva) {
//     print_frame_attr_indent();

//     print_nv(nva);
//   }
// }

// const char *strsettingsid(int32_t id) {
//   switch (id) {
//   case NGHTTP2_SETTINGS_HEADER_TABLE_SIZE:
//     return "SETTINGS_HEADER_TABLE_SIZE";
//   case NGHTTP2_SETTINGS_ENABLE_PUSH:
//     return "SETTINGS_ENABLE_PUSH";
//   case NGHTTP2_SETTINGS_MAX_CONCURRENT_STREAMS:
//     return "SETTINGS_MAX_CONCURRENT_STREAMS";
//   case NGHTTP2_SETTINGS_INITIAL_WINDOW_SIZE:
//     return "SETTINGS_INITIAL_WINDOW_SIZE";
//   case NGHTTP2_SETTINGS_MAX_FRAME_SIZE:
//     return "SETTINGS_MAX_FRAME_SIZE";
//   case NGHTTP2_SETTINGS_MAX_HEADER_LIST_SIZE:
//     return "SETTINGS_MAX_HEADER_LIST_SIZE";
//   default:
//     return "UNKNOWN";
//   }
// }

// std::string strframetype(uint8_t type) {
//   switch (type) {
//   case NGHTTP2_DATA:
//     return "DATA";
//   case NGHTTP2_HEADERS:
//     return "HEADERS";
//   case NGHTTP2_PRIORITY:
//     return "PRIORITY";
//   case NGHTTP2_RST_STREAM:
//     return "RST_STREAM";
//   case NGHTTP2_SETTINGS:
//     return "SETTINGS";
//   case NGHTTP2_PUSH_PROMISE:
//     return "PUSH_PROMISE";
//   case NGHTTP2_PING:
//     return "PING";
//   case NGHTTP2_GOAWAY:
//     return "GOAWAY";
//   case NGHTTP2_WINDOW_UPDATE:
//     return "WINDOW_UPDATE";
//   case NGHTTP2_ALTSVC:
//     return "ALTSVC";
//   }

//   std::string s = "extension(0x";
//   s += format_hex(&type, 1);
//   s += ')';

//   return s;
// };


// static void print_flags(const nghttp2_frame_hd &hd) {
//   std::string s;
//   switch (hd.type) {
//   case NGHTTP2_DATA:
//     if (hd.flags & NGHTTP2_FLAG_END_STREAM) {
//       s += "END_STREAM";
//     }
//     if (hd.flags & NGHTTP2_FLAG_PADDED) {
//       if (!s.empty()) {
//         s += " | ";
//       }
//       s += "PADDED";
//     }
//     break;
//   case NGHTTP2_HEADERS:
//     if (hd.flags & NGHTTP2_FLAG_END_STREAM) {
//       s += "END_STREAM";
//     }
//     if (hd.flags & NGHTTP2_FLAG_END_HEADERS) {
//       if (!s.empty()) {
//         s += " | ";
//       }
//       s += "END_HEADERS";
//     }
//     if (hd.flags & NGHTTP2_FLAG_PADDED) {
//       if (!s.empty()) {
//         s += " | ";
//       }
//       s += "PADDED";
//     }
//     if (hd.flags & NGHTTP2_FLAG_PRIORITY) {
//       if (!s.empty()) {
//         s += " | ";
//       }
//       s += "PRIORITY";
//     }

//     break;
//   case NGHTTP2_PRIORITY:
//     break;
//   case NGHTTP2_SETTINGS:
//     if (hd.flags & NGHTTP2_FLAG_ACK) {
//       s += "ACK";
//     }
//     break;
//   case NGHTTP2_PUSH_PROMISE:
//     if (hd.flags & NGHTTP2_FLAG_END_HEADERS) {
//       s += "END_HEADERS";
//     }
//     if (hd.flags & NGHTTP2_FLAG_PADDED) {
//       if (!s.empty()) {
//         s += " | ";
//       }
//       s += "PADDED";
//     }
//     break;
//   case NGHTTP2_PING:
//     if (hd.flags & NGHTTP2_FLAG_ACK) {
//       s += "ACK";
//     }
//     break;
//   }
//   fprintf(outfile, "; %s\n", s.c_str());
// }

// static void print_frame(print_type ptype, const nghttp2_frame *frame) {
//   fprintf(outfile, "%s%s%s frame ", frame_name_ansi_esc(ptype),
//           strframetype(frame->hd.type).c_str(), ansi_escend());
//   print_frame_hd(frame->hd);
//   if (frame->hd.flags) {
//     print_frame_attr_indent();
//     print_flags(frame->hd);
//   }
//   switch (frame->hd.type) {
//   case NGHTTP2_DATA:
//     if (frame->data.padlen > 0) {
//       print_frame_attr_indent();
//       fprintf(outfile, "(padlen=%zu)\n", frame->data.padlen);
//     }
//     break;
//   case NGHTTP2_HEADERS:
//     print_frame_attr_indent();
//     fprintf(outfile, "(padlen=%zu", frame->headers.padlen);
//     if (frame->hd.flags & NGHTTP2_FLAG_PRIORITY) {
//       fprintf(outfile, ", dep_stream_id=%d, weight=%u, exclusive=%d",
//               frame->headers.pri_spec.stream_id, frame->headers.pri_spec.weight,
//               frame->headers.pri_spec.exclusive);
//     }
//     fprintf(outfile, ")\n");
//     switch (frame->headers.cat) {
//     case NGHTTP2_HCAT_REQUEST:
//       print_frame_attr_indent();
//       fprintf(outfile, "; Open new stream\n");
//       break;
//     case NGHTTP2_HCAT_RESPONSE:
//       print_frame_attr_indent();
//       fprintf(outfile, "; First response header\n");
//       break;
//     case NGHTTP2_HCAT_PUSH_RESPONSE:
//       print_frame_attr_indent();
//       fprintf(outfile, "; First push response header\n");
//       break;
//     default:
//       break;
//     }
//     print_nv(frame->headers.nva, frame->headers.nvlen);
//     break;
//   case NGHTTP2_PRIORITY:
//     print_frame_attr_indent();

//     fprintf(outfile, "(dep_stream_id=%d, weight=%u, exclusive=%d)\n",
//             frame->priority.pri_spec.stream_id, frame->priority.pri_spec.weight,
//             frame->priority.pri_spec.exclusive);

//     break;
//   case NGHTTP2_RST_STREAM:
//     print_frame_attr_indent();
//     fprintf(outfile, "(error_code=%s(0x%02x))\n",
//             nghttp2_http2_strerror(frame->rst_stream.error_code),
//             frame->rst_stream.error_code);
//     break;
//   case NGHTTP2_SETTINGS:
//     print_frame_attr_indent();
//     fprintf(outfile, "(niv=%lu)\n",
//             static_cast<unsigned long>(frame->settings.niv));
//     for (size_t i = 0; i < frame->settings.niv; ++i) {
//       print_frame_attr_indent();
//       fprintf(outfile, "[%s(0x%02x):%u]\n",
//               strsettingsid(frame->settings.iv[i].settings_id),
//               frame->settings.iv[i].settings_id, frame->settings.iv[i].value);
//     }
//     break;
//   case NGHTTP2_PUSH_PROMISE:
//     print_frame_attr_indent();
//     fprintf(outfile, "(padlen=%zu, promised_stream_id=%d)\n",
//             frame->push_promise.padlen, frame->push_promise.promised_stream_id);
//     print_nv(frame->push_promise.nva, frame->push_promise.nvlen);
//     break;
//   case NGHTTP2_PING:
//     print_frame_attr_indent();
//     fprintf(outfile, "(opaque_data=%s)\n",
//             format_hex(frame->ping.opaque_data, 8).c_str());
//     break;
//   case NGHTTP2_GOAWAY:
//     print_frame_attr_indent();
//     fprintf(outfile, "(last_stream_id=%d, error_code=%s(0x%02x), "
//                      "opaque_data(%u)=[%s])\n",
//             frame->goaway.last_stream_id,
//             nghttp2_http2_strerror(frame->goaway.error_code),
//             frame->goaway.error_code,
//             static_cast<unsigned int>(frame->goaway.opaque_data_len),
//             ascii_dump(frame->goaway.opaque_data,
//                              frame->goaway.opaque_data_len).c_str());
//     break;
//   case NGHTTP2_WINDOW_UPDATE:
//     print_frame_attr_indent();
//     fprintf(outfile, "(window_size_increment=%d)\n",
//             frame->window_update.window_size_increment);
//     break;
//   case NGHTTP2_ALTSVC: {
//     auto altsvc = static_cast<nghttp2_ext_altsvc *>(frame->ext.payload);
//     print_frame_attr_indent();
//     fprintf(outfile, "(origin=[%.*s], altsvc_field_value=[%.*s])\n",
//             static_cast<int>(altsvc->origin_len), altsvc->origin,
//             static_cast<int>(altsvc->field_value_len), altsvc->field_value);
//     break;
//   }
//   default:
//     break;
//   }
// }

// static int verbose_on_frame_recv_callback(nghttp2_session *session,
//                                    const nghttp2_frame *frame,
//                                    void *user_data) {
//   fprintf(outfile, " recv ");
//   print_frame(PRINT_RECV, frame);
//   fflush(outfile);
//   return 0;
// }
// int verbose_on_frame_send_callback(nghttp2_session *session,
//                                    const nghttp2_frame *frame,
//                                    void *user_data) {
//   fprintf(outfile, " send ");
//   print_frame(PRINT_SEND, frame);
//   fflush(outfile);
//   return 0;
// }
