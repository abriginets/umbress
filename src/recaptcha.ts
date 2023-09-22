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
    let expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * options.recaptchaCookieTtl)
    let expiresInSecs = Math.round(expires.valueOf() / 1000).toString()

    const uuidCacheKey = `recaptchaUuidCache_${options.ip}`
    const cachedUuid = await options.cache.get(uuidCacheKey)

    let uuid = ''

    if (cachedUuid !== null) {
        uuid = cachedUuid.split('_')[0]
        expiresInSecs = cachedUuid.split('_')[2]
        expires = new Date(parseInt(expiresInSecs) * 1000)
    } else {
        const keyPair = `${uuidv4()}_${uuidv4()}_${expiresInSecs}`
        uuid = keyPair.split('_')[0]
        await options.cache.set(uuidCacheKey, keyPair, 'EX', 10)
    }

    const randomQuery = getRandomQuery(128)

    return options.res
        .status(403)
        .cookie(options.recaptchaCookieName, uuid, {
            expires: expires,
            domain: '.' + (options.proxyTrusted ? options.req.headers[options.proxyHostname] : options.req.hostname),
            httpOnly: true,
            sameSite: 'lax',
            secure: options.proxyTrusted
                ? options.req.headers[options.proxyProto] === 'https'
                : options.req.protocol === 'https'
        })
        .send(options.recaptchaTemplate.replace('%randCacheBypass%', randomQuery).replace('%uuid%', uuid))
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
