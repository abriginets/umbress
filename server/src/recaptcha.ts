/**
 * Core Modules
 */

import { AutomatedNCaptchaOpts } from './types'

import express from 'express'
import { v4 as uuidv4 } from 'uuid'

/**
 * Engine Modules
 */

import { getPublicAsset, getRandomQuery } from './helpers'

/**
 * Logic
 */

export const sendCaptcha = async (options: AutomatedNCaptchaOpts): Promise<express.Response> => {
    const uuidCacheKey = 'recaptchaUuidCache_' + options.ip + '_' + options.req.headers['user-agent']
    let uuid = ''

    const cachedUuid = await options.cache.get(uuidCacheKey)

    if (cachedUuid !== null) {
        uuid = cachedUuid
    } else {
        uuid = uuidv4()
        await options.cache.set(uuidCacheKey, uuid, 'EX', 4)
    }

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * options.recaptchaCookieTtl)
    const randomQuery = getRandomQuery(128)

    return options.res
        .status(403)
        .cookie(options.recaptchaCookieName, uuid, {
            expires: expires,
            domain: '.' + (options.proxyTrusted ? options.req.headers[options.proxyHostname] : options.req.hostname),
            httpOnly: true,
            sameSite: 'Lax',
            secure: options.proxyTrusted
                ? options.req.headers[options.proxyProto] === 'https'
                : options.req.protocol === 'https'
        })
        .send(
            options.recaptchaTemplate
                .replace('%randCacheBypass%', randomQuery)
                .replace('%cookieTimestamp%', Math.round(expires.valueOf() / 1000).toString())
                .replace('%uuid%', uuid)
        )
}

export const precompileRecaptcha = (siteKey: string, header: string, text: string, frame: string): string => {
    const styleContent = getPublicAsset('recaptcha', 'css')
    const scriptContent = getPublicAsset('recaptcha', 'js')

    const styleRegexp = new RegExp('<style\\stype="text\\/css"><\\/style>')
    const scriptRegexp = new RegExp('<script\\stype="text\\/javascript"><\\/script>')

    const stageOneFrame = frame
        .replace('%captcha_header%', header)
        .replace('%captcha_text%', text)
        .replace(styleRegexp, `<style type="text/css">${styleContent}</style>`)
        .replace(scriptRegexp, `<script type="text/javascript">${scriptContent}</script>`)

    return stageOneFrame.replace('%recaptchaSiteKey%', siteKey)
}
