import {
  SupportedCellValues,
  Schema as StoreSchema,
  Store,
  CellValue
} from "tinybase/store";

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

type GetCell<Table extends TableSchema> = <CellId extends keyof Table>(cellId: CellId) => Table[CellId] | undefined;

type Extend<
  Tables extends Schema,
  TableId extends Key,
  NewTable extends TableSchema
> = Tables &
  {
    [K in TableId]: NewTable;
  };

type Rename<
  Tables extends Schema,
  TableId extends keyof Tables,
  NewId extends Key
> = Omit<Tables, TableId> &
  {
    [K in NewId]: Tables[TableId];
  };

type OnFunction<Table extends TableSchema> = (getCell: GetCell<Table>, rowId: string) => string;

export class QueryBuilder<
  S extends Schema,
  MainTableId extends keyof S,
  Tables extends Schema = Extend<{}, MainTableId, S[MainTableId]>,
  Result extends TableSchema = {},
  LatestOp extends "joins" | "selects" | "groups" | undefined = undefined,
  LatestId extends Key | undefined = undefined
> {
  // We don't really care about keeping the schema of the store
  // Although we may need to, for .getStore()
  protected store: Store<any>;
  protected mainTableId: MainTableId;
  protected joins: Array<AliasableOp> = [];
  protected selects: Array<AliasableOp> = [];
  protected groups: Array<AliasableOp> = [];
  protected wheres: Array<Op> = [];
  protected havings: Array<Op> = [];

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
  as<LatestJoinId extends keyof Tables, Alias extends Key>(
    this: QueryBuilder<S, MainTableId, Tables, Result, "joins", LatestJoinId>,
    alias: Alias
  ): QueryBuilder<
    S,
    MainTableId,
    Rename<Tables, LatestJoinId, Alias>,
    Result,
    undefined,
    undefined
  >;
  as(alias: string): any {
    const array = this[this.latest as "joins" | "selects" | "groups"];
    array[array.length - 1].as = alias;
    this.latest = undefined as any;
    return this as any;
  }

  join<TableId extends keyof S>(
    joinedTableId: TableId,
    on: NonBooleanCells<S[TableId]>
  ): QueryBuilder<
    S,
    MainTableId,
    Extend<Tables, TableId, S[TableId]>,
    Result,
    "joins",
    TableId
  >;
  join<TableId extends keyof S>(
    joinedTableId: TableId,
    on: OnFunction<S[TableId]>
  ): QueryBuilder<
    S,
    MainTableId,
    Extend<Tables, TableId, S[TableId]>,
    Result,
    "joins",
    TableId
  >;
  join<TableId extends keyof S, IntermediateTableId extends keyof Tables>(
    joinedTableId: TableId,
    fromIntermediateJoinedTableId: IntermediateTableId,
    on: NonBooleanCells<Tables[IntermediateTableId]>
  ): QueryBuilder<
    S,
    MainTableId,
    Extend<Tables, TableId, S[TableId]>,
    Result,
    "joins",
    TableId
  >;
  join(...args: Array<any>): any {
    this.joins.push({ args });
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
  ): QueryBuilder<S, TableId, Pick<S, TableId>, {}> {
    return new QueryBuilder(this.store, tableId);
  }
}

export function createQueryBuilder<S extends StoreSchema>(
  store: Store<S>
): UninitializedQueryBuilder<TransformSchema<S>> {
  return new UninitializedQueryBuilder(store);
}
