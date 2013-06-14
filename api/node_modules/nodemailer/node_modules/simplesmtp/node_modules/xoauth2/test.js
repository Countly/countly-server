var xoauth2 = require("./index"),
    xoauth2gen;

xoauth2gen = xoauth2.createXOAuth2Generator({
    user: "user@gmail.com",
    clientId: "{Client ID}",
    clientSecret: "{Client Secret}",
    refreshToken: "{User Refresh Token}",
    accessToken: "{User Refresh Token}",
    timeout: 3600
});

// SMTP/IMAP
xoauth2gen.getToken(function(err, token){
    if(err){
        console.log(123)
        return console.log(err);
    }
    console.log("AUTH XOAUTH2 " + token);
});