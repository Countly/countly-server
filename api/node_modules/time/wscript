import sys
import Options
from os import unlink, rename, symlink, popen
from os.path import exists

def set_options(opt):
  opt.tool_options("compiler_cxx")

def configure(conf):
  conf.check_tool("compiler_cxx")
  conf.check_tool("node_addon")

  conf.check_cxx(header_name='time.h', mandatory=True)
  
  if conf.check_cxx(msg="Checking for 'tm_gmtoff' in struct 'tm'", fragment="""
    #include <time.h>
    int main() {
      time_t now = time(NULL);
      struct tm* tz = localtime(&now);
      int offset = tz->tm_gmtoff;
      return 0;
    }
  """):
    conf.env.append_value('CXXFLAGS', '-DHAVE_TM_GMTOFF=1')

  if conf.check_cxx(msg="Checking for 'altzone' defined by <time.h>", fragment="""
    #include <time.h>
    int main() {
      long tz = altzone;
      return 0;
    }
  """):
    conf.env.append_value('CXXFLAGS', '-DHAVE_ALTZONE=1')

  if conf.check_cxx(msg="Checking for 'timezone' defined by <time.h>", fragment="""
    #include <time.h>
    int main() {
      long tz = timezone;
      return 0;
    }
  """):
    conf.env.append_value('CXXFLAGS', '-DHAVE_TIMEZONE=1')

def build(bld):
  obj = bld.new_task_gen("cxx", "shlib", "node_addon")
  obj.cxxflags = ["-g", "-D_FILE_OFFSET_BITS=64", "-D_LARGEFILE_SOURCE", "-Wall"]
  obj.target = "time"
  obj.source = "src/time.cc"
