export class HttpClientService {
  async get<T = unknown>(url: URL, options?: RequestInit): Promise<T> {
    const result = await fetch(url.toString(), options);

    return result.json();
  }
}
