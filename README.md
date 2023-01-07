# tinybase-types
An attempt at providing advanced TypeScript support for [`tinybase`](https://github.com/tinyplex/tinybase).

Also includes a tiny, fully typesafe query builder for TinyQL.

## Modules covered
- [x] `store`
- [ ] `metrics`
- [ ] `indexes`  
- [ ] `relationships`
- [x] `queries`
  - [ ] Query builder extension (WIP)
- [ ] `metrics`
- [ ] `checkpoints`
- [ ] `persisters`
- [ ] `ui-react`
- [ ] `common`
- [ ] `tools`

## Other TODOs
- [ ] Examples (will act as TypeScript tests)
- [ ] Tests for extensions

## Known limitations
- Cell listeners in `store` cannot be 100% typesafe.
  - If a `cellId` corresponds to cells with different types across different tables, a listener listening on all those tables can't determine the type of the cell value by checking the `tableId`, since those are passed as two separate arguments.
- Base `queries` module can only have very general types. The query builder extension aims to solve that.