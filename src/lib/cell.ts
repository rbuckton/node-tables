import { ReadonlyCollection, ReadonlyClassNames, TableCellClassName } from "./types";
import { Style, ClassNames } from "./style";
import { Border } from "./border";
import { TableRowGroup } from "./rowGroup";
import { TableColumn } from "./column";
import { TableRow } from "./row";
import { Table } from "./table";
import { measureText } from "./text";
import { maxInt32, minMax } from "./utils";

export { TableCellClassName } from "./types";

export class TableCell<T> {
    readonly table: Table<T>;
    readonly group: TableRowGroup<T> | undefined;
    readonly row: TableRow<T>;
    readonly column: TableColumn<T> | undefined;
    readonly columnSpan: number;
    readonly rowSpan: number;
    readonly text: string;
    readonly className: string;
    readonly classNames: ReadonlyCollection<TableCellClassName>;

    /*@internal*/ readonly _classNames: ReadonlyClassNames<TableCellClassName>;
    /*@internal*/ readonly _minWidth: number;
    /*@internal*/ _desiredWidth: number;
    /*@internal*/ _actualHeight: number = -1;
    /*@internal*/ _actualWidth: number = -1;
    /*@internal*/ _actualStyle: Style | undefined;
    /*@internal*/ _lines: string[] | undefined;

    constructor(table: Table<T>, group: TableRowGroup<T> | undefined, row: TableRow<T>, column: TableColumn<T> | undefined, columnSpan: number, classNames: ReadonlyCollection<TableCellClassName>, text: string) {
        this.table = table;
        this.group = group;
        this.row = row;
        this.column = column;
        this.columnSpan = Math.max(1, columnSpan);
        this.rowSpan = 1;
        this.classNames = classNames;
        this._classNames = new ClassNames(classNames);
        this.className = this._classNames.toString();
        this.text = text;
        const { width, minWidth } = measureText(this.text, maxInt32);
        this._minWidth = minWidth;
        this._desiredWidth = width;
        if (column) {
            if (column._desiredWidth < width) {
                column._desiredWidth = width;
            }
            if (column._minWidth < minWidth) {
                column._minWidth = minWidth;
            }
            if (column._maxWidth < minWidth) {
                column._maxWidth = minWidth;
            }
        }
        else {
            if (table._groupLabelMinWidth < minWidth) {
                table._groupLabelMinWidth = minWidth;
            }
        }
    }
}

