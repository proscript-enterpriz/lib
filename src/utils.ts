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
  return /^(https?:\/\/|ftp:\/\/|file:\/\/|www\.)/i.test(str);
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
  return /^(\/|\.\/|\.\.\/+$)/.test(str);
}

/**
 * Removes all falsy values from an object and returns a new object with truthy values only.
 * Falsy values include: `false`, `0`, `""`, `null`, `undefined`, and `NaN`.
 *
 * @param {Record<any, any>} [obj={}] - The source object to be cleaned
 * @returns {Record<any, any>} A new object containing only truthy values from the original
 *
 * @example
 * // Returns { a: 1, c: 'hello' }
 * clearObj({ a: 1, b: 0, c: 'hello', d: null });
 *
 * @example
 * // Returns { name: 'John', active: true }
 * clearObj({ name: 'John', age: undefined, active: true });
 */
export function clearObj(obj: Record<any, any> = {}): Record<any, any> {
  const result: Record<any, any> = {};
  for (const key in obj) {
    if (!!obj[key]) result[key] = obj[key];
  }
  return result;
}

/**
 * Triggers a download of a Blob or File with a specified filename.
 *
 * This function creates a temporary anchor element to simulate a file download.
 * It supports both Blob and File types and ensures cleanup after download is triggered.
 *
 * @param {Blob | File} data - The Blob or File object to download.
 * @param {string} name - The desired filename (including extension) for the downloaded file.
 *
 * @example
 * const blob = new Blob(['Hello world'], { type: 'text/plain' });
 * downloadToPreview(blob, 'hello.txt');
 *
 * const file = new File(['PDF content'], 'document.pdf', { type: 'application/pdf' });
 * downloadToPreview(file, file.name);
 */
export const downloadToPreview = (data: Blob | File, name: string): void => {
  const url = URL.createObjectURL(data);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Converts a JavaScript object into a FormData instance.
 *
 * Handles nested objects, arrays, File/Blob values, and provides configuration options
 * for key formatting, type hints, JSON fallback, and debugging.
 *
 * @param {Record<string, any>} obj - The plain JavaScript object to convert.
 * @param {Object} [config] - Optional configuration.
 * @param {boolean} [config.useDotNotation=false] - Key formatting style:
 *   - `false`: user[name]
 *   - `true`: user.name
 * @param {boolean} [config.addTypeHints=false] - Whether to append type hints (e.g., `:number`, `:boolean`) to keys.
 * @param {boolean} [config.jsonFallback=false] - If `true`, nested objects are stringified to JSON instead of recursed.
 * @param {string} [config.parentKey] - Internal use: used during recursion to build full keys.
 * @param {boolean} [config.debug=false] - If `true`, logs all append operations to the console.
 * @param {FormData} [formData] - Optional existing FormData object to append to.
 * @returns {FormData} A FormData instance ready for submission.
 *
 * @example
 * // Example 1: Simple object
 * const obj = { name: "Alice", age: 30 };
 * const formData = objToFormData(obj);
 *
 * // Result:
 * // formData.entries() =>
 * // ["name", "Alice"]
 * // ["age", "30"]
 *
 * @example
 * // Example 2: Nested object using bracket style
 * const user = {
 *   info: {
 *     fullName: "John Doe",
 *     active: true,
 *     age: 25
 *   }
 * };
 * const formData = objToFormData(user);
 *
 * // Result:
 * // ["info[fullName]", "John Doe"]
 * // ["info[active]", "true"]
 * // ["info[age]", "25"]
 *
 * @example
 * // Example 3: Dot notation + type hints
 * const user = {
 *   info: {
 *     age: 30,
 *     active: false
 *   }
 * };
 * const formData = objToFormData(user, {
 *   useDotNotation: true,
 *   addTypeHints: true
 * });
 *
 * // Result:
 * // ["info.age:number", "30"]
 * // ["info.active:boolean", "false"]
 *
 * @example
 * // Example 4: Using JSON fallback for nested object
 * const payload = {
 *   meta: { tags: ["x", "y"], version: 2 }
 * };
 * const formData = objToFormData(payload, {
 *   jsonFallback: true
 * });
 *
 * // Result:
 * // ["meta", '{"tags":["x","y"],"version":2}']
 *
 * @example
 * // Example 5: JSON fallback + type hints
 * const payload = {
 *   meta: { tags: ["x", "y"], version: 2 }
 * };
 * const formData = objToFormData(payload, {
 *   jsonFallback: true,
 *   addTypeHints: true
 * });
 *
 * // Result:
 * // ["meta:json", '{"tags":["x","y"],"version":2}']
 *
 * @example
 * // Example 6: Blob or File input
 * const file = new File(["hello"], "hello.txt", { type: "text/plain" });
 * const obj = { file };
 * const formData = objToFormData(obj);
 *
 * // Result:
 * // ["file", File] with name "hello.txt"
 */
export function objToFormData(
  obj: Record<string, any>,
  config: {
    useDotNotation?: boolean;
    addTypeHints?: boolean;
    jsonFallback?: boolean;
    parentKey?: string;
    debug?: boolean;
  } = {},
  formData: FormData = new FormData()
): FormData {
  const {
    useDotNotation = false,
    addTypeHints = false,
    jsonFallback = false,
    parentKey,
    debug = false,
  } = config;

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey
      ? useDotNotation
        ? `${parentKey}.${key}`
        : `${parentKey}[${key}]`
      : key;

    if (value === undefined || value === null) {
      continue;
    }

    if (value instanceof File || value instanceof Blob) {
      const name = (value as File).name || 'blob';
      if (debug) console.log(`FormData append [${fullKey}]:`, value, `(file: ${name})`);
      formData.append(fullKey, value, name);
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      if (jsonFallback) {
        let hint = '';
        if (addTypeHints) hint = ':json';
        const jsonString = JSON.stringify(value);
        if (debug) console.log(`FormData append [${fullKey}${hint}]:`, jsonString);
        formData.append(fullKey + hint, jsonString);
      } else {
        objToFormData(value, { ...config, parentKey: fullKey }, formData);
      }
    } else {
      let stringValue: string;
      let hint = '';

      if (typeof value === 'boolean' || typeof value === 'number') {
        stringValue = String(value);
        if (addTypeHints) {
          hint = `:${typeof value}`;
        }
      } else {
        stringValue = value;
      }

      if (debug) console.log(`FormData append [${fullKey}${hint}]:`, stringValue);
      formData.append(fullKey + hint, stringValue);
    }
  }

  return formData;
}

export type PrettyType<T> = T extends object
  ? { [key in keyof T]: T[key] extends object ? PrettyType<T[key]> : T[key] }
  : T;

export type ReplaceType<BT, Replacements extends { [K in keyof BT]?: any }> = {
  [Key in keyof BT]: Key extends keyof Replacements
    ? Replacements[Key]
    : BT[Key];
};

export type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S;

export type SnakeCaseKeys<T> = {
  [K in keyof T as CamelToSnakeCase<string & K>]: T[K] extends object
    ? SnakeCaseKeys<T[K]>
    : T[K];
};

export type EnumToObject<Type> = {
  [_P in keyof Type]?: any;
};
