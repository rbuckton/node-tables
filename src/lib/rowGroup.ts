import { ReadonlyCollection } from "./types";
import { Style } from "./style";
import { TableGroup } from "./group";
import { TableRow } from "./row";
import { Table } from "./table";

export class TableRowGroup<T> {
    readonly table: Table<T>;
    readonly group: TableGroup<T>;
    readonly depth: number;
    readonly parent: TableRowGroup<T> | undefined;
    readonly children: ReadonlyCollection<TableRowGroup<T>>;
    readonly key: any;
    readonly rows: ReadonlyCollection<TableRow<T>>;

    /*@internal*/ _actualStyle: Style | undefined;

    constructor(table: Table<T>, group: TableGroup<T>, parent: TableRowGroup<T> | undefined, children: ReadonlyCollection<TableRowGroup<T>>, key: any, rows: ReadonlyCollection<TableRow<T>>) {
        this.table = table;
        this.group = group;
        this.parent = parent;
        this.children = children;
        this.key = key;
        this.rows = rows;
        this.depth = group.depth;
    }
}