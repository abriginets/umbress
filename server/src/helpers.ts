/**
 * Core Modules
 */

import { UmbressOptions } from './types'

import fs from 'fs'
import path from 'path'
import { Request } from 'express'

/**
 * Engine Modules
 */

/**
 * Logic
 */

export const merge = (defaults: UmbressOptions, options: UmbressOptions): UmbressOptions => {
    const result = { ...defaults }

    for (const key in options) {
        if (key in options) {
            if (options[key] instanceof Object && !Array.isArray(options[key]) && !(options[key] instanceof RegExp)) {
                result[key] = merge(result[key], options[key])
            } else {
                result[key] = options[key]
            }
        }
    }

    return result
}

export const iterate = (obj: UmbressOptions, stack: UmbressOptions): void => {
    for (const prop in obj) {
        if (prop in obj) {
            if (obj[prop] instanceof Object && !Array.isArray(obj[prop])) {
                iterate(obj[prop], stack[prop])
            } else {
                if (typeof obj[prop] !== typeof stack[prop]) {
                    throw new Error(`'${prop}' type should be ${typeof stack[prop]}, you passed ${typeof obj[prop]}`)
                }
            }
        }
    }
}

export const getAddress = (req: Request, isProxyTrusted: boolean): string => {
    // if proxy is trusted then Express is obviously behind the proxy so it's intentional to work with x-forwarded-for
    if (isProxyTrusted) {
        return req.headers['x-forwarded-for'] as string
    } else {
        if (req.connection.remoteAddress.startsWith('::ffff:')) {
            return req.connection.remoteAddress.substr(7)
        }
        return req.connection.remoteAddress
    }
}

export function getAdvancedAssets(name: 'automated', ext: 'css' | 'js'): string {
    const dirname = path.resolve(__dirname, '../../public/dist')
    let fileContent = null

    fs.readdirSync(dirname).forEach((file: string) => {
        if (file.startsWith(name) && file.endsWith(ext)) {
            fileContent = fs.readFileSync(path.resolve(dirname, file), { encoding: 'utf-8' })
        }
    })

    if (fileContent !== null) return fileContent
    throw new Error(`Desired file was not found (name: ${name}, ext: ${ext})`)
}
