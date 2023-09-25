import express from 'express';

import { AbuseIPDBPlugin } from '../../src/ip-based-mitigation/plugins/abuse-ipdb/abuse-ipdb.plugin';
import { VirusTotalIpAddressResponseDataAttributesResultEntryResult } from '../../src/ip-based-mitigation/plugins/virus-total/client/enums/virus-total-ip-address.enum';
import { VirusTotalPlugin } from '../../src/ip-based-mitigation/plugins/virus-total/virus-total.plugin';
import umbress from '../../src/main';

const app = express();

app.use(
  umbress<express.Request, express.Response>({
    ipAddressExtractor: (request) => {
      const xForwardedFor = request.headers['x-forwarded-for'];

      if (Array.isArray(xForwardedFor)) {
        return xForwardedFor.at(0);
      }

      return xForwardedFor;
    },
    ipBasedMitigation: [
      new AbuseIPDBPlugin({
        accessToken: process.env.ABUSE_IPDB_ACCESS_TOKEN,
        action: (request, response) => response.status(403).end(),
        confidenceScoreToBan: 79,
        maxAgeInDays: 30,
      }),
      new VirusTotalPlugin({
        accessToken: process.env.VIRUS_TOTAL_ACCESS_TOKEN,
        action: (request, response) => response.status(403).end(),
        decisionMaker(stats, vendorsData) {
          return (
            vendorsData.CrowdSec.result === VirusTotalIpAddressResponseDataAttributesResultEntryResult.MALICIOUS ||
            stats.malicious >= 10
          );
        },
      }),
    ],
  }),
);

app.listen(3003);
