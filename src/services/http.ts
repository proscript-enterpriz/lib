/* eslint-disable @typescript-eslint/no-explicit-any */
import { clearObj, isObject, objToQs } from '../utils';

export type FetchResult<T> = {
  body: T;
  error: string | null;
};

export type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown> | FormData;
  searchParams?: Record<string, any>;
};

export type FetchClientConfig = {
  baseUrl: string;
  defaultHeaders?: HeadersInit;
  getAuthToken?: () => Promise<string | null>;
};

/**
 * A wrapper around the native fetch API to simplify authenticated HTTP requests with default configuration.
 *
 * @example
 * import { FetchClient } from '@interpriz/lib/services';
 *
 * const api = new FetchClient({
 *   baseUrl: 'https://api.example.com',
 *   getAuthToken: async () => localStorage.getItem('accessToken'),
 * });
 *
 * // GET request
 * const { body, error } = await api.get<User[]>('/users');
 *
 * if (error) {
 *   console.error('Failed to fetch users:', error);
 * } else {
 *   console.log('Users:', body);
 * }
 */
export class FetchClient {
  private config: FetchClientConfig;

  /**
   * Constructs a new FetchClient.
   * @param config Configuration object for the FetchClient.
   */
  constructor(config: FetchClientConfig) {
    if (!config.baseUrl) throw new Error('baseUrl is required in config');
    this.config = { ...config };
  }

  /**
   * Makes a fetch request to the given endpoint.
   * @template T The expected shape of the response body.
   * @param endpoint Relative endpoint to be appended to the baseUrl.
   * @param options Fetch options, including optional body and searchParams.
   * @returns A promise resolving to a FetchResult containing either the response body or an error message.
   */
  public async request<T>(
    endpoint: string,
    options: FetchOptions = {},
  ): Promise<FetchResult<T>> {
    let opts = { ...options };
    try {
      const headers = new Headers(opts.headers || this.config.defaultHeaders);

      if (!headers.has('Authorization') && this.config.getAuthToken) {
        const token = await this.config.getAuthToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }

      const { url, fetchOptions } = this.prepareRequest(
        endpoint,
        opts,
        headers,
      );
      const response = await fetch(url, fetchOptions);
      const body: T = await this.parseResponse(response);

      if (!response.ok) throw this.createError(body, response);

      return { body, error: null };
    } catch (error: any) {
      return this.handleError(error, endpoint, opts);
    }
  }

  /**
   * Prepares the fetch request by constructing the full URL and setting headers.
   * @param endpoint API endpoint.
   * @param options Fetch options.
   * @param headers Request headers.
   * @returns The full URL and options to be passed to fetch.
   */
  private prepareRequest(
    endpoint: string,
    options: FetchOptions,
    headers: Headers,
  ): { url: string; fetchOptions: RequestInit } {
    let url = `${this.config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const isBodyObject = isObject(options.body);
    if (!isBodyObject) {
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: (isBodyObject
        ? JSON.stringify(clearObj(options.body))
        : options.body) as RequestInit['body'],
    };

    if (options.searchParams) {
      url += `?${objToQs(clearObj(options.searchParams))}`;
    }

    return { url, fetchOptions };
  }

  /**
   * Parses the response body according to its content type.
   * @template T The expected response type.
   * @param response The fetch response.
   * @returns A promise resolving to the parsed body.
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return await response.text() as any;
  }

  /**
   * Constructs an error from a failed response.
   * @param body Parsed response body.
   * @param _ Ignored response parameter.
   * @returns An Error instance with a message.
   */
  private createError(body: any, _: Response): Error {
    return new Error(body?.error || body?.message);
  }

  /**
   * Handles a failed request by logging and returning a standardized error object.
   * @param error The error caught during request.
   * @param url Request URL.
   * @param opts Request options.
   * @returns A FetchResult with null body and an error string.
   */
  private handleError(
    error: any,
    url: string,
    opts: FetchOptions,
  ) {
    console.error('Request failed:', { url, options: opts, error });
    const errString = error?.error ?? error?.message ?? String(error);

    return {
      body: null as any,
      error: errString,
    };
  }

  /**
   * Sends a GET request.
   * @template TData Expected response type.
   * @param endpoint API endpoint.
   * @param options Optional fetch options without body.
   * @returns A promise resolving to the response.
   */
  public async get<TData>(endpoint: string, options?: Omit<FetchOptions, 'body'>) {
    return await this.request<TData>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Sends a POST request.
   * @template TData Expected response type.
   * @param endpoint API endpoint.
   * @param body Request body.
   * @param options Optional fetch options.
   * @returns A promise resolving to the response.
   */
  public async post<TData>(endpoint: string, body: any, options?: FetchOptions) {
    return await this.request<TData>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * Sends a PUT request.
   * @template TData Expected response type.
   * @param endpoint API endpoint.
   * @param body Request body.
   * @param options Optional fetch options.
   * @returns A promise resolving to the response.
   */
  public async put<TData>(endpoint: string, body: any, options?: FetchOptions) {
    return await this.request<TData>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * Sends a PATCH request.
   * @template TData Expected response type.
   * @param endpoint API endpoint.
   * @param body Request body.
   * @param options Optional fetch options.
   * @returns A promise resolving to the response.
   */
  public async patch<TData>(endpoint: string, body: any, options?: FetchOptions) {
    return await this.request<TData>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * Sends a DELETE request.
   * @template TData Expected response type.
   * @param endpoint API endpoint.
   * @param options Optional fetch options.
   * @returns A promise resolving to the response.
   */
  public async delete<TData>(endpoint: string, options?: FetchOptions) {
    return await this.request<TData>(endpoint, { ...options, method: 'DELETE' });
  }
}
