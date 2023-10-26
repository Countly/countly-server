/* eslint-disable no-inner-declarations */
const { CentralMaster, CentralWorker } = require('../../../api/parts/jobs/ipc'),
    log = require('../../utils/log')('metrics'),
    os = require('os');

const metrics = {},
    CMD_RUNNERS_PERF_METRICS = 'runners_performance',
    CPUnRAM_PERIODICITY = 10000;

if (require('cluster').isMaster) {
    metrics.workers = {};

    let ipc = new CentralMaster(CMD_RUNNERS_PERF_METRICS, function(data, reply, pid) {
            metrics.workers[pid] = data;
            for (const key in data) {
                metrics[key] = Object.values(metrics.workers).map(w => w[key] || 0).reduce((a, b) => a + b, 0) / (Object.keys(metrics.workers).length || 1);
            }
        }),
        load_timeout = undefined;

    ipc.attach((worker, pid) => {
        if (worker) {
            metrics.workers[pid] = {};
        }
        else {
            delete metrics.workers[pid];
        }
    });

    /**
     * Record total system-wide CPU load
     */
    function updateSystemCPU() {
        metrics.load = os.loadavg()[0];
        log.d('total system load: %f', metrics.load);
        load_timeout = setTimeout(updateSystemCPU, CPUnRAM_PERIODICITY);
    }

    process.on('beforeExit', () => {
        clearTimeout(load_timeout);
    });

    updateSystemCPU();
}
else {
    const { PerformanceObserver, constants } = require('perf_hooks'),
        ipc = new CentralWorker(CMD_RUNNERS_PERF_METRICS, () => {});

    const obs = new PerformanceObserver(list => {
        let major = list.getEntries().filter(gc => gc.kind === constants.NODE_PERFORMANCE_GC_MAJOR);
        if (major.length) {
            metrics.gc = major.map(e => e.duration).reduce((a, b) => a + b, 0) / (list.getEntries().length || 1);
            log.d('GCs: %d %f', major.length, metrics.gc);
        }
    });
    obs.observe({ entryTypes: ['gc'] });

    let cpu = process.cpuUsage(),
        cpu_time = process.hrtime(),
        cpuNram_timeout = undefined;

    /**
     * Periodically measure CPU & RAM usage
     */
    function updateCPUnRAM() {
        let elapsed = process.hrtime(cpu_time);
        cpu = process.cpuUsage(cpu);
        cpu_time = process.hrtime();
        metrics.cpu_user = cpu.user / 1000 / (elapsed[0] * 1000 + elapsed[1] / 1e6);
        metrics.cpu_system = cpu.system / 1000 / (elapsed[0] * 1000 + elapsed[1] / 1e6);

        let ram = process.memoryUsage();
        metrics.ram_rss = ram.rss;
        metrics.ram_heap = ram.heapUsed / ram.heapTotal;
        metrics.ram_heap_total = ram.heapTotal;

        let now = process.hrtime();
        setImmediate(() => {
            now = process.hrtime(now);
            metrics.ev_loop = now[0] * 1000 + now[1] / 1e6;
            log.d('CPU: %f [%f], RAM %f [%d], event loop %f', metrics.cpu_user, metrics.cpu_system, metrics.ram_heap, ram.heapTotal, metrics.ev_loop);
            ipc.send(metrics);
            cpuNram_timeout = setTimeout(updateCPUnRAM, CPUnRAM_PERIODICITY);
        });
    }

    process.on('beforeExit', () => {
        obs.disconnect();
        clearTimeout(cpuNram_timeout);
    });

    ipc.attach();

    updateCPUnRAM();
}

module.exports = metrics;