var testData = require('./testData.js');
const process = require('process');
const Triggers = require('./parts/triggers/index.js');
const Effects = require('./parts/effects/index.js');
const asyncLib = require('async');
const EventEmitter = require('events');

class Hooks {
    constructor(options) {
        this._cachedRules = [];
        this._triggers = {};
        this._effects = {};
        this._queue = [];
        

        this.fetchRules();
        setInterval(() => {
            this.fetchRules();
        }, 5000);
        this.registerEffects();
        this.registerTriggers();


        this._queueEventEmitter = new EventEmitter();
        this._queueEventEmitter.on('push', (data) => {
            this._queue.push(data);
        });
        this._queueEventEmitter.on('pipe', () => {this.pipeEffects()})
        this._queueEventEmitter.emit("pipe");
    }

    registerTriggers() {
        for(let type in Triggers) {
            const t = new Triggers[type]({
                pipeline: (data) => {
                    this._queueEventEmitter.emit('push', data);
                }
            });
            this._triggers[type] = t;
        }
    }

    registerEffects() {
        for(let type in Effects) {
            const t = new Effects[type]();
            this._effects[type] = t;
        }
    }

    fetchRules() {
        // temp test data
        this._cachedRules = testData.rules;
        this._cachedRules.forEach((item) => {
            item.time = new Date().getTime();
        });
        this.syncRulesWithTrigger();
        console.log("fetch rules !!");
    }

    syncRulesWithTrigger() {
        for(let type in this._triggers) {
            const t = this._triggers[type];
            if ( typeof t.syncRules == "function") {
                t.syncRules(this._cachedRules);
            }
         }
    }

    async pipeEffects() {
        console.log("pro::", process.pid, ":::",this._queue.length);
        try {
            const chunk = this._queue.splice(0, 20);
            await asyncLib.mapLimit(chunk,2, async (item, callback) => {
                console.log(item,"chunk limit");
                // trigger effects logic
                if(this._effects[item.effect.type]) {
                    this._effects[item.effect.type].run(item);
                }
            })
            console.log("finish this round pipeEffect");
        } catch(e){console.log(e);}

        //check periodically
        setTimeout(()=> {
            this._queueEventEmitter.emit("pipe");
        },500);
     }
}

//hook rules CRUD apis
class HookManager {
    
}

// init instnace;
const hooks = new Hooks();
