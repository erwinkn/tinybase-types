// TODO:
// - in the case where TypeScript and TinyBase schemas are merged,
//   allow setting a new TinyBase schema and have it merged with
//   the original TypeScript schema. We could keep the original TypeScript
//   schema under a unique symbol key, that we remove before returning
//   the data.
// - convert `null` inputs to `undefined` outputs for TypeScript schemas
declare module "tinybase/store" {
	// By default, the TypeScript schema is used for inputs and outputs
	export function createStore<S extends Schema = {}>(): Store<S, S>;

	// Input and Output schemas may differ, so we distinguish between them
	// This is easier and more performant than keeping track of all the
	// schema information & transforming it every time.
	export interface Store<Input extends Schema, Output extends Schema> {
		// === Schema definition ===
		setSchema<S extends TinyBaseSchema>(
			schema: S
		): {} extends Output // check if there's an existing schema
			? Store<TinyBaseInput<S>, TinyBaseOutput<S>>
			: // Careful: first argument to `MergeInputs` must be the TinyBase schema,
			  // and the second one has to be the TypeScript schema
			  // Same applies for `MergeOutputs`
			  Store<
					MergeInputs<TinyBaseInput<S>, Input>,
					MergeOutputs<TinyBaseOutput<S>, Output>
			  >;

		// === Getters ===
		getTable<TableId extends keyof Output>(
			tableId: TableId
		): Record<string, Output[TableId]>;
		getTables(): Data<Output>;
		// This method is meant to be used as a type guard with arbitrary strings
		hasTable(tableId: string): tableId is string & keyof Output;
		hasTables(): {} extends Output ? false : true;
		/* We can't give a more precise type, since TypeScript doesn't keep track of the order of object keys
		 * Example:
		 * ```
		 * const schema1 = { a: {}, b: {}, };
		 *
		 * createStore()
		 *   .setSchema(schema1)
		 *   .getTableIds(); // -> ["a", "b"]
		 *
		 * const schema2 = { b: {}, a: {}, };
		 * createStore()
		 *   .setSchema(schema2)
		 *   .getTableIds(); // -> ["a", "b"]
		 * ```
		 * But TypeScript cannot differentiate between the type of `schema1` and `schema2`
		 */
		getTableIds(): Array<keyof Output>;
		getRow<TableId extends keyof Output>(
			tableId: TableId,
			rowId: string
		): Output[TableId] | undefined;
		// We cannot provide any information about row IDs
		getRowIds<TableId extends keyof Output>(tableId: TableId): Array<string>;
		getSortedRowIds<TableId extends keyof Output>(
			tableId: TableId
		): Array<string>;
		getCell<TableId extends keyof Output, CellId extends keyof Output[TableId]>(
			tableId: TableId,
			rowId: string,
			cellId: CellId
		): Output[TableId][CellId] | undefined;
		// Meant to be used as a type guard for arbitrary strings
		hasCell<TableId extends keyof Output>(
			tableId: TableId,
			rowId: string,
			cellId: string
		): cellId is string & keyof Output[TableId];
		getCellIds<TableId extends keyof Output>(
			tableId: TableId,
			rowId: string
		): Array<keyof Output[TableId]>;
		// Not worth it to implement a JSON serializer in TypeScript
		getJson(): string;
		// Not worth it to implement a JSON serializer in TypeScript
		getSchemaJson(): string;

		// === Setters ===
		// TODO: should we allow creation of new tables here?
		// Example: I don't know what TinyBase does if you .setTable() for a table ID
		// that is not in the schema
		setTables(tables: Input): Store<Input, Output>;
		setTable<TableId extends keyof Input>(
			tableId: TableId,
			table: Input[TableId]
		): Store<Input, Output>;
		setRow<TableId extends keyof Input>(
			tableId: TableId,
			rowId: string,
			row: Input[TableId]
		): Store<Input, Output>;
		// TODO: if we assume that TypeScript users conform to the types, this method should never return `undefined`
		// Should we remove it from the signature?
		addRow<TableId extends keyof Input>(
			tableId: TableId,
			row: Input[TableId]
		): string | undefined;

		setPartialRow<TableId extends keyof Input>(
			tableId: TableId,
			rowId: string,
			partialRow: Partial<Input[TableId]>
		): Store<Input, Output>;

