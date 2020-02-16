/**
 * Core Modules
 */

import uuidv4 from 'uuid/v4'
import { Redis } from 'ioredis'
import { compileTemplate } from 'pug'
import { Request, Response } from 'express'

/**
 * Engine Modules
 */

import { getAdvancedAssets } from './helpers'

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
    template: compileTemplate
    content: string
    cache: Redis
}

export async function sendInitial(options: Opts): Promise<Response> {
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

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

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
            options.template({
                content: options.content,
                styleContent: getAdvancedAssets('automated', 'css'),
                scriptContent: getAdvancedAssets('automated', 'js'),
                uuid: uuid,
                randCacheBypass: hash.join(''),
                cookieTimestamp: Math.round(expires.valueOf() / 1000)
            })
        )
}
