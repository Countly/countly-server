import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';

import TwoFASetupModal from './components/TwoFASetupModal.vue';

import './assets/main.scss';

// Register configuration labels.
if (app.configurationsView) {
    app.configurationsView.registerLabel("two-factor-auth", "two-factor-auth.two-factor-authentication");
    app.configurationsView.registerLabel("two-factor-auth-globally_enabled", "two-factor-auth.globally_enabled");
}

// Register 2FA settings component under account settings.
registerData("/account/settings", {
    _id: "2fa",
    title: i18n('two-factor-auth.plugin-title'),
    component: TwoFASetupModal
});
