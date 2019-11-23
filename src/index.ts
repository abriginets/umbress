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
import { umbressOptions } from './types'
import { isIpInSubnets } from './ip'

/**
 * Logic
 */

const subnetRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/\d{1,3}$/

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

    if (Array.isArray(options.messageOnTooManyRequests)) {
        throw new Error('You can`t pass an array to `messageOnTooManyRequests`')
    }

    if (options.whitelist.length > 0 && options.blacklist.length > 0) {
        throw new Error('Both whitelist and blacklist were specified. You are allowed to use only one list at a time')
    }

    if (Array.isArray(options.messageOnAccessNotAllowed)) {
        throw new Error('You can`t pass an array to `messageOnAccessNotAllowed`')
    }

    if (options.whitelist.length > 0 || options.blacklist.length > 0) {
        var subnets: Array<string> = [],
            key: string

        if (options.whitelist.length > 0) key = 'whitelist'
        if (options.blacklist.length > 0) key = 'blacklist'

        for (let i = 0; i < options[key].length; i++) {
            if (subnetRegex.test(options[key][i])) {
                subnets.push(options[key][i])
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

        const isIpInList = (address: string, list: string[]) => {
            let isIpInList = false

            for (let i = 0; i < list.length; i++) {
                isIpInList = address === list[i]
                if (isIpInList) break
            }

            return isIpInList
        }

        if (options.whitelist.length > 0) {
            if (subnets.length > 0 && subnets.length === options.whitelist.length) {
                if (isIpInSubnets(ip, subnets)) next()
            } else if (subnets.length > 0 && subnets.length !== options.whitelist.length) {
                if (isIpInSubnets(ip, subnets) || isIpInList(ip, options.whitelist)) next()
            } else if (subnets.length === 0 && options.whitelist.length > 0) {
                if (isIpInList(ip, options.whitelist)) next()
            }

            if (typeof options.messageOnAccessNotAllowed === 'object') {
                res.status(403).json(options.messageOnAccessNotAllowed)
            } else {
                res.status(403).end()
            }
        }

        if (options.blacklist.length > 0) {
            let toBlock = false

            if (subnets.length > 0 && subnets.length === options.blacklist.length) {
                if (isIpInSubnets(ip, subnets)) toBlock = true
            } else if (subnets.length > 0 && subnets.length !== options.blacklist.length) {
                if (isIpInSubnets(ip, subnets) || isIpInList(ip, options.blacklist)) toBlock = true
            } else if (subnets.length === 0 && options.blacklist.length > 0) {
                if (isIpInList(ip, options.blacklist)) toBlock = true
            }

            if (toBlock) {
                if (typeof options.messageOnAccessNotAllowed === 'object') {
                    res.status(403).json(options.messageOnAccessNotAllowed)
                } else {
                    res.status(403).end()
                }
            } else next()
        }

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
    } else {
        if (req.connection.remoteAddress.startsWith('::ffff:')) {
            return req.connection.remoteAddress.substr(7)
        }
    }
    return req.connection.remoteAddress
}
