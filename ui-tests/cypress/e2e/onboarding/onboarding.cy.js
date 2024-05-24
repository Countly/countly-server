import user from '../../fixtures/user.json';
const navigationHelpers = require('../../support/navigations');
const setupHelpers = require('../../lib/onboarding/setup');
const initialSetupHelpers = require('../../lib/onboarding/initialSetup');
const initialConsentHelpers = require('../../lib/onboarding/initialConsent');
const quickstartPopoeverHelpers = require('../../support/components/quickstartPopover');
const homePageHelpers = require('../../lib/dashboard/home/home');
const analyticsUsersOverviewPageHelpers = require('../../lib/dashboard/analytics/users/overview');
const analyticsLoyaltyUserActivityPageHelpers = require('../../lib/dashboard/analytics/loyalty/userActivity');
const analyticsLoyaltySlippingAwayPageHelpers = require('../../lib/dashboard/analytics/loyalty/slippingAway');
const analyticsLoyaltyTimesOfDayPageHelpers = require('../../lib/dashboard/analytics/loyalty/timesOfDay');
const analyticsSessionAnalyticsOverviewPageHelpers = require('../../lib/dashboard/analytics/sessions/overview');
const analyticsSessionAnalyticsDurationsPageHelpers = require('../../lib/dashboard/analytics/sessions/durations');
const analyticsSessionFrequencyPageHelpers = require('../../lib/dashboard/analytics/sessions/frequency');
const analyticsViewsPerSessionPageHelpers = require('../../lib/dashboard/analytics/sessions/viewsPerSession');
const analyticsViewsPageHelpers = require('../../lib/dashboard/analytics/views/views');
const analyticsSourcesPageHelpers = require('../../lib/dashboard/analytics/sources/acquisition');
const analyticsTechnologyPlatformsPageHelpers = require('../../lib/dashboard/analytics/technology/platforms');
const analyticsTechnologyDevicesAndTypesPageHelpers = require('../../lib/dashboard/analytics/technology/devicesAndTypes');
const analyticsTechnologyResolutionsPageHelpers = require('../../lib/dashboard/analytics/technology/resolutions');
const analyticsTechnologyAppVersionsPageHelpers = require('../../lib/dashboard/analytics/technology/versions');
const analyticsTechnologyCarriersPageHelpers = require('../../lib/dashboard/analytics/technology/carriers');
const analyticsTechnologyDensitiesPageHelpers = require('../../lib/dashboard/analytics/technology/densities');
const analyticsGeoCountriesPageHelpers = require('../../lib/dashboard/analytics/geo/countries/countries');
const analyticsGeoLanguagesPageHelpers = require('../../lib/dashboard/analytics/geo/languages/languages');
const analyticsEventsOverviewPageHelpers = require('../../lib/dashboard/analytics/events/overview');
const analyticsEventsPageHelpers = require('../../lib/dashboard/analytics/events/events');
const messagingPageHelpers = require('../../lib/dashboard/messaging/messaging');
const feedbackRatingsPageHelpers = require('../../lib/dashboard/feedback/ratings/ratings');
const feedbackRatingWidgetsPageHelpers = require('../../lib/dashboard/feedback/ratings/widgets');
const crashesPageHelpers = require('../../lib/dashboard/crashes/crashes');
const remoteConfigPageHelpers = require('../../lib/dashboard/remoteConfig/remoteConfig');
const reportManagerPageHelpers = require('../../lib/dashboard/manage/tasks/tasks');
const dataManagerEventsPageHelpers = require('../../lib/dashboard/manage/dataManager/events/events');
const dataManagerEventGroupsPageHelpers = require('../../lib/dashboard/manage/dataManager/events/eventGroups');
const dataPopulatorPageHelpers = require('../../lib/dashboard/manage/populate/populate');
const incomingDataLogsPageHelpers = require('../../lib/dashboard/manage/logger/logger');
const sdkManagersPageHelpers = require('../../lib/dashboard/manage/sdk/stats');
const requestStatsPageHelpers = require('../../lib/dashboard/manage/sdk/requestStats');
const healthCheckPageHelpers = require('../../lib/dashboard/manage/sdk/healthCheck');
const sdkConfigurationsPageHelpers = require('../../lib/dashboard/manage/sdk/configurations');
const complianceHubMetricsPageHelpers = require('../../lib/dashboard/manage/compliance/metrics');
const complianceHubUsersPageHelpers = require('../../lib/dashboard/manage/compliance/users');
const complianceHubHistoryPageHelpers = require('../../lib/dashboard/manage/compliance/history');
const complianceHubExportPurgePageHelpers = require('../../lib/dashboard/manage/compliance/actionlogs');
const userManagementPageHelpers = require('../../lib/dashboard/manage/users/users');
const applicationsPageHelpers = require('../../lib/dashboard/manage/apps/apps');
const settingsPageHelpers = require('../../lib/dashboard/manage/configurations/configurations');
const dataPointsPageHelpers = require('../../lib/dashboard/manage/dataPoints/dataPoints');
const errorLogsPageHelpers = require('../../lib/dashboard/manage/logs/errorlogs');
const systemLogsPageHelpers = require('../../lib/dashboard/manage/logs/systemlogs');
const jobsPageHelpers = require('../../lib/dashboard/manage/jobs/jobs');
const pluginsPageHelpers = require('../../lib/dashboard/manage/plugins/plugins');
const reportsPageHelpers = require('../../lib/dashboard/manage/reports/reports');
const alertsPageHelpers = require('../../lib/dashboard/manage/alerts/alerts');
const hooksPageHelpers = require('../../lib/dashboard/manage/hooks/hooks');
const dbCountlyPageHelpers = require('../../lib/dashboard/manage/db/countly/dbCountly');
const dbCountlyOutPageHelpers = require('../../lib/dashboard/manage/db/countlyOut/countlyOut');
const dbCountlyFsPageHelpers = require('../../lib/dashboard/manage/db/countlyFs/countlyFs');
const { APP_TYPE, DATA_TYPE } = require('../../support/constants');

