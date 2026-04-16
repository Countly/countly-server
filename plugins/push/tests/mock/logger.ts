import type { Logger, LogModule } from '../../../../types/log.d.ts';
import sinon from 'sinon';

export function createSilentLogger(): sinon.SinonStubbedInstance<Logger> {
    return sinon.stub({
        d() {},
        i() {},
        w() {},
        e() {},
    } as Logger);
}

export function createSilentLogModule(): LogModule {
    const logModule = Object.assign(
        (_name: string) => createSilentLogger() as unknown as Logger,
        {
            setLevel() {},
            setDefault() {},
            getLevel() { return 'error'; },
            setPrettyPrint() {},
            updateConfig() {},
            hasOpenTelemetry: false,
            shutdown() {},
        }
    );
    return logModule as unknown as LogModule;
}
