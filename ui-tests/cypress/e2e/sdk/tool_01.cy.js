import { setupTest, goToConfigTab, checkTooltipAppears } from "../../lib/sdk/setup";

describe('1.Neutral tooltip (default at app creation)', () => {
    it('1.1-Setup', function() {
        setupTest();
    });
    it('1.2-Test', function() {
        goToConfigTab();
        checkTooltipAppears('neutral');
    });
});