import { ReadonlyCollection, TableRowSection } from "./types";
import { Style } from "./style";
import { TableRowGroup } from "./rowGroup";
import { Table } from "./table";
import { TableCell } from "./cell";

export { TableRowSection } from "./types";

export class TableRow<T> {
    readonly table: Table<T>;
    readonly group: TableRowGroup<T> | undefined;
    readonly sections: ReadonlyCollection<TableRowSection>;
    readonly cells: ReadonlyCollection<TableCell<T>>;
    readonly dataItem: T | undefined;

    /*@internal*/ _actualHeight: number = -1;
    /*@internal*/ _actualStyle: Style | undefined;

    private _sections: Set<TableRowSection> | undefined;

    constructor(table: Table<T>, group: TableRowGroup<T> | undefined, sections: ReadonlyCollection<TableRowSection>, cells: ReadonlyCollection<TableCell<T>>, dataItem: T | undefined) {
        this.table = table;
        this.group = group;
        this.sections = sections;
        this.cells = cells;
        this.dataItem = dataItem;
    }

    isInSection(...sections: TableRowSection[]) {
        if (!this._sections) {
            this._sections = new Set(this.sections);
        }

        for (const section of sections) if (section) {
            if (!this._sections.has(section)) {
                return false;
            }
        }

        return true;
    }
}

