import {EnumToObject, PrettyType} from "../utils.js";

const source = [
	'title',
	'images',
	'sku',
	'slug',
	'price',
	'name',
	'updated_at',
	'created_at',
];

const sortNames = {
	random: {
		_script: { script: 'Math.random()', type: 'number', order: 'asc' },
	},
	date_desc: [{ created_at: 'desc' }],
	date_asc: [{ created_at: 'asc' }],
	price_asc: [{ selling_price: 'asc' }],
	price_desc: [{ selling_price: 'desc' }],
	sale_desc: [{ sale_percent: 'desc' }],
};

export type SortOptions =
	| 'random'
	| 'date_desc'
	| 'date_asc'
	| 'price_asc'
	| 'price_desc'
	| 'sale_desc';

export interface ResponseData {
	ok: boolean;
	data: any;
}

export interface QueryOptions {
	size?: number;
	from?: number;
	sort?: SortOptions;
	must?: Record<string, any> | Array<Record<string, any>>;
	ids?: Array<string>;
	additionalSources?: Array<string>;
}

export type ESconfigType = Partial<{
	sortNames?: PrettyType<EnumToObject<Record<SortOptions, any>>>;
	source?: Array<string>;
}>;

export function convertHits<HitObject = any>(response: {
	ok: boolean;
	data: { hits: { hits: HitObject[] } };
}): HitObject[] {
	if (!response.ok) return [];
	return response.data.hits.hits.map((p: any) => ({ id: p._id, ...p._source }));
}

export function productQueryBuilder(
	baseMust: Array<any>,
	options: QueryOptions = {},
	config: ESconfigType,
) {
	const must = baseMust;

	if (options.ids) {
		must.push({ terms: { id: options.ids } });
	}
	if (options.must) {
		if (Array.isArray(options.must)) options.must.forEach((x) => must.push(x));
		else must.push(options.must);
	}
	const _source = options.additionalSources
		? [...(config?.source || []), ...options.additionalSources]
		: config.source;

	const sort = options.sort
		? (config.sortNames || {})[options.sort] || [{ _score: 'desc' }]
		: [{ _score: 'desc' }];

	return {
		query: { bool: { must: must } },
		size: options.size || 12,
		_source,
		sort: options.ids ? {} : sort,
		from: options.from,
	};
}

export type ESServiceProps = {
	index: string;
	config?: ESconfigType;
	host: string;
	auth: { username: string; password: string };
};

/**
 * @example
	 export const eventHitSource: (keyof EventItemType)[] = [
	  'id',
	  'event_name',
	  'event_image',
	  'event_genre',
	  'event_type',
	  'openning_at',
	  'updated_at',
	  'created_at',
	];

	export class ESEvent extends ESService<EventItemType> {
	  constructor(
	    config: Omit<ESconfigType, 'source'> & {
	      source?: (keyof EventItemType)[];
	    } = {},
	  ) {
	    super({
	      index: 'events',
			  auth: {
			    username: process.env.ES_USERNAME!,
			    password: process.env.ES_PASS!,
	      },
		    host: process.env.ES_ENDPOINT!,
	      config: { source: eventHitSource as string[], ...config },
	    });
	  }
	  // custom functions here
	}

	export const eventES = new ESEvent();
  eventES.search({ size: 1, sort: 'sale_desc' });
 */


export class ESService<
	HitObject extends Record<string, any> = Record<string, any>,
> {
	private index: string;
	private password: string;
	private username: string;
	private host: string;
	private path: string;
	private config: ESconfigType;
	private static instances: Map<string, ESService> = new Map();

	constructor({ index, config, host, auth }: ESServiceProps) {
		this.index = index;
		this.username = auth.username;
		this.password = auth.password;
		this.host = host!;
		this.path = `/${index}/_search`;
		this.config = {
			sortNames: { ...sortNames, ...(config?.sortNames || {}) },
			source: [...source, ...(config?.source || [])],
		};

		if (!ESService.instances.has(index)) ESService.instances.set(index, this)
	}

	static getInstance(index: string): ESService {
		if (!ESService.instances.has(index)) throw new Error(`ES instance for index "${index}" not initialized`);
		return ESService.instances.get(index)!;
	}

	async post(
		url = '',
		data: any = {},
		contentType = 'application/json',
	): Promise<ResponseData> {
		return fetch(`${this.host}${url}`, {
			method: 'POST',
			mode: 'cors',
			cache: 'force-cache',
			headers: {
				Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
				'Content-Type': contentType,
			},
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
			body: contentType === 'application/json' ? JSON.stringify(data) : data,
		})
			.then((response) =>
				response.json().then((json) => ({ json, ok: response.ok })),
			)
			.then(({ json, ok }) => ({ ok, data: json }))
			.catch((e) => ({ ok: false, data: e }));
	}

	raw = (query: any): Promise<ResponseData> => this.post(this.path, query);

	rawHits = (query: any): Promise<Array<HitObject>> =>
		this.post(this.path, query).then((c) => convertHits<HitObject>(c));

	msearch = (queries: Array<any>): Promise<ResponseData> =>
		this.post(
			`/${this.index}/_msearch`,
			`{ }\n${queries.map((x) => JSON.stringify(x)).join('\n\n')}\n`,
			'application/x-ndjson',
		);

	search = (options?: QueryOptions): Promise<Array<HitObject>> =>
		this.post(this.path, productQueryBuilder([], options, this.config)).then(
			(c) => convertHits<HitObject>(c),
		);
}
