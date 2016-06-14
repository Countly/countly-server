#ifndef LOG_H
#define LOG_H

#include <iostream>

class Log {
public:

    enum Level { Debug, Error, Info, Warning };

    static std::ostream& GetStream();
    static void SetLevel(Level l);
    static bool IsLevelActive(Level l);
};

#ifndef NO_LOG
#define LOG_ERROR(M)   do { if (Log::IsLevelActive(Log::Error))   (Log::GetStream() << "ERR: " << M << "\n"); } while (false)
#define LOG_INFO(M)    do { if (Log::IsLevelActive(Log::Info))    (Log::GetStream() << "INF: " << M << "\n"); } while (false)
#define LOG_WARNING(M) do { if (Log::IsLevelActive(Log::Warning)) (Log::GetStream() << "WRN: " << M << "\n"); } while (false)
#define LOG_DEBUG(M)   do { if (Log::IsLevelActive(Log::Debug))   (Log::GetStream() << "DBG: " << M << "\n"); } while (false)
#else
#define LOG_ERROR(M)
#define LOG_INFO(M)
#define LOG_WARNING(M)
#define LOG_DEBUG(M)
#endif

#endif