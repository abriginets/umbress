/*!
 * umbress
 * Copyright(c) 2019 JamesJGoodwin
 * MIT Licensed
 */

import { UmbressOptions, HtmlTemplates, AutomatedNCaptchaOpts } from './types'

/**
 * Core Modules
 */

import fs from 'fs'
import path from 'path'
import Redis from 'ioredis'
import cookie from 'cookie'
import fetch from 'node-fetch'
import { promises as dns } from 'dns'
import net, { isIPv4, isIPv6 } from 'net'
import { Request as Req, Response as Res, NextFunction as Next } from 'express'

/**
 * Engine Modules
 */

import { defaults } from './defaults'
import { checkAddress } from './abuseipdb'
import { isIpInSubnets, isIpInList } from './ip'
import { getAddress, iterate, merge } from './helpers'
import { precompileRecaptcha, sendCaptcha } from './recaptcha'
import { sendInitialAutomated, precompileAutomated } from './automated'

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

const AUTOMATED_INITIAL_COOKIE = '__umbuuid'
const AUTOMATED_CLEARANCE_COOKIE = '__umb_clearance'

const RECAPTCHA_INITIAL_COOKIE = '__umb_rcptch'
const RECAPTCHA_CLEARANCE_COOKIE = RECAPTCHA_INITIAL_COOKIE + '_clearance'

const PROXY_HOSTNAME = 'x-forwarded-hostname'
const PROXY_PROTO = 'x-forwarded-proto'
const PROXY_GEOIP = 'x-umbress-country'

const CACHE_PREFIX = 'umbress_'

const templatesPath = '../../templates/compiled'

export default function umbress(userOptions: UmbressOptions): (req: Req, res: Res, next: Next) => void {
    const templates: HtmlTemplates = {}
    const compiledPath = path.join(__dirname, templatesPath)

    fs.readdirSync(compiledPath).forEach(f => {
        if (f in templates === false) {
            templates[f] = {}
        }

        const filesPath = path.resolve(compiledPath, f)

        fs.readdirSync(filesPath).forEach(h => {
            const filePath = path.resolve(filesPath, h)

            templates[f][h.split('.html')[0]] = fs.readFileSync(filePath, { encoding: 'utf-8' })
        })
    })

    const defaultOptions = defaults(templates.automated.face)
    const options = merge(defaultOptions, userOptions)

    iterate(options, defaultOptions)

    const automatedFrame = precompileAutomated(options.advancedClientChallenging.content, templates.automated.frame)
    const recaptchaTemplate = precompileRecaptcha(
        options.recaptcha.siteKey,
        options.recaptcha.header,
        options.recaptcha.description,
        templates.recaptcha.index
    )

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

    return async function (req: Req, res: Res, next: Next): Promise<void | Next | Res> {
        const ip = getAddress(req, options.isProxyTrusted)

        const ratelimiterCachePrefix = 'ratelimiter_'
        const suspiciousJailPrefix = 'abuseipdb_'
        const botsKey = 'bot_' + ip

        let bypassChecking = false
        const bypassCaptcha = false

        const initialOpts: AutomatedNCaptchaOpts = {
            ip: ip,
            req: req,
            res: res,
            proxyTrusted: options.isProxyTrusted,
            automatedCookieName: AUTOMATED_INITIAL_COOKIE,
            recaptchaCookieName: RECAPTCHA_INITIAL_COOKIE,
            proxyHostname: PROXY_HOSTNAME.replace('www.', ''),
            proxyProto: PROXY_PROTO,
            automatedTemplate: automatedFrame,
            recaptchaTemplate: recaptchaTemplate,
            cache: redis,
            automatedCookieTtl: options.advancedClientChallenging.cookieTtl,
            recaptchaCookieTtl: options.recaptcha.cookieTtl
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
                                return await sendInitialAutomated(initialOpts)
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
                        return await sendInitialAutomated(initialOpts)
                    }

                    if (!options.recaptcha.enabled && options.geoipRule.action === 'recaptcha') {
                        return await sendCaptcha(initialOpts)
                    }
                } else {
                    if (!options.advancedClientChallenging.enabled && options.geoipRule.otherwise === 'check') {
                        return await sendInitialAutomated(initialOpts)
                    }

                    if (!options.recaptcha.enabled && options.geoipRule.otherwise === 'recaptcha') {
                        return await sendCaptcha(initialOpts)
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
                        return await sendInitialAutomated(initialOpts)
                    }

                    if (!options.recaptcha.enabled && options.geoipRule.action === 'recaptcha') {
                        return await sendCaptcha(initialOpts)
                    }
                } else {
                    if (options.advancedClientChallenging.enabled && options.geoipRule.otherwise === 'pass') {
                        bypassChecking = true
                    }

                    if (!options.advancedClientChallenging.enabled && options.geoipRule.otherwise === 'check') {
                        return await sendInitialAutomated(initialOpts)
                    }

                    if (!options.recaptcha.enabled && options.geoipRule.otherwise === 'recaptcha') {
                        return await sendCaptcha(initialOpts)
                    }
                }
            }
        }

        /**
         * Recaptcha for all users
         */

        // cookies for both automated and recaptcha
        const cookies = cookie.parse(req.headers.cookie || '')

        const isFirstCaptchaCookie = RECAPTCHA_INITIAL_COOKIE in cookies && !(RECAPTCHA_CLEARANCE_COOKIE in cookies)
        const allCaptchaCookies = RECAPTCHA_INITIAL_COOKIE in cookies && RECAPTCHA_CLEARANCE_COOKIE in cookies

        if (options.recaptcha.enabled || (isFirstCaptchaCookie && !allCaptchaCookies)) {
            const passedKey = `recaptchaPassed_${ip}`

            if (req.method === 'POST' && '__umb_rcptch_cb' in req.query) {
                if (!req.body) return await sendCaptcha(initialOpts)
                if ('g-recaptcha-response' in req.body === false) return await sendCaptcha(initialOpts)

                const uuidPair = await redis.get(`recaptchaUuidCache_${ip}`)

                if (uuidPair !== null) {
                    const uuidPairParsed = uuidPair.split('_')

                    const gresponse = await fetch(
                        `https://www.google.com/recaptcha/api/siteverify?secret=${options.recaptcha.secretKey}&response=${req.body['g-recaptcha-response']}&remoteip=${ip}`,
                        {
                            method: 'POST'
                        }
                    ).then(res => res.json())

                    if (gresponse.success === false) return await sendCaptcha(initialOpts)

                    await redis.set(
                        passedKey,
                        `${uuidPairParsed[0]}_${uuidPairParsed[1]}`,
                        'EX',
                        parseInt(uuidPairParsed[2]) - Math.round(new Date().valueOf() / 1000)
                    )

                    return res
                        .cookie(RECAPTCHA_CLEARANCE_COOKIE, uuidPairParsed[1], {
                            expires: new Date(parseInt(uuidPairParsed[2]) * 1000),
                            domain: '.' + (options.isProxyTrusted ? initialOpts.proxyHostname : req.hostname),
                            httpOnly: true,
                            sameSite: 'lax',
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
                return sendCaptcha(initialOpts)
            } else {
                if (!allCaptchaCookies && !bypassCaptcha) {
                    return await sendCaptcha(initialOpts)
                } else {
                    if (allCaptchaCookies) {
                        const cookiesInCache = await redis.get(passedKey)

                        if (cookiesInCache !== null) {
                            if (
                                cookiesInCache !==
                                cookies[RECAPTCHA_INITIAL_COOKIE] + '_' + cookies[RECAPTCHA_CLEARANCE_COOKIE]
                            ) {
                                return await sendCaptcha(initialOpts)
                            }
                        } else {
                            return await sendCaptcha(initialOpts)
                        }
                    }
                }
            }
        }

        /**
         * Advanced client challenging
         */

        const isFirstAutomatedCookie = AUTOMATED_INITIAL_COOKIE in cookies && !(AUTOMATED_CLEARANCE_COOKIE in cookies)
        const allAutomatedCookies = AUTOMATED_INITIAL_COOKIE in cookies && AUTOMATED_CLEARANCE_COOKIE in cookies

        if (options.advancedClientChallenging.enabled || (isFirstAutomatedCookie && !allAutomatedCookies)) {
            const passedKey = `automatedPassed_${ip}`

            if (req.method === 'POST' && '__umbuid' in req.query) {
                if (!req.body) return await sendInitialAutomated(initialOpts)
                if (!('sk' in req.body) || !('jschallenge' in req.body)) return await sendInitialAutomated(initialOpts)

                const uuidPair = await redis.get(`automatedUuidCache_${ip}`)

                if (uuidPair !== null) {
                    const uuidPairParsed = uuidPair.split('_')
                    const bd: { sk: string; jschallenge: string } = req.body
                    const dict = '0123456789'
                    const numbers: number[] = []
                    const letters: string[] = []

                    bd.sk.split('').forEach(symbol => {
                        if (dict.includes(symbol)) numbers.push(parseInt(symbol))
                        else letters.push(symbol)
                    })

                    const answer =
                        numbers.reduce((a, b) => Math.pow(a, a > 0 ? 1 : a) * Math.pow(b, b > 0 ? 1 : b)) *
                        letters.length

                    if (answer === parseInt(bd.jschallenge)) {
                        await redis.set(
                            passedKey,
                            `${uuidPairParsed[0]}_${uuidPairParsed[1]}`,
                            'EX',
                            parseInt(uuidPairParsed[2]) - Math.round(new Date().valueOf() / 1000)
                        )

                        return res
                            .cookie(AUTOMATED_CLEARANCE_COOKIE, uuidPairParsed[1], {
                                expires: new Date(parseInt(uuidPairParsed[2]) * 1000),
                                domain: '.' + (options.isProxyTrusted ? initialOpts.proxyHostname : req.hostname),
                                httpOnly: true,
                                sameSite: 'lax',
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
                }
                return await sendInitialAutomated(initialOpts)
            } else {
                if (!allAutomatedCookies && !bypassChecking) {
                    return await sendInitialAutomated(initialOpts)
                } else {
                    if (allAutomatedCookies) {
                        const cookiesInCache = await redis.get(passedKey)

                        if (cookiesInCache !== null) {
                            if (
                                cookiesInCache !==
                                cookies[AUTOMATED_INITIAL_COOKIE] + '_' + cookies[AUTOMATED_CLEARANCE_COOKIE]
                            ) {
                                return await sendInitialAutomated(initialOpts)
                            }
                        } else {
                            return await sendInitialAutomated(initialOpts)
                        }
                    }
                }
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
                    }

                    if (options.checkSuspiciousAddresses.action === 'check') {
                        return await sendInitialAutomated({
                            ...initialOpts,
                            ...{ automatedCookieTtl: options.checkSuspiciousAddresses.cookieTtl }
                        })
                    }

                    if (options.checkSuspiciousAddresses.action === 'recaptcha') {
                        return await sendCaptcha({
                            ...initialOpts,
                            ...{ recaptchaCookieTtl: options.checkSuspiciousAddresses.cookieTtl }
                        })
                    }
                }
            }
        }

        next()
    }
}
