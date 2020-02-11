/**
 * Core Modules
 */

import { UmbressOptions, AbuseIPDBResponse } from '../../typings'

import fetch from 'node-fetch'
import { Redis } from 'ioredis'

/**
 * Engine Modules
 */

/**
 * Logic
 */

export async function checkAddress(ip: string, options: UmbressOptions, redis: Redis, jailKey: string): Promise<void> {
    fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=7&verbose`, {
        headers: {
            Accept: 'application/json',
            Key: options.checkSuspiciousAddresses.token
        }
    })
        .then(async res => {
            if (res.status !== 200) {
                if (res.status === 429) {
                    const expirationAt = parseInt(res.headers['X-RateLimit-Reset'])
                    const secondsUntillExpiration = expirationAt - Math.round(new Date().valueOf() / 1000)
                    redis
                        .pipeline()
                        .del(jailKey)
                        .set(jailKey, 'exceeded', 'EX', secondsUntillExpiration)
                        .set('abuseipdb_quota', 'exceeded', 'EX', secondsUntillExpiration)
                        .exec(function(err) {
                            if (err) console.error(err)

                            if (options.logs === true) {
                                console.log(
                                    `[umbress] AbuseIPDB quota exceeded. Access will be restored at ${new Date(
                                        expirationAt * 1000
                                    ).toUTCString()}`
                                )
                            }
                        })
                } else {
                    await redis.set(jailKey, 'checked', 'EX', 60 * 30)

                    if (options.logs === true) {
                        res.json().then(data => {
                            console.error(
                                `[umbress] Error occured while requesting IP info! Status code: ${
                                    res.status
                                }; Response body: ${JSON.stringify(data)}`
                            )
                        })
                    }
                }
            } else {
                return res.json()
            }
        })
        .then(async (body: AbuseIPDBResponse) => {
            if ('data' in body === false) return

            const cached = await redis.get(jailKey)

            if (cached === 'checking') {
                await redis.del(jailKey)
            }

            if (body.data.abuseConfidenceScore > 80) {
                await redis.set(jailKey, 'banned', 'EX', 60 * 60 * 24 * 7)
            } else {
                await redis.set(jailKey, 'checked', 'EX', 60 * 60 * 24 * 7)
            }
        })
}
