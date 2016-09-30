import { ReadonlyClassNames, TableCellStyleDefinition, TableCellClassName } from "./types";
import { Border } from "./border";
import { Style, fromClassNames } from "./style";
import { TableCell } from "./cell";
import { Table } from "./table";

export { TableCellStyleDefinition, TableCellClassName } from "./types";

export class TableCellStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly key: any;
    readonly classNames: ReadonlyArray<TableCellClassName>;
    readonly canMatch: boolean;

    /*@internal*/ _classNames: ReadonlyClassNames<TableCellClassName>;

    private _match: ((dataItem: T, columnKey: any, cell: TableCell<T>) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableCellStyleDefinition<T>) {
        const { key, match } = definition;
        this.table = table;
        this.style = Style.from(definition).updateFrom({ border: Border.inherit }).asCellStyle();
        this._classNames = fromClassNames(validTableCellClassName, definition);
        this.classNames = this._classNames.toArray();
        this.canMatch = typeof match === "function";
        this.key = key;
        this._match = match;
    }

    isMatch(dataItem: T | undefined, columnKey: any, cell: TableCell<T>) {
        return dataItem !== undefined && this._match ? (void 0, this._match)(dataItem, columnKey, cell) : false;
    }
}

function validTableCellClassName(className: string): className is TableCellClassName {
    return className === "header"
        || className === "footer"
        || className === "group"
        || className === "body"
        || className === "first-row"
        || className === "last-row"
        || className === "even-row"
        || className === "odd-row"
        || className === "first-column"
        || className === "last-column"
        || className === "even-column"
        || className === "odd-column";
}