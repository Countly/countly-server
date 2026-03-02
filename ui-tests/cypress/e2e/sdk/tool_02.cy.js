import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('2.Warning tooltip (old Web SDK version)', () => {
    it('2.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('javascript_native_web', '19.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('2.2-Reset', function() {
        goToConfigTab();
    });
    it('2.3-Test', function() {
        goToConfigTab(true);
        checkTooltipAppears('warning', 35);
    });
});
