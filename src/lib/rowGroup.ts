import { Style } from "./style";
import { TableGroup } from "./group";
import { TableRow } from "./row";
import { Table } from "./table";

export class TableRowGroup<T> {
    readonly table: Table<T>;
    readonly group: TableGroup<T>;
    readonly depth: number;
    readonly parent: TableRowGroup<T> | undefined;
    readonly children: ReadonlyArray<TableRowGroup<T>>;
    readonly key: any;
    readonly rows: ReadonlyArray<TableRow<T>>;

    /*@internal*/ _actualStyle: Style | undefined;

    constructor(table: Table<T>, group: TableGroup<T>, parent: TableRowGroup<T> | undefined, children: ReadonlyArray<TableRowGroup<T>>, key: any, rows: ReadonlyArray<TableRow<T>>) {
        this.table = table;
        this.group = group;
        this.parent = parent;
        this.children = children;
        this.key = key;
        this.rows = rows;
        this.depth = group.depth;
    }
}