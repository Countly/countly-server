const should = require('should'),
    data = require('./data'),
    { Template, PLATFORM, util, PushError } = require('../api/send'),
    { Message, State, Status, Filter, Results, PlainTrigger, APITrigger } = require('../api/send/data'),
    { Note } = require('../api/parts/note');

describe('PUSH MIGRATE', () => {
    it('handles complex created messages', () => {
        let note = new Note(data.migration[0]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg.id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Done);
        msg.status.should.equal(Status.Stopped);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.results instanceof Results);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(2);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.not.exist(msg.filter.geos);
        should.not.exist(msg.filter.cohorts);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            en = msg.content(undefined, 'en');

        should.ok(trigger);
        should.ok(trigger instanceof PlainTrigger);
        should.equal(trigger.start, note.date);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.ok(en);
        should.equal(def.title, note.messagePerLocale['default|t']);
        should.deepEqual(def.titlePers, note.messagePerLocale['default|tp']);
        should.equal(def.message, note.messagePerLocale['default']);
        should.deepEqual(def.messagePers, note.messagePerLocale['default|p']);
        should.equal(def.sound, note.sound);
        should.equal(def.badge, note.badge);
        should.deepEqual(def.data, note.data);
        should.not.exist(def.extras);
        should.equal(def.url, note.url);
        should.equal(def.media, note.media);
        should.equal(def.mediaMime, note.mediaMime);
        should.ok(def.buttons);
        should.equal(def.buttons.length, note.buttons);
        should.equal(def.button(0).url, note.messagePerLocale['default|0|l']);
        should.equal(def.button(0).title, note.messagePerLocale['default|0|t']);
        should.not.exist(def.button(0).titlePers);
        should.equal(def.button(1).url, note.messagePerLocale['default|1|l']);
        should.equal(def.button(1).title, note.messagePerLocale['default|1|t']);
        should.not.exist(def.button(1).titlePers);
        should.not.exist(def.specific());

        should.equal(en.title, note.messagePerLocale['en|t']);
        should.deepEqual(en.titlePers, note.messagePerLocale['en|tp']);
        should.equal(en.message, note.messagePerLocale['en']);
        should.deepEqual(en.messagePers, note.messagePerLocale['en|p']);
        should.not.exist(en.sound);
        should.not.exist(en.badge);
        should.not.exist(en.data);
        should.not.exist(en.url);
        should.not.exist(en.media);
        should.not.exist(en.mediaMime);
        should.ok(en.buttons);
        should.equal(en.buttons.length, note.buttons);
        should.equal(en.button(0).url, note.messagePerLocale['en|0|l']);
        should.equal(en.button(0).title, note.messagePerLocale['en|0|t']);
        should.not.exist(en.button(0).titlePers);
        should.equal(en.button(1).url, note.messagePerLocale['en|1|l']);
        should.equal(en.button(1).title, note.messagePerLocale['en|1|t']);
        should.not.exist(en.button(1).titlePers);
        should.not.exist(en.specific());

        should.not.exist(msg.results.error);
        should.not.exist(msg.results.errors);
        should.not.exist(msg.results.responses);
        should.not.exist(msg.results.batches);
        should.not.exist(msg.results.next);
        should.equal(msg.results.total, 1);
        should.equal(msg.results.processed, 0);
        should.equal(msg.results.sent, 0);
    });

    it('handles sent data messages', () => {
        let note = new Note(data.migration[1]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg.id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Done);
        msg.status.should.equal(Status.Sent);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.results instanceof Results);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(1);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.not.exist(msg.filter.geos);
        should.not.exist(msg.filter.cohorts);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            other = msg.content(undefined, 'default');

        should.ok(trigger);
        should.ok(trigger instanceof PlainTrigger);
        should.equal(trigger.start, note.date);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.not.exist(other);
        should.not.exist(def.title);
        should.not.exist(def.titlePers);
        should.not.exist(def.message);
        should.not.exist(def.messagePers);
        should.not.exist(def.sound);
        should.not.exist(def.badge);
        should.not.exist(def.extras);
        should.not.exist(def.badge);
        should.not.exist(def.url);
        should.not.exist(def.media);
        should.not.exist(def.mediaMime);
        should.not.exist(def.buttons);
        should.not.exist(def.button(0));
        should.not.exist(def.button(1));
        should.not.exist(def.specific());

        should.not.exist(msg.results.error);
        should.not.exist(msg.results.errors);
        should.not.exist(msg.results.responses);
        should.not.exist(msg.results.batches);
        should.not.exist(msg.results.next);
        should.equal(msg.results.total, 1);
        should.equal(msg.results.processed, 1);
        should.equal(msg.results.sent, 1);
    });

    it('handles active tx messages', () => {
        let note = new Note(data.migration[2]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg.id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Queued);
        msg.status.should.equal(Status.Scheduled);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.results instanceof Results);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(1);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.not.exist(msg.filter.geos);
        should.not.exist(msg.filter.cohorts);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            other = msg.content(undefined, 'default');

        should.ok(trigger);
        should.ok(trigger instanceof APITrigger);
        should.equal(trigger.start, note.date);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.not.exist(other);
        should.not.exist(def.title);
        should.not.exist(def.titlePers);
        should.equal(def.message, note.messagePerLocale['default']);
        should.not.exist(def.messagePers);
        should.equal(def.sound, 'default');
        should.not.exist(def.badge);
        should.not.exist(def.extras);
        should.not.exist(def.badge);
        should.not.exist(def.url);
        should.not.exist(def.media);
        should.not.exist(def.mediaMime);
        should.not.exist(def.buttons);
        should.not.exist(def.button(0));
        should.not.exist(def.button(1));
        should.not.exist(def.specific());

        should.not.exist(msg.results.error);
        should.not.exist(msg.results.responses);
        should.not.exist(msg.results.batches);
        should.not.exist(msg.results.next);
        should.equal(msg.results.total, 7);
        should.equal(msg.results.processed, 7);
        should.equal(msg.results.sent, 2);
        should.deepEqual(msg.results.errors, {skiptz: 5});
        should.equal(msg.results.errorsCount, 5);
    });

    it('handles errors', () => {
        let note = new Note(data.migration[3]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg.id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Done | State.Error);
        msg.status.should.equal(Status.Failed);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.results instanceof Results);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(1);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.not.exist(msg.filter.geos);
        should.not.exist(msg.filter.cohorts);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            other = msg.content(undefined, 'default');

        should.ok(trigger);
        should.ok(trigger instanceof PlainTrigger);
        should.equal(trigger.start, note.date);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.not.exist(other);
        should.not.exist(def.title);
        should.not.exist(def.titlePers);
        should.equal(def.message, note.messagePerLocale['default']);
        should.not.exist(def.messagePers);
        should.equal(def.sound, 'default');
        should.not.exist(def.badge);
        should.not.exist(def.extras);
        should.not.exist(def.badge);
        should.not.exist(def.url);
        should.not.exist(def.media);
        should.not.exist(def.mediaMime);
        should.not.exist(def.buttons);
        should.not.exist(def.button(0));
        should.not.exist(def.button(1));
        should.not.exist(def.specific());

        should.ok(msg.results.error);
        should.ok(msg.results.error instanceof PushError);
        should.equal(msg.results.error.message, 'ECONNREFUSED');
        should.equal(msg.results.error.date.getTime(), note.date.getTime());
        should.not.exist(msg.results.responses);
        should.not.exist(msg.results.batches);
        should.not.exist(msg.results.next);
        should.equal(msg.results.total, 1);
        should.equal(msg.results.processed, 0);
        should.equal(msg.results.sent, 0);
        should.deepEqual(msg.results.errors, {aborted: 1});
        should.equal(msg.results.errorsCount, 1);
    });
});
