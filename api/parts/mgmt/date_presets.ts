/**
 * This module is meant for handling date presets.
 * @module api/parts/mgmt/date_presets
 */

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');

/**
 * Member interface
 */
interface Member {
    _id: string;
    email: string;
    global_admin: boolean;
    group_id?: string | string[];
    full_name?: string;
}

/**
 * Params type for date preset operations
 */
interface DatePresetParams {
    qstring: {
        preset_id?: string;
        app_id?: string;
        name?: string;
        range?: string | unknown[] | Record<string, unknown>;
        share_with?: string;
        shared_email_edit?: string | string[];
        shared_email_view?: string | string[];
        shared_user_groups_edit?: string | string[];
        shared_user_groups_view?: string | string[];
        exclude_current_day?: string | boolean;
        fav?: string | boolean;
        sort_order?: string | number;
    };
    member: Member;
}

/**
 * Date preset document
 */
interface DatePreset {
    _id: string;
    name: string;
    range: unknown[] | Record<string, unknown> | string;
    share_with: string;
    shared_email_edit?: string[];
    shared_email_view?: string[];
    shared_user_groups_edit?: string[];
    shared_user_groups_view?: string[];
    exclude_current_day?: boolean;
    owner_id: string;
    owner_name?: string;
    fav: string[];
    is_owner?: boolean;
    created_at: number;
    edited_at?: number;
    sort_order: number;
}

/**
 * Date presets API module interface
 */
interface PresetsApi {
    getAll: (params: DatePresetParams) => Promise<boolean>;
    create: (params: DatePresetParams) => boolean | undefined;
    update: (params: DatePresetParams) => boolean;
    delete: (params: DatePresetParams) => boolean | undefined;
    getById: (params: DatePresetParams) => boolean | undefined;
}

/**
 * Argument properties for validation
 */
interface ArgProps {
    [key: string]: {
        required: boolean;
        type?: string | string[];
        'non-empty'?: boolean;
        'min-length'?: number;
        'max-length'?: number;
        'exclude-from-ret-obj'?: boolean;
        default?: unknown;
        multiple?: boolean;
    };
}