describe('Complete Onboarding', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
    });

    afterEach(function() {
        cy.dropMongoDatabase();
    });

    it('should be complete onboarding flow with creating web type demo application', function() {
        setupHelpers.verifyDefaultPageElements();
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: true
        });

        initialSetupHelpers.verifyDefaultPageElements(true);
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: true,
            appType: APP_TYPE.WEB,
            demoAppData: DATA_TYPE.ECOMMERCE,
            timezone: 'Troll'
        });

        initialConsentHelpers.verifyDefaultPageElements();
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });
        navigationHelpers.isNavigatedToDashboard();
        quickstartPopoeverHelpers.verifyDefaultPageElements();
    });

    it('should be complete onboarding flow with creating mobile type demo application and enable tracking and subscribe to newsletter', function() {
        setupHelpers.verifyDefaultPageElements();
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: true
        });

        initialSetupHelpers.verifyDefaultPageElements(true);
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: true,
            appType: APP_TYPE.MOBILE,
            demoAppData: DATA_TYPE.GAMING,
            timezone: 'Istanbul'
        });

        initialConsentHelpers.verifyDefaultPageElements();
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });
        navigationHelpers.isNavigatedToDashboard();
        quickstartPopoeverHelpers.verifyDefaultPageElements();
    });

    it('should be complete onboarding flow with creating mobile type own application and verify all pages with empty data', function() {
        setupHelpers.verifyDefaultPageElements();
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: false
        });

        initialSetupHelpers.verifyDefaultPageElements(false);
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: false,
            appType: APP_TYPE.MOBILE,
            appName: 'My Mobile App',
            appKey: 'aaaaabe5c377f6ab830890e9d7d416970f5541a4',
            timezone: 'Istanbul'
        });

        initialConsentHelpers.verifyDefaultPageElements();
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });

        navigationHelpers.isNavigatedToDashboard();
        quickstartPopoeverHelpers.verifyDefaultPageElements();
        quickstartPopoeverHelpers.closeQuickStartPopover();
        homePageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsUsersOverview();
        analyticsUsersOverviewPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToVisitorLoyalty();
        analyticsLoyaltyUserActivityPageHelpers.verifyEmptyPageElements();
        analyticsLoyaltyUserActivityPageHelpers.clickSlippingAwayTab();
        analyticsLoyaltySlippingAwayPageHelpers.verifyEmptyPageElements();
        analyticsLoyaltySlippingAwayPageHelpers.clickTimesOfDayTab();
        analyticsLoyaltyTimesOfDayPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsSessionAnalyticsOverview();
        analyticsSessionAnalyticsOverviewPageHelpers.verifyEmptyPageElements();
        analyticsSessionAnalyticsOverviewPageHelpers.clickSessionDurationsTab();
        analyticsSessionAnalyticsDurationsPageHelpers.verifyEmptyPageElements();
        analyticsSessionAnalyticsDurationsPageHelpers.clickSessionFrequencyTab();
        analyticsSessionFrequencyPageHelpers.verifyEmptyPageElements();
        analyticsSessionFrequencyPageHelpers.clickViewsPerSessionTab();
        analyticsViewsPerSessionPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsViews();
        analyticsViewsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsSources();
        analyticsSourcesPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsTechnologyPlatforms();
        analyticsTechnologyPlatformsPageHelpers.verifyEmptyPageElements();
        analyticsTechnologyPlatformsPageHelpers.clickDevicesAndTypesTab();
        analyticsTechnologyDevicesAndTypesPageHelpers.verifyEmptyPageElements();
        analyticsTechnologyDevicesAndTypesPageHelpers.clickResolutionsTab();
        analyticsTechnologyResolutionsPageHelpers.verifyEmptyPageElements();
        analyticsTechnologyResolutionsPageHelpers.clickAppVersionsTab();
        analyticsTechnologyAppVersionsPageHelpers.verifyEmptyPageElements();
        analyticsTechnologyAppVersionsPageHelpers.clickCarriersTab();
        analyticsTechnologyCarriersPageHelpers.verifyEmptyPageElements();
        analyticsTechnologyCarriersPageHelpers.clickDensitiesTab();
        analyticsTechnologyDensitiesPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsGeoCountries();
        analyticsGeoCountriesPageHelpers.verifyEmptyPageElements();
        analyticsGeoCountriesPageHelpers.clickLanguagesTab();
        analyticsGeoLanguagesPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsEventsOverview();
        analyticsEventsOverviewPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAnalyticsAllEvents();
        analyticsEventsPageHelpers.verifyEmptyPageElements();
        cy.wait(25000)
        navigationHelpers.goToPushNotifications();
        messagingPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToFeedbackRatingsPage();
        feedbackRatingsPageHelpers.verifyEmptyPageElements();
        feedbackRatingsPageHelpers.clickRatingWidgetsTab();
        feedbackRatingWidgetsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToCrashesOverviewPage();
        crashesPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToRemoteConfigPage();
        remoteConfigPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToReportManagerPage();
        reportManagerPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToDataManagerPage();
        dataManagerEventsPageHelpers.verifyEmptyPageElements();
        dataManagerEventsPageHelpers.clickEventGroupsTab();
        dataManagerEventGroupsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToDataPopulatorPage();
        dataPopulatorPageHelpers.verifyEmptyPageElementsOfDataPopulatorWithTemplatePage();
        dataPopulatorPageHelpers.clickPopulateWithEnvironmentTab();
        dataPopulatorPageHelpers.verifyEmptyPageElementsOfDataPopulatorWithEnvironmentPage();
        dataPopulatorPageHelpers.clickTemplatesTab();
        dataPopulatorPageHelpers.verifyEmptyPageElementsOfTemplatesPage();
        navigationHelpers.goToIncomingDataLogsPage();
        incomingDataLogsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToSdkManagerPage();
        sdkManagersPageHelpers.verifyEmptyPageElements();
        sdkManagersPageHelpers.clickRequestStatsTab();
        requestStatsPageHelpers.verifyEmptyPageElements();
        requestStatsPageHelpers.clickHealthCheckTab();
        healthCheckPageHelpers.verifyEmptyPageElements();
        healthCheckPageHelpers.clickSdkConfigurationTab();
        sdkConfigurationsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToComplianceHubMetricsPage();
        complianceHubMetricsPageHelpers.verifyEmptyPageElements();
        complianceHubMetricsPageHelpers.clickUsersTab();
        complianceHubUsersPageHelpers.verifyEmptyPageElements();
        complianceHubUsersPageHelpers.clickConsentHistoryTab();
        complianceHubHistoryPageHelpers.verifyEmptyPageElements();
        complianceHubHistoryPageHelpers.clickExportPurgeHistoryTab();
        complianceHubExportPurgePageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToUserManagementPage();
        userManagementPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToApplicationsPage();
        applicationsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToSettingsPage();
        settingsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToDataPointsPage();
        dataPointsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToLogsPage();
        errorLogsPageHelpers.verifyEmptyPageElements();
        errorLogsPageHelpers.clickAuditLogsTab();
        systemLogsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToJobsPage();
        jobsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToFeatureManagementPage();
        pluginsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToEMailReportsPage();
        reportsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToAlertsPage();
        alertsPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToHooksPage();
        hooksPageHelpers.verifyEmptyPageElements();
        navigationHelpers.goToDbViewerPage();
        dbCountlyPageHelpers.verifyEmptyPageElements();
        dbCountlyPageHelpers.clickCountlyOutDatabaseTab();
        dbCountlyOutPageHelpers.verifyEmptyPageElements();
        dbCountlyOutPageHelpers.clickCountlyFileSystemDatabaseTab();
        dbCountlyFsPageHelpers.verifyEmptyPageElements();
    });

    it('should be complete onboarding flow with creating own desktop type application with default app key and enable tracking and subscribe to newsletter', function() {
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: false
        });

        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: false,
            appType: APP_TYPE.DESKTOP,
            appName: 'My Desktop App',
            timezone: 'Andorra'
        });

        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: true,
            isSubscribeToNewsletter: true
        });
        navigationHelpers.isNavigatedToDashboard();
        quickstartPopoeverHelpers.verifyDefaultPageElements();
    });

    it('should be complete onboarding flow with creating mobile type demo application and verify home page with Banking data', function() {
        setupHelpers.verifyDefaultPageElements();
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: true
        });

        initialSetupHelpers.verifyDefaultPageElements(true);
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: true,
            appType: APP_TYPE.MOBILE,
            demoAppData: DATA_TYPE.BANKING,
            timezone: 'Troll'
        });

        initialConsentHelpers.verifyDefaultPageElements();
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });
        navigationHelpers.isNavigatedToDashboard();
        quickstartPopoeverHelpers.closeQuickStartPopover();
        homePageHelpers.verifyFullDataPageElements();
    });
});
