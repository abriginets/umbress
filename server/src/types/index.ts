import { compileTemplate } from 'pug'

export interface UmbressOptions {
    isProxyTrusted?: boolean
    rateLimiter?: {
        enabled?: boolean
        requests?: number
        per?: number
        banFor?: number
        clearQueueAfterBan?: boolean
    }
    logs?: boolean
    whitelist?: Array<string>
    blacklist?: Array<string>
    checkSuspiciousAddresses?: {
        enabled?: boolean
        token?: string
        action?: 'block' | 'check'
        banFor?: number
        cookieTtl?: 1
    }
    advancedClientChallenging?: {
        enabled: boolean
        cookieTtl?: number
        content?: string
        userAgentsWhitelist?: RegExp
        cache?: 'redis'
        cacheHost?: string
        cachePort?: number
    }
    geoipRule?: {
        type: 'whitelist' | 'blacklist'
        codes: Array<string>
        action: geoipAction
        otherwise: geoipAction
    }
}

type geoipAction = 'block' | 'check' | 'pass'

export interface AbuseIPDBResponse {
    data: {
        ipAddress: string
        isPublic: boolean
        ipVersion: number
        isWhitelisted: boolean
        abuseConfidenceScore: number
        countryCode: string
        countryName: string
        usageType: string
        isp: string
        domain: string
        totalReports: number
        numDistinctUsers: number
        lastReportedAt: string
        reports: Array<{
            reportedAt: string
            comment: string
            categories: Array<number>
            reporterId: number
            reporterCountryCode: string
            reporterCountryName: string
        }>
    }
}

export interface PugTemplates {
    [key: string]: compileTemplate
}
