/* jshint ignore:start */

const { Message, Audience, State, Status } = require('../send/index.js'),
    J = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:push:schedule:' + process.pid);

/** 
 * Push notification sheduling job
 */
class ScheduleJob extends J.Job {
    /** 
     * Constructor
     * 
     * @param {string} name - job name
     * @param {object} data - job data
     */
    constructor(name, data) {
        super(name, data);
        log.d('initializing ScheduleJob with %j & %j', name, data);
    }

    /** prepares job
     * @param {object} manager - not used
     * @param {object} db - db connection
     */
    async prepare() {
        log.d('Loading message %s', this.data.mid);
        this.message = await Message.findOne(this.data.mid);
        if (this.message) {
            this.audience = new Audience(log, this.message);
            await this.audience.getApp();
        }
        log.d('Loaded message %s', this.message && this.message._id);
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

        if (!this.message) {
            error = 'Message not found';
        }
        else if (this.message.is(State.Deleted)) {
            error = 'Message deleted';
        }
        else if (this.message.is(State.Error)) {
            error = 'Message is in Error state';
        }
        else {
            let plain = this.message.triggerPlain(),
                resch = this.message.triggerRescheduleable();
            if (!plain && !resch) {
                error = 'No plain or rescheduleable trigger in the message';
            }
            else {
                if (plain) {
                    let res = await this.message.updateAtomically(
                        { _id: this.message._id },
                        {
                            $set: {
                                state: State.Created | State.Scheduling,
                                status: Status.Scheduled
                            }
                        }
                    );

                    if (!res) {
                        error = 'Failed to update message';
                    }

                    let result = await this.audience.push(plain).setStart(this.data.start).run(); // this.data.start is supposed to be undefined for now

                    if (result.total === 0) {
                        update = {
                            $set: {
                                'result.total': 0,
                                'result.processed': 0,
                                'state': State.Created | State.Done | State.Error,
                                status: Status.Failed,
                                'result.error': 'NoAudience'
                            },
                            $unset: {
                                'result.next': 1
                            }
                        };
                    }

                    if (update) {
                        await this.message.update(update, () => {});
                        log.i('Scheduled message %s: %j / %j / %j', this.message.id, this.message.state, this.message.status, this.message.result.json);
                    }
                    await this.message.updateAtomically(
                        { _id: this.message._id },
                        {
                            $bit: {
                                state: {
                                    and: ~State.Scheduling,
                                    or: State.Streamable
                                }
                            }
                        }
                    );
                }

                if (resch) {
                    let res = await this.message.updateAtomically(
                        { _id: this.message._id },
                        {
                            $bit: {
                                state: {
                                    and: ~State.Streamable,
                                    or: State.Scheduling
                                }
                            },
                            $set: {
                                status: Status.Scheduled
                            }
                        }
                    );
                    if (!res) {
                        error = 'Failed to update message';
                    }

                    let now = new Date(this.data.reference),
                        result = await this.audience.push(resch).setStart(now).run();

                    log.i('Rescheduleable message %s scheduling result for %s: %j, full result %j', this.message.id, now, result, this.message.result.json);

                    await this.message.updateAtomically(
                        { _id: this.message._id },
                        {
                            $bit: {
                                state: {
                                    and: ~State.Scheduling,
                                    or: State.Streamable
                                }
                            }
                        }
                    );

                    await this.message.schedule(log);
                }
            }
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