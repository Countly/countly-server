import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('4.Mixed tooltip (old Android SDK version)', () => {
    it('4.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('java-native-android', '23.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('4.2-Reset', function() {
        goToConfigTab();
    });
    it('4.3-Test', function() {
        goToConfigTab(true);
        checkTooltipAppears('success', 2, true);
        checkTooltipAppears('warning', 20, true);
    });
});