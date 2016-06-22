import { ReadonlyCollection, TableColumnStyleDefinition } from "./types";
import { Style, StyleDefinition } from "./style";
import { Table } from "./table";
import { TableColumnSection } from "./column";

export { TableColumnStyleDefinition } from "./types";

export class TableColumnStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly sections: ReadonlyCollection<TableColumnSection>;
    readonly canMatchKey: boolean;

    private _match: ((key: any) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableColumnStyleDefinition) {
        const { section, match } = definition;
        this.table = table;
        this.style = Style.fromObject(definition).asColumnStyle();
        this.sections = Array.isArray(section) ? section.slice() : section ? [section] : [];
        this.canMatchKey = typeof match === "function";
        this._match = match;
    }

    isMatch(key: any) {
        // TODO: match sections for best fit.
        return this._match ? (void 0, this._match)(key) : false;
    }
}
