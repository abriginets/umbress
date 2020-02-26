/**
 * Core Modules
 */

import { Redis } from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { Request, Response } from 'express'

/**
 * Engine Modules
 */

import { getPublicAsset } from './helpers'

/**
 * Logic
 */

export interface Opts {
    ip: string
    req: Request
    res: Response
    proxyTrusted: boolean
    umbressCookieName: string
    proxyHostname: string
    proxyProto: string
    template: string
    cache: Redis
    cookieTtl: number
}

export async function sendAutomated(options: Opts): Promise<Response> {
    const hash = []
    const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    const uuidCacheKey = 'uuidCache_' + options.ip + '_' + options.req.headers['user-agent']
    let uuid = ''

    const cachedUuid = await options.cache.get(uuidCacheKey)

    if (cachedUuid !== null) {
        uuid = cachedUuid
    } else {
        uuid = uuidv4()
        await options.cache.set(uuidCacheKey, uuid, 'EX', 4)
    }

    for (let i = 0; i < 128; i++) {
        hash.push(dict.charAt(Math.floor(Math.random() * dict.length)))
    }

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * options.cookieTtl)

    return options.res
        .status(503)
        .cookie(options.umbressCookieName, uuid, {
            expires: expires,
            domain: '.' + (options.proxyTrusted ? options.req.headers[options.proxyHostname] : options.req.hostname),
            httpOnly: true,
            sameSite: 'Lax',
            secure: options.proxyTrusted
                ? options.req.headers[options.proxyProto] === 'https'
                : options.req.protocol === 'https'
        })
        .send(
            options.template
                .replace('%randCacheBypass%', hash.join(''))
                .replace('%cookieTimestamp%', Math.round(expires.valueOf() / 1000).toString())
                .replace('%uuid%', uuid)
        )
}

export function precompile(userContent: string, frame: string): string {
    const styleContent = getPublicAsset('automated', 'css')
    const scriptContent = getPublicAsset('automated', 'js')

    const styleRegexp = new RegExp('<style\\stype="text\\/css"><\\/style>')
    const scriptRegexp = new RegExp('<script\\stype="text\\/javascript"><\\/script>')

    return frame
        .replace('%user_content%', userContent)
        .replace(styleRegexp, `<style type="text/css">${styleContent}</style>`)
        .replace(scriptRegexp, `<script type="text/javascript">${scriptContent}</script>`)
}
