import express from 'express';

import { AbuseIPDBPlugin } from '../../src/ip-based-mitigation/plugins/abuse-ipdb/abuse-ipdb.plugin';
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
      }),
    ],
  }),
);

app.listen(3003);
