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
import net, { isIPv4, isIPv6 } from 'net'
import pug from 'pug'
import path from 'path'
import Redis from 'ioredis'
import uuidv4 from 'uuid/v4'
import { promises as dns } from 'dns'
import { Request as Req, Response as Res, NextFunction as Next } from 'express'

/**
 * Engine Modules
 */

import { defaults } from './defaults'
import { checkAddress } from './abuseipdb'
import { isIpInSubnets, isIpInList } from './ip'
import { getAddress, iterate, merge } from './helpers'
import { sendInitial, Opts as AutomatedOpts } from './automated'

/**
 * Logic
 */

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

const PROXY_HOSTNAME = 'x-forwarded-hostname'
const PROXY_PROTO = 'x-forwarded-proto'
const PROXY_GEOIP = 'x-umbress-country'

const CACHE_PREFIX = 'umbress_'

export default function umbress(instanceOptions: UmbressOptions): (req: Req, res: Res, next: Next) => void {
    const defaultOptions = defaults(pugs.face())
    const options = merge(defaultOptions, instanceOptions)

    iterate(options, defaultOptions)

    const redis = new Redis({
        host: options.advancedClientChallenging.cacheHost,
        port: options.advancedClientChallenging.cachePort,
        keyPrefix: CACHE_PREFIX
    })

    const ipv4Subnets: Array<string> = []
    const ipv6Subnets: Array<string> = []
    const subnetsTail = new RegExp(/\/\d{1,3}/)

    if (options.whitelist.length > 0 || options.blacklist.length > 0) {
        let key = ''

        if (options.whitelist.length > 0) key = 'whitelist'
        if (key.length === 0 && options.blacklist.length > 0) key = 'blacklist'

        for (const entry of options[key]) {
            if (subnetsTail.test(entry)) {
                const bareAddr = entry.split('/')[0]

                if (isIPv4(bareAddr)) ipv4Subnets.push(entry)
                if (isIPv6(bareAddr)) ipv6Subnets.push(entry)
            }
        }
    }

    return async function(req: Req, res: Res, next: Next): Promise<void | Next | Res> {
        const ip = getAddress(req, options.isProxyTrusted)

        const ratelimiterCachePrefix = 'ratelimiter_'
        const suspiciousJailPrefix = 'abuseipdb_'
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
         * GeoIP blocking
         */

        if (PROXY_GEOIP in req.headers) {
            if (options.geoipRule.type === 'whitelist') {
                if (options.geoipRule.codes.includes(req.headers[PROXY_GEOIP] as string)) {
                    if (options.advancedClientChallenging.enabled && options.geoipRule.action === 'pass') {
                        bypassChecking = true
                    }

                    if (!options.advancedClientChallenging.enabled && options.geoipRule.action === 'check') {
                        return await sendInitial(initialOpts)
                    }
                } else {
                    if (!options.advancedClientChallenging.enabled && options.geoipRule.otherwise === 'check') {
                        return await sendInitial(initialOpts)
                    }

                    if (options.geoipRule.otherwise === 'block') {
                        return res.status(403).end()
                    }
                }
            } else {
                if (options.geoipRule.codes.includes(req.headers[PROXY_GEOIP] as string)) {
                    if (options.geoipRule.action === 'block') {
                        return res.status(403).end()
                    }

                    if (!options.advancedClientChallenging.enabled && options.geoipRule.action === 'check') {
                        return await sendInitial(initialOpts)
                    }
                } else {
                    if (options.advancedClientChallenging.enabled && options.geoipRule.otherwise === 'pass') {
                        bypassChecking = true
                    }

                    if (!options.advancedClientChallenging.enabled && options.geoipRule.otherwise === 'check') {
                        return await sendInitial(initialOpts)
                    }
                }
            }
        }

        /**
         * Advanced client challenging
         */

        const isFirstCookie = !!req.headers.cookie && req.headers.cookie.includes(UMBRESS_COOKIE_NAME)
        const allCookies = isFirstCookie && req.headers.cookie.includes(CLEARANCE_COOKIE_NAME)

        if (options.advancedClientChallenging.enabled === true || (isFirstCookie && !allCookies)) {
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
                if (allCookies || bypassChecking === true) return next()
                else return await sendInitial(initialOpts)
            }
        }

        /**
         * White and blacklists
         */

        if (options.whitelist.length > 0) {
            const CIDRsToCheck = net.isIPv4(ip) ? ipv4Subnets : ipv6Subnets

            if (isIpInList(ip, options.whitelist) || (CIDRsToCheck.length > 0 && isIpInSubnets(ip, CIDRsToCheck))) {
                return next()
            } else {
                return res.status(403).end()
            }
        }

        if (options.blacklist.length > 0) {
            const CIDRsToCheck = net.isIPv4(ip) ? ipv4Subnets : ipv6Subnets

            if (isIpInList(ip, options.blacklist) || (CIDRsToCheck.length > 0 && isIpInSubnets(ip, CIDRsToCheck))) {
                return res.status(403).end()
            }
        }

        /**
         * Ratelimiter
         */

        if (options.rateLimiter.enabled) {
            const ratelimiterCacheKey = ratelimiterCachePrefix + ip
            const ipKeys = await redis.keys(CACHE_PREFIX + ratelimiterCacheKey + '_*')
            const nowRaw = new Date().valueOf()
            const now = Math.round(nowRaw / 1000)
            const isBannedAlready = ipKeys.length === 1 && ipKeys[0].endsWith('banned')

            if (ipKeys.length >= options.rateLimiter.requests || isBannedAlready) {
                if (isBannedAlready) {
                    const bannedKey = await redis.get(ipKeys[0])
                    // if IP address marked as banned
                    const bannedUntil = parseInt(await redis.get(bannedKey))

                    // if IP still banned
                    return res
                        .status(429)
                        .set({
                            'Retry-After': new Date((now - bannedUntil) * 1000).toUTCString()
                        })
                        .end()
                } else {
                    // if IP reached threshold
                    const bannedUntil = now + options.rateLimiter.banFor

                    await redis.set(
                        `${ratelimiterCacheKey}_${nowRaw}_banned`,
                        bannedUntil,
                        'EX',
                        options.rateLimiter.banFor
                    )

                    if (options.rateLimiter.clearQueueAfterBan) {
                        const pipeline = ['del']

                        for (const ipKey of ipKeys) {
                            if (!ipKey.endsWith('banned')) {
                                pipeline.push(ipKey.replace(CACHE_PREFIX, ''))
                            }
                        }

                        await redis.pipeline([pipeline]).exec()
                    }

                    return res
                        .status(429)
                        .set({
                            'Retry-After': new Date(bannedUntil * 1000).toUTCString()
                        })
                        .end()
                }
            } else {
                await redis.set(`${ratelimiterCacheKey}_${nowRaw}`, '', 'EX', options.rateLimiter.per)
            }
        }

        /** Check visitors IP in database for recent reports
         * If IP is engaged in any kind of malicious activity - block it or send it an automated checking page
         */

        if (options.checkSuspiciousAddresses.enabled) {
            const suspiciousJailKey = suspiciousJailPrefix + '_' + ip
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