const presetsApi: PresetsApi = {
    /**
     * Get presets
     * @param params - params object
     * @returns true if successful
     */
    getAll: async function(params: DatePresetParams): Promise<boolean> {
        const member = params.member;
        const memberId = member._id + '';
        const memberEmail = member.email;
        let filterCond: Record<string, unknown> = {};

        if (!member.global_admin) {
            let groups = member.group_id || [];
            if (!Array.isArray(groups)) {
                groups = [groups];
            }
            groups = groups.map((group_id: string) => group_id + '');
            filterCond = {
                $or: [
                    { owner_id: memberId },
                    { share_with: 'all-users' },
                    { shared_email_view: memberEmail },
                    { shared_email_edit: memberEmail },
                    { shared_user_groups_edit: { $in: groups } },
                    { shared_user_groups_view: { $in: groups } }
                ]
            };
        }

        /* eslint-disable unicorn/no-thenable -- MongoDB $cond operator requires 'then' property */
        common.db.collection('date_presets').aggregate([
            { $match: filterCond },
            {
                $addFields: {
                    owner_id_objectId: { $toObjectId: '$owner_id' }
                }
            },
            {
                $lookup: {
                    from: 'members',
                    localField: 'owner_id_objectId',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: '$owner' },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    range: 1,
                    share_with: 1,
                    shared_email_edit: {
                        $cond: {
                            if: {
                                $or: [
                                    member.global_admin,
                                    { $eq: ['$owner_id', memberId] },
                                    { $in: [member.group_id || [], '$shared_user_groups_edit'] },
                                    { $in: [memberEmail, '$shared_email_edit'] }
                                ]
                            },
                            then: '$shared_email_edit',
                            else: false
                        }
                    },
                    shared_email_view: {
                        $cond: {
                            if: {
                                $or: [
                                    member.global_admin,
                                    { $eq: ['$owner_id', memberId] },
                                    { $in: [member.group_id || [], '$shared_user_groups_edit'] },
                                    { $in: [memberEmail, '$shared_email_edit'] }
                                ]
                            },
                            then: '$shared_email_view',
                            else: false
                        }
                    },
                    shared_user_groups_edit: {
                        $cond: {
                            if: {
                                $or: [
                                    member.global_admin,
                                    { $eq: ['$owner_id', memberId] },
                                    { $in: [member.group_id || [], '$shared_user_groups_edit'] },
                                    { $in: [memberEmail, '$shared_email_edit'] }
                                ]
                            },
                            then: '$shared_user_groups_edit',
                            else: false
                        }
                    },
                    shared_user_groups_view: {
                        $cond: {
                            if: {
                                $or: [
                                    member.global_admin,
                                    { $eq: ['$owner_id', memberId] },
                                    { $in: [member.group_id || [], '$shared_user_groups_edit'] },
                                    { $in: [memberEmail, '$shared_email_edit'] }
                                ]
                            },
                            then: '$shared_user_groups_view',
                            else: false
                        }
                    },
                    exclude_current_day: 1,
                    owner_id: 1,
                    owner_name: '$owner.full_name',
                    fav: {
                        $in: [memberId, '$fav']
                    },
                    is_owner: {
                        $cond: {
                            if: {
                                $eq: ['$owner_id', memberId]
                            },
                            then: true,
                            else: member.global_admin
                        }
                    },
                    created_at: 1,
                    edited_at: 1,
                    sort_order: 1
                }
            },
            {
                $sort: {
                    sort_order: 1
                }
            }
        ]).toArray(function(err: Error | null, presets: DatePreset[]) {
            if (err) {
                console.log('Error getting presets', err, presets);
                common.returnMessage(params, 500, 'Error getting presets');
                return false;
            }
            presets = presets || [];
            common.returnOutput(params, presets);
            return true;
        });
        /* eslint-enable unicorn/no-thenable */

        return true;
    },

    /**
     * Add new preset
     * @param params - params object
     * @returns true if successful
     */
    create: function(params: DatePresetParams): boolean | undefined {
        const argProps: ArgProps = {
            'name': {
                'required': true,
                'type': 'String',
                'non-empty': true
            },
            'range': {
                'required': true,
                'type': [
                    'Array',
                    'Object',
                    'String'
                ],
                'multiple': true
            },
            'share_with': {
                'required': true,
                'type': 'String',
                'default': 'none',
                'non-empty': true
            },
            'shared_email_edit': {
                'required': false,
                'type': 'Array'
            },
            'shared_email_view': {
                'required': false,
                'type': 'Array'
            },
            'shared_user_groups_edit': {
                'required': false,
                'type': 'Array'
            },
            'shared_user_groups_view': {
                'required': false,
                'type': 'Array'
            },
            'exclude_current_day': {
                'required': false,
                'type': 'Boolean',
                'default': false
            },
            'app_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            }
        };

        if (params.qstring.range) {
            try {
                params.qstring.range = JSON.parse(params.qstring.range as string);
                if (Array.isArray(params.qstring.range) && params.qstring.range.length !== 2) {
                    throw new SyntaxError('Invalid range format');
                }
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid range');
                return false;
            }
        }

        if (params.qstring.shared_email_edit) {
            try {
                params.qstring.shared_email_edit = JSON.parse(params.qstring.shared_email_edit as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_email_edit');
                return false;
            }
        }

        if (params.qstring.shared_email_view) {
            try {
                params.qstring.shared_email_view = JSON.parse(params.qstring.shared_email_view as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_email_view');
                return false;
            }
        }

        if (params.qstring.shared_user_groups_edit) {
            try {
                params.qstring.shared_user_groups_edit = JSON.parse(params.qstring.shared_user_groups_edit as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_user_groups_edit');
                return false;
            }
        }

        if (params.qstring.shared_user_groups_view) {
            try {
                params.qstring.shared_user_groups_view = JSON.parse(params.qstring.shared_user_groups_view as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_user_groups_view');
                return false;
            }
        }

        if (params.qstring.exclude_current_day) {
            try {
                params.qstring.exclude_current_day = JSON.parse(params.qstring.exclude_current_day as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid exclude_current_day');
                return false;
            }
        }

        const newPreset: Partial<DatePreset> = common.validateArgs(params.qstring, argProps);
        if (!newPreset) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        for (const i in params.qstring) {
            if ((newPreset as Record<string, unknown>)[i] === undefined && !['app_id'].includes(i)) {
                (newPreset as Record<string, unknown>)[i] = (params.qstring as Record<string, unknown>)[i];
            }
        }

        newPreset.created_at = Math.floor((Date.now()) / 1000);
        newPreset.owner_id = params.member._id + '';
        newPreset.fav = [];

        if (newPreset.share_with !== 'selected-users') {
            newPreset.shared_email_edit = [];
            newPreset.shared_email_view = [];
            newPreset.shared_user_groups_edit = [];
            newPreset.shared_user_groups_view = [];
        }

        newPreset.sort_order = 0;

        common.db.collection('date_presets').insert(newPreset, { safe: true }, function(err: Error | null, preset: { ops: DatePreset[] }) {
            if (!err && preset && preset.ops && preset.ops[0] && preset.ops[0]._id) {
                // Update sort order of other presets
                common.db.collection('date_presets').updateMany(
                    { _id: { $ne: preset.ops[0]._id } },
                    { $inc: { sort_order: 1 } },
                    function(err1: Error | null) {
                        if (err1) {
                            common.returnMessage(params, 500, 'Error updating sort order of other presets');
                            return false;
                        }
                        common.returnOutput(params, preset.ops[0]);
                        return true;
                    }
                );
            }
            else {
                common.returnMessage(params, 500, 'Error adding preset');
                return false;
            }
        });
    },

    /**
     * Update preset
     * @param params - params object
     * @returns true if successful
     */
    update: function(params: DatePresetParams): boolean {
        const argProps: ArgProps = {
            'preset_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            },
            'name': {
                'required': false,
                'type': 'String',
                'non-empty': true
            },
            'range': {
                'required': false,
                'type': [
                    'Array',
                    'Object',
                    'String'
                ],
                'multiple': true
            },
            'share_with': {
                'required': false,
                'type': 'String',
                'default': 'none',
                'non-empty': true
            },
            'shared_email_edit': {
                'required': false,
                'type': 'Array'
            },
            'shared_email_view': {
                'required': false,
                'type': 'Array'
            },
            'shared_user_groups_edit': {
                'required': false,
                'type': 'Array'
            },
            'shared_user_groups_view': {
                'required': false,
                'type': 'Array'
            },
            'exclude_current_day': {
                'required': false,
                'type': 'Boolean',
                'default': false
            },
            'fav': {
                'required': false,
                'type': 'Boolean',
            },
            'sort_order': {
                'required': false,
                'type': 'Number'
            },
            'app_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            }
        };

        const member = params.member;
        const memberId = member._id + '';
        const memberEmail = member.email;
        let filterCond: Record<string, unknown> = {};

        if (!member.global_admin) {
            let groups = member.group_id || [];
            if (!Array.isArray(groups)) {
                groups = [groups];
            }
            groups = groups.map((group_id: string) => group_id + '');
            filterCond = {
                $or: [
                    { owner_id: memberId },
                    { share_with: 'all-users' },
                    { shared_email_view: memberEmail },
                    { shared_email_edit: memberEmail },
                    { shared_user_groups_edit: { $in: groups } },
                    { shared_user_groups_view: { $in: groups } }
                ]
            };
        }

        if (params.qstring.range) {
            try {
                params.qstring.range = JSON.parse(params.qstring.range as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid range');
                return false;
            }
        }

        if (params.qstring.shared_email_edit) {
            try {
                params.qstring.shared_email_edit = JSON.parse(params.qstring.shared_email_edit as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_email_edit');
                return false;
            }
        }

        if (params.qstring.shared_email_view) {
            try {
                params.qstring.shared_email_view = JSON.parse(params.qstring.shared_email_view as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_email_view');
                return false;
            }
        }

        if (params.qstring.shared_user_groups_edit) {
            try {
                params.qstring.shared_user_groups_edit = JSON.parse(params.qstring.shared_user_groups_edit as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_user_groups_edit');
                return false;
            }
        }

        if (params.qstring.shared_user_groups_view) {
            try {
                params.qstring.shared_user_groups_view = JSON.parse(params.qstring.shared_user_groups_view as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid shared_user_groups_view');
                return false;
            }
        }

        if (params.qstring.exclude_current_day) {
            try {
                params.qstring.exclude_current_day = JSON.parse(params.qstring.exclude_current_day as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid exclude_current_day');
                return false;
            }
        }

        if (params.qstring.fav) {
            try {
                params.qstring.fav = JSON.parse(params.qstring.fav as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid fav');
                return false;
            }
        }

        if (params.qstring.sort_order) {
            try {
                params.qstring.sort_order = JSON.parse(params.qstring.sort_order as string);
            }
            catch (_) {
                common.returnMessage(params, 400, 'Invalid sort_order');
                return false;
            }
        }

        const updatedPreset: Partial<DatePreset> = common.validateArgs(params.qstring, argProps);
        if (!updatedPreset) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        filterCond._id = common.db.ObjectID(params.qstring.preset_id);

        common.db.collection('date_presets').findOne(filterCond, function(err: Error | null, presetBefore: DatePreset | null) {
            if (err || !presetBefore) {
                common.returnMessage(params, 500, 'Could not find preset');
                return false;
            }

            for (const i in params.qstring) {
                if ((updatedPreset as Record<string, unknown>)[i] === undefined && !['preset_id', 'fav', 'app_id'].includes(i)) {
                    (updatedPreset as Record<string, unknown>)[i] = (params.qstring as Record<string, unknown>)[i];
                }
            }

            updatedPreset.edited_at = Math.floor((Date.now()) / 1000);

            if (updatedPreset.share_with !== 'selected-users') {
                updatedPreset.shared_email_edit = [];
                updatedPreset.shared_email_view = [];
                updatedPreset.shared_user_groups_edit = [];
                updatedPreset.shared_user_groups_view = [];
            }

            // Handle fav
            if (params.qstring.fav !== undefined) {
                const fav = presetBefore.fav || [];
                if (params.qstring.fav === true && !fav.includes(params.member._id + '')) {
                    fav.push(params.member._id + '');
                }
                if (params.qstring.fav === false && fav.includes(params.member._id + '')) {
                    fav.splice(fav.indexOf(params.member._id + ''), 1);
                }
                updatedPreset.fav = fav;
            }

            common.db.collection('date_presets').update(
                { _id: presetBefore._id },
                { $set: updatedPreset },
                { safe: true },
                function(err1: Error | null) {
                    if (err1) {
                        common.returnMessage(params, 500, 'Error updating preset');
                        return false;
                    }

                    // If sort order changed, update other presets
                    if (updatedPreset.sort_order !== presetBefore.sort_order) {
                        const oldSortOrder = presetBefore.sort_order;
                        const newSortOrder = updatedPreset.sort_order as number;
                        const sort_order_difference = oldSortOrder - newSortOrder;

                        const updateQuery = {
                            sort_order: {
                                $gte: Math.min(oldSortOrder, newSortOrder),
                                $lte: Math.max(oldSortOrder, newSortOrder)
                            },
                            _id: { $ne: presetBefore._id }
                        };

                        const update = sort_order_difference > 0 ? { $inc: { sort_order: 1 } } : { $inc: { sort_order: -1 } };

                        common.db.collection('date_presets').updateMany(updateQuery, update, { multi: true }, function(err2: Error | null) {
                            if (err2) {
                                common.returnMessage(params, 500, 'Error updating sort order of other presets');
                                return false;
                            }
                            common.returnMessage(params, 200, 'Preset updated');
                            return true;
                        });
                    }
                    else {
                        common.returnMessage(params, 200, 'Preset updated');
                        return true;
                    }
                }
            );
        });
        return true;
    },

    /**
     * Delete preset
     * @param params - params object
     * @returns true if successful
     */
    delete: function(params: DatePresetParams): boolean | undefined {
        const argProps: ArgProps = {
            'preset_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            }
        };

        if (!common.validateArgs(params.qstring, argProps)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        common.db.collection('date_presets').findOne({ _id: common.db.ObjectID(params.qstring.preset_id) }, function(err: Error | null, presetBefore: DatePreset | null) {
            if (err || !presetBefore) {
                common.returnMessage(params, 500, 'Could not find preset');
                return false;
            }
            if (presetBefore.owner_id !== params.member._id + '' && !params.member.global_admin) {
                common.returnMessage(params, 401, 'Not authorized');
                return false;
            }
            common.db.collection('date_presets').remove({ _id: common.db.ObjectID(params.qstring.preset_id) }, { safe: true }, function(err1: Error | null, preset: unknown) {
                if (err1 || !preset) {
                    common.returnMessage(params, 500, 'Error deleting preset');
                    return false;
                }
                // Update sort order of other presets
                common.db.collection('date_presets').updateMany({ sort_order: { $gt: presetBefore.sort_order } }, { $inc: { sort_order: -1 } }, function(err2: Error | null) {
                    if (err2) {
                        common.returnMessage(params, 500, 'Error updating sort order of other presets');
                        return false;
                    }
                    common.returnOutput(params, preset);
                    return true;
                });
            });
        });
    },

    /**
     * Get preset by ID
     * @param params - params object
     * @returns true if successful
     */
    getById: function(params: DatePresetParams): boolean | undefined {
        const argProps: ArgProps = {
            'preset_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            },
            'app_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            }
        };

        const member = params.member;
        const memberId = member._id + '';
        const memberEmail = member.email;
        let filterCond: Record<string, unknown> = {};

        if (!member.global_admin) {
            let groups = member.group_id || [];
            if (!Array.isArray(groups)) {
                groups = [groups];
            }
            groups = groups.map((group_id: string) => group_id + '');
            filterCond = {
                $or: [
                    { owner_id: memberId },
                    { share_with: 'all-users' },
                    { shared_email_view: memberEmail },
                    { shared_email_edit: memberEmail },
                    { shared_user_groups_edit: { $in: groups } },
                    { shared_user_groups_view: { $in: groups } }
                ]
            };
        }

        if (!common.validateArgs(params.qstring, argProps)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        filterCond._id = common.db.ObjectID(params.qstring.preset_id);

        common.db.collection('date_presets').findOne(filterCond, function(err: Error | null, preset: DatePreset | null) {
            if (err || !preset) {
                common.returnMessage(params, 500, 'Could not find preset');
                return false;
            }
            (preset as DatePreset & { is_owner: boolean }).is_owner = (preset.owner_id === memberId) || member.global_admin;
            const fav = preset.fav || [];
            (preset as DatePreset & { fav: boolean }).fav = fav.includes(memberId) as unknown as string[];
            common.returnOutput(params, preset);
            return true;
        });
    }
};

export default presetsApi;
export type { DatePresetParams, DatePreset, PresetsApi, Member };
