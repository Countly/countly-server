/* jshint ignore:start */

const J = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:push:schedule:' + process.pid),
    S = require('../parts/store.js'),
    N = require('../parts/note.js');
/** schedule job class */
class ScheduleJob extends J.Job {
    /** class constructr
     * @param {string} name - name
     * @param {object} data - data
     */
    constructor(name, data) {
        super(name, data);
        log.d('initializing ScheduleJob with %j & %j', name, data);
    }

    /** prepares job
     * @param {object} manager - not used
     * @param {object} db - db connection
     */
    async prepare(manager, db /*, apps */) {
        log.d('Loading notification %s', this.data.mid);
        this.note = await N.Note.load(db, this.data.mid);
        log.d('Loaded notification %s', this.note && this.note._id);
        this.sg = new S.StoreGroup(db);
    }

    /** _timeoutCancelled()
     * @returns {boolean} true(always)
     */
    _timeoutCancelled() {
        return true;
    }

    /** run
     * @param {object} db - data base connection
     * @param {function} done - callback function
     */
    async run(db, done) {
        let update, error;

        if (!this.note) {
            error = 'Note not found';
        }
        else if (this.note.result.status & N.Status.Deleted) {
            update = {$set: {'result.total': 0}, $bit: {'result.status': {and: ~N.Status.Scheduled, or: N.Status.Deleted}}};
            error = 'Note deleted';
        }
        else if (this.note.result.status & N.Status.Aborted) {
            update = {$set: {'result.total': 0}, $bit: {'result.status': {and: ~N.Status.Scheduled, or: N.Status.Aborted}}};
            error = 'Note deleted';
        }
        else if (this.note.tx || this.note.auto) {
            error = 'tx or auto';
        }
        else {
            await this.sg.ensureIndexes(this.note);
            let result = await this.sg.pushApps(this.note);
            if (result.total === 0) {
                update = {$set: {'result.total': 0, 'result.processed': 0, 'result.status': N.Status.DONE_ABORTED, 'result.error': 'No audience'}, $unset: {'result.nextbatch': 1}};
            }
            else {
                update = {$set: {'result.total': result.total, 'result.nextbatch': result.next || undefined}, $bit: {'result.status': {or: N.Status.Scheduled}}};
            }
        }

        if (update) {
            await this.note.updateAtomically(db, {'result.status': {$bitsAllSet: N.Status.Created, $bitsAllClear: N.Status.Deleted | N.Status.Aborted}}, update).then(neo => {
                if (neo) {
                    log.i('Updated note %s with scheduling results: %j', this.note._id, update);
                }
                else {
                    log.w('Couldn\'t update note %s with %j', this.note._id, update);
                }
            }, err => {
                log.e('Error while scheduling note %s', this.note._id);
                done(err);
            });
        }

        if (error) {
            done(error);
        }
        else {
            done();
        }
    }
}

module.exports = ScheduleJob;