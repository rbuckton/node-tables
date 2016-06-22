import { ReadonlyCollection, TableRowStyleDefinition, TableRowSection } from "./types";
import { Style, StyleDefinition } from "./style";
import { Table } from "./table";

export { TableRowStyleDefinition } from "./types";

export class TableRowStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly sections: ReadonlyCollection<TableRowSection>;
    readonly canMatchDataItem: boolean;

    private _match: ((dataItem: T) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableRowStyleDefinition<T>) {
        const { section, match } = definition;
        this.table = table;
        this.style = Style.fromObject(definition).asRowStyle();
        this.sections = Array.isArray(section) ? section.slice() : section ? [section] : [];
        this.canMatchDataItem = typeof match === "function";
        this._match = match;
    }

    isMatch(dataItem: T | undefined) {
        return dataItem !== undefined && this._match ? (void 0, this._match)(dataItem) : false;
    }
}
