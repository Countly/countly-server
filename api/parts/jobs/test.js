'use strict';

class Runner {
	run() {
		this.running = true;
		return 'running';
	}

	isRunning() {
		return true;
	}
}

class Swimmer {
	run () {
		this.smimming = true;
		return 'smimming';
	}

	isSwimming() {
		return true;
	}
}


class Triathloner extends Runner {
	isTriathloning () {
		return true;
	}
}


let r = new Runner(),
	s = new Swimmer(),
	t = new Triathloner();

console.log(r instanceof Runner);
console.log(s instanceof Runner);
console.log(t instanceof Runner);
console.log(t instanceof Triathloner);

