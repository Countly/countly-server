const should = require('should'),
    data = require('./data'),
    { Template, PLATFORM, util } = require('../api/send'),
    { Note } = require('../api/parts/note');

describe('PUSH COMPILE', () => {
    it('compiles APN templates', () => {
        let note = new Note(data.notes.n1),
            template = new Template(note, PLATFORM.i),
            [p1, p2, p3, p4, p5, p6] = data.compilation,
            [r1, r2, r3, r4, r5, r6] = data.compilation_results.i;

        // just to catch silly caching bugs
        for (let i = 0; i < 1000; i++) {
            should.deepEqual(template.compile(p1), r1, 'No p case passes');
            should.deepEqual(template.compile(p2), r2, 'la-only case passes');
            should.deepEqual(template.compile(p3), r3, 'overriding sound case passes');
            should.deepEqual(template.compile(p4), r4, 'overriding data & sound case passes');
            should.deepEqual(template.compile(p5), r5, 'empty o + extras case passes');
            should.deepEqual(template.compile(p6), r6, 'extras case passes');
        }
    });
});

// describe('compilation bench', () => {
//     it('comparing old & templated notification compilation', () => {
//         let note = new Note(data.notes.n1);
//         let template = new Template(note, PLATFORM.i);
//         let now = Date.now();
//         let c = 0;
//         for (let i = 0; i < 100000; i++) {
//             c += data.compilation.map(m => note.compile('i', m)).reduce((_a, b) => b++, 0);
//         }
//         console.log('Note compilation %dms', Date.now() - now);
//         now = Date.now();
//         for (let i = 0; i < 100000; i++) {
//             c += data.compilation.map(m => template.compile(m)).reduce((_a, b) => b++, 0);
//         }
//         console.log('Template compilation %dms', Date.now() - now);
//         now = Date.now();
//         for (let i = 0; i < 100000; i++) {
//             c += data.compilation.map(m => util.hash(m, m.o ? util.hash(m.o) : 0)).reduce((_a, b) => b++, 0);
//         }
//         console.log('Hashing %dms', Date.now() - now);
//         return c;
//     });
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
