import ipaddr from 'ipaddr.js'

export const isIpInSubnets = (ip: string, cidrs: Array<string>): boolean => {
    const addr = ipaddr.parse(ip)
    return cidrs.some(cidr => addr.match(ipaddr.parseCIDR(cidr)))
}

export const isIpInList = (address: string, list: string[]): boolean => list.some(ip => ip === address)
