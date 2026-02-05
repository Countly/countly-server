/**
 * This module defines preset configurations for user properties and event segments
 * @module "api/lib/countly.preset"
 */

/**
 * Field definition for user properties and event segments
 */
export interface FieldDefinition {
    /** Display name for the field */
    name: string;
    /** Field type: 'd' for date, 'n' for number, 'l' for list/enum, 's' for string */
    type: 'd' | 'n' | 'l' | 's';
}

/**
 * User properties preset configuration
 */
export interface UserPropertiesPreset {
    [key: string]: FieldDefinition;
}

/**
 * Event segment preset configuration
 */
export interface EventSegmentPreset {
    [segmentKey: string]: FieldDefinition;
}

/**
 * Segment presets by event name
 */
export interface SegmentPresets {
    [eventName: string]: EventSegmentPreset;
}

/**
 * Complete preset configuration
 */
export interface PresetConfig {
    /** User properties preset */
    up: UserPropertiesPreset;
    /** Segment presets by event name */
    sg: SegmentPresets;
}

/**
 * Module exports interface
 */
export interface PresetModule {
    preset: PresetConfig;
}

const preset: PresetConfig = {
    up: {
        fs: { name: 'first_seen', type: 'd' },
        ls: { name: 'last_seen', type: 'd' },
        tsd: { name: 'total_session_duration', type: 'n' },
        sc: { name: 'session_count', type: 'n' },
        d: { name: 'device', type: 'l' },
        dt: { name: 'device_type', type: 'l' },
        mnf: { name: 'manufacturer', type: 'l' },
        ornt: { name: 'ornt', type: 'l' },
        cty: { name: 'city', type: 'l' },
        rgn: { name: 'region', type: 'l' },
        cc: { name: 'country_code', type: 'l' },
        p: { name: 'platform', type: 'l' },
        pv: { name: 'platform_version', type: 'l' },
        av: { name: 'app_version', type: 'l' },
        av_major: { name: 'app_version_major', type: 'n' },
        av_minor: { name: 'app_version_minor', type: 'n' },
        av_patch: { name: 'app_version_patch', type: 'n' },
        av_prerel: { name: 'app_version_prerelease', type: 'l' },
        av_build: { name: 'app_version_build', type: 'l' },
        c: { name: 'carrier', type: 'l' },
        r: { name: 'resolution', type: 'l' },
        dnst: { name: 'dnst', type: 'l' },
        brw: { name: 'brw', type: 'l' },
        brwv: { name: 'brwv', type: 'l' },
        la: { name: 'la', type: 'l' },
        lo: { name: 'lo', type: 'l' },
        src: { name: 'src', type: 'l' },
        src_ch: { name: 'src_ch', type: 'l' },
        name: { name: 'name', type: 's' },
        username: { name: 'username', type: 's' },
        email: { name: 'email', type: 's' },
        organization: { name: 'organization', type: 's' },
        phone: { name: 'phone', type: 's' },
        gender: { name: 'gender', type: 'l' },
        byear: { name: 'byear', type: 'n' },
        age: { name: 'age', type: 'n' },
        engagement_score: { name: 'engagement_score', type: 'n' },
        lp: { name: 'lp', type: 'd' },
        lpa: { name: 'lpa', type: 'n' },
        tp: { name: 'tp', type: 'n' },
        tpc: { name: 'tpc', type: 'n' },
        lv: { name: 'lv', type: 'l' },
        cadfs: { name: 'cadfs', type: 'n' },
        cawfs: { name: 'cawfs', type: 'n' },
        camfs: { name: 'camfs', type: 'n' },
        hour: { name: 'hour', type: 'l' },
        dow: { name: 'dow', type: 'l' },
        hh: { name: 'hh', type: 'l' },
        sdk_name: { name: 'sdk_name', type: 's' },
        sdk_version: { name: 'sdk_version', type: 's' }
    },
    sg: {
        '[CLY]_view': {
            start: { name: 'start', type: 'l' },
            exit: { name: 'exit', type: 'l' },
            bounce: { name: 'bounce', type: 'l' }
        },
        '[CLY]_session': {
            request_id: { name: 'request_id', type: 's' },
            prev_session: { name: 'prev_session', type: 's' },
            prev_start: { name: 'prev_start', type: 'd' },
            postfix: { name: 'postfix', type: 's' },
            ended: { name: 'ended', type: 'l' }
        },
        '[CLY]_action': {
            x: { name: 'x', type: 'n' },
            y: { name: 'y', type: 'n' },
            width: { name: 'width', type: 'n' },
            height: { name: 'height', type: 'n' }
        },
        '[CLY]_crash': {
            name: { name: 'name', type: 's' },
            manufacture: { name: 'manufacture', type: 'l' },
            cpu: { name: 'cpu', type: 'l' },
            opengl: { name: 'opengl', type: 'l' },
            view: { name: 'view', type: 'l' },
            browser: { name: 'browser', type: 'l' },
            os: { name: 'os', type: 'l' },
            orientation: { name: 'orientation', type: 'l' },
            nonfatal: { name: 'nonfatal', type: 'l' },
            root: { name: 'root', type: 'l' },
            online: { name: 'online', type: 'l' },
            signal: { name: 'signal', type: 'l' },
            muted: { name: 'muted', type: 'l' },
            background: { name: 'background', type: 'l' },
            app_version: { name: 'app_version', type: 'l' },
            app_version_major: { name: 'app_version_major', type: 'n' },
            app_version_minor: { name: 'app_version_minor', type: 'n' },
            app_version_patch: { name: 'app_version_patch', type: 'n' },
            app_version_prerelease: { name: 'app_version_prerelease', type: 'l' },
            app_version_build: { name: 'app_version_build', type: 'l' },
            ram_current: { name: 'ram_current', type: 'n' },
            ram_total: { name: 'ram_total', type: 'n' },
            disk_current: { name: 'disk_current', type: 'n' },
            disk_total: { name: 'disk_total', type: 'n' },
            bat_current: { name: 'bat_current', type: 'n' },
            bat_total: { name: 'bat_total', type: 'n' },
            bat: { name: 'bat', type: 'n' },
            run: { name: 'run', type: 'n' }
        },
        '[CLY]_star_rating': {
            email: { name: 'email', type: 's' },
            comment: { name: 'comment', type: 's' },
            widget_id: { name: 'widget_id', type: 'l' },
            contactMe: { name: 'contactMe', type: 's' },
            rating: { name: 'rating', type: 'n' },
            platform_version_rate: { name: 'platform_version_rate', type: 's' }
        },
        '[CLY]_nps': {
            comment: { name: 'comment', type: 's' },
            widget_id: { name: 'widget_id', type: 'l' },
            rating: { name: 'rating', type: 'n' },
            shown: { name: 'shown', type: 's' },
            answered: { name: 'answered', type: 's' }
        },
        '[CLY]_survey': {
            widget_id: { name: 'widget_id', type: 'l' },
            shown: { name: 'shown', type: 's' },
            answered: { name: 'answered', type: 's' }
        },
        '[CLY]_push_action': {
            i: { name: 'i', type: 's' }
        },
        '[CLY]_push_sent': {
            i: { name: 'i', type: 's' }
        },
        '[CLY]_consent': {
            _type: { name: '_type', type: 's' }
        }
    }
};

const presetModule: PresetModule = {
    preset: preset
};

export default presetModule;
export { preset };
