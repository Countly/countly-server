var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

beforeEach(function(done) {
    this.timeout(0);
    rl.question("Press Enter to continue\n", function(answer) {
        done();
    });
});
after(function() {
    rl.close();
});