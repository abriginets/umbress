export const ipToLong = (ip: string): number =>
    ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0

export const isIPinSubnet = (ip: string) => (cidr: string): boolean => {
    const [range, bits] = cidr.split('/')
    const mask = ~(2 ** (32 - parseInt(bits)) - 1)
    return (ipToLong(ip) & mask) === (ipToLong(range) & mask)
}

export const isIpInSubnets = (ip: string, cidrs: Array<string>): boolean => cidrs.some(isIPinSubnet(ip))

export const isIpInList = (address: string, list: string[]): boolean => list.some(ip => ip === address)
