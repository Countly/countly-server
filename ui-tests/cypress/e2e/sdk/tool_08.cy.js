import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('8.Success tooltip (latest iOS SDK version)', () => {
    it('8.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('objc-native-ios', '25.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('8.2-Test', function() {
        goToConfigTab();
        checkTooltipAppears('success');
    });
});