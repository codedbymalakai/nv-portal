// hubspot-events.ts

type Primitive = string | number | boolean | null;

export interface SendLoginEventParams {
  email: string;
  loginTimestamp?: string | Date;
}

export interface HubSpotClientOptions {
  accessToken?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class HubSpotEventsClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: HubSpotClientOptions = {}) {
    const token = options.accessToken ?? process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!token) {
      throw new Error(
        'HubSpot access token is required. Set HUBSPOT_PRIVATE_APP_TOKEN or pass accessToken.',
      );
    }

    this.token = token;
    this.baseUrl = options.baseUrl ?? 'https://api.hubapi.com';
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /** Standard login event */
  async sendLoginEvent(params: SendLoginEventParams) {
    const timestamp = this.normalizeTimestamp(params.loginTimestamp);

    return this.sendCustomEvent(
      'pe26109463_client_portal_login',
      params.email,
      { login_timestamp: timestamp },
    );
  }

  /** First-ever login event */
  async sendFirstLoginEvent(params: SendLoginEventParams) {
    const timestamp = this.normalizeTimestamp(params.loginTimestamp);

    return this.sendCustomEvent('pe26109463_firstportallogin', params.email, {
      first_login_timestamp: timestamp,
    });
  }

  /** Generic behavioral event sender */
  async sendCustomEvent(
    eventName: string,
    email: string,
    properties?: Record<string, Primitive>,
  ) {
    console.log('Event Logged:', eventName);
    return this.post('/events/v3/send', {
      eventName,
      email,
      properties,
    });
  }

  private normalizeTimestamp(value?: string | Date): string {
    if (value instanceof Date) return value.toISOString();
    return value ?? new Date().toISOString();
  }

  private async post<T extends object>(path: string, body: T): Promise<void> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `HubSpot API error (${res.status}): ${text || res.statusText}`,
      );
    }
  }
}
