const J = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:push:schedule:' + process.pid),
    S = require('../parts/store.js'),
    N = require('../parts/note.js');

class ScheduleJob extends J.Job {
    constructor(name, data) {
        super(name, data);
        log.d('initializing ScheduleJob with %j & %j', name, data);
    }

    async prepare (manager, db /*, apps */) {
        log.d('Loading notification %s', this.data.mid);
        this.note = await N.Note.load(db, this.data.mid);
        log.d('Loaded notification %s', this.note && this.note._id);
        this.sg = new S.StoreGroup(db);
    }

    _timeoutCancelled () {
        return true;
    }

    async run (db, done) {
        if (!this.note) {
            return done('Note not found');
        } else if (this.note.result.status & N.Status.Deleted) {
            return done('Note deleted');
        } else if (this.note.result.status & N.Status.Deleted) {
            return done('Note deleted');
        } else if (this.note.tx || this.note.auto) {
            return done();
        }

        let result = await this.sg.pushApps(this.note),
            update = {$set: {'result.total': result.total, 'result.nextbatch': result.next || undefined}, $bit: {'result.status': {or: N.Status.Scheduled}}};
        
        await this.note.updateAtomically(db, {'result.status': {$bitsAllSet: N.Status.Created, $bitsAllClear: N.Status.Deleted | N.Status.Aborted}}, update).then(neo => {
            if (neo) {
                log.i('Updated note %s with scheduling results: %j', this.note._id, update);
                done();
            } else {
                log.w('Couldn\'t update note %s with %j', this.note._id, update);
                done('findAndModify didn\'t succeed');
            }
        }, err => {
            log.e('Error while scheduling note %s', this.note._id);
            done(err);
        });
    }
}

module.exports = ScheduleJob;