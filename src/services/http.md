# Extending FetchClient with Custom Auth Error Handling

This document shows how to extend the base `FetchClient` class to:

- Handle authorization errors (401/403) by logging out or rotating tokens
- Customize error creation and formatting
- Centralize error logging and recovery

---

## 👷 Why Extend FetchClient?

The base `FetchClient` provides basic request handling. You might want to:

- Detect expired tokens and trigger logout or refresh
- Format backend errors in a user-friendly way
- Automatically retry failed requests after token rotation

---

## 🔧 ExtendedFetchClient Implementation

```ts
import { FetchClient, FetchOptions, FetchResult } from './FetchClient';

export class ExtendedFetchClient extends FetchClient {
  // Add a method for rotating the token (or logging out)
  private async handleAuthFailure(): Promise<boolean> {
    try {
      // Replace this with your actual refresh logic
      const refreshed = await tryRefreshAccessToken();
      if (!refreshed) {
        redirectToLogin(); // or clear storage, etc.
      }
      return refreshed;
    } catch {
      redirectToLogin();
      return false;
    }
  }

  /**
   * Override the base handleError to intercept auth failures.
   */
  protected override async handleError(
    error: any,
    url: string,
    opts: FetchOptions,
  ): Promise<FetchResult<any>> {
    const errorMessage = error?.message?.toLowerCase?.() || '';

    const isUnauthorized =
      error?.status === 401 ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid token');

    if (isUnauthorized) {
      console.warn('[AuthError] Unauthorized response detected');

      const recovered = await this.handleAuthFailure();
      if (recovered) {
        console.log('[AuthError] Retrying original request after recovery');
        return await super.request(url, opts);
      }
    }

    return super.handleError(error, url, opts);
  }

  /**
   * Override createError to shape custom error objects.
   */
  protected override createError(body: any, response: Response): Error {
    let message = 'Unexpected error occurred';

    if (body?.error) {
      message = body.error;
    } else if (body?.message) {
      message = body.message;
    }

    // Attach HTTP status to error
    const err = new Error(message);
    (err as any).status = response.status;
    return err;
  }
}
```

# ExtendedFetchClient Usage Example

This document shows how to use `ExtendedFetchClient` to make API calls with automatic token handling and custom error formatting.

---

## 🚀 Setup

First, create an instance of the client:

```ts
import { ExtendedFetchClient } from './ExtendedFetchClient';

const api = new ExtendedFetchClient({
  baseUrl: 'https://api.example.com',
  getAuthToken: async () => localStorage.getItem('accessToken'),
});
```

---

GET request

```ts
const { body, error } = await api.get<User[]>('/users');

if (error) {
  console.error('Failed to fetch users:', error);
} else {
  console.log('Users:', body);
}
```

---

POST request

```ts
const { body, error } = await api.post<{ success: boolean }>('/users', {
  name: 'Alice',
  role: 'admin',
});

if (error) {
  alert('Failed to create user');
}
```
