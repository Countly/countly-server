require("should");
var isolatedVm = require("../../plugins/hooks/api/parts/isolated-vm.js");
var CustomCodeEffect = require("../../plugins/hooks/api/parts/effects/custom_code.js");

// The hooks plugin installs isolated-vm 6 (Node.js 22) and 7 (Node.js 24+) as optional
// dependencies, because neither builds on every supported Node.js. These pin which one is
// picked, that a missing build falls back to the other, and that custom code still runs in
// the sandbox on whatever Node.js this suite runs on.
describe("hooks isolated-vm by Node.js version", function() {
    it("prefers 6 on Node.js 22 and 7 on Node.js 24 and later", function() {
        isolatedVm.candidates("22.23.4").should.eql(["isolated-vm-6", "isolated-vm-7"]);
        isolatedVm.candidates("24.15.0").should.eql(["isolated-vm-7", "isolated-vm-6"]);
        isolatedVm.candidates("26.12.1").should.eql(["isolated-vm-7", "isolated-vm-6"]);
    });

    it("falls back to the other build when the preferred one did not install", function() {
        var tried = [];
        var ivm = isolatedVm.load(function(name) {
            tried.push(name);
            if (name === "isolated-vm-7") {
                throw new Error("Cannot find module 'isolated-vm-7'");
            }
            return {build: name};
        }, "26.12.1");
        ivm.should.eql({build: "isolated-vm-6"});
        tried.should.eql(["isolated-vm-7", "isolated-vm-6"]);
    });

    it("names both attempts when no build loads", function() {
        (function() {
            isolatedVm.load(function(name) {
                throw new Error("missing " + name);
            }, "22.23.4");
        }).should.throw(/No isolated-vm build loads on Node\.js 22\.23\.4.*missing isolated-vm-6.*missing isolated-vm-7/);
    });

    it("runs custom code in the sandbox on this Node.js", async function() {
        this.timeout(20000);
        var effect = new CustomCodeEffect();
        var result = await effect.run({
            effect: {configuration: {code: "params.total = params.a + params.b; params.node = typeof process;"}},
            params: {a: 2, b: 3},
            rule: {_id: "unit-test"},
            effectStep: 0
        });
        result.params.should.eql({a: 2, b: 3, total: 5, node: "undefined"});
    });
});
