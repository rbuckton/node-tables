import { TableGroupDefinition } from "./types";
import { Style, StyleDefinition } from "./style";
import { Table } from "./table";

export { TableGroupDefinition } from "./types";

export class TableGroup<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly depth: number;

    /*@internal*/ _actualStyle: Style | undefined;

    private _by: (x: T) => any;
    private _header: string | ((key: any) => any) | undefined;
    private _footer: string | ((key: any) => any) | undefined;

    constructor(table: Table<T>, depth: number, definition: TableGroupDefinition<T>) {
        const { header, footer, by } = definition;
        this.table = table;
        this.depth = depth;
        this.style = Style.from(definition).asGroupStyle();
        this._header = header;
        this._footer = footer;
        this._by = by;
    }

    getHeaderText(key: any) {
        if (typeof this._header === "string") {
            return this._header;
        }
        else if (typeof this._header === "function") {
            return String((void 0, this._header)(key) || "");
        }
        else {
            return String(key);
        }
    }

    getFooterText(key: any) {
        if (typeof this._footer === "string") {
            return this._footer;
        }
        else if (typeof this._footer === "function") {
            return String((void 0, this._footer)(key) || "");
        }
        else {
            return "";
        }
    }

    getKey(x: T) {
        return (void 0, this._by)(x);
    }
}