		setCell<TableId extends keyof Input, CellId extends keyof Input[TableId]>(
			tableId: TableId,
			rowId: string,
			cellId: CellId,
			cell: CellUpdate<Input[TableId][CellId]>
		): Store<Input, Output>;

		// This is the Wild West, all bets are off
		setJson(json: string): Store<Input, Output>;

		// == Listeners ==
		addTablesListener(
			listener: TablesListener<Input, Output>,
			mutator?: boolean
		): string;

		// Not entirely clear on what this does, may need to change the type
		addTableIdsListener(
			listener: TablesIdListener<Input, Output>,
			mutator?: boolean
		): string;

		// 2 overloads for `addTableListener`
		addTableListener(
			tableId: null,
			listener: GlobalTableListener<Input, Output>,
			mutator?: boolean
		): string;
		addTableListener<TableId extends keyof Output>(
			tableId: TableId,
			listener: TableListener<Input, Output, TableId>,
			mutator?: boolean
		): string;

		// 2 overloads for `addRowIdsListener`
		addRowIdsListener(
			tableId: null,
			listener: GlobalRowIdsListener<Input, Output>,
			mutator?: boolean
		): string;
		addRowIdsListener<TableId extends keyof Output>(
			tableId: TableId,
			listener: RowIdsListener<Input, Output, TableId>,
			mutator?: boolean
		): string;

		addSortedRowIdsListener<
			TableId extends keyof Output,
			CellIdOrUndefined extends keyof Output[TableId] | undefined
		>(
			tableId: TableId,
			cellId: CellIdOrUndefined,
			descending: boolean,
			offset: number,
			limit: number | undefined,
			listener: SortedRowIdsListener<Input, Output, TableId, CellIdOrUndefined>,
			mutator?: boolean
		): string;

		addRowListener<
			TableId extends keyof Output | null,
			RowId extends string | null
		>(
			tableId: TableId,
			rowId: RowId,
			listener: RowListener<Input, Output, TableId, RowId>,
			mutator?: boolean
		): string;

		addCellIdsListener<
			TableId extends keyof Output | null,
			RowId extends string | null
		>(
			tableId: TableId,
			rowId: RowId,
			listener: CellIdsListener<Input, Output, TableId, RowId>,
			mutator?: boolean
		): string;

		// 3 overloads for addCellListener
		// Necessary to provide precise typings on the cell values received by the listener
		addCellListener<
			TableId extends keyof Output,
			RowId extends string | null,
			CellId extends keyof Output[TableId]
		>(
			tableId: TableId,
			rowId: RowId,
			cellId: CellId,
			listener: ExactCellListener<Input, Output, TableId, RowId, CellId>,
			mutator?: boolean
		): string;

		addCellListener<
			RowId extends string | null,
			CellId extends AllCellIds<Output>
		>(
			tableId: null,
			rowId: RowId,
			cellId: CellId,
			listener: CrossTablesCellListener<Input, Output, RowId, CellId>,
			mutator?: boolean
		): string;

		addCellListener<RowId extends string | null>(
			tableId: null,
			rowId: RowId,
			cellId: null,
			listener: CellListener<Input, Output, RowId>,
			mutator?: boolean
		): string;

		addInvalidCellListener<
			TableId extends keyof Output | null,
			RowId extends string | null,
			CellId extends AllowedCellIds<Output, TableId> | null
		>(
			tableId: TableId,
			rowId: RowId,
			cellId: CellId,
			listener: InvalidCellListener<Input, Output, TableId, RowId, CellId>,
			mutator?: boolean
		): string;

		addDidFinishTransactionListener(
			listener: TransactionListener<Input, Output>
		): string;
		addWillFinishTransactionListener(
			listener: TransactionListener<Input, Output>
		): string;

		callListener(listenerId: string): Store<Input, Output>;
		delListener(listenerId: string): Store<Input, Output>;

		// === [Iterator methods] ===
		forEachTable(tableCallback: TableCallback<Output>): void;
		forEachRow<TableId extends keyof Output>(
			tableId: TableId,
			rowCallback: RowCallback<Output, TableId>
		): void;
		forEachCell<TableId extends keyof Output>(
			tableId: TableId,
			rowId: string,
			cellCallback: CellCallback<Output, TableId>
		): void;

		// === [Transaction methods] ===
		transaction<T>(actions: () => T, doRollback?: DoRollback<Output>): T;
		startTransaction(): Store<Input, Output>;
		finishTransaction(doRollback?: DoRollback<Output>): Store<Input, Output>;

		// === [Delete methode] ===
		// TODO: should this remove the table from the type
		delTables(): Store<Input, Output>;
		// TODO: should this remove the table from the type?
		delTable<TableId extends keyof Output>(
			tableId: TableId
		): Store<Input, Output>;
		delRow<TableId extends keyof Output>(
			tableId: TableId,
			rowId: string
		): Store<Input, Output>;

		// TODO: shoud we make the Store generic by its schema, to refine the type for this?
		// I don't think it's worth it
		delCell<TableId extends keyof Output, CellId extends keyof Output[TableId]>(
			tableId: TableId,
			rowId: string,
			cellId: CellId,
			forceDel?: boolean
		): Store<Input, Output>;

		delSchema(): Store<{}, {}>;

		getListenerStats(): StoreListenerStats;
	}

	// export type SchemasMatch<S extends TinyBaseSchema, Ext extends ExternalSchema> =

	// === Schema type inference ===
	export interface BooleanSchema {
		type: "boolean";
		default?: boolean;
	}
	export interface NumberSchema {
		type: "number";
		default?: number;
	}
	export interface StringSchema {
		type: "string";
		default?: string;
	}

	export type TinyBaseCellSchema = BooleanSchema | NumberSchema | StringSchema;
	export type TinyBaseTableSchema = Record<string, TinyBaseCellSchema>;
	export type TinyBaseSchema = Record<string, TinyBaseTableSchema>;

	type CellValue<CellType extends string> = CellType extends "boolean"
		? boolean
		: CellType extends "number"
		? number
		: CellType extends "string"
		? string
		: never;

	// The conditional checks if a default is provided or not
	// All fields are nullable in a TinyBase schema, thus the output
	// can always be `undefined`, unless a default is provided.
	export type OutputValue<S extends TinyBaseCellSchema> =
		S["default"] extends CellValue<S["type"]>
			? CellValue<S["type"]>
			: CellValue<S["type"]> | undefined;

	export type SupportedCellTypes = CellValue<TinyBaseCellSchema["type"]>;
	export type SupportedCellValues = SupportedCellTypes | null | undefined;

	export type TinyBaseOutput<S extends TinyBaseSchema> = {
		[TableId in keyof S]: {
			[CellId in keyof S[TableId]]: OutputValue<S[TableId][CellId]>;
		};
	};
	export type TinyBaseInput<S extends TinyBaseSchema> = {
		[TableId in keyof S]: {
			[CellId in keyof S[TableId]]?: OutputValue<S[TableId][CellId]> | null;
		};
	};

	export type CellSchema = SupportedCellValues;
	export type TableSchema = Record<string, SupportedCellValues>;
	export type Schema = Record<string, Record<string, SupportedCellValues>>;

	export type Data<S extends Schema> = {
		[TableId in keyof S]: Record<
			string,
			{
				[CellId in keyof S[TableId]]: S[TableId][CellId];
			}
		>;
	};

	export type Row<S extends TableSchema> = Record<string, S>;

	// To merge schemas, we iterate over the keys in the TinyBase schema,
	// since anything not specified in it will cause a runtime error
	// For any cell that has a default,
	export type MergeOutputs<
		TinyBase extends Schema,
		TypeScript extends Schema
	> = {
		[TableId in keyof TinyBase]: {
			// First, we need to verify that TableId and CellId match the TypeScript schema
			[CellId in keyof TinyBase[TableId]]: TableId extends keyof TypeScript
				? CellId extends keyof TypeScript[TableId]
					? TinyBase[TableId][CellId] & TypeScript[TableId][CellId]
					: never
				: never;
		};
	};

	// For the input, we also only consider keys in the TinyBase schema
	// However, we take the input types directly from the TypeScript schema
	export type MergeInputs<
		TinyBase extends Schema,
		TypeScript extends Schema
	> = {
		[TableId in keyof TinyBase]: {
			[CellId in keyof TinyBase[TableId]]: TableId extends keyof TypeScript
				? CellId extends keyof TypeScript[TableId]
					? // Here we merge the types, but let the TypeScript schema dictate
					  // whether inputs can be nullable or nut
					  Exclude<TinyBase[TableId][CellId], null | undefined> &
							TypeScript[TableId][CellId]
					: never
				: never;
		};
	};

