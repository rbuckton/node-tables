import { ReadonlyCollection, TableGroupStyleDefinition } from "./types";
import { Style } from "./style";
import { TableGroup } from "./group";
import { Table } from "./table";

export { TableGroupStyleDefinition } from "./types";

export class TableGroupStyle<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly canMatchKey: boolean;
    readonly depth: number | undefined;

    private _match: ((key: any, group: TableGroup<T>) => boolean) | undefined;

    constructor(table: Table<T>, definition: TableGroupStyleDefinition<T>) {
        const { match, depth } = definition;
        this.table = table;
        this.style = Style.from(definition).asGroupStyle();
        this.canMatchKey = typeof match === "function";
        this.depth = depth;
        this._match = match;
    }

    isMatch(key: any, group: TableGroup<T>) {
        return this._match ? (void 0, this._match)(key, group) : false;
    }
}
