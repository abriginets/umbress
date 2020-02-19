import { UmbressOptions } from './types'

export function defaults(contentForAutomated: string): UmbressOptions {
    const defaults: UmbressOptions = {
        /* If your Express instance is behind the proxy (e.g. Nginx)
        This option decides the way umbress is going to find real user's IP address (from it's connection if false and from x-forwarded-for if true) */

        isProxyTrusted: false,

        /* Settings to block users based on req/s ratio */

        rateLimiter: {
            /** Enables ratelimiter */

            enabled: false,

            /* Requests that can be made */

            requests: 60,

            /* In X amount of time*/

            per: 60,

            /* Time of ban in seconds */

            banFor: 30
        },

        /**  */

        clearQueueAfterBan: false,

        /** This option enables notification about bans and unbans */

        logs: false,

        /** Whitelist and blacklist */

        whitelist: [],
        blacklist: [],

        /** Ban IP addresses engaged in illegal activities */

        checkSuspiciousAddresses: {
            /** Is enabled */

            enabled: false,

            /** AbuseIPDB token */

            token: '',

            /** Action for blocked IP addresses */

            action: 'check',

            /** Time to ban IP if it was detected as suspicious */

            banFor: 3600,

            /** Time for cookie to live in user's web browser */

            cookieTtl: 1
        },

        /** Automated browser checking. Special page will be shown to user to pass JS challenge. Thisd is full automatic */

        advancedClientChallenging: {
            /** Is option above enabled - boolean */

            enabled: false,

            /** Time for cookie to live in user's web browser */

            cookieTtl: 30,

            /** Message for user - html or simple string */

            content: contentForAutomated,

            /** Whitelisted User-Agents */

            userAgentsWhitelist: /emptyRegExp/,

            /** This is caching layer to store bots and crawlers IP addresses */

            cache: 'redis',

            /** Redis server address */

            cacheHost: '127.0.0.1',

            /** Redis server port */

            cachePort: 6379
        }
    }

    return defaults
}
