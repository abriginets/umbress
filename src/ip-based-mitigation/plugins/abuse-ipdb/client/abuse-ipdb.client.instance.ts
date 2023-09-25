import { AbuseIPDBClient } from './abuse-ipdb.client';
import { httpClientInstance } from '../../../../http-client/http-client.instance';

export const AbuseIPDBClientInstance = new AbuseIPDBClient(httpClientInstance);
