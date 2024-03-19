const should = require('should'),
    { Message, MultiTrigger, RecurringTrigger, RecurringType, Time } = require('../api/send/data'),
    { MultiRecurringMapper, setNow } = require('../api/send/audience');

const SCHEDULE_AHEAD = 10 * 60000,
    EASTMOST_TIMEZONE = 14 * 60 * 60000,
    users = [
        {_id: 1, uid: 1, tk: [{tk: {ip: 'ip'}}], tz: 0},
        {_id: 2, uid: 2, tk: [{tk: {ip: 'ip'}}], tz: 180},
        {_id: 3, uid: 3, tk: [{tk: {ip: 'ip'}}], tz: -240},
    ];

describe('PUSH RECURRING', () => {
    it('multi day no timezones', () => {
        let start = new Date(2023, 0, 12, 15, 0),
            later = new Date(2023, 0, 12, 18, 0),
            now = new Date(2000, 0, 1).getTime(),
            nowSkip = new Date(start.getTime() + 1).getTime(),
            nowBad = later.getTime(),
            trigger = new MultiTrigger({
                start: start,
                dates: [
                    start,
                    later
                ]
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        setNow(() => now);

        should.equal(start.getTime(), trigger.nextReference().getTime());
        should.equal(start.getTime() - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(), now).getTime());
        should.equal(start.getTime(), trigger.nextReference(new Date(start.getTime() - 1)).getTime());
        should.equal(start.getTime() - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(new Date(start.getTime() - 1)), now).getTime());
        should.equal(start.getTime() - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(new Date(start.getTime() - 1)), nowSkip).getTime());
        should.equal(later.getTime() - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(new Date(start.getTime() + 1)), nowSkip).getTime());
        should.equal(later.getTime(), trigger.nextReference(start).getTime());
        should.equal(later.getTime() - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(start), now).getTime());
        should.equal(later.getTime(), trigger.nextReference(new Date(start.getTime() + 20)).getTime());
        should.equal(later.getTime() - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(new Date(start.getTime() + 20)), now).getTime());
        should.equal(null, trigger.scheduleDate(trigger.nextReference(nowBad)));
        should.equal(null, trigger.nextReference(later));
        should.equal(null, trigger.scheduleDate(trigger.nextReference(later), now));
        should.equal(null, trigger.nextReference(new Date(later.getTime() + 5 * 60000)));
        should.equal(null, trigger.scheduleDate(trigger.nextReference(new Date(later.getTime() + 5 * 60000)), now));

        let mapped = users.map(u => mapper.map(u, start));
        should.equal(mapped[0]._id.getTimestamp().getTime(), start.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), start.getTime());
        should.equal(mapped[2]._id.getTimestamp().getTime(), start.getTime());
    });

    it('multi day with timezones', () => {
        let start = new Date(2023, 0, 12, 15, 0),
            now = new Date(2000, 0, 1).getTime(),
            first = new Date(2023, 0, 13, 18, 0),
            second = new Date(first.getTime() + 3 * 24 * 60 * 60000),
            third = new Date(first.getTime() + 6 * 24 * 60 * 60000),
            sctz = -3,
            trigger = new MultiTrigger({
                start: start,
                dates: [
                    first,
                    second,
                    third
                ],
                sctz
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        should.equal(first.getTime() - sctz * 60000, trigger.nextReference().getTime());
        should.equal(first.getTime() - sctz * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(), now).getTime());
        should.equal(first.getTime() - sctz * 60000, trigger.nextReference(start).getTime());
        should.equal(first.getTime() - sctz * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(start), now).getTime());
        should.equal(second.getTime() - sctz * 60000, trigger.nextReference(new Date(first.getTime() - sctz * 60000 + 20)).getTime());
        should.equal(second.getTime() - sctz * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(new Date(first.getTime() - sctz * 60000 + 20)), now).getTime());
        should.equal(third.getTime() - sctz * 60000, trigger.nextReference(new Date(second.getTime() - sctz * 60000 + 20)).getTime());
        should.equal(third.getTime() - sctz * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(trigger.nextReference(new Date(second.getTime() - sctz * 60000 + 20)), now).getTime());
        should.equal(null, trigger.nextReference(third.getTime() - sctz * 60000));
        should.equal(null, trigger.scheduleDate(trigger.nextReference(third.getTime() - sctz * 60000), now));
        should.equal(null, trigger.nextReference(new Date(third.getTime() + 5 * 60000)));
        should.equal(null, trigger.scheduleDate(trigger.nextReference(new Date(third.getTime() + 5 * 60000)), now));

        let mapped = users.map(u => mapper.map(u, start));
        should.equal(mapped[0]._id.getTimestamp().getTime(), start.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), start.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), start.getTime() - users[2].tz * 60000);

    });

    it('recurring 2-daily, start is too close to time', () => {
        let start = new Date(2023, 0, 12, 4, 31),
            startZero = new Date(2023, 0, 12),
            now = new Date(2000, 0, 1).getTime(),
            time = (18 * 60 + 30) * 60000,
            sctz = -3,
            every = 2,
            trigger = new RecurringTrigger({
                start,
                bucket: RecurringType.Daily,
                every,
                time,
                sctz
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        let first = trigger.nextReference(),
            second = trigger.nextReference(first),
            third = trigger.nextReference(second);

        should.equal(startZero.getTime() + time + 0 * every * 24 * 60 * 60000, first.getTime());
        should.equal(startZero.getTime() + time + 0 * every * 24 * 60 * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(first, now).getTime());
        should.equal(startZero.getTime() + time + 1 * every * 24 * 60 * 60000, second.getTime());
        should.equal(startZero.getTime() + time + 1 * every * 24 * 60 * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(second, now).getTime());
        should.equal(startZero.getTime() + time + 2 * every * 24 * 60 * 60000, third.getTime());
        should.equal(startZero.getTime() + time + 2 * every * 24 * 60 * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(third, now).getTime());

        let mapped = users.map(u => mapper.map(u, start));
        should.equal(mapped[0]._id.getTimestamp().getTime(), start.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), start.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), start.getTime() - users[2].tz * 60000);
    });

    it('recurring 2-daily, start is 14h 1m & 3min for tz before time', () => {
        let start = new Date(2023, 0, 12, 4, 30),
            startZero = new Date(2023, 0, 12),
            now = new Date(2000, 0, 1).getTime(),
            time = (18 * 60 + 30) * 60000,
            sctz = -3,
            every = 2,
            trigger = new RecurringTrigger({
                start,
                bucket: RecurringType.Daily,
                every,
                time,
                sctz
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        let first = trigger.nextReference(),
            second = trigger.nextReference(first),
            third = trigger.nextReference(second);

        should.equal(startZero.getTime() + time + 0 * every * 24 * 60 * 60000, first.getTime());
        should.equal(startZero.getTime() + time + 0 * every * 24 * 60 * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(first, now).getTime());
        should.equal(startZero.getTime() + time + 1 * every * 24 * 60 * 60000, second.getTime());
        should.equal(startZero.getTime() + time + 1 * every * 24 * 60 * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(second, now).getTime());
        should.equal(startZero.getTime() + time + 2 * every * 24 * 60 * 60000, third.getTime());
        should.equal(startZero.getTime() + time + 2 * every * 24 * 60 * 60000 - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(third, now).getTime());

        let mapped = users.map(u => mapper.map(u, first));
        should.equal(mapped[0]._id.getTimestamp().getTime(), first.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), first.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), first.getTime() - users[2].tz * 60000);
    });

    it('weekly', () => {
        let start = new Date(2023, 0, 12, 5, 30),
            now = new Date(2000, 0, 1).getTime(),
            time = (18 * 60 + 30) * 60000,
            sctz = -3,
            every = 2,
            trigger = new RecurringTrigger({
                start,
                bucket: RecurringType.Weekly,
                every,
                on: [1, 2, 5],
                time,
                sctz
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        let first = trigger.nextReference(),
            second = trigger.nextReference(first),
            third = trigger.nextReference(second),
            fourth = trigger.nextReference(third),
            fifth = trigger.nextReference(fourth),
            sixth = trigger.nextReference(fifth),
            seventh = trigger.nextReference(sixth);

        let one = new Date(2023, 0, 13, 18, 30),
            two = new Date(2023, 0, 23, 18, 30),
            thr = new Date(2023, 0, 24, 18, 30),
            fou = new Date(2023, 0, 27, 18, 30),
            fif = new Date(2023, 1, 6, 18, 30),
            six = new Date(2023, 1, 7, 18, 30),
            sev = new Date(2023, 1, 10, 18, 30);

        should.equal(one.getTime(), first.getTime());
        should.equal(two.getTime(), second.getTime());
        should.equal(thr.getTime(), third.getTime());
        should.equal(fou.getTime(), fourth.getTime());
        should.equal(fif.getTime(), fifth.getTime());
        should.equal(six.getTime(), sixth.getTime());
        should.equal(sev.getTime(), seventh.getTime());

        should.equal(first.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(first, now).getTime());
        should.equal(second.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(second, now).getTime());
        should.equal(third.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(third, now).getTime());
        should.equal(fourth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(fourth, now).getTime());
        should.equal(fifth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(fifth, now).getTime());
        should.equal(sixth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(sixth, now).getTime());
        should.equal(seventh.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(seventh, now).getTime());

        let mapped = users.map(u => mapper.map(u, first));
        should.equal(mapped[0]._id.getTimestamp().getTime(), first.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), first.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), first.getTime() - users[2].tz * 60000);
    });

    it('monthly start from next month', () => {
        let start = new Date(2023, 0, 12, 4, 30),
            startZero = new Date(2023, 0, 12),
            now = new Date(2000, 0, 1).getTime(),
            time = (18 * 60 + 30) * 60000,
            sctz = -3,
            every = 2,
            trigger = new RecurringTrigger({
                start,
                bucket: RecurringType.Monthly,
                every,
                on: [1, 2, 3],
                time,
                sctz
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        let first = trigger.nextReference(),
            second = trigger.nextReference(first),
            third = trigger.nextReference(second),
            fourth = trigger.nextReference(third),
            fifth = trigger.nextReference(fourth),
            sixth = trigger.nextReference(fifth);

        let one = new Date(2023, 1, 1, 18, 30),
            two = new Date(2023, 1, 2, 18, 30),
            thr = new Date(2023, 1, 3, 18, 30),
            fou = new Date(2023, 3, 1, 18, 30),
            fif = new Date(2023, 3, 2, 18, 30),
            six = new Date(2023, 3, 3, 18, 30);

        should.equal(one.getTime(), first.getTime());
        should.equal(two.getTime(), second.getTime());
        should.equal(thr.getTime(), third.getTime());
        should.equal(fou.getTime(), fourth.getTime());
        should.equal(fif.getTime(), fifth.getTime());
        should.equal(six.getTime(), sixth.getTime());

        should.equal(first.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(first, now).getTime());
        should.equal(second.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(second, now).getTime());
        should.equal(third.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(third, now).getTime());
        should.equal(fourth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(fourth, now).getTime());
        should.equal(fifth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(fifth, now).getTime());
        should.equal(sixth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(sixth, now).getTime());

        let mapped = users.map(u => mapper.map(u, first));
        should.equal(mapped[0]._id.getTimestamp().getTime(), first.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), first.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), first.getTime() - users[2].tz * 60000);
    });

    it('monthly partially start from cur month', () => {
        let start = new Date(2023, 0, 12, 4, 30),
            startZero = new Date(2023, 0, 12),
            now = new Date(2000, 0, 1).getTime(),
            time = (18 * 60 + 30) * 60000,
            sctz = -3,
            every = 2,
            trigger = new RecurringTrigger({
                start,
                bucket: RecurringType.Monthly,
                every,
                on: [1, 2, 15],
                time,
                sctz
            }),
            mapper = new MultiRecurringMapper({_id: 'appid', timezone: 'Europe/Moscow'}, new Message({triggers: [trigger.json]}), trigger, 'i', 'p');

        let first = trigger.nextReference(),
            second = trigger.nextReference(first),
            third = trigger.nextReference(second),
            fourth = trigger.nextReference(third),
            fifth = trigger.nextReference(fourth),
            sixth = trigger.nextReference(fifth);

        let one = new Date(2023, 0, 15, 18, 30),
            two = new Date(2023, 2, 1, 18, 30),
            thr = new Date(2023, 2, 2, 18, 30),
            fou = new Date(2023, 2, 15, 18, 30),
            fif = new Date(2023, 4, 1, 18, 30),
            six = new Date(2023, 4, 2, 18, 30);

        should.equal(one.getTime(), first.getTime());
        should.equal(two.getTime(), second.getTime());
        should.equal(thr.getTime(), third.getTime());
        should.equal(fou.getTime(), fourth.getTime());
        should.equal(fif.getTime(), fifth.getTime());
        should.equal(six.getTime(), sixth.getTime());

        should.equal(first.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(first, now).getTime());
        should.equal(second.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(second, now).getTime());
        should.equal(third.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(third, now).getTime());
        should.equal(fourth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(fourth, now).getTime());
        should.equal(fifth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(fifth, now).getTime());
        should.equal(sixth.getTime() - EASTMOST_TIMEZONE - SCHEDULE_AHEAD, trigger.scheduleDate(sixth, now).getTime());

        let mapped = users.map(u => mapper.map(u, first));
        should.equal(mapped[0]._id.getTimestamp().getTime(), first.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), first.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), first.getTime() - users[2].tz * 60000);

        mapped = users.map(u => mapper.map(u, second));
        should.equal(mapped[0]._id.getTimestamp().getTime(), second.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), second.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), second.getTime() - users[2].tz * 60000);

        mapped = users.map(u => mapper.map(u, third));
        should.equal(mapped[0]._id.getTimestamp().getTime(), third.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), third.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), third.getTime() - users[2].tz * 60000);

        mapped = users.map(u => mapper.map(u, fourth));
        should.equal(mapped[0]._id.getTimestamp().getTime(), fourth.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), fourth.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), fourth.getTime() - users[2].tz * 60000);

        mapped = users.map(u => mapper.map(u, fifth));
        should.equal(mapped[0]._id.getTimestamp().getTime(), fifth.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), fifth.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), fifth.getTime() - users[2].tz * 60000);

        mapped = users.map(u => mapper.map(u, sixth));
        should.equal(mapped[0]._id.getTimestamp().getTime(), sixth.getTime());
        should.equal(mapped[1]._id.getTimestamp().getTime(), sixth.getTime() - users[1].tz * 60000);
        should.equal(mapped[2]._id.getTimestamp().getTime(), sixth.getTime() - users[2].tz * 60000);
    });
});
