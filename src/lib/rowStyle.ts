import { ReadonlyClassNames, TableRowStyleDefinition, TableRowClassName } from "./types";
import { Style, fromClassNames } from "./style";
import { TableRow } from "./row";
import { Table } from "./table";

export { TableRowStyleDefinition, TableRowClassName } from "./types";

export class TableRowStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly className: string;
    readonly classNames: ReadonlyArray<TableRowClassName>;
    readonly canMatch: boolean;

    /*@internal*/ _classNames: ReadonlyClassNames<TableRowClassName>;

    private _match: ((dataItem: T, row: TableRow<T>) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableRowStyleDefinition<T>) {
        const { match } = definition;
        this.table = table;
        this.style = Style.from(definition).asRowStyle();
        this._classNames = fromClassNames(validTableRowClassName, definition);
        this.classNames = this._classNames.toArray();
        this.className = this._classNames.toString();
        this.canMatch = typeof match === "function";
        this._match = match;
    }

    isMatch(dataItem: T | undefined, row: TableRow<T>) {
        return dataItem !== undefined && this._match ? (void 0, this._match)(dataItem, row) : false;
    }
}

function validTableRowClassName(className: string): className is TableRowClassName {
    return className === "header"
        || className === "footer"
        || className === "group"
        || className === "body"
        || className === "first-row"
        || className === "last-row"
        || className === "even-row"
        || className === "odd-row";
}