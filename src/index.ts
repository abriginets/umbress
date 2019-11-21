/*!
 * umbress
 * Copyright(c) 2019 JamesJGoodwin
 * MIT Licensed
 */

'use strict'

/**
 * Core Modules
 */

import express from 'express'

/**
 * Engine Modules
 */

import { defaults } from './defaults'
import { umbressOptions } from './types/global'

/**
 * Logic
 */

export default function(instanceOptions: umbressOptions) {
    const defaultOptions = defaults()
    const options = { ...defaultOptions }

    for (let opt in instanceOptions) {
        if (opt in options) {
            if (opt === 'rateLimiter') {
                for (let rlopt in instanceOptions[opt]) {
                    if (rlopt in options.rateLimiter) {
                        options.rateLimiter[rlopt] = instanceOptions[opt][rlopt]
                    }
                }
            } else {
                options[opt] = instanceOptions[opt]
            }
        }
    }

    /** { ip: seconds } */
    const jail = {}
    const queue = {}

    /**
     * Decrementing queue. The formula is time / requests * 1000
     * The lower req/s ratio is - the less frequent queue is releasing ips from queue and jail
     */
    setInterval(() => {
        let now = timestamp()
        // if there is expired prisoners - release them
        for (let prisoner in jail) {
            if (now > jail[prisoner]) {
                delete jail[prisoner]

                if (options.clearQueueAfterBan) {
                    delete queue[prisoner]
                }

                if (options.logs === true) {
                    console.log(`[umbress] Unbanned ${prisoner}`)
                }
            }
        }

        for (let ip in queue) {
            if (queue[ip] <= 0) {
                delete queue[ip]
            } else {
                queue[ip]--
            }
        }
    }, (options.rateLimiter.per / options.rateLimiter.requests) * 1000)

    return function(req: express.Request, res: express.Response, next: express.NextFunction) {
        const ip = getAddress(req, options.isProxyTrusted || false)

        if (ip in queue) {
            if (ip in jail) {
                if (timestamp() > jail[ip]) {
                    delete jail[ip]
                } else {
                    if (options.messageOnTooManyRequests) {
                        res.status(429)
                            .set({
                                'Retry-After': new Date(jail[ip] * 1000).toUTCString()
                            })
                            .send(options.messageOnTooManyRequests)
                    } else {
                        res.status(429)
                            .set({
                                'Retry-After': new Date(jail[ip] * 1000).toUTCString() // converting unix timestamp to HTTP Date
                                /**
                                 * For better support there should be two Retry-After headers
                                 * The first one with HTTP Date in it
                                 * And the second one with a number of seconds
                                 * But TypeScript not allowing to do so (see ts2300)
                                 */
                                //'Retry-After': jail[ip] - timestamp()
                            })
                            .end()
                    }
                }
            } else {
                queue[ip]++

                if (queue[ip] > options.rateLimiter.requests) {
                    jail[ip] = timestamp() + options.rateLimiter.banFor

                    if (options.logs === true) {
                        console.log(`[umbress] Banned ${ip} for ${options.rateLimiter.banFor} seconds`)
                    }
                }
            }
        } else {
            queue[ip] = 1
        }

        next()
    }
}

const timestamp = () => Math.round(new Date().getTime() / 1000)

const getAddress = (req: express.Request, isProxyTrusted: boolean) => {
    // if proxy is trusted then Express is obviously behind the proxy so it's intentional to work with x-forwarded-for
    if (isProxyTrusted) {
        if (Array.isArray(req.headers['x-forwarded-for'])) {
            return req.headers['x-forwarded-for'][0]
        }
        return req.headers['x-forwarded-for']
    }
    return req.connection.remoteAddress
}
