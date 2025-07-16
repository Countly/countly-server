import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('7.Success tooltip (latest Android SDK version)', () => {
    it('7.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('java-native-android', '25.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('7.2-Reset', function() {
        goToConfigTab();
    });
    it('7.3-Test', function() {
        goToConfigTab(true);
        checkTooltipAppears('success');
    });
});