import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('5.Mixed tooltip (old iOS SDK version)', () => {
    it('5.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('objc-native-ios', '24.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('5.2-Test', function() {
        goToConfigTab();
        checkTooltipAppears('success', 2, true);
        checkTooltipAppears('warning', 19, true);
    });
});