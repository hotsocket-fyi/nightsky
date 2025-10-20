type TSRecord<K extends string | number | symbol, T> = globalThis.Record<K, T>;

// strings are in backticks to line up with spec
// https://atproto.com/specs/lexicon

export type Lexicon = {
	lexicon: 1;
	id: string;
	description?: string;
	defs: TSRecord<string, AnySchemaObject>;
};
export type PrimaryTypes = Query | Procedure | Subscription | Record;

export type Record = SchemaObject & {
	type: `record`;
	key: `tid` | `nsid` | `literal:${string}` | `any`;
	record: Object;
};
export type Query = RPC & {
	type: `query`;
	parameters: Params;
};
export type Procedure = RPC & {
	type: `procedure`;
	input?: RPC_IO;
};
export type RPC = SchemaObject & {
	output?: RPC_IO;
	parameters?: Params;
	errors?: RPC_Error[];
};
type RPC_Error = {
	name: string;
	description?: string;
};
export type RPC_IO = {
	description?: string;
	encoding: `application/json` | `${string}/${string}`;
	schema?: Object | Ref | Union;
};
export type Subscription = RPC & {
	type: `subscription`;
	message?: {
		description?: string;
		schema: Union;
	};
};

export type Params = FieldDef & {
	type: `params`;
	required?: string[];
	properties: TSRecord<string, ParamTypes>;
};
type ParamTypes = Boolean | Integer | String | Unknown | Array<Boolean | Integer | String | Unknown>;

export type AnySchemaObject = PrimaryTypes | FieldTypes;
export type FieldTypes = _FieldTypes | Array<_FieldTypes>;
type _FieldTypes =
	| Null
	| Boolean
	| Integer
	| String
	| Bytes
	| CidLink
	| Blob
	| Object
	| Params
	| Token
	| Ref
	| Union
	| Unknown;

export type FieldDef = SchemaObject & {
	type:
		| `null`
		| `boolean`
		| `integer`
		| `string`
		| `bytes`
		| `cid-link`
		| `blob`
		| `array`
		| `object`
		| `params`
		| `token`
		| `ref`
		| `union`
		| `unknown`;
};
export type Null = FieldDef & {
	type: `null`;
};
export type Boolean = FieldDef & {
	type: `boolean`;
	default?: boolean;
	const?: boolean;
};
export type Integer = FieldDef & {
	type: `integer`;
	minimum?: number;
	maximum?: number;
	enum?: number[];
	default?: number;
	const?: number;
};
export type String = FieldDef & {
	type: `string`;
	format?: string;
	maxLength?: number;
	minLength?: number;
	maxGraphemes?: number;
	minGraphemes?: number;
	knownValues?: string[];
	enum?: string[];
	default?: string;
	const?: string;
};
export type Bytes = FieldDef & {
	type: `bytes`;
	minLength?: number;
	maxLength?: number;
};
export type CidLink = FieldDef & {
	type: `cid-link`;
};
export type Array<T extends AnySchemaObject> = FieldDef & {
	type: `array`;
	items: T;
	minLength?: number;
	maxLength?: number;
};
export type Object = FieldDef & {
	type: `object`;
	properties: TSRecord<string, FieldTypes>;
	required?: string[];
	nullable?: string[];
};
export type Blob = FieldDef & {
	type: `blob`;
	accept?: `${string}/${string}`[];
	maxSize?: number;
};
export type Token = FieldDef & {
	type: `token`;
};
export type Ref = FieldDef & {
	type: `ref`;
	ref: string;
};
export type Union = FieldDef & {
	type: `union`;
	refs: string[];
	close?: boolean;
};
export type Unknown = FieldDef & {
	type: `unknown`;
};
export type SchemaObject = {
	type:
		| `null`
		| `boolean`
		| `integer`
		| `string`
		| `bytes`
		| `cid-link`
		| `blob`
		| `array`
		| `object`
		| `params`
		| `token`
		| `ref`
		| `union`
		| `unknown`
		| `record`
		| `query`
		| `procedure`
		| `subscription`;
	description?: string;
};