	export type InputOf<S extends Store<any, any>> = S extends Store<
		infer Input,
		any
	>
		? Input
		: never;

	export type OutputOf<S extends Store<any, any>> = S extends Store<
		any,
		infer Output
	>
		? Output
		: never;

	// === ===

	// type KeysWithoutDefault<Table extends TinyBaseTableSchema> = {
	// 	[Key in keyof Table]: Table[Key]["default"] extends CellValue<Table[Key]>
	// 		? never
	// 		: Key;
	// }[keyof Table];

	type KeysOfUnion<T> = T extends any ? keyof T : never;

	export type AllCellIds<S extends Schema> = KeysOfUnion<S[keyof S]>;

	type AllowedCellIds<
		S extends Schema,
		TableId extends keyof S | null
	> = TableId extends keyof S ? keyof S[TableId] : AllCellIds<S>;

	export type KeepIfHasCellId<
		S extends Schema,
		TableId extends keyof S,
		CellId extends AllCellIds<S>
	> = CellId extends keyof S[TableId] ? TableId : never;

	export type TablesWithCellId<
		S extends Schema,
		CellId extends AllCellIds<S>
	> = {
		[TableId in keyof S]: KeepIfHasCellId<S, TableId, CellId>;
	}[keyof S];

	type MapCell<Cell> = (cell: Cell | undefined) => Cell;
	type CellUpdate<Cell> = Cell | MapCell<Cell>;

	type CellChange<
		S extends Schema,
		TableId extends keyof S,
		CellId extends keyof S[TableId]
	> = [
		changed: boolean,
		oldCell: S[TableId][CellId] | undefined,
		newCell: S[TableId][CellId]
	];

	type GetCellChange<S extends Schema> = <
		TableId extends keyof S,
		CellId extends keyof S[TableId]
	>(
		tableId: TableId,
		rowId: string,
		cellId: CellId
	) => CellChange<S, TableId, CellId>;

	type TablesListener<Input extends Schema, Output extends Schema> = (
		store: Store<Input, Output>,
		getCellChange: GetCellChange<Output>
	) => void;

	// Not entirely clear on what this does, it may need to receive a store with a different schema
	type TablesIdListener<Input extends Schema, Output extends Schema> = (
		store: Store<Input, Output>
	) => void;

	type GlobalTableListener<Input extends Schema, Output extends Schema> = (
		store: Store<Input, Output>,
		tableId: keyof Output,
		getCellChange: GetCellChange<Output>
	) => void;

	type TableListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output
	> = (
		store: Store<Input, Output>,
		tableId: TableId,
		getCellChange: GetCellChange<Output>
	) => void;

	type GlobalRowIdsListener<Input extends Schema, Output extends Schema> = (
		store: Store<Input, Output>,
		tableId: keyof Output
	) => void;

	type RowIdsListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output
	> = (store: Store<Input, Output>, tableId: TableId) => void;

	// I don't think it's worth it to provide two types, each with `descending` either `true` or `false`
	type SortedRowIdsListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output,
		CellIdOrUndefined extends keyof Output[TableId] | undefined
	> = (
		store: Store<Input, Output>,
		tableId: TableId,
		cellId: CellIdOrUndefined,
		descending: boolean,
		offset: number,
		limit: number | undefined,
		sortedRowIds: Array<string>
	) => void;

	type RowListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output | null,
		RowId extends string | null
	> = (
		store: Store<Input, Output>,
		tableId: TableId extends null ? keyof Output : TableId,
		rowId: RowId extends null ? string : RowId,
		getCellChange: GetCellChange<Output> | undefined
	) => void;

	type CellIdsListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output | null,
		RowId extends string | null
	> = (
		store: Store<Input, Output>,
		tableId: TableId extends null ? keyof Output : TableId,
		rowId: RowId extends null ? string : RowId
	) => void;

	type ExactCellListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output,
		RowId extends string | null,
		CellId extends keyof Output[TableId]
	> = (
		store: Store<Input, Output>,
		tableId: TableId,
		rowId: RowId extends null ? string : RowId,
		cellId: CellId,
		newCell: Output[TableId][CellId],
		oldCell: Output[TableId][CellId],
		getCellChange: GetCellChange<Output> | undefined
	) => void;

