/**
 * Formats a number as a currency string with an optional suffix.
 *
 * @param {number} total - The number to format.
 * @param {string} [suffix='₮'] - The currency suffix to append (default is '₮').
 * @returns {string} The formatted currency string.
 *
 * @example
 * currencyFormat(1000000); // "1'000'000₮"
 * currencyFormat(5000, 'MNT'); // "5'000MNT"
 */
export const currencyFormat = (total: number, suffix: string = '₮'): string =>
  String(total)
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'")
    .concat(suffix);

/**
 * Handles sharing content using the Web Share API or falls back to copying the URL to the clipboard.
 *
 * @param {Object} options - The sharing options.
 * @param {string} options.title - The title of the content to share.
 * @param {string} options.url - The URL to share.
 * @param {Function} [options.cb] - A callback function to execute after sharing or copying.
 * @returns {void}
 *
 * @example
 * handleShare({ title: 'My Website', url: 'https://example.com' });
 */
export function handleShare({
  title,
  url,
  cb,
}: {
  title: string;
  url: string;
  cb?: () => void;
}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined')
    return null;

  if (navigator.share) {
    try {
      navigator.share({
        title: title,
        url: url,
      });
    } catch (error) {
      handleCopy(url, cb);
      console.error('Error sharing content:', error);
    }
  } else {
    handleCopy(url, cb);
  }
}

/**
 * Copies text to the clipboard using the Clipboard API or falls back to a legacy method.
 *
 * @param {string} text - The text to copy.
 * @param {Function} [cb] - A callback function to execute after copying.
 * @returns {void}
 *
 * @example
 * handleCopy('Hello, World!', () => console.log('Text copied!'));
 */
export function handleCopy(text: string, cb?: (error?: unknown) => void): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  try {
    navigator.clipboard.writeText(text).then(() => cb?.());
  } catch (e) {
    console.error(e);
    handleCopyZombies(text, cb);
  }
}

/**
 * Copies text to the clipboard using a legacy method (fallback for older browsers).
 *
 * @param {string} text - The text to copy.
 * @param {Function} [cb] - A callback function to execute after copying.
 * @returns {void}
 *
 * @example
 * handleCopyZombies('Hello, World!', () => console.log('Text copied!'));
 */
export function handleCopyZombies(
  text: string,
  cb?: (error?: unknown) => void,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    cb?.();
  } catch (err) {
    cb?.(err);
    console.error('Failed to copy text: ', err);
  }

  document.body.removeChild(textArea);
}

export type QueryParams = Record<
  string,
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null
  | undefined
>;

/**
 * Converts an object of query parameters into a URL-encoded query string.
 *
 * @param {QueryParams} params - The object containing query parameters.
 * @returns {string} The URL-encoded query string.
 *
 * @example
 * objToQs({ search: 'hello', page: 1 }); // "search=hello&page=1"
 * objToQs({ ids: [1, 2, 3] }); // "ids=1&ids=2&ids=3"
 */
export function objToQs(params: QueryParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined) {
          searchParams.append(key, item.toString());
        }
      });
    } else if (value !== null && value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });

  return searchParams.toString();
}

/**
 * Formats a duration in seconds into a human-readable string (HH:MM:SS or MM:SS).
 *
 * @param {number} timeInDur - The duration in seconds.
 * @returns {string} The formatted duration string.
 *
 * @example
 * formatDuration(3661); // "1:01:01"
 * formatDuration(125); // "2:05"
 */
export const formatDuration = (timeInDur: number): string => {
  const hours = Math.floor(timeInDur / 3600);
  const minutes = Math.floor((timeInDur % 3600) / 60);
  const seconds = Math.floor(timeInDur % 60);

  if (hours > 0) return `${hours}:${addZero(minutes)}:${addZero(seconds)}`;
  return `${minutes}:${addZero(seconds)}`;
};

/**
 * Adds a leading zero to a number if it is a single digit.
 *
 * @param {number} v - The number to format.
 * @returns {string} The formatted number as a string.
 *
 * @example
 * addZero(5); // "05"
 * addZero(12); // "12"
 */
export const addZero = (v: number): string => v.toString().padStart(2, '0');

/**
 * Removes HTML tags and entities from a string.
 *
 * @param {string} [str=''] - The string to clean.
 * @returns {string} The cleaned string.
 *
 * @example
 * removeHTML('<p>Hello, <b>World!</b></p>'); // "Hello, World!"
 */
export const removeHTML = (str: string = ''): string =>
  str.replace(/<\/?[^>]+(>|$)|&[^;]+;/g, '');

type StorageModifierFuncType<T> = (
  oldValues: T | null,
  setFun: (value: T) => void,
) => void;

export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      try {
        return JSON.parse(item);
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error(`Failed to read key "${key}" from localStorage:`, error);
      return null;
    }
  },
  /**
	 * Sets a value in localStorage for a given key.
	 * If the value is a function, it will be invoked with the current value from localStorage
	 * and a setter function to update the value.
	 *
	 * @template T
	 * @param {string} key - The key for the item in localStorage.
	 * @param {T | StorageModifierFuncType<T>} value - The value to store or a callback function
	 * that receives the current value and a setter function.
	 * @returns {void}
	 *
	 * @example
	 * // Setting a string value
	 * set('keyName', 'JohnDoe');

	 * @example
	 * // Setting an object value
	 * set('keyName', { age: 30, city: 'Ulaanbaatar' });

	 * @example
	 * // Setting an array value
	 * set('keyName', [0,1,2]);

	 * @example
	 * // Using a callback to update a value
	 * set('keyName', (current, setter) => setter((current || 0) + 1));
	 */
  set<T>(k: string, v: T | StorageModifierFuncType<T>): void {
    if (typeof window === 'undefined') return;
    try {
      if (typeof v === 'function') {
        (v as StorageModifierFuncType<T>)(this.get<T>(k), (val: T) =>
          this.set(k, val),
        );
      } else {
        const serializedValue = typeof v === 'string' ? v : JSON.stringify(v);
        localStorage.setItem(k, serializedValue);
      }
    } catch (error) {
      console.error(`Failed to set key "${k}" in localStorage:`, error);
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove key "${key}" from localStorage:`, error);
    }
  },
};

/**
 * Checks if a value is a plain object (not an array, FormData, or null).
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean} True if the value is a plain object, false otherwise.
 *
 * @example
 * isObject({}); // true
 * isObject([]); // false
 * isObject(null); // false
 */
export const isObject = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof FormData);

/**
 * Checks if a string is a valid URI.
 *
 * @param {string} [str] - The string to check.
 * @returns {boolean} True if the string is a valid URI, false otherwise.
 *
 * @example
 * isUri('https://example.com'); // true
 * isUri('www.example.com'); // true
 * isUri('example'); // false
 */
export function isUri(str?: string): boolean {
  if (!str) return false;
  const uriRegex = /^(https?:\/\/|ftp:\/\/|file:\/\/|www\.)/i;
  return uriRegex.test(str);
}

/**
 * Checks if a string is a valid path (starts with /, ./, or ../).
 *
 * @param {string} [str] - The string to check.
 * @returns {boolean} True if the string is a valid path, false otherwise.
 *
 * @example
 * isPath('/home'); // true
 * isPath('./relative'); // true
 * isPath('example'); // false
 */
export function isPath(str?: string): boolean {
  if (!str) return false;
  const pathRegex = /^(\/|\.\/|\.\.\/+$)/;
  return pathRegex.test(str);
}
