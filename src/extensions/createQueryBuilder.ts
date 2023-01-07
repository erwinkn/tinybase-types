import {
	SupportedCellValues,
	Schema as StoreSchema,
	Store,
	CellValue,
} from "tinybase/store";

// TODO:
// - what happens if the user wants to join the same table multiple times,
//   and not alias the first join? the subsequent joins would overwrite
//   the first join in the `Tables` type, even if they're aliased afterwards

// We use a different schema type from the Store module,
// as we only care about the data contained in the table,
// not the full schema.
type TableSchema = Record<string, SupportedCellValues>;
type Schema = Record<string, TableSchema>;

type TransformSchema<S extends StoreSchema> = {
	[TableId in keyof S]: {
		[CellId in keyof S[TableId]]: CellValue<S[TableId][CellId]>;
	};
};

type AliasableOp = {
	args: any[];
	as?: string;
};

type Op = Array<any>;

type NonBooleanCells<Table extends TableSchema> = {
	[K in keyof Table]: Table[K] extends boolean ? never : K;
}[keyof Table];

type Key = string | number | symbol;

type GetCell<Table extends TableSchema> = <CellId extends keyof Table>(
	cellId: CellId
) => Table[CellId] | undefined;

type Extend<T, K extends Key, Value> = T & {
	[Key in K]: Value;
};

type Rename<T, PrevKey extends keyof T, NewKey extends Key> = Omit<
	T,
	PrevKey
> & {
	[K in NewKey]: T[PrevKey];
};

type JoinFunction<Table extends TableSchema> = (
	getCell: GetCell<Table>,
	rowId: string
) => string;

export class QueryBuilder<
	S extends Schema,
	// The main table has a special role, so we need to keep its ID in the type
	// Also, we can't include it in `OtherTables`, because that would mess up
	// the types for any self-join, even if aliased afterwards.
	MainTableId extends keyof S,
	OtherTables extends Schema = {},
	Result extends TableSchema = {},
	LatestOp extends "joins" | "selects" | "groups" | undefined = undefined,
	LatestId extends Key | undefined = undefined
> {
	// We don't really care about keeping the schema of the store
	protected store: Store<any>;
	protected mainTableId: MainTableId;

	protected joins: Array<AliasableOp> = [];
	protected selects: Array<AliasableOp> = [];
	protected groups: Array<AliasableOp> = [];
	protected wheres: Array<Op> = [];
	protected havings: Array<Op> = [];

	// Used for `as`, so that we know where the alias should go
	protected latest: LatestOp;
	// not actually used, but forces TypeScript to consider LatestId as used
	protected latestId: LatestId = undefined!;

	constructor(store: Store<any>, mainTableId: MainTableId) {
		this.store = store;
		this.mainTableId = mainTableId;
		this.latest = undefined as any;
	}

	// LatestId could also refer to a cell, so we have to specify it has
	// to come from a table here
	// TODO: verify this doesn't prevent the `as` method to be available after a join
	as<LatestJoinId extends keyof OtherTables, Alias extends Key>(
		this: QueryBuilder<
			S,
			MainTableId,
			OtherTables,
			Result,
			"joins",
			LatestJoinId
		>,
		alias: Alias
	): QueryBuilder<
		S,
		MainTableId,
		Rename<OtherTables, LatestJoinId, Alias>,
		Result,
		undefined,
		undefined
	>;
	as<LatestSelectId extends keyof Result, Alias extends Key>(
		this: QueryBuilder<
			S,
			MainTableId,
			OtherTables,
			Result,
			"selects",
			LatestSelectId
		>,
		alias: Alias
	): QueryBuilder<
		S,
		MainTableId,
		OtherTables,
		Rename<Result, LatestSelectId, Alias>,
		undefined,
		undefined
	>;
	// TODO: GroupedAs
	as(alias: string): any {
		const array = this[this.latest as "joins" | "selects" | "groups"];
		array[array.length - 1].as = alias;
		this.latest = undefined as any;
		return this as any;
	}

	join<TableId extends keyof S>(
		joinedTableId: TableId,
		on: NonBooleanCells<S[MainTableId]>
	): QueryBuilder<
		S,
		MainTableId,
		Extend<OtherTables, TableId, S[TableId]>,
		Result,
		"joins",
		TableId
	>;
	join<TableId extends keyof S>(
		joinedTableId: TableId,
		on: JoinFunction<S[MainTableId]>
	): QueryBuilder<
		S,
		MainTableId,
		Extend<OtherTables, TableId, S[TableId]>,
		Result,
		"joins",
		TableId
	>;
	join<TableId extends keyof S, IntermediateTableId extends keyof OtherTables>(
		joinedTableId: TableId,
		fromIntermediateJoinedTableId: IntermediateTableId,
		on: NonBooleanCells<OtherTables[IntermediateTableId]>
	): QueryBuilder<
		S,
		MainTableId,
		Extend<OtherTables, TableId, S[TableId]>,
		Result,
		"joins",
		TableId
	>;
	join<TableId extends keyof S, IntermediateTableId extends keyof OtherTables>(
		joinedTableId: TableId,
		fromIntermediateJoinedTableId: IntermediateTableId,
		on: JoinFunction<OtherTables[IntermediateTableId]>
	): QueryBuilder<
		S,
		MainTableId,
		Extend<OtherTables, TableId, S[TableId]>,
		Result,
		"joins",
		TableId
	>;
	join(...args: Array<any>): any {
		this.joins.push({ args });
		return this;
	}

	// Select with one parameter takes from the main table
	select<CellId extends keyof S[MainTableId]>(
		cellId: CellId
	): QueryBuilder<
		S,
		MainTableId,
		OtherTables,
		Extend<Result, CellId, S[MainTableId][CellId]>,
		"selects",
		CellId
	>;
	select<
		TableId extends keyof OtherTables,
		CellId extends keyof OtherTables[TableId]
	>(
		tableId: TableId,
		cellId: CellId
	): QueryBuilder<
		S,
		MainTableId,
		OtherTables,
		Extend<Result, CellId, OtherTables[TableId][CellId]>,
		"selects",
		CellId
	>;

	select(...args: Array<any>): any {
		this.selects.push({ args });
		return this;
	}
}

export class UninitializedQueryBuilder<S extends Schema> {
	protected store: Store<any>;

	constructor(store: Store<any>) {
		this.store = store;
	}

	from<TableId extends keyof S>(
		tableId: TableId
	): QueryBuilder<S, TableId, {}, {}, undefined, undefined> {
		return new QueryBuilder(this.store, tableId);
	}
}

export function createQueryBuilder<S extends StoreSchema>(
	store: Store<S>
): UninitializedQueryBuilder<TransformSchema<S>> {
	return new UninitializedQueryBuilder(store);
}
