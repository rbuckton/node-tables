import { ReadonlyCollection, TableColumnDefinition, TableColumnSection } from "./types";
import { Style, StyleDefinition } from "./style";
import { Size, } from "./size";
import { Table } from "./table";
import { maxInt32, minMax } from "./utils";

export { TableColumnDefinition, TableColumnSection } from "./types";

export class TableColumn<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly header: string | undefined;
    readonly footer: string | undefined;
    readonly maxWidth: number;
    readonly minWidth: number;
    readonly key: any;
    readonly sections: ReadonlyCollection<TableColumnSection>;
    readonly columnIndex: number;

    /*@internal*/ _desiredWidth: number = -1;
    /*@internal*/ _actualWidth: number = -1;
    /*@internal*/ _actualStyle: Style | undefined;
    /*@internal*/ _width: Size;

    private _expression: ((x: T, key: any) => any) | undefined;
    private _sections: Set<TableColumnSection> | undefined;

    constructor(table: Table<T>, columnIndex: number, sections: ReadonlyCollection<TableColumnSection>, definition: TableColumnDefinition<T>) {
        const { header, footer, maxWidth = maxInt32, minWidth = 0, width = "auto", key, expression } = definition;
        this.table = table;
        this.columnIndex = columnIndex;
        this.sections = sections;
        this.style = Style.fromObject(definition).asColumnStyle();
        this.header = header;
        this.footer = footer;
        this.key = key;
        this.maxWidth = minMax(maxWidth, 1, maxInt32);
        this.minWidth = minMax(minWidth, 0, maxInt32);
        this._width = typeof width === "object" ? width : Size.parse(width);
        this._expression = expression;
        if (this.width.isFixed) {
            this._desiredWidth = this.width.value;
        }
    }

    get width(): Size {
        return this._width;
    }

    getText(x: T | undefined | null): string {
        if (x === undefined || x === null) {
            return "";
        }

        const value = this._expression
            ? (void 0, this._expression)(x, this.key)
            : Object.prototype.hasOwnProperty.call(x, this.key)
                ? (<any>x)[this.key]
                : undefined;

        if (value === undefined || value === null) {
            return "";
        }

        return "" + value;
    }

    isInSection(section: TableColumnSection) {
        if (!this._sections) {
            this._sections = new Set(this.sections);
        }

        return this._sections.has(section);
    }
}
