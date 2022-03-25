const should = require('should'),
    data = require('./data'),
    { PushError } = require('../api/send'),
    { Message, State, Status, Filter, Result, PlainTrigger, APITrigger } = require('../api/send/data'),
    { Note } = require('../api/parts/note');

describe('PUSH MIGRATE', () => {
    it('handles complex created messages', () => {
        let note = new Note(data.migration[0]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg._id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Done);
        msg.status.should.equal(Status.Stopped);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.result instanceof Result);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(3);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.equal(msg.filter.geos.length, 0);
        should.equal(msg.filter.cohorts.length, 0);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            en = msg.content(undefined, 'en'),
            a = msg.content('a');

        should.ok(trigger);
        should.ok(trigger instanceof PlainTrigger);
        should.equal(trigger.start, note.date);
        should.equal(trigger.delayed, true);
        should.equal(trigger.tz, true);
        should.equal(trigger.sctz, 3600000);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.ok(en);
        should.equal(def.title, note.messagePerLocale['default|t']);
        should.deepEqual(def.titlePers, note.messagePerLocale['default|tp']);
        should.equal(def.message, note.messagePerLocale['default']);
        should.deepEqual(def.messagePers, note.messagePerLocale['default|p']);
        should.equal(def.sound, note.sound);
        should.equal(def.badge, undefined);
        should.deepEqual(def.data, undefined);
        should.not.exist(def.extras);
        should.equal(def.url, undefined);
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

        should.equal(a.sound, note.sound);
        should.equal(a.badge, note.badge);
        should.deepEqual(a.data, note.data);
        should.equal(a.url, note.url);

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

        should.not.exist(msg.result.error);
        should.not.exist(msg.result.errors);
        should.not.exist(msg.result.responses);
        should.not.exist(msg.result.batches);
        should.not.exist(msg.result.next);
        should.equal(msg.result.total, 1);
        should.equal(msg.result.processed, 0);
        should.equal(msg.result.sent, 0);
    });

    it('handles sent data messages', () => {
        let note = new Note(data.migration[1]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg._id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Done);
        msg.status.should.equal(Status.Sent);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.result instanceof Result);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(2);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.equal(msg.filter.geos.length, 0);
        should.equal(msg.filter.cohorts.length, 0);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            a = msg.content('a');

        should.ok(trigger);
        should.ok(trigger instanceof PlainTrigger);
        should.equal(trigger.start, note.date);
        should.equal(trigger.delayed, note.delayed);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.ok(a);
        should.not.exist(def.title);
        should.not.exist(def.titlePers);
        should.not.exist(def.message);
        should.not.exist(def.messagePers);
        should.not.exist(def.sound);
        should.not.exist(def.badge);
        should.not.exist(def.extras);
        should.not.exist(def.url);
        should.not.exist(def.media);
        should.not.exist(def.mediaMime);
        should.not.exist(def.buttons);
        should.not.exist(def.button(0));
        should.not.exist(def.button(1));
        should.not.exist(def.specific());

        should.not.exist(a.title);
        should.not.exist(a.titlePers);
        should.not.exist(a.message);
        should.not.exist(a.messagePers);
        should.not.exist(a.sound);
        should.not.exist(a.badge);
        should.not.exist(a.extras);
        should.not.exist(a.url);
        should.not.exist(a.media);
        should.not.exist(a.mediaMime);
        should.not.exist(a.buttons);
        should.not.exist(a.button(0));
        should.not.exist(a.button(1));
        should.not.exist(a.specific());

        should.not.exist(msg.result.error);
        should.not.exist(msg.result.errors);
        should.not.exist(msg.result.responses);
        should.not.exist(msg.result.batches);
        should.not.exist(msg.result.next);
        should.equal(msg.result.total, 1);
        should.equal(msg.result.processed, 1);
        should.equal(msg.result.sent, 1);
    });

    it('handles active tx messages', () => {
        let note = new Note(data.migration[2]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg._id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Streamable);
        msg.status.should.equal(Status.Scheduled);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.result instanceof Result);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(2);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.equal(msg.filter.geos.length, 0);
        should.equal(msg.filter.cohorts.length, 0);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            a = msg.content('a');

        should.ok(trigger);
        should.ok(trigger instanceof APITrigger);
        should.equal(trigger.start, note.date);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.ok(a);
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
        should.equal(a.sound, 'default');
        should.deepEqual(a.json, {p: 'a', sound: 'default'});

        should.not.exist(msg.result.error);
        should.not.exist(msg.result.responses);
        should.not.exist(msg.result.batches);
        should.not.exist(msg.result.next);
        should.equal(msg.result.total, 7);
        should.equal(msg.result.processed, 7);
        should.equal(msg.result.sent, 2);
        should.deepEqual(msg.result.errors, {skiptz: 5});
        should.equal(msg.result.errored, 5);
    });

    it('handles errors', () => {
        let note = new Note(data.migration[3]),
            msg = Message.fromNote(note);

        note._id.should.equal(msg._id);
        note.apps[0].should.equal(msg.app);
        note.platforms.should.deepEqual(msg.platforms);
        msg.state.should.equal(State.Done | State.Error);
        msg.status.should.equal(Status.Failed);
        should.ok(msg.filter instanceof Filter);
        should.ok(msg.result instanceof Result);
        should.ok(Array.isArray(msg.triggers));
        should.ok(Array.isArray(msg.contents));
        msg.triggers.length.should.equal(1);
        msg.contents.length.should.equal(3);

        should.equal(msg.filter.isEmpty, true);
        should.not.exist(msg.filter.user);
        should.not.exist(msg.filter.drill);
        should.equal(msg.filter.geos.length, 0);
        should.equal(msg.filter.cohorts.length, 0);

        let trigger = msg.triggers[0],
            info = msg.info,
            def = msg.content(),
            i = msg.content('i'),
            a = msg.content('a');

        should.ok(trigger);
        should.ok(trigger instanceof PlainTrigger);
        should.equal(trigger.start, note.date);
        should.ok(info);
        should.equal(info.created, note.created);
        should.ok(def);
        should.ok(i);
        should.ok(a);
        should.not.exist(def.title);
        should.not.exist(def.titlePers);
        should.equal(def.message, note.messagePerLocale['default']);
        should.not.exist(def.messagePers);
        should.equal(def.sound, 'default');
        should.equal(i.sound, 'default');
        should.equal(a.sound, 'default');
        should.deepEqual(i.json, {p: 'i', sound: 'default'});
        should.deepEqual(a.json, {p: 'a', sound: 'default'});
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

        should.ok(msg.result.error);
        should.ok(msg.result.error instanceof PushError);
        should.equal(msg.result.error.message, 'ECONNREFUSED');
        should.equal(msg.result.error.date.getTime(), note.date.getTime());
        should.not.exist(msg.result.responses);
        should.not.exist(msg.result.batches);
        should.not.exist(msg.result.next);
        should.equal(msg.result.total, 1);
        should.equal(msg.result.processed, 0);
        should.equal(msg.result.sent, 0);
        should.deepEqual(msg.result.errors, {aborted: 1});
        should.equal(msg.result.errored, 1);
    });
});
