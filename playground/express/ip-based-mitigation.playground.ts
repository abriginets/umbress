import express from 'express';

import { AbuseIPDBPlugin } from '../../src/ip-based-mitigation/plugins/abuse-ipdb/abuse-ipdb.plugin';
import umbress from '../../src/main';

const app = express();

app.use(
  umbress<express.Request, express.Response>({
    ipAddressExtractor: (request) => request.headers['x-forwarded-for'],
    ipBasedMitigation: [
      new AbuseIPDBPlugin({
        accessToken: process.env.ABUSE_IPDB_ACCESS_TOKEN,
        action: (request, response) => response.status(403).end(),
      }),
    ],
  }),
);

app.listen(3003);
