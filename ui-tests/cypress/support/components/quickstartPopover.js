const quickstartPopoeverElements = {
    QUICKSTART_POPOVER_WRAPPER: 'quickstart-popover-wrapper',
    QUICKSTART_POPOVER_POSITIONER: 'quickstart-popover-positioner',
    CLOSE_ICON: 'quickstart-popover-close',
    QUICKSTART_LABEL: 'quickstart-title',
    INVITE_USERS_ITEM: 'quickstart-item-invite-users',
    INVITE_USERS_ICON: 'quickstart-item-svg-invite-users',
    INVITE_USERS_LINK: 'quickstart-item-link-invite-users',
    INVITE_USERS_DESC: 'quickstart-item-desc-invite-users',
    CREATE_APP_ITEM: 'quickstart-item-create-a-new-application',
    CREATE_APP_ICON: 'quickstart-item-svg-create-a-new-application',
    CREATE_APP_LINK: 'quickstart-item-link-create-a-new-application',
    CREATE_APP_DESC: 'quickstart-item-desc-create-a-new-application',
    EXPLORE_GUIDES_ITEM: 'quickstart-item-explore-countly-guides',
    EXPLORE_GUIDES_ICON: 'quickstart-item-svg-explore-countly-guides',
    EXPLORE_GUIDES_LINK: 'quickstart-item-link-explore-countly-guides',
    EXPLORE_GUIDES_DESC: 'quickstart-item-desc-explore-countly-guides',
    FIND_SDK_ITEM: 'quickstart-item-find-your-countly-sdk',
    FIND_SDK_ICON: 'quickstart-item-svg-find-your-countly-sdk',
    FIND_SDK_LINK: 'quickstart-item-link-find-your-countly-sdk',
    FIND_SDK_ION_ANDROID_OPEN: 'quickstart-item-ios-android-open-find-your-countly-sdk',
    FIND_SDK_DESC: 'quickstart-item-desc-find-your-countly-sdk',
    JOIN_DISCORD_ITEM: 'quickstart-item-join-countly-community-on-discord',
    JOIN_DISCORD_ICON: 'quickstart-item-svg-join-countly-community-on-discord',
    JOIN_DISCORD_LINK: 'quickstart-item-link-join-countly-community-on-discord',
    JOIN_DISCORD_ION_ANDROID_OPEN: 'quickstart-item-ios-android-open-join-countly-community-on-discord',
    JOIN_DISCORD_DESC: 'quickstart-item-desc-join-countly-community-on-discord',
};

const verifyDefaultPageElements = () => {
    cy.verifyElement({
        element: quickstartPopoeverElements.QUICKSTART_POPOVER_POSITIONER,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.CLOSE_ICON,
    });

    cy.verifyElement({
        labelElement: quickstartPopoeverElements.QUICKSTART_LABEL,
        labelText: "Quick Start"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.INVITE_USERS_ITEM,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.INVITE_USERS_ICON,
        isElementVisible: false,
        attr: "src",
        attrText: "./images/dashboard/onboarding/light-bulb.svg"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.INVITE_USERS_LINK,
        isElementVisible: false,
        elementText: "Invite users",
        hrefContainUrl: "/manage/users"
    });

    cy.verifyElement({
        labelElement: quickstartPopoeverElements.INVITE_USERS_DESC,
        isElementVisible: false,
        labelText: "Add new dashboard users"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.CREATE_APP_ITEM,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.CREATE_APP_ICON,
        isElementVisible: false,
        attr: "src",
        attrText: "./images/dashboard/onboarding/light-bulb.svg"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.CREATE_APP_LINK,
        isElementVisible: false,
        elementText: "Create a new application",
        hrefContainUrl: "/manage/apps"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.EXPLORE_GUIDES_ITEM,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.EXPLORE_GUIDES_ICON,
        isElementVisible: false,
        attr: "src",
        attrText: "./images/dashboard/onboarding/light-bulb.svg"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.EXPLORE_GUIDES_LINK,
        isElementVisible: false,
        elementText: "Explore Countly Guides",
        hrefContainUrl: "/guides"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.FIND_SDK_ITEM,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.FIND_SDK_ICON,
        isElementVisible: false,
        attr: "src",
        attrText: "./images/dashboard/onboarding/light-bulb.svg"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.FIND_SDK_LINK,
        isElementVisible: false,
        elementText: "Find your Countly SDK",
        hrefContainUrl: "https://support.count.ly/hc/en-us/articles/360037236571-Downloading-and-Installing-SDKs"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.JOIN_DISCORD_ITEM,
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.JOIN_DISCORD_ICON,
        isElementVisible: false,
        attr: "src",
        attrText: "./images/dashboard/onboarding/light-bulb.svg"
    });

    cy.verifyElement({
        element: quickstartPopoeverElements.JOIN_DISCORD_LINK,
        isElementVisible: false,
        elementText: "Join Countly Community on Discord",
        hrefContainUrl: "https://discord.gg/countly"
    });
};

module.exports = {
    verifyDefaultPageElements
};