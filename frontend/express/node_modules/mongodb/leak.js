require('v8-profiler');

// It is important to use named constructors (like the one below), otherwise
// the heap snapshots will not produce useful outputs for you.
function LeakingClass() {
}

var leaks = [];
setInterval(function() {
  for (var i = 0; i < 100; i++) {
    leaks.push(new LeakingClass);
  }

  console.error('Leaks: %d', leaks.length);
}, 1000);