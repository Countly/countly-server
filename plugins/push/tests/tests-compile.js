const should = require('should'),
    data = require('./data'),
    { Message, Template, PLATFORM } = require('../api/send');

describe('PUSH COMPILE', () => {
    it('compiles APN templates', () => {
        let msg = new Message(data.messages.m1),
            template = new Template(msg, PLATFORM.i),
            [p1, p2, p3, p4, p5, p6, p7, p8] = data.compilation,
            [r1, r2, r3, r4, r5, r6, r7, r8] = data.compilation_results.i;

        // just to catch silly caching bugs
        for (let i = 0; i < 1000; i++) {
            should.deepEqual(template.compile(p1), r1, 'No p case passes');
            should.deepEqual(template.compile(p2), r2, 'la-only case passes');
            should.deepEqual(template.compile(p3), r3, 'overriding sound case passes');
            should.deepEqual(template.compile(p4), r4, 'overriding sound for locale case passes');
            should.deepEqual(template.compile(p5), r5, 'overriding sound for wrong locale case passes');
            should.deepEqual(template.compile(p6), r6, 'overriding data & sound case passes');
            should.deepEqual(template.compile(p7), r7, 'empty o + extras case passes');
            should.deepEqual(template.compile(p8), r8, 'extras case passes');
        }
    });
});

// describe('compilation bench', () => {
//     it('comparing old & templated notification compilation', () => {
//         let templated = {},
//             noted = {},
//             tests = ['simple', 'compilation', 'personalization'],
//             runs = 3,
//             randomness = 100;

//         function run(name, run, f) {
//             let now = Date.now();
//             f();
//             now = Date.now() - now;
//             console.log(`Run ${run} of ${name} took ${now}ms`);
//             return now;
//         }

//         for (let r = 0; r <= runs; r++) {
//             tests.forEach(name => {
//                 let pushes = data[`bench_${name}`](randomness),
//                     note = new Note(data.notes.m1),
//                     template = new Template(Message.fromNote(note), PLATFORM.i, true),
//                     t = 0,
//                     n = 0;

//                 console.log(`----------------------------`);
//                 templated[name] = templated[name] || [];
//                 templated[name].push(run(`Template ${name}`, r, () => {
//                     for (let i = 0; i < pushes.length; i++) {
//                         t += template.compile(pushes[i], i).length;
//                         // if (i < 5) {
//                         //     console.log(`Template ${i}: ${template.compile(pushes[i], i)}`);
//                         // }
//                     }
//                 }));
//                 noted[name] = noted[name] || [];
//                 noted[name].push(run(`Note ${name}`, r, () => {
//                     for (let i = 0; i < pushes.length; i++) {
//                         n += note.compile('i', pushes[i], i).length;
//                         // if (i < 5) {
//                         //     console.log(`Note ${i}: ${note.compile('i', pushes[i], i)}`);
//                         // }
//                     }
//                 }));
//                 console.log(`Total data produced is ${t} for templates (${template.cache.length} cached items), ${n} for notes`);
//             });
//             console.log(`+++++++++++++++++++++++++++`);
//         }

//         console.log(`============================`);
//         tests.forEach(name => {
//             templated[name] = templated[name].reduce((a, b) => a + b, 0);
//             noted[name] = noted[name].reduce((a, b) => a + b, 0);

//             console.log(`Template ${name} took ${templated[name]}ms which averages to ${Math.round(templated[name] / runs)}ms per run`);
//             console.log(`Note ${name} took ${noted[name]}ms which averages to ${Math.round(noted[name] / runs)}ms per run`);
//         });
//     }).timeout(15000);
// });
// describe('hashing strength', () => {
//     it('ensuring 1bln of hashes don\'t overlap', () => {
//         let hashes = {};
//         for (let i = 0; i < 100000000; i++) {
//             let h = util.hash({a: i});
//             if (hashes[h]) {
//                 should.fail(`{a: ${i}} fails`);
//             }
//             hashes[h] = true;
//         }
//     });
// });
