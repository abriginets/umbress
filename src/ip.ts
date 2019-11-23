export const ipToLong = (ip: string) => ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0

export const isIPinSubnet = (ip: string) => (cidr: string) => {
    const [range, bits] = cidr.split('/')
    const mask = ~(2 ** (32 - parseInt(bits)) - 1)
    return (ipToLong(ip) & mask) === (ipToLong(range) & mask)
}

export const isIpInSubnets = (ip: string, cidrs: Array<string>) => cidrs.some(isIPinSubnet(ip))
