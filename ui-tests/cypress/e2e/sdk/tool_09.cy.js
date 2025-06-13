import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('9.Mixed tooltip (multiple SDK versions)', () => {
    it('9.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('a', '26.12.1'));
        cy.request('GET', createRequest('javascript_native_web', '25.12.1v2'));
        cy.request('GET', createRequest('java-native-android', '22.12.1'));
        cy.request('GET', createRequest('objc-native-ios-rc2', '24.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef
                expect(response.status).to.eq(200);
            });
    });
    it('9.2-Reset', function() {
        goToConfigTab();
    });
    it('9.3-Test', function() {
        goToConfigTab(true);
        checkTooltipAppears('success', 2, true);
        checkTooltipAppears('warning', 19, true);
    });
});
