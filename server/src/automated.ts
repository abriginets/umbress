/**
 * Core Modules
 */

import { compileTemplate } from 'pug'
import uuidv4 from 'uuid/v4'
import { Request, Response } from 'express'

/**
 * Engine Modules
 */

import { getAdvancedAssets } from './helpers'

/**
 * Logic
 */

export interface Opts {
    req: Request
    res: Response
    proxyTrusted: boolean
    umbressCookieName: string
    proxyHostname: string
    proxyProto: string
    template: compileTemplate
    content: string
}

export function sendInitial(options: Opts): Response {
    const hash = []
    const uuid = uuidv4()
    const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < 128; i++) {
        hash.push(dict.charAt(Math.floor(Math.random() * dict.length)))
    }

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    //const expires = new Date(Date.now() + 1000 * 20) // 20 seconds cache for debugging

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
