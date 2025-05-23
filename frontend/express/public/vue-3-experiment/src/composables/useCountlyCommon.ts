import { computed } from 'vue';
import { useRoute } from "vue-router";

export function useCountlyCommon() {
    const $route = useRoute();

    return {
        ACTIVE_APP_ID: computed(() => $route.params.id)
    }
}