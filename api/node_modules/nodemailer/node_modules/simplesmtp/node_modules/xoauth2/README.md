xoauth2
=======

XOAuth2 token generation with node.js

## Installation

    npm install xoauth2

## Usage

**xoauth2** generates XOAUTH2 login tokens from provided Client and User credentials.

Use `xoauth2.createXOAuth2Generator(options)` to initialize Token Generator

Possible options values:

  * **user** _(Required)_ User e-mail address
  * **accessUrl** _(Optional)_ Endpoint for token generation (defaults to *https://accounts.google.com/o/oauth2/token*)
  * **clientId** _(Required)_ Client ID value
  * **clientSecret** _(Required)_ Client secret value
  * **refreshToken** _(Required)_ Refresh token for an user
  * **accessToken** _(Optional)_ initial access token. If not set, a new one will be generated
  * **timeout** _(Optional)_ timestamp for when the initial access token times out. In **milliseconds** after 1.1.1970.

See [https://developers.google.com/accounts/docs/OAuth2WebServer#offline]() for generating the required credentials

### Methods

#### Request an access token

Use `xoauth2obj.getToken(callback)` to get an access token. If a cached token is found and it should not be expired yet, the cached value will be used.

#### Request for generating a new access token

Use `xoauth2obj.generateToken(callback)` to get an access token. Cache will not be used and a new token is generated.

#### Update access token values

Use `xoauth2obj.updateToken(accessToken, timeout)` to set the new value for the xoauth2 access token. This function emits 'token'

### Events

If a new token value has been set, `'token'` event is emitted.

    xoauth2obj.on("token", function(token){
        console.log("User: ", token.user); // e-mail address
        console.log("New access token: ", token.accessToken);
        console.log("New access token timeout: ", token.timeout); // timestamp after 1.1.1970 in seconds
    });

### Example

    var xoauth2 = require("xoauth2"),
        xoauth2gen;

    xoauth2gen = xoauth2.createXOAuth2Generator({
        user: "user@gmail.com",
        clientId: "{Client ID}",
        clientSecret: "{Client Secret}",
        refreshToken: "{User Refresh Token}"
    });

    // SMTP/IMAP
    xoauth2gen.getToken(function(err, token){
        if(err){
            return console.log(err);
        }
        console.log("AUTH XOAUTH2 " + token);
    });

    // HTTP
    xoauth2gen.getToken(function(err, token, accessToken){
        if(err){
            return console.log(err);
        }
        console.log("Authorization: Bearer " + accessToken);
    });

## License

**MIT**