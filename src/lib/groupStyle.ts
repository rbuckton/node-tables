import { ReadonlyCollection, TableGroupStyleDefinition } from "./types";
import { Style, StyleDefinition } from "./style";
import { Table } from "./table";

export { TableGroupStyleDefinition } from "./types";

export class TableGroupStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly canMatchKey: boolean;
    readonly depth: number | undefined;

    private _match: ((key: any) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableGroupStyleDefinition) {
        const { match, depth } = definition;
        this.table = table;
        this.style = Style.fromObject(definition).asGroupStyle();
        this.canMatchKey = typeof match === "function";
        this.depth = depth;
        this._match = match;
    }

    isMatch(key: any) {
        return this._match ? (void 0, this._match)(key) : false;
    }
}