	type CrossTablesCellListener<
		Input extends Schema,
		Output extends Schema,
		RowId extends string | null,
		CellId extends AllCellIds<Output>
	> = <TableId extends TablesWithCellId<Output, CellId>>(
		store: Store<Input, Output>,
		tableId: TableId,
		rowId: RowId extends null ? string : RowId,
		cellId: CellId,
		/* NOTE: we can provide the most accurate union possible here,
		 * but if 2 tables have the same cellId associated with two different types,
		 * the listener won't be able to narrow down the type of the cell by checking
		 * the name of the table.
		 * It would only be possible if the arguments were passed as a single object.
		 * Example:
		 * ```
		 * createStore().setSchema({
		 *	  a: {
		 *     name: { type: "string" }
		 *   },
		 *   b: {
		 *     name: { type: "number" }
		 *   },
		 *   c: {
		 *     otherField: { type: "boolean" }
		 *   }
		 * }).addCellListener(
		 *   null, "rowId", "name",
		 *   (store, tableId, rowId, cellId, newCell, oldCell) => {
		 *     // TypeScript will be able to tell you that `tableId` can only be "a" or "b", but never "c"
		 *     if(tableId === "a") {
		 *       // TypeScript won't be able to know that `newCell` has to be a string at this point
		 *     }
		 *   }
		 * )
		 * ```
		 */
		newCell: Output[TableId][CellId],
		oldCell: Output[TableId][CellId],
		getCellChange: GetCellChange<Output> | undefined
	) => void;

	type CellListener<
		Input extends Schema,
		Output extends Schema,
		RowId extends string | null
	> = <TableId extends keyof Output, CellId extends keyof Output[TableId]>(
		store: Store<Input, Output>,
		tableId: TableId,
		rowId: RowId extends null ? string : RowId,
		cellId: CellId,
		newCell: Output[TableId][CellId],
		oldCell: Output[TableId][CellId],
		getCellChange: GetCellChange<Output> | undefined
	) => void;

	type InvalidCellListener<
		Input extends Schema,
		Output extends Schema,
		TableId extends keyof Output | null,
		RowId extends string | null,
		CellId extends AllowedCellIds<Output, TableId> | null
	> = (
		store: Store<Input, Output>,
		tableId: TableId extends null ? keyof Output : TableId,
		rowId: RowId extends null ? string : RowId,
		cellId: CellId extends null
			? TableId extends keyof Output
				? keyof Output[TableId]
				: AllCellIds<Output>
			: CellId,
		invalidCells: any[]
	) => void;

	type TransactionListener<Input extends Schema, Output extends Schema> = (
		store: Store<Input, Output>,
		cellsTouched: boolean
	) => void;

	type CellCallback<S extends Schema, TableId extends keyof S> = <
		CellId extends keyof S[TableId]
	>(
		cellId: CellId,
		cell: S[TableId][CellId]
	) => void;

	type RowCallback<S extends Schema, TableId extends keyof S> = (
		rowId: string,
		forEachCell: (cellCallback: CellCallback<S, TableId>) => void
	) => void;

	type TableCallback<S extends Schema> = <TableId extends keyof S>(
		tableId: TableId,
		forEachRow: (rowCallback: RowCallback<S, TableId>) => void
	) => void;

	type CellChangeArray<CellValue> =
		| [undefined, CellValue]
		| [CellValue, undefined]
		| [CellValue, CellValue];

	type ChangedCells<S extends Schema> = Partial<{
		[TableId in keyof S]: Record<
			string,
			Partial<{
				[CellId in keyof S[TableId]]: CellChangeArray<S[TableId][CellId]>;
			}>
		>;
	}>;

	type InvalidCells<S extends Schema> = Partial<{
		[TableId in keyof S]: Record<
			string,
			Partial<{
				[CellId in keyof S[TableId]]: Array<any>;
			}>
		>;
	}>;

	export type DoRollback<S extends Schema> = (
		changedCells: ChangedCells<S>,
		invalidCells: InvalidCells<S>
	) => boolean;

	export interface StoreListenerStats {
		tables?: number;
		tableIds?: number;
		table?: number;
		rowIds?: number;
		sortedRowIds?: number;
		row?: number;
		cellIds?: number;
		cell?: number;
		invalidCell?: number;
		transaction?: number;
	}

	// TODO:
	// - add opaque types for different types of IDs, to avoid confusing them with other strings?
	//   (ex: ListenerId)
	//   This may complicate the use of the library too much though
	// - find a way to enforce mutator / non mutator distinction on listeners?
}
