import { ReadonlyCollection, ReadonlyClassNames, TableColumnDefinition, TableColumnClassName } from "./types";
import { Style, StyleDefinition, ClassNames } from "./style";
import { Size, } from "./size";
import { Table } from "./table";
import { maxInt32, minMax } from "./utils";

export { TableColumnDefinition, TableColumnClassName } from "./types";

export class TableColumn<T> {
    readonly table: Table<T>;
    readonly style: Style;
    readonly header: string | undefined;
    readonly footer: string | undefined;
    readonly width: Size;
    readonly maxWidth: number;
    readonly minWidth: number;
    readonly key: any;
    readonly className: string;
    readonly classNames: ReadonlyCollection<TableColumnClassName>;
    readonly columnIndex: number;
    readonly visible: boolean;

    /*@internal*/ readonly _classNames: ReadonlyClassNames<TableColumnClassName>;
    /*@internal*/ _additionalWidthForGroupLabel: number = 0;
    /*@internal*/ _minWidth: number = -1;
    /*@internal*/ _maxWidth: number = maxInt32;
    /*@internal*/ _desiredWidth: number = -1;
    /*@internal*/ _actualWidth: number = -1;
    /*@internal*/ _actualStyle: Style | undefined;

    private _expression: ((x: T, key: any) => any) | undefined;
    private _sections: Set<TableColumnClassName> | undefined;

    constructor(table: Table<T>, columnIndex: number, classNames: ReadonlyCollection<TableColumnClassName>, definition: TableColumnDefinition<T>) {
        const { header, footer, maxWidth = maxInt32, minWidth = 0, width = "auto", key, expression, visible } = definition;
        this.table = table;
        this.columnIndex = columnIndex;
        this.classNames = classNames;
        this._classNames = new ClassNames(classNames);
        this.className = this._classNames.toString();
        this.style = Style.from(definition).asColumnStyle();
        this.header = header;
        this.footer = footer;
        this.key = key;
        this.minWidth = minMax(minWidth, 1, maxInt32);
        this._minWidth = this.minWidth;
        this.maxWidth = minMax(maxWidth, 1, maxInt32);
        this._maxWidth = this.maxWidth;
        this.width = typeof width === "object" ? width : Size.parse(width);
        this._expression = expression;
        this.visible = visible !== undefined ? visible : true;
        if (this.width.isFixed) {
            this._desiredWidth = this.width.value;
        }
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

    isInSection(section: TableColumnClassName) {
        if (!this._sections) {
            this._sections = new Set(this.classNames);
        }

        return this._sections.has(section);
    }
}
