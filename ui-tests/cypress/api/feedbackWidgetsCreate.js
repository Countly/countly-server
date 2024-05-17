const request = (countlyToken, appId, widgetName) => {
    const baseUrl = Cypress.config('baseUrl');
    const apiUrl = `${baseUrl}/i/feedback/widgets/create`;

    return cy.request({
        method: 'POST',
        url: apiUrl,
        headers: {
            'Countly-Token': countlyToken
        },
        body: {
            popup_header_text: widgetName,
            popup_comment_callout: "Add comment",
            popup_email_callout: "Contact me via e-mail",
            popup_button_callout: "Submit Feedback",
            popup_thanks_message: "Thanks for your feedback!",
            trigger_position: "mleft",
            trigger_bg_color: "#FF0000",
            trigger_font_color: "#C1F027",
            trigger_button_text: "Feedback",
            target_page: "all",
            target_pages: ["/"],
            hide_sticker: false,
            trigger_size: "m",
            comment_enable: false,
            contact_enable: false,
            targeting: null,
            ratings_texts: ["Very Dissatisfied", "Somewhat Dissatisfied", "Neither Satisfied Nor Dissatisfied", "Somewhat Satisfied", "Very Satisfied"],
            rating_symbol: "emojis",
            status: true,
            logoType: "default",
            globalLogo: false,
            internalName: "created by automation",
            app_id: appId
        },
    })
}

module.exports = {
    request,
};