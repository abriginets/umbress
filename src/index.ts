/*!
 * umbress
 * Copyright(c) 2019 JamesJGoodwin
 * MIT Licensed
 */

import { UmbressOptions, AbuseIPDBResponse, PugTemplates } from '../typings'

/**
 * Core Modules
 */

import os from 'os'
import fs from 'fs'
import pug from 'pug'
import path from 'path'
import fetch from 'node-fetch'
import uuidv4 from 'uuid/v4'
import { Request, Response, NextFunction } from 'express'

const cpus = os.cpus()

/**
 * Engine Modules
 */

import { defaults } from './defaults'
import { isIpInSubnets } from './ip'
import { timestamp, getAddress, getAdvancedAssets } from './helpers'

/**
 * Logic
 */

const subnetRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/\d{1,3}$/
/**
 * Visit https://www.abuseipdb.com/categories for more info about categories
 */
const relativeAbuseCategories = [4, 15, 16, 19, 20, 21, 23]

const pugs: PugTemplates = {}
const templatesPath = path.join(__dirname + '/../templates/')

fs.readdirSync(templatesPath).forEach((file: string): void => {
    if (file.endsWith('.pug')) {
        try {
            const filepath = templatesPath + file
            pugs[file.split('.pug')[0]] = pug.compile(fs.readFileSync(filepath, { encoding: 'utf-8' }), {
                filename: filepath
            })
        } catch (e) {
            console.error(e)
        }
    }
})

const CLEARANCE_COOKIE_NAME = '__umb_clearance'
const UMBRESS_COOKIE_NAME = '__umbuuid'
const PROXY_HOSTNAME = 'X-Forwarded-Hostname'
const PROXY_PROTO = 'X-Forwarded-Proto'

export default function(instanceOptions: UmbressOptions): (req: Request, res: Response, next: NextFunction) => void {
    const defaultOptions = defaults()
    const subnets: Array<string> = []
    const queue = {}
    const avgCpuLoad: Array<number> = []
    const quota: { isExceeded: boolean; unbanAt: null | number } = {
        isExceeded: false,
        unbanAt: null
    }

    let options = { ...defaultOptions }

    const merge = (target: UmbressOptions, source: UmbressOptions): UmbressOptions => {
        // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object) {
                Object.assign(source[key], merge(target[key], source[key]))
            }
        }

        // Join `target` and modified `source`
        Object.assign(target || {}, source)
        return target
    }

    options = merge(options, instanceOptions)

    if (Object.keys(options.advancedClientChallenging).length > 0) {
        if (typeof options.advancedClientChallenging.enabled === 'boolean') {
            if (options.advancedClientChallenging.enabled === true) {
                if (
                    typeof options.advancedClientChallenging.content === 'string' &&
                    options.advancedClientChallenging.content.length === 0
                ) {
                    options.advancedClientChallenging.content = pugs.face()
                } else {
                    throw new Error('Wrong type or value of `advancedClientChallenging.content` key')
                }
            }
        } else {
            throw new Error(
                `You passed ${typeof options.advancedClientChallenging
                    .enabled} type for the 'advancedClientChallenging.enabled' key, boolean expected`
            )
        }
    } else {
        throw new Error('You passed an empty object for the `advancedClientChallenging` key')
    }

    if (
        typeof options.messageOnTooManyRequests !== 'object' ||
        (typeof options.messageOnTooManyRequests === 'object' && Array.isArray(options.messageOnTooManyRequests))
    ) {
        throw new Error('You can only pass JS-object to `messageOnTooManyRequests`')
    }

    if (options.whitelist.length > 0 && options.blacklist.length > 0) {
        throw new Error('Both whitelist and blacklist were specified. You are allowed to use only one list at a time')
    }

    if (
        typeof options.messageOnAccessNotAllowed !== 'object' ||
        (typeof options.messageOnAccessNotAllowed === 'object' && Array.isArray(options.messageOnAccessNotAllowed))
    ) {
        throw new Error('You can only pass JS-object to `messageOnAccessNotAllowed`')
    }

    if (options.banSuspiciousIP.enabled) {
        if (typeof options.banSuspiciousIP.token !== 'string' || options.banSuspiciousIP.token.length === 0) {
            throw new Error('AbuseIPDB token was specified in wrong format or unspecified at all')
        }

        if (
            typeof options.banSuspiciousIP.messageOnSuspicious !== 'object' ||
            (typeof options.banSuspiciousIP.messageOnSuspicious === 'object' &&
                Array.isArray(options.banSuspiciousIP.messageOnSuspicious))
        ) {
            throw new Error('You can only pass JS-object to `banSuspiciousIP.messageOnSuspicious`')
        }
    }

    if (options.whitelist.length > 0 || options.blacklist.length > 0) {
        let key = ''

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

    const suspiciousJail = {}
    const checkingIP: Array<string> = []
    const suspiciousCache: { [key: string]: { suspicious: boolean; cachedSeconds: number } } = {}

    /**
     * Decrementing queue. The formula is time / requests * 1000
     * The lower req/s ratio is - the less frequent queue is releasing ips from queue and jail
     */
    setInterval(() => {
        const now = timestamp()
        // if there is expired prisoners - release them
        for (const prisoner in jail) {
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

        for (const ip in queue) {
            if (queue[ip] <= 0) {
                delete queue[ip]
            } else queue[ip]--
        }
    }, (options.rateLimiter.per / options.rateLimiter.requests) * 1000)

    /** Interval to free jail of suspicious IP addresses */

    setInterval(() => {
        for (const ip in suspiciousJail) {
            if (suspiciousJail[ip] <= 0) {
                delete suspiciousJail[ip]
            } else suspiciousJail[ip]--
        }

        for (const suspect in suspiciousCache) {
            if (suspiciousCache[suspect].cachedSeconds <= 0) {
                delete suspiciousCache[suspect]
            } else suspiciousCache[suspect].cachedSeconds--
        }
    }, 1000)

    /** Interval to check and update avarage CPU load and amount of free RAM */

    if (options.banSuspiciousIP.enabled === true) {
        setInterval(() => {
            const coresLoad: Array<number> = []

            for (let i = 0, len = cpus.length; i < len; i++) {
                const cpu = cpus[i]
                let total = 0
                const stats: { [key: string]: number } = {}

                for (const type in cpu.times) {
                    total += cpu.times[type]
                }

                for (const type in cpu.times) {
                    if (type !== 'idle') {
                        stats[type] = Math.round((100 * cpu.times[type]) / total)
                    }
                }

                coresLoad.push(Object.values(stats).reduce((a, b) => a + b))
            }

            avgCpuLoad.push(coresLoad.reduce((a, b) => a + b) / cpus.length)

            if (avgCpuLoad.length > 10) avgCpuLoad.shift()
        }, 1000)
    }

    return function(req: Request, res: Response, next: NextFunction): void | NextFunction | Response {
        const ip = getAddress(req, options.isProxyTrusted || false)
        if (options.advancedClientChallenging.enabled === true) {
            if (req.method === 'POST') {
                if (!req.body) return next()
                if ('sk' in req.body === false || 'jschallenge' in req.body === false) return next()

                const bd: { sk: string; jschallenge: string } = req.body

                const dict = '0123456789',
                    numbers: number[] = [],
                    letters: string[] = []

                bd.sk.split('').forEach(symbol => {
                    if (dict.includes(symbol)) numbers.push(parseInt(symbol))
                    else letters.push(symbol)
                })

                const answer =
                    numbers.reduce((a, b) => Math.pow(a, a > 0 ? 1 : a) * Math.pow(b, b > 0 ? 1 : b)) * letters.length

                if (answer === parseInt(bd.jschallenge)) {
                    return res
                        .cookie(CLEARANCE_COOKIE_NAME, uuidv4(), {
                            expires: new Date(parseInt(req.query['__umbuid'].split('_')[1]) * 1000),
                            domain: '.' + (options.isProxyTrusted ? req.headers[PROXY_HOSTNAME] : req.hostname),
                            httpOnly: true,
                            sameSite: 'Lax',
                            secure: options.isProxyTrusted
                                ? req.headers[PROXY_PROTO] === 'https'
                                : req.protocol === 'https'
                        })
                        .redirect(
                            301,
                            `${options.isProxyTrusted ? req.headers[PROXY_PROTO] : req.protocol}://${
                                options.isProxyTrusted ? req.headers[PROXY_HOSTNAME] : req.hostname
                            }${req.path}`
                        )
                }
                return next()
            } else {
                if (
                    !!req.headers.cookie &&
                    req.headers.cookie.includes(UMBRESS_COOKIE_NAME) &&
                    req.headers.cookie.includes(CLEARANCE_COOKIE_NAME)
                ) {
                    return next()
                } else {
                    const hash = []
                    const uuid = uuidv4()
                    const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

                    for (let i = 0; i < 128; i++) {
                        hash.push(dict.charAt(Math.floor(Math.random() * dict.length)))
                    }

                    //const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
                    const expires = new Date(Date.now() + 1000 * 20) // 20 seconds cache for debugging

                    return res
                        .status(503)
                        .cookie(UMBRESS_COOKIE_NAME, uuid, {
                            expires: expires,
                            domain: '.' + (options.isProxyTrusted ? req.headers[PROXY_HOSTNAME] : req.hostname),
                            httpOnly: true,
                            sameSite: 'Lax',
                            secure: options.isProxyTrusted
                                ? req.headers[PROXY_PROTO] === 'https'
                                : req.protocol === 'https'
                        })
                        .send(
                            pugs.frame({
                                content: options.advancedClientChallenging.content,
                                styleContent: getAdvancedAssets('automated', 'css'),
                                scriptContent: getAdvancedAssets('automated', 'js'),
                                uuid: uuid,
                                randCacheBypass: hash.join(''),
                                cookieTimestamp: Math.round(expires.valueOf() / 1000)
                            })
                        )
                }
            }
        }

        const isIpInList = (address: string, list: string[]): boolean => {
            let isIpInList = false

            for (let i = 0; i < list.length; i++) {
                isIpInList = address === list[i]
                if (isIpInList) break
            }

            return isIpInList
        }

        if (options.whitelist.length > 0) {
            if (subnets.length > 0 && subnets.length === options.whitelist.length) {
                if (isIpInSubnets(ip, subnets)) return next()
            } else if (subnets.length > 0 && subnets.length !== options.whitelist.length) {
                if (isIpInSubnets(ip, subnets) || isIpInList(ip, options.whitelist)) return next()
            } else if (subnets.length === 0 && options.whitelist.length > 0) {
                if (isIpInList(ip, options.whitelist)) return next()
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
            } else return next()
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

        try {
            if (options.banSuspiciousIP.enabled) {
                if (quota.isExceeded === false && !checkingIP.includes(ip) && ip in suspiciousCache === false) {
                    if (avgCpuLoad.length >= 2) {
                        checkingIP.push(ip)
                        const avg = avgCpuLoad.reduce((a, b) => a + b) / avgCpuLoad.length
                        const freemem = Math.round(os.freemem() / 1000000)

                        if (avg > options.banSuspiciousIP.on.cpuAvg || freemem < options.banSuspiciousIP.on.freemem) {
                            fetch(
                                `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(
                                    ip
                                )}&maxAgeInDays=7&verbose`,
                                {
                                    headers: {
                                        Accept: 'application/json',
                                        Key: options.banSuspiciousIP.token
                                    }
                                }
                            )
                                .then(res => {
                                    if (res.status === 429) {
                                        quota.isExceeded = true
                                        quota.unbanAt = parseInt(res.headers['X-RateLimit-Reset'])

                                        checkingIP.splice(checkingIP.indexOf(ip), 1)

                                        if (options.logs === true) {
                                            throw new Error(
                                                `[umbress] AbuseIPDB quota exceeded. Access will be restored at ${new Date(
                                                    quota.unbanAt * 1000
                                                ).toUTCString()}`
                                            )
                                        }
                                    } else {
                                        if (res.status !== 200) {
                                            checkingIP.splice(checkingIP.indexOf(ip), 1)

                                            if (options.logs === true) {
                                                res.json().then(data => {
                                                    throw new Error(
                                                        `[umbress] Error occured while requesting IP info! Response body: ${JSON.stringify(
                                                            data
                                                        )}`
                                                    )
                                                })
                                            }
                                        }
                                    }

                                    return res.json()
                                })
                                .then((body: AbuseIPDBResponse) => {
                                    if ('data' in body === false) {
                                        return console.log(
                                            '[umbress] Failed to fetch abuseipdb data, request finished with body: ' +
                                                JSON.stringify(body)
                                        )
                                    }

                                    if (body.data.abuseConfidenceScore > 30) {
                                        const reportCategories: Array<number> = []

                                        body.data.reports.slice(0, 30).forEach(val => {
                                            val.categories.forEach(cat => {
                                                if (!reportCategories.includes(cat)) {
                                                    reportCategories.push(cat)
                                                }
                                            })
                                        })

                                        for (let i = 0; i < reportCategories.length; i++) {
                                            if (relativeAbuseCategories.includes(reportCategories[i])) {
                                                if (options.logs === true) {
                                                    console.log(
                                                        `[umbress] Banned ${ip} as it was marked malicious by AbuseIPDB`
                                                    )
                                                }

                                                suspiciousJail[ip] = options.banSuspiciousIP.banFor
                                                suspiciousCache[ip] = {
                                                    suspicious: true,
                                                    cachedSeconds: 86400
                                                }
                                                break
                                            }
                                        }
                                    } else {
                                        suspiciousCache[ip] = {
                                            suspicious: false,
                                            cachedSeconds: 86400
                                        }
                                    }

                                    checkingIP.splice(checkingIP.indexOf(ip), 1)
                                })
                                .catch(err => console.error(err))
                        }
                    }
                }

                if (ip in suspiciousJail) {
                    if (options.banSuspiciousIP.messageOnSuspicious !== null) {
                        res.status(403).json(options.banSuspiciousIP.messageOnSuspicious)
                    } else res.status(403).end()
                }

                if (quota.isExceeded) {
                    if (timestamp() > quota.unbanAt) {
                        quota.isExceeded = false
                        quota.unbanAt = null
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }

        next()
    }
}
