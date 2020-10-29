const rules = [
    {
        id: "1",
        name: "api endpoint hook 1",
        description: "post method",
        trigger: {
            type: "APIEndPointTrigger",
            configuration: {
                path: "pxVkjpv3b8pYoDJdGkdaLUMuXRXVURAA",
                method: "POST", //"GET"
            }
        },
        effects: [
            {
                type: "HttpEffect",
                configuration: {
                    url: "http://ifconfig.co/",
                    method: "get",
                    variables: []
                }
            },
            {
                type: "SDKEventEffect",
                configuration: {
                    app_key: "dd87451998d973bd89e2c6e53cb93d91b0f975c3",
                    event_key: "test_effect",
                    segmentation: {
                        "pay": 1,
                    }
                }
            },
            {
                type: "EmailEffect",
                configuration: {
                    address: "abc@abc.com", //"get"
                }
            },
            {
                type: "pushnotificationeffect",
            },
        ],
        status: 0,
    },
];

module.exports = {
    rules,
};
