export interface AbuseIPDBPluginOptions {
  /**
   * Parameter to only return reports within the last X amount of days
   */
  maxAgeInDays?: number;
  /**
   * AbuseIPDB provides abuse confidence score. 0 = not abusive. 100 = abusive.
   *
   * Default - 80
   */
  confidenceScoreToBan?: number;
  /**
   * Token to access AbuseIPDB API
   */
  accessToken: string;
}
