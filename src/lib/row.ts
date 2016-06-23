import { ReadonlyCollection, ReadonlyClassNames, TableRowClassName } from "./types";
import { Style, ClassNames } from "./style";
import { TableRowGroup } from "./rowGroup";
import { Table } from "./table";
import { TableCell } from "./cell";

export { TableRowClassName } from "./types";

export class TableRow<T> {
    readonly table: Table<T>;
    readonly group: TableRowGroup<T> | undefined;
    readonly className: string;
    readonly classNames: ReadonlyCollection<TableRowClassName>;
    readonly cells: ReadonlyCollection<TableCell<T>>;
    readonly dataItem: T | undefined;

    /*@internal*/ readonly _classNames: ReadonlyClassNames<TableRowClassName>;
    /*@internal*/ _actualHeight: number = -1;
    /*@internal*/ _actualStyle: Style | undefined;

    private _sections: Set<TableRowClassName> | undefined;

    constructor(table: Table<T>, group: TableRowGroup<T> | undefined, classNames: ReadonlyCollection<TableRowClassName>, cells: ReadonlyCollection<TableCell<T>>, dataItem: T | undefined) {
        this.table = table;
        this.group = group;
        this.classNames = classNames;
        this._classNames = new ClassNames(classNames);
        this.className = this._classNames.toString();
        this.cells = cells;
        this.dataItem = dataItem;
    }

    isInSection(...sections: TableRowClassName[]) {
        if (!this._sections) {
            this._sections = new Set(this.classNames);
        }

        for (const section of sections) if (section) {
            if (!this._sections.has(section)) {
                return false;
            }
        }

        return true;
    }
}

