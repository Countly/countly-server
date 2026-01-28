import { setupTest, goToConfigTab, checkTooltipAppears, createRequest } from "../../lib/sdk/setup";

describe('6.Danger tooltip (unsupported SDK)', () => {
    it('6.1-Setup', function() {
        setupTest();
        cy.request('GET', createRequest('unity', '25.12.1'))
            .then((response) => {
                // eslint-disable-next-line no-undef 
                expect(response.status).to.eq(200);
            });
    });
    it('6.2-Reset', function() {
        goToConfigTab();
    });
    it('6.3-Test', function() {
        goToConfigTab(true);
        checkTooltipAppears('danger', 35);
    });
});