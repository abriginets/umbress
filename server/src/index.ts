/*!
 * umbress
 * Copyright(c) 2019 JamesJGoodwin
 * MIT Licensed
 */

import { UmbressOptions, PugTemplates } from './types'

/**
 * Core Modules
 */

import fs from 'fs'
import net from 'net'
import pug from 'pug'
import path from 'path'
import Redis from 'ioredis'
import uuidv4 from 'uuid/v4'
import { Request as Req, Response as Res, NextFunction as Next } from 'express'

import { promises as dns } from 'dns'

/**
 * Engine Modules
 */

import { defaults } from './defaults'
import { isIpInSubnets, isIpInList } from './ip'
import { getAddress, iterate, merge } from './helpers'
import { sendInitial, Opts as AutomatedOpts } from './automated'
import { checkAddress } from './abuseipdb'

/**
 * Logic
 */

const ipv4SubnetRegexp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/\d{1,3}$/
const ipv6SubnetRegexp = /^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?s*(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$/

/**
 * Whitelisted crawlers:
 * Google
 * Yandex
 * Bing
 * Baidu
 * Mail.ru
 * Applebot
 */

const BOTS_USERAGENT_REGEX = /((AdsBot-)?Google(bot)?)|Yandex(Webmaster|Bot|Metrika)|(bing|msn)bot|Baiduspider|Mail\.RU_Bot|Applebot/
const BOTS_HOSTNAME_REGEX = /(google(bot)?.com|yandex\.(com|net|ru)|search\.msn\.com|crawl\.baidu\.com|mail\.ru|applebot\.apple\.com)$/

/**
 * Social Network Bots:
 * VK.com
 * Facebook
 * Twitter
 */

const NON_HOSTNAMEABLE_BOTS = /Twitterbot|facebookexternalhit|vkShare/

const pugs: PugTemplates = {}
const templatesPath = path.join(__dirname + '/../../templates/')

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

export default function umbress(instanceOptions: UmbressOptions): (req: Req, res: Res, next: Next) => void {
    const defaultOptions = defaults(pugs.face())
    const options = merge(defaultOptions, instanceOptions)

    iterate(options, defaultOptions)

    const redis = new Redis({
        host: options.advancedClientChallenging.cacheHost,
        port: options.advancedClientChallenging.cachePort,
        keyPrefix: 'umbress_'
    })

    const ipv4Subnets: Array<string> = []
    const ipv6Subnets: Array<string> = []

    if (options.whitelist.length > 0 || options.blacklist.length > 0) {
        let key = ''

        if (options.whitelist.length > 0) key = 'whitelist'
        if (key.length === 0 && options.blacklist.length > 0) key = 'blacklist'

        for (const entry of options[key]) {
            if (ipv4SubnetRegexp.test(entry)) {
                ipv4Subnets.push(entry)
            } else if (ipv6SubnetRegexp.test(entry)) {
                ipv6Subnets.push(entry)
            }
        }
    }

    /**
     * Decrementing queue. The formula is time / requests * 1000
     * The lower req/s ratio is - the less frequent queue is releasing ips from queue and jail
     */

    const queue = {}

    if (options.rateLimiter.enabled) {
        setInterval(() => {
            for (const ip in queue) {
                if (queue[ip] <= 0) {
                    delete queue[ip]
                } else queue[ip]--
            }
        }, (options.rateLimiter.per / options.rateLimiter.requests) * 1000)
    }

    return async function(req: Req, res: Res, next: Next): Promise<void | Next | Res> {
        const ip = getAddress(req, options.isProxyTrusted)
        const ratelimiterJailKey = 'jail_' + ip
        const suspiciousJailKey = 'abuseipdb_' + ip
        const botsKey = 'bot_' + ip
        let bypassChecking = false

        const initialOpts: AutomatedOpts = {
            ip: ip,
            req: req,
            res: res,
            proxyTrusted: options.isProxyTrusted,
            umbressCookieName: UMBRESS_COOKIE_NAME,
            proxyHostname: PROXY_HOSTNAME.replace('www.', ''),
            proxyProto: PROXY_PROTO,
            template: pugs.frame,
            content: options.advancedClientChallenging.content,
            cache: redis,
            cookieTtl: options.advancedClientChallenging.cookieTtl
        }

        /**
         * If visitor have crawler-like user-agent - check his hostname
         * If hostname is valid - allow visitor to bypass automated checking
         * If hostname does not belong to any of the crawlers - add visitor IP to blacklist
         */

        if (BOTS_USERAGENT_REGEX.test(req.headers['user-agent'])) {
            const cache: string | null = await redis.get(botsKey)

            if (cache !== null) {
                if (options.advancedClientChallenging.enabled) {
                    bypassChecking = true
                }
            } else {
                let hostnames: string[] = []

                try {
                    hostnames = await dns.reverse(ip)
                } catch (e) {
                    hostnames = [ip]
                }

                for (const hostname of hostnames) {
                    if (BOTS_HOSTNAME_REGEX.test(hostname)) {
                        await redis.set(botsKey, ip, 'EX', 60 * 60 * 24 * 180)
                        if (options.advancedClientChallenging.enabled) {
                            bypassChecking = true
                        }
                    } else {
                        if (!options.blacklist.includes(ip)) {
                            if (options.advancedClientChallenging.enabled) {
                                return await sendInitial(initialOpts)
                            } else {
                                options.blacklist.push(ip)
                                return res.status(403).end()
                            }
                        }
                    }
                    break
                }
            }
        } else if (NON_HOSTNAMEABLE_BOTS.test(req.headers['user-agent'])) {
            if (options.advancedClientChallenging.enabled) {
                bypassChecking = true
            }
        } else if (options.advancedClientChallenging.userAgentsWhitelist.toString() !== '/emptyRegExp/') {
            if (options.advancedClientChallenging.userAgentsWhitelist.test(req.headers['user-agent'])) {
                if (options.advancedClientChallenging.enabled) {
                    bypassChecking = true
                }
            }
        }

        /**
         * Advanced client challenging
         */

        if (options.advancedClientChallenging.enabled === true) {
            if (req.method === 'POST' && '__umbuid' in req.query) {
                if (!req.body) return await sendInitial(initialOpts)
                if (!('sk' in req.body) || !('jschallenge' in req.body)) return await sendInitial(initialOpts)

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
                            domain: '.' + (options.isProxyTrusted ? initialOpts.proxyHostname : req.hostname),
                            httpOnly: true,
                            sameSite: 'Lax',
                            secure: options.isProxyTrusted
                                ? req.headers[PROXY_PROTO] === 'https'
                                : req.protocol === 'https'
                        })
                        .redirect(
                            301,
                            `${options.isProxyTrusted ? req.headers[PROXY_PROTO] : req.protocol}://${
                                options.isProxyTrusted ? initialOpts.proxyHostname : req.hostname
                            }${req.path}`
                        )
                }
                return await sendInitial(initialOpts)
            } else {
                if (
                    (!!req.headers.cookie &&
                        req.headers.cookie.includes(UMBRESS_COOKIE_NAME) &&
                        req.headers.cookie.includes(CLEARANCE_COOKIE_NAME)) ||
                    bypassChecking === true
                ) {
                    return next()
                } else {
                    return await sendInitial(initialOpts)
                }
            }
        }

        /**
         * White and blacklists
         */

        if (options.whitelist.length > 0) {
            if (net.isIPv4(ip)) {
                if (isIpInList(ip, options.whitelist) || (ipv4Subnets.length > 0 && isIpInSubnets(ip, ipv4Subnets))) {
                    return next()
                } else {
                    return res.status(403).end()
                }
            }
        }

        if (options.blacklist.length > 0) {
            if (net.isIPv4(ip)) {
                if (isIpInList(ip, options.blacklist) || (ipv4Subnets.length > 0 && isIpInSubnets(ip, ipv4Subnets))) {
                    return res.status(403).end()
                }
            }
        }

        /**
         * Ratelimiter
         */

        if (options.rateLimiter.enabled) {
            const cachedIpData = await redis.get(ratelimiterJailKey)

            if (cachedIpData !== null) {
                const ttl = new Date(Math.round(new Date().valueOf() / 1000) + (await redis.ttl(ratelimiterJailKey)))

                return res
                    .status(429)
                    .set({
                        'Retry-After': ttl.toUTCString()
                    })
                    .end()
            } else {
                if (ip in queue) {
                    if (queue[ip] > options.rateLimiter.requests) {
                        await redis.set(ratelimiterJailKey, 'banned', 'EX', options.rateLimiter.banFor)

                        if (options.clearQueueAfterBan) {
                            delete queue[ip]
                        }

                        if (options.logs === true) {
                            console.log(`[umbress] Banned ${ip} for ${options.rateLimiter.banFor} seconds`)
                        }

                        return res.status(429).end()
                    } else {
                        queue[ip]++
                    }
                } else {
                    queue[ip] = 1
                }
            }
        }

        /** Check visitors IP in database for recent reports
         * If IP is engaged in any kind of malicious activity - block it or send it an automated checking page
         */

        if (options.checkSuspiciousAddresses.enabled) {
            const ipData = await redis.get(suspiciousJailKey)

            if (ipData === null) {
                await redis.set(suspiciousJailKey, 'checking', 'EX', 10)
                checkAddress(ip, options, redis, suspiciousJailKey).catch(err => console.error(err))
            } else {
                if (ipData === 'banned') {
                    if (options.checkSuspiciousAddresses.action === 'block') {
                        return res.status(403).end()
                    } else if (options.checkSuspiciousAddresses.action === 'check') {
                        return await sendInitial({
                            ...initialOpts,
                            ...{ cookieTtl: options.checkSuspiciousAddresses.cookieTtl }
                        })
                    }
                }
            }
        }

        next()
    }
}
