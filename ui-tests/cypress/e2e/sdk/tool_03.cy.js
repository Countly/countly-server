import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('3.Success tooltip (latest Web SDK version)', () => {
    it('3.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('javascript_native_web', '25.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('3.2-Reset', function() {
        goToConfigTab();
    });
    it('3.3-Test', function() {
        goToConfigTab(true);
        checkTooltipAppears('success');
    });
});