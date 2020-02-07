import { UmbressOptions } from '../../typings'

export function defaults(): UmbressOptions {
    const defaults: UmbressOptions = {
        /* If your Express instance is behind the proxy (e.g. Nginx)
        This option decides the way umbress is going to find real user's IP address (from it's connection if false and from x-forwarded-for if true) */

        isProxyTrusted: false,

        /* Settings to block users based on req/s ratio */

        rateLimiter: {
            /* Requests that can be made */

            requests: 60,

            /* In X amount of time*/

            per: 60,

            /* Time of ban in seconds */

            banFor: 30
        },

        /** If you're using Express.js as REST API endpoint, you might want to notify banned client of his violation */
        /** E.g. {"error": "You are making way too much requests so we had no choice but to cut your access. Please, retry later."} */

        messageOnTooManyRequests: null,

        /**  */

        clearQueueAfterBan: false,

        /** This option enables notification about bans and unbans */

        logs: false,

        /** Whitelist and blacklist */

        whitelist: [],
        blacklist: [],

        /** Same as `messageOnTooManyRequests` but for whitelist or blacklist */

        messageOnAccessNotAllowed: null,

        /** Ban IP addresses engaged in illegal activities */

        banSuspiciousIP: {
            /** Is enabled */

            enabled: false,

            /** AbuseIPDB token */

            token: '',

            /** Conditions to start checking IP addresses */

            on: {
                /** Start checking IP addresses if free memory on machine is less then X megabytes */

                freemem: 250,

                /** Start checking IP addresses if avarage CPU load was higher than X percent in 10 seconds */

                cpuAvg: 95
            },

            /** Time to ban IP if it was detected as suspicious */

            banFor: 3600,

            /** Same as `messageOnTooManyRequests` but for suspicious IP addresses */

            messageOnSuspicious: null
        },
        advancedClientChallenging: {
            enabled: false,
            content: ''
        }
    }

    return defaults
}
