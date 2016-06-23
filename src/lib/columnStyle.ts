import { ReadonlyCollection, ReadonlyClassNames, TableColumnStyleDefinition, TableColumnClassName } from "./types";
import { Style, fromClassNames } from "./style";
import { Table } from "./table";
import { TableColumn } from "./column";

export { TableColumnStyleDefinition, TableColumnClassName } from "./types";

export class TableColumnStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly className: string;
    readonly classNames: ReadonlyCollection<TableColumnClassName>;
    readonly canMatch: boolean;

    /*@internal*/ _classNames: ReadonlyClassNames<TableColumnClassName>;

    private _match: ((key: any, column: TableColumn<T>) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableColumnStyleDefinition<T>) {
        const { match } = definition;
        this.table = table;
        this.style = Style.from(definition).asColumnStyle();
        this._classNames = fromClassNames(validTableColumnClassName, definition);
        this.classNames = this._classNames.toArray();
        this.className = this._classNames.toString();
        this.canMatch = typeof match === "function";
        this._match = match;
    }

    isMatch(key: any, column: TableColumn<T>) {
        return this._match ? (void 0, this._match)(key, column) : false;
    }
}

function validTableColumnClassName(className: string): className is TableColumnClassName {
    return className === "first-column"
        || className === "last-column"
        || className === "even-column"
        || className === "odd-column";
}