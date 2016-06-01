#include "log.h"


static enum Log::Level lev = Log::Level::Debug;

std::ostream& Log::GetStream() { return std::cout; }

void Log::SetLevel(Level l) { lev = l; }

bool Log::IsLevelActive(Level l) { 
	if (!lev || lev == Debug) {
		return true; 
	} else if (lev == Info) {
		return l == Info || l == Warning || l == Error;
	} else if (lev == Warning) {
		return l == Warning || l == Error;
	} else if (lev == Error) {
		return l == Error;
	}
	return true; 
}
