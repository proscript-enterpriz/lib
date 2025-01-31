export const currencyFormat = (total: number, suffix = '₮') =>
	String(total)
		.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'")
		.concat(suffix);

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

export function handleCopy(text: string, cb?: (error?: unknown) => void) {
	if (typeof window === 'undefined' || typeof navigator === 'undefined')
		return null;

	try {
		navigator.clipboard.writeText(text).then(() => cb?.());
	} catch (e) {
		console.error(e);
		handleCopyZombies(text, cb);
	}
}

export function handleCopyZombies(
	text: string,
	cb?: (error?: unknown) => void,
) {
	if (typeof window === 'undefined' || typeof document === 'undefined')
		return null;
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

export const formatDuration = (timeInDur: number) => {
	const hours = Math.floor(timeInDur / 3600);
	const minutes = Math.floor((timeInDur % 3600) / 60);
	const seconds = Math.floor(timeInDur % 60);

	if (hours > 0) return `${hours}:${addZero(minutes)}:${addZero(seconds)}`;
	return `${minutes}:${addZero(seconds)}`;
};

export const addZero = (v: number) => v.toString().padStart(2, '0');

export const removeHTML = (str: string = '') =>
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

export const isObject = (value: unknown) =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value) &&
	!(value instanceof FormData);

export function isUri(str?: string) {
	if (!str) return false;
	const uriRegex = /^(https?:\/\/|ftp:\/\/|file:\/\/|www\.)/i;
	return uriRegex.test(str);
}

export function isPath(str?: string) {
	if (!str) return false;
	const pathRegex = /^(\/|\.\/|\.\.\/+$)/;
	return pathRegex.test(str);
}
