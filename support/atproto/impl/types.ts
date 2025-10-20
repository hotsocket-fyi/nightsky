// implementation-specific bits

export interface Loadable<T> {
	load(data: unknown): T;
	unload(data: T): unknown;
}

export interface Stringifiable {
	toString(): string | null;
}

// This is not the same as
export type Serializable = SerializableTypes | SerializableObject | Array<Serializable> | SerializableParams;
export interface SerializableObject {
	[key: string]: Serializable;
	$type?: string;
}
export interface SerializableParams {
	[key: string]: SerializableTypes | Array<SerializableTypes>;
}
export type SerializableTypes = string | number | boolean | null | undefined;
