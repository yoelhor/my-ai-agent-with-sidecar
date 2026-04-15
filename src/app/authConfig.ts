import { Configuration, LogLevel } from "@azure/msal-browser";
/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */
export const msalConfig: Configuration = {
    auth: {
        clientId: "3f3865e0-d0a7-4b4b-b731-109942fac5fb",
        authority: "https://login.microsoftonline.com/d4bc1473-02ff-4b6a-a30d-cacf41c287d5", //  Replace the placeholder with your tenant info
        redirectUri: 'http://localhost:3000', // You must register this URI on App Registration.
    },
    cache: {
        cacheLocation: 'sessionStorage', // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO.
    },
    system: {
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            },
        },
    },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview#openid-connect-scopes
 */
export const loginRequest = {
    scopes: ["api://fc1e4b07-712a-461f-93ad-8f9d6433791f/access_agent"],
};

/**
 * An optional silentRequest object can be used to achieve silent SSO
 * between applications by providing a "login_hint" property.
 */

// const silentRequest = {
//   scopes: ["openid", "profile"],
//   loginHint: "example@domain.net"
// };

// exporting config object for jest
if (typeof exports !== 'undefined') {
    module.exports = {
        msalConfig: msalConfig,
        loginRequest: loginRequest,
    };
}