<template>
    <div class="kafka-event-details">
        <h4 class="kafka-event-details__header">Event Details</h4>

        <div class="kafka-event-details__list">
            <div v-if="row.details && row.details.message" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Message</div>
                <div class="kafka-event-details__value">{{ row.details.message }}</div>
            </div>
            <div v-if="row.stateKey" class="kafka-event-details__row">
                <div class="kafka-event-details__label">State Key</div>
                <div class="kafka-event-details__value">
                    <code class="kafka-event-details__value--code">{{ row.stateKey }}</code>
                </div>
            </div>
            <div v-if="row.details && row.details.expectedClusterId" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Expected Cluster</div>
                <div class="kafka-event-details__value">{{ row.details.expectedClusterId }}</div>
            </div>
            <div v-if="row.details && row.details.actualClusterId" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Actual Cluster</div>
                <div class="kafka-event-details__value">{{ row.details.actualClusterId }}</div>
            </div>
            <div v-if="row.details && row.details.expectedOffset" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Expected Offset</div>
                <div class="kafka-event-details__value kafka-event-details__value--mono">{{ row.details.expectedOffset }}</div>
            </div>
            <div v-if="row.details && row.details.actualOffset !== undefined" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Actual Offset</div>
                <div class="kafka-event-details__value kafka-event-details__value--mono">{{ row.details.actualOffset }}</div>
            </div>
            <div v-if="row.details && row.details.gap" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Offset Gap</div>
                <div class="kafka-event-details__value kafka-event-details__value--mono kafka-event-details__value--danger">{{ row.details.gap }}</div>
            </div>
            <div v-if="row.details && row.details.actionTaken" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Action Taken</div>
                <div class="kafka-event-details__value">
                    <span class="kafka-event-details__badge kafka-event-details__badge--primary">{{ row.details.actionTaken }}</span>
                </div>
            </div>
            <div v-if="row.metadata && row.metadata.hostname" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Hostname</div>
                <div class="kafka-event-details__value">{{ row.metadata.hostname }}</div>
            </div>
            <div v-if="row.metadata && row.metadata.processId" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Process ID</div>
                <div class="kafka-event-details__value kafka-event-details__value--mono">{{ row.metadata.processId }}</div>
            </div>
            <div v-if="row.details && row.details.oldStateKey" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Old State Key</div>
                <div class="kafka-event-details__value">
                    <code class="kafka-event-details__value--code">{{ row.details.oldStateKey }}</code>
                </div>
            </div>
            <div v-if="row.details && row.details.newStateKey" class="kafka-event-details__row">
                <div class="kafka-event-details__label">New State Key</div>
                <div class="kafka-event-details__value">
                    <code class="kafka-event-details__value--code">{{ row.details.newStateKey }}</code>
                </div>
            </div>
            <div v-if="row.details && row.details.partitionCount !== undefined" class="kafka-event-details__row">
                <div class="kafka-event-details__label">Partitions</div>
                <div class="kafka-event-details__value">{{ row.details.partitionCount }}</div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        row: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
};
</script>
