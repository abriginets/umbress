/**
 * Core Modules
 */

import fs from 'fs'
import path from 'path'
import { Request } from 'express'

/**
 * Engine Modules
 */

/**
 * Logic
 */

export const timestamp = (): number => Math.round(new Date().getTime() / 1000)

export const getAddress = (req: Request, isProxyTrusted: boolean): string => {
    // if proxy is trusted then Express is obviously behind the proxy so it's intentional to work with x-forwarded-for
    if (isProxyTrusted) {
        if (Array.isArray(req.headers['x-forwarded-for'])) {
            return req.headers['x-forwarded-for'][0]
        }
        return req.headers['x-forwarded-for']
    } else {
        if (req.connection.remoteAddress.startsWith('::ffff:')) {
            return req.connection.remoteAddress.substr(7)
        }
    }
    return req.connection.remoteAddress
}

export function getAdvancedAssets(name: 'automated', ext: 'css' | 'js'): string {
    const dirname = path.resolve(__dirname, '../public/dist')
    let fileContent = null

    fs.readdirSync(dirname).forEach((file: string) => {
        if (file.startsWith(name) && file.endsWith(ext)) {
            fileContent = fs.readFileSync(path.resolve(dirname, file), { encoding: 'utf-8' })
        }
    })

    if (fileContent !== null) return fileContent
    throw new Error(`Desired file was not found (name: ${name}, ext: ${ext})`)
}
