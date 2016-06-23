import * as tty from "tty";
import * as os from "os";
import { from } from "iterable-query";
import { ReadonlyCollection, ReadonlyClassNames, TableDefinition, TableColumnClassName, TableRowClassName, TableCellClassName } from "./types";
import { Border } from "./border";
import { StringWriter } from "./writer";
import { Color, ColorStringWriter } from "./color";
import { Style } from "./style";
import { Size } from "./size";
import { TableGroup, TableGroupDefinition } from "./group";
import { TableColumn, TableColumnDefinition } from "./column";
import { TableRowGroup } from "./rowGroup";
import { TableRow } from "./row";
import { TableCell } from "./cell";
import { TableGroupStyle, TableGroupStyleDefinition } from "./groupStyle";
import { TableColumnStyle, TableColumnStyleDefinition} from "./columnStyle";
import { TableRowStyle, TableRowStyleDefinition } from "./rowStyle";
import { TableCellStyle, TableCellStyleDefinition } from "./cellStyle";
import { TextMeasurements, measureText, fit, repeat } from "./text";
import { maxInt32, minMax, addInt32 } from "./utils";

export { TableDefinition } from "./types";

export class Table<T> {
    readonly style: Style;
    readonly padding: number;
    readonly groups: ReadonlyCollection<TableGroup<T>>;
    readonly columns: ReadonlyCollection<TableColumn<T>>;
    readonly groupStyles: ReadonlyCollection<TableGroupStyle<T>>;
    readonly columnStyles: ReadonlyCollection<TableColumnStyle<T>>;
    readonly rowStyles: ReadonlyCollection<TableRowStyle<T>>;
    readonly cellStyles: ReadonlyCollection<TableCellStyle<T>>;
    readonly width: number | undefined;
    readonly useColor: boolean | undefined;

    /*@internal*/ _groupLabelMinWidth: number = -1;

    private _hasColumnHeaders: boolean;
    private _hasColumnFooters: boolean;
    private _hasStarColumns: boolean;
    private _rowGroups: ReadonlyCollection<TableRowGroup<T>> | undefined;
    private _columns: ReadonlyCollection<TableColumn<T>> | undefined;
    private _rows: ReadonlyCollection<TableRow<T>> | undefined;
    private _currentStyle: Style | undefined;
    private _viewportWidth: number | undefined;
    private _maxGroupDepth: number | undefined;
    private _groupLabelAvailableWidth: number = -1;

    constructor(definition: TableDefinition<T>) {
        const { padding = 1, group: groups, columns, groupStyles, columnStyles, rowStyles, cellStyles, width, useColor } = definition;
        const tablePadding = padding >> 0;
        const tableStyle = Style.from(definition).asTableStyle();
        const tableGroups: TableGroup<T>[] = this._generateGroups(groups);
        const { tableColumns, hasStarColumns, hasColumnHeaders, hasColumnFooters } = this._generateColumns(columns);
        const tableGroupStyles= this._generateGroupStyles(groupStyles);
        const tableColumnStyles = this._generateColumnStyles(columnStyles);
        const tableRowStyles = this._generateRowStyles(tableStyle, rowStyles);
        const tableCellStyles = this._generateCellStyles(cellStyles);
        this.padding = tablePadding;
        this.width = width;
        this.useColor = useColor;
        this.style = tableStyle;
        this.groups = tableGroups;
        this.columns = tableColumns;
        this.groupStyles = tableGroupStyles;
        this.columnStyles = tableColumnStyles;
        this.rowStyles = tableRowStyles;
        this.cellStyles = tableCellStyles;
        this._hasStarColumns = hasStarColumns;
        this._hasColumnHeaders = hasColumnHeaders;
        this._hasColumnFooters = hasColumnFooters;
    }

    private _generateGroups(groups: TableGroupDefinition<T>[] | undefined) {
        const tableGroups: TableGroup<T>[] = [];
        if (groups) {
            let depth = 0;
            for (const group of groups) if (group) {
                const tableGroup = new TableGroup(this, depth++, group);
                tableGroups.push(tableGroup);
            }
        }
        return tableGroups;
    }

    private _generateColumns(columns: TableColumnDefinition<T>[] | undefined) {
        let hasStarColumns = false;
        let hasColumnHeaders = false;
        let hasColumnFooters = false;
        const tableColumns: TableColumn<T>[] = [];
        if (columns) {
            const numColumns = columns.length;
            for (let i = 0; i < numColumns; i++) {
                const column = columns[i];
                const classNames: TableColumnClassName[] = [];
                if (i === 0) classNames.push("first-column");
                if (i === numColumns - 1) classNames.push("last-column");
                classNames.push(i % 2 ? "odd-column" : "even-column");
                const tableColumn = new TableColumn(this, i, classNames, column);
                if (tableColumn.width.isStar) {
                    hasStarColumns = true;
                }

                if (tableColumn.header) {
                    hasColumnHeaders = true;
                }

                if (tableColumn.footer) {
                    hasColumnFooters = true;
                }

                tableColumns.push(tableColumn);
            }
        }
        return { tableColumns, hasStarColumns, hasColumnHeaders, hasColumnFooters };
    }

    private _generateGroupStyles(groupStyles: TableGroupStyleDefinition<T>[] | undefined) {
        const tableGroupStyles: TableGroupStyle<T>[] = [];
        if (groupStyles) {
            for (const groupStyle of groupStyles) if (groupStyle) {
                tableGroupStyles.push(new TableGroupStyle<T>(this, groupStyle));
            }
        }
        return tableGroupStyles;
    }

    private _generateColumnStyles(columnStyles: TableColumnStyleDefinition<T>[] | undefined) {
        const tableColumnStyles: TableColumnStyle<T>[] = [];
        if (columnStyles) {
            for (const columnStyle of columnStyles) if (columnStyle) {
                tableColumnStyles.push(new TableColumnStyle<T>(this, columnStyle));
            }
        }
        return tableColumnStyles;
    }

    private _generateRowStyles(tableStyle: Style, rowStyles: ("*" | TableRowStyleDefinition<T>)[] | "*" | undefined) {
        const tableRowStyles: TableRowStyle<T>[] = [];
        if (rowStyles && typeof rowStyles !== "string") {
            let hasAddedDefaults = false;
            for (const rowStyle of rowStyles) {
                hasAddedDefaults = this._generateRowStyle(tableRowStyles, tableStyle, rowStyle, hasAddedDefaults);
            }
        }
        else {
            this._generateRowStyle(tableRowStyles, tableStyle, "*", false);
        }

        return tableRowStyles;
    }

    private _generateRowStyle(tableRowStyles: TableRowStyle<T>[], tableStyle: Style, rowStyle: "*" | TableRowStyleDefinition<T>, hasAddedDefaults: boolean) {
        if (typeof rowStyle === "string") {
            if (rowStyle === "*") {
                if (!hasAddedDefaults) {
                    const border = tableStyle.border;
                    const top = border.horizontal === "inherit" ? border.top : border.horizontal;
                    const bottom = border.horizontal === "inherit" ? border.bottom : border.horizontal;
                    tableRowStyles.push(new TableRowStyle<T>(this, { className: "header", border: { top, bottom }}));
                    tableRowStyles.push(new TableRowStyle<T>(this, { className: "footer", border: { top, bottom }}));
                    hasAddedDefaults = true;
                }
            }
            else {
                throw new Error("Invalid row style.");
            }
        }
        else {
            tableRowStyles.push(new TableRowStyle<T>(this, rowStyle));
        }
        return hasAddedDefaults;
    }

    private _generateCellStyles(cellStyles: TableCellStyleDefinition<T>[] | undefined) {
        const tableCellStyles: TableCellStyle<T>[] = [];
        if (cellStyles) {
            for (const cellStyle of cellStyles) if (cellStyle) {
                tableCellStyles.push(new TableCellStyle<T>(this, cellStyle));
            }
        }
        return tableCellStyles;
    }

    public render(itemsSource: Iterable<T>, out?: NodeJS.WritableStream): string {
        const viewportWidth = out && tty.isatty(out) ? out.columns - 2 : (this.width || 75);
        this._viewportWidth = this.width === undefined ? viewportWidth : Math.min(this.width, viewportWidth);
        this._rowGroups = undefined;
        this._rows = undefined;
        this._currentStyle = undefined;
        this._maxGroupDepth = undefined;
        this._groupLabelAvailableWidth = -1;
        this._groupLabelMinWidth = -1;
        const eagerItemsSource = Array.from(itemsSource);

        let hasColumnHeaders = this._hasColumnHeaders;
        let tableColumns = this.columns;
        if (tableColumns.length === 0) {
            ({ tableColumns, hasColumnHeaders } = this._autoGenerateColumns(eagerItemsSource));
        }

        this._columns = tableColumns;
        this._initializeColumnWidths();
        this._generateRows(eagerItemsSource, hasColumnHeaders, this._hasColumnFooters);
        this._applyStyles();
        this._computeColumnWidths(0);
        if (this._groupLabelAvailableWidth < this._groupLabelMinWidth) {
            this._computeColumnWidths(this._groupLabelMinWidth - this._groupLabelAvailableWidth);
        }

        this._measureRows();
        this._arrangeRows();
        return this._renderRows(out);
    }

    private _autoGenerateColumns(itemsSource: Iterable<T>) {
        const names = new Set<string>();
        for (const element of itemsSource) {
            if (typeof element === "object" && element !== null) {
                for (const name of Object.getOwnPropertyNames(element)) {
                    const value = element[name];
                    if (value !== null) {
                        switch (typeof value) {
                            case "number":
                            case "string":
                            case "boolean":
                            case "object":
                                names.add(name);
                                break;
                        }
                    }
                }
            }
        }

        const autoGeneratedColumns: TableColumnDefinition<T>[] = [];
        for (const name of names) {
            autoGeneratedColumns.push({
                header: name,
                key: name,
                expression: x => Reflect.get(x, name)
            });
        }
        if (autoGeneratedColumns.length === 0) {
            autoGeneratedColumns.push({
                expression: x => x
            });
        }
        return this._generateColumns(autoGeneratedColumns);
    }

    private _getCell(rowIndex: number, columnIndex: number) {
        if (this._rows === undefined || this._columns === undefined) return undefined;
        if (rowIndex < 0 || rowIndex >= this._rows.length) return undefined;
        if (columnIndex < 0 || columnIndex >= this._columns.length) return undefined;
        const cells = this._rows[rowIndex].cells;
        const numCells = cells.length;

        let columnOffset = 0;
        for (let cellIndex = 0; cellIndex < numCells; cellIndex++) {
            const cell = cells[cellIndex];
            if (columnIndex >= columnOffset && columnIndex < columnOffset + cell.columnSpan) {
                return cell;
            }

            columnOffset += cell.columnSpan;
        }

        return undefined;
    }

    private _initializeColumnWidths() {
        if (!this._columns) return;
        for (const column of this._columns) {
            column._desiredWidth = -1;
            column._actualWidth = -1;
            column._minWidth = column.minWidth;
            column._maxWidth = column.maxWidth;
            column._additionalWidthForGroupLabel = 0;
            if (column.width.isFixed) {
                column._desiredWidth = column.width.value;
            }
        }
    }

    private _generateRows(itemsSource: Iterable<T>, hasColumnHeaders: boolean, hasColumnFooters: boolean) {
        if (this._columns === undefined) return;
        const rowGroups: TableRowGroup<T>[] = [];
        const rows: TableRow<T>[] = [];
        // generate header
        if (hasColumnHeaders) {
            const cells: TableCell<T>[] = [];
            const rowClassNames: TableRowClassName[] = ["header"];
            const row = new TableRow<T>(this, /*group*/ undefined, rowClassNames, cells, /*dataItem*/ undefined);
            rows.push(row);
            for (const column of this._columns) {
                const cell = new TableCell<T>(this, /*group*/ undefined, row, column, /*columnSpan*/ 1, [...rowClassNames, ...column.classNames], column.header || "");
                cells.push(cell);
            }
        }

        this._generateGroup(rowGroups, /*parentGroup*/ undefined, /*parentRowGroupChildren*/ undefined, /*parentGroupRows*/ undefined, /*groupDepth*/ 0, rows, itemsSource);

        // generate footer
        if (hasColumnFooters) {
            const cells: TableCell<T>[] = [];
            const rowClassNames: TableRowClassName[] = ["footer"];
            const row = new TableRow<T>(this, /*group*/ undefined, rowClassNames, cells, /*dataItem*/ undefined);
            rows.push(row);
            for (const column of this._columns) {
                const cell = new TableCell<T>(this, /*group*/ undefined, row, column, /*columnSpan*/ 1, [...rowClassNames, ...column.classNames], column.footer || "");
                cells.push(cell);
            }
        }

        this._rows = rows;
        this._rowGroups = rowGroups;
    }

    private _generateGroup(rowGroups: TableRowGroup<T>[], parentRowGroup: TableRowGroup<T> | undefined, parentRowGroupChildren: TableRowGroup<T>[] | undefined, parentRowGroupRows: TableRow<T>[] | undefined, groupDepth: number, rows: TableRow<T>[], itemsSource: Iterable<T>) {
        if (this._columns === undefined) return;
        if (groupDepth < this.groups.length) {
            if (this._maxGroupDepth === undefined || this._maxGroupDepth < groupDepth) {
                this._maxGroupDepth = groupDepth;
            }

            const group = this.groups[groupDepth];
            for (const itemsGroup of from(itemsSource).groupBy(x => group.getKey(x))) {
                const rowGroupRows: TableRow<T>[] = [];
                const rowGroupChildren: TableRowGroup<T>[] = [];
                const rowGroup = new TableRowGroup<T>(this, group, parentRowGroup, rowGroupChildren, itemsGroup.key, rowGroupRows);
                rowGroups.push(rowGroup);
                if (parentRowGroupChildren) {
                    parentRowGroupChildren.push(rowGroup);
                }

                const header = group.getHeaderText(itemsGroup.key);
                if (header) {
                    const cells: TableCell<T>[] = [];
                    const rowClassNames: TableRowClassName[] = ["group", "header"]
                    const row = new TableRow<T>(this, rowGroup, rowClassNames, cells, /*dataItem*/ undefined);
                    rows.push(row);
                    rowGroupRows.push(row);
                    const cell = new TableCell<T>(this, rowGroup, row, /*column*/ undefined, this._columns.length, rowClassNames as TableCellClassName[], header);
                    cells.push(cell);
                }

                this._generateGroup(rowGroups, rowGroup, rowGroupChildren, rowGroupRows, groupDepth + 1, rows, itemsGroup);

                const footer = group.getFooterText(itemsGroup.key);
                if (footer) {
                    const cells: TableCell<T>[] = [];
                    const rowClassNames: TableRowClassName[] = ["group", "footer"];
                    const row = new TableRow<T>(this, rowGroup, rowClassNames, cells, /*dataItem*/ undefined);
                    rows.push(row);
                    rowGroupRows.push(row);
                    const cell = new TableCell<T>(this, rowGroup, row, /*column*/ undefined, this._columns.length, rowClassNames as TableCellClassName[], footer);
                    cells.push(cell);
                }
            }
        }
        else {
            const items = Array.from(itemsSource);
            const numRecords = items.length;
            for (let i = 0; i < numRecords; i++) {
                const dataItem = items[i];
                const rowClassNames: TableRowClassName[] = [];
                if (groupDepth > 0) rowClassNames.push("group");
                rowClassNames.push("body");
                if (i === 0) rowClassNames.push("first-row");
                if (i === numRecords - 1) rowClassNames.push("last-row");
                rowClassNames.push(i % 2 ? "even-row" : "odd-row");
                const cells: TableCell<T>[] = [];
                const row = new TableRow<T>(this, parentRowGroup, rowClassNames, cells, dataItem);
                rows.push(row);
                if (parentRowGroupRows) {
                    parentRowGroupRows.push(row);
                }
                for (const column of this._columns) {
                    const text = column.getText(dataItem);
                    const cell = new TableCell<T>(this, parentRowGroup, row, column, /*columnSpan*/ 1, [...rowClassNames, ...column.classNames], text);
                    cells.push(cell);
                }
            }
        }
    }

    private _applyStyles() {
        const rowGroups = this._rowGroups;
        const rows = this._rows;
        const columns = this._columns;

        // apply self styles
        if (rowGroups) for (const rowGroup of rowGroups) rowGroup._actualStyle = this._matchGroupStyle(rowGroup);
        if (rows) for (const row of rows) if (row) row._actualStyle = this._matchRowStyle(row);
        if (columns) for (const column of columns) column._actualStyle = this._matchColumnStyle(column);

        const numRows = rows ? rows.length : 0;
        const numColumns = columns ? columns.length : 0;
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            let columnSpan: number;
            for (let columnIndex = 0; columnIndex < numColumns; columnIndex += columnSpan) {
                columnSpan = this._applyCellStyle(rowIndex, columnIndex);
            }
        }

        // merge styles with neighbors
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            let columnSpan: number;
            for (let columnIndex = 0; columnIndex < numColumns; columnIndex += columnSpan) {
                columnSpan = this._mergeCellStyles(rowIndex, columnIndex);
            }
        }
    }

    private _matchGroupStyle(rowGroup: TableRowGroup<T>) {
        interface Match {
            groupStyle: TableGroupStyle<T>;
            count: number;
            index: number;
        }

        const { key, group, depth, parent } = rowGroup;
        const possibleMatches = new Set<Match>(this.groupStyles.map((groupStyle, index) => ({ groupStyle, count: 0, index })));
        for (const match of Array.from(possibleMatches)) {
            const groupStyle = match.groupStyle;
            if (groupStyle.depth === depth) {
                if (groupStyle.canMatchKey) {
                    if (groupStyle.isMatch(key, rowGroup.group)) {
                        match.count++;
                    }
                    else {
                        possibleMatches.delete(match);
                        continue;
                    }
                }
                match.count++;
            }
            if (groupStyle.depth <= depth) {
                match.count++;
            }
            else if (!parent) {
                possibleMatches.delete(match);
                continue;
            }
        }

        const baseStyle = parent && parent._actualStyle || Style.inherit;
        return from(possibleMatches)
            .orderBy(x => x.count)
            .thenBy(x => x.index)
            .reduce((style, x) => x.groupStyle.style.inherit(style), baseStyle);
    }

    private _matchColumnStyle(column: TableColumn<T>) {
        interface Match {
            columnStyle: TableColumnStyle<T>;
            count: number;
            index: number;
        }

        const classNames = column._classNames;
        const key = column.key;
        const possibleMatches = new Set<Match>(this.columnStyles.map((columnStyle, index) => ({ count: 0, columnStyle, index })));

        // Proceess initial restrictions based on matching the key.
        for (const match of Array.from(possibleMatches)) if (match) {
            const columnStyle = match.columnStyle;
            for (const section of columnStyle.classNames) {
                if (classNames.has(section)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }

            if (columnStyle.key !== undefined) {
                if (columnStyle.key === key) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }

            if (columnStyle.canMatch) {
                if (columnStyle.isMatch(key, column)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }
        }

        return from(possibleMatches)
            .orderBy(x => x.count)
            .thenBy(x => x.index)
            .reduce((style, x) => x.columnStyle.style.inherit(style), column.style);
    }

    private _matchRowStyle(row: TableRow<T>) {
        interface Match {
            rowStyle: TableRowStyle<T>;
            count: number;
            index: number;
        }

        const classNames = row._classNames;
        const dataItem = row.dataItem;
        const possibleMatches = new Set<Match>(this.rowStyles.map((rowStyle, index) => ({ count: 0, rowStyle, index })));
        for (const match of Array.from(possibleMatches) as Iterable<Match>) {
            const rowStyle = match.rowStyle;
            for (const section of rowStyle.classNames) {
                if (classNames.has(section)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }

            if (rowStyle.canMatch) {
                if (rowStyle.isMatch(dataItem, row)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }
        }

        return from(possibleMatches)
            .orderBy(x => x.count)
            .thenBy(x => x.index)
            .reduce((style, x) => x.rowStyle.style.inherit(style), Style.inherit);
    }

    private _matchCellStyle(cell: TableCell<T>) {
        interface Match {
            cellStyle: TableCellStyle<T>;
            count: number;
            index: number;
        }

        const classNames = cell._classNames;
        const column = cell.column;
        const columnKey = column ? column.key : undefined;
        const dataItem = cell.row.dataItem;
        const possibleMatches = new Set<Match>(this.cellStyles.map((cellStyle, index) => ({ count: 0, cellStyle, index })));
        for (const match of Array.from(possibleMatches) as Iterable<Match>) {
            const cellStyle = match.cellStyle;
            for (const className of cellStyle.classNames) {
                if (classNames.has(className)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }

            if (cellStyle.key !== undefined) {
                if (cellStyle.key === columnKey) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }

            if (cellStyle.canMatch) {
                if (cellStyle.isMatch(dataItem, columnKey, cell)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }
        }

        return from(possibleMatches)
            .orderBy(x => x.count)
            .thenBy(x => x.index)
            .reduce((style, x) => x.cellStyle.style.inherit(style), Style.inherit);
    }

    private _applyCellStyle(rowIndex: number, columnIndex: number) {
        const cell = this._getCell(rowIndex, columnIndex)!;
        const { group, row, column } = cell;
        const cellStyle = this._matchCellStyle(cell);
        let style = this._getInitialCellStyle(rowIndex, columnIndex);
        if (group && group._actualStyle) style = group._actualStyle.inherit(style);
        if (row && row._actualStyle) style = row._actualStyle.inherit(style);
        if (column && column._actualStyle) style = column._actualStyle.inherit(style);
        if (cellStyle) style = cellStyle.inherit(style);
        cell._actualStyle = style.asCellStyle();
        return cell.columnSpan;
    }

    private _mergeCellStyles(rowIndex: number, columnIndex: number) {
        const cell = this._getCell(rowIndex, columnIndex)!;
        const columnSpan = cell.columnSpan;
        if (cell._actualStyle) {
            const aboveLeft = this._getCell(rowIndex - 1, columnIndex);
            const aboveLeftBorder = aboveLeft && aboveLeft._actualStyle && aboveLeft._actualStyle.border;
            const aboveRight = this._getCell(rowIndex - 1, columnIndex + columnSpan - 1);
            const aboveRightBorder = aboveRight && aboveRight._actualStyle && aboveRight._actualStyle.border;
            const leftTop = this._getCell(rowIndex, columnIndex - 1);
            const leftTopBorder = leftTop && leftTop._actualStyle && leftTop._actualStyle.border;
            const leftBottom = this._getCell(rowIndex + cell.rowSpan - 1, columnIndex - 1);
            const leftBottomBorder = leftBottom && leftBottom._actualStyle && leftBottom._actualStyle.border;

            let border = cell._actualStyle.border;
            border = border.adjustToAbove(aboveLeftBorder, aboveRightBorder);
            border = border.adjustToLeft(leftTopBorder, leftBottomBorder);
            cell._actualStyle = cell._actualStyle.updateFrom({ border });
        }

        return columnSpan;
    }

    private _computeColumnWidths(groupLabelAdditionalWidth: number) {
        const columns = this._columns;
        if (!columns) return;

        const numColumns = columns.length;
        const padding = this.padding;
        let availableWidth = this._viewportWidth
            - (numColumns + 1)
            - (padding * numColumns * 2)
            - (this._maxGroupDepth || 0);

        // calculate min/max widths and stars
        const pendingColumns: TableColumn<T>[] = [];
        const columnsNeedingMoreSpace: TableColumn<T>[] = [];
        let totalStars = 0;
        let minWidth = 0;
        let maxWidth = 0;
        let starMinWidth = 0;
        let starMaxWidth = 0;
        for (const column of columns) {
            minWidth = addInt32(minWidth, column._minWidth);
            maxWidth = addInt32(maxWidth, column._maxWidth);
            if (column.width.isStar) {
                starMinWidth = addInt32(starMinWidth, column._minWidth);
                starMaxWidth = addInt32(starMaxWidth, column._maxWidth);
                totalStars += column.width.value;
                pendingColumns.push(column);
            }
        }

        if (groupLabelAdditionalWidth > 0) {
            if (totalStars > 0) {
                const groupLabelAdditionalWidthPerStar = Math.floor(groupLabelAdditionalWidth / totalStars);
                let groupLabelAdditionalWidthForStar = groupLabelAdditionalWidthPerStar + Math.ceil(groupLabelAdditionalWidth % totalStars);
                for (let i = pendingColumns.length - 1; i >= 0; i--) {
                    const column = pendingColumns[i];
                    column._minWidth = addInt32(column._minWidth, groupLabelAdditionalWidthForStar);
                    column._maxWidth = addInt32(column._maxWidth, groupLabelAdditionalWidthForStar);
                    column._additionalWidthForGroupLabel = groupLabelAdditionalWidthForStar;
                    groupLabelAdditionalWidthForStar = groupLabelAdditionalWidthPerStar;
                }

                starMinWidth = addInt32(starMinWidth, groupLabelAdditionalWidth);
                starMaxWidth = addInt32(starMaxWidth, groupLabelAdditionalWidth);
            }
            else {
                console.log(groupLabelAdditionalWidth);
                const groupLabelAdditionalWidthPerColumn = Math.floor(groupLabelAdditionalWidth / numColumns);
                console.log(groupLabelAdditionalWidthPerColumn);
                let groupLabelAdditionalWidthForColumn = groupLabelAdditionalWidthPerColumn + Math.ceil(groupLabelAdditionalWidth % numColumns);
                for (let i = numColumns - 1; i >= 0; i--) {
                    const column = columns[i];
                    column._minWidth = addInt32(column._minWidth, groupLabelAdditionalWidthForColumn);
                    column._maxWidth = addInt32(column._maxWidth, groupLabelAdditionalWidthForColumn);
                    column._additionalWidthForGroupLabel = groupLabelAdditionalWidthForColumn;
                    groupLabelAdditionalWidthForColumn = groupLabelAdditionalWidthPerColumn;
                }
            }

            minWidth = addInt32(minWidth, groupLabelAdditionalWidth);
            maxWidth = addInt32(maxWidth, groupLabelAdditionalWidth);
        }

        availableWidth = minMax(availableWidth, minWidth, maxWidth);
        availableWidth -= starMinWidth;

        // give each non-star column its desired width
        for (const column of columns) {
            if (!column.width.isStar) {
                const displayWidth = minMax(column._desiredWidth + column._additionalWidthForGroupLabel, column._minWidth, column._maxWidth);
                availableWidth -= displayWidth;
                column._actualWidth = displayWidth;
            }
        }

        availableWidth += starMinWidth;
        availableWidth = minMax(availableWidth, starMinWidth, starMaxWidth);

        // give each star column a portion of the remaining width
        while (pendingColumns.length > 0) {
            // process pending columns whose relative width is less than their minimum width
            for (let i = 0; i < pendingColumns.length; i++) {
                const column = pendingColumns[i];
                const width = column.width;
                const minWidth = column._minWidth;
                const relativeWidth = Math.min(Math.floor(availableWidth * width.value / totalStars), maxInt32);
                if (minWidth > relativeWidth) {
                    availableWidth = Math.max(availableWidth - minWidth, 0);
                    totalStars -= width.value;
                    pendingColumns.splice(i, 1);
                    columnsNeedingMoreSpace.push(column);
                    i--;
                }
            }

            // process columns whose relative width is greater than their max width, until we find excess space.
            let hasExcessSpace = false;
            for (let i = 0; i < pendingColumns.length; i++) {
                const column = pendingColumns[i];
                const width = column.width;
                const maxWidth = column._maxWidth;
                const relativeWidth = Math.min(Math.floor(availableWidth * width.value / totalStars), maxInt32);
                if (maxWidth < relativeWidth) {
                    hasExcessSpace = true;
                    pendingColumns.splice(i, 1);
                    availableWidth -= maxWidth;
                    totalStars -= width.value;
                    break;
                }
            }

            if (hasExcessSpace) {
                // restore columns that need more space
                for (let i = 0; i < columnsNeedingMoreSpace.length; i++) {
                    const column = columnsNeedingMoreSpace[i];
                    const width = column.width;
                    pendingColumns.push(column);
                    availableWidth += column._minWidth;
                    totalStars += width.value;
                }
                columnsNeedingMoreSpace.length = 0;
            }
            else {
                // adjust columns needing more space to their minimum width
                for (let i = 0; i < columnsNeedingMoreSpace.length; i++) {
                    const column = columnsNeedingMoreSpace[i];
                    const width = column.width;
                    const minWidth = column._minWidth;
                    column._desiredWidth = addInt32(Math.floor(availableWidth * width.value), column._additionalWidthForGroupLabel);
                    column._actualWidth = minWidth;
                }
                columnsNeedingMoreSpace.length = 0;

                // adjust columns with enough space
                for (let i = 0; i < pendingColumns.length; i++) {
                    const column = pendingColumns[i];
                    const width = column.width;
                    const relativeWidth = Math.min(Math.floor(availableWidth * width.value / totalStars), maxInt32);
                    column._desiredWidth = addInt32(Math.floor(availableWidth * width.value), column._additionalWidthForGroupLabel);
                    column._actualWidth = addInt32(relativeWidth, column._additionalWidthForGroupLabel);
                }
                pendingColumns.length = 0;
            }
        }

        let totalWidth = 1;
        for (const column of columns) {
            totalWidth += padding * 2 + column._actualWidth + 1;
        }

        this._groupLabelAvailableWidth = totalWidth - (padding * 2) - 2;
    }

    private _measureRows() {
        if (!this._rows) return;
        for (const row of this._rows) {
            row._actualHeight = 0;
            for (const cell of row.cells) {
                this._measureCell(cell);
                if (row._actualHeight < cell._actualHeight) {
                    row._actualHeight = cell._actualHeight;
                }
            }
        }
    }

    private _measureCell(cell: TableCell<T>) {
        const column = cell.column;
        if (column) {
            cell._actualWidth = column._actualWidth;
        }
        else if (this._groupLabelAvailableWidth) {
            cell._actualWidth = this._groupLabelAvailableWidth;
        }

        const { height } = measureText(cell.text, cell._actualWidth);
        cell._actualHeight = height;
    }

    private _arrangeRows() {
        if (!this._rows) return;
        for (const row of this._rows) {
            for (const cell of row.cells) {
                this._arrangeCell(cell, row._actualHeight);
            }
        }
    }

    private _arrangeCell(cell: TableCell<T>, height: number) {
        const style = cell._actualStyle;
        cell._lines = fit(cell.text, height, cell._actualWidth, style ? style.align : "left", style ? style.verticalAlign : "top");
    }

    private _renderRows(out: NodeJS.WritableStream | undefined) {
        const useColor = this.useColor === undefined ? out && tty.isatty(out) : this.useColor;
        const writer = useColor ? new ColorStringWriter() : new StringWriter();
        const rows = this._rows;
        const numRows = rows ? rows.length : 0;
        const previousStyle = this._useColors(writer, this.style);
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            // render top border
            this._renderRowBorder(writer, rowIndex);

            // render row
            this._renderRow(writer, rowIndex, numRows);
        }

        // render bottom border
        this._renderRowBorder(writer, numRows);
        this._restoreColors(writer, previousStyle);
        const text = writer.toString();
        if (out) {
            out.write(text, "utf8");
        }

        return text;
    }

    private _renderRowBorder(writer: StringWriter, rowIndex: number) {
        const columns = this._columns;
        if (!columns) return;

        let hasHorizontalBorder = false;
        const numColumns = columns.length;
        for (let columnIndex = 0; columnIndex < numColumns; columnIndex++) {
            if (this._hasHorizontalLine(rowIndex, columnIndex)) {
                hasHorizontalBorder = true;
                break;
            }
        }

        if (hasHorizontalBorder) {
            for (let columnIndex = 0; columnIndex < numColumns; columnIndex++) {
                // render left line
                writer.append(this._getCorner(rowIndex, columnIndex));

                // render padding and cell
                const ch = this._getHorizontalLine(rowIndex, columnIndex);
                let size = this.padding * 2 + columns[columnIndex]._actualWidth;
                if (columnIndex === 0 && this._maxGroupDepth > 0) {
                    size += this._maxGroupDepth;
                }

                writer.append(repeat(ch, size));
            }

            // render right line
            writer.appendLine(this._getCorner(rowIndex, numColumns));
        }
    }

    private _renderRow(writer: StringWriter, rowIndex: number, numRows: number) {
        const rows = this._rows;
        const columns = this._columns;
        if (!rows || !columns) return;

        let columnSpan = 1;
        const row = rows[rowIndex];
        const numLines = row._actualHeight;
        const numColumns = columns.length;
        for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
            for (let columnIndex = 0; columnIndex < numColumns; columnIndex += columnSpan) {
                // render left border
                writer.append(this._getVerticalLine(rowIndex, columnIndex));

                // render cell
                columnSpan = this._renderCell(writer, rowIndex, columnIndex, lineIndex);
            }

            // render right border
            writer.appendLine(this._getVerticalLine(rowIndex, numColumns));
        }
    }

    private _renderCell(writer: StringWriter, rowIndex: number, columnIndex: number, lineIndex: number) {
        const cell = this._getCell(rowIndex, columnIndex);
        if (!cell || !cell._lines) return 1;

        const lines = cell._lines;
        const style = cell._actualStyle;
        const width = cell._actualWidth;
        const padding = this.padding;
        let leftPadding = padding;
        let rightPadding = padding;
        if (columnIndex === 0 && this._maxGroupDepth > 0) {
            const group = cell.group;
            if (group) {
                const depthPadding = group.depth;
                leftPadding += depthPadding;
                rightPadding += this._maxGroupDepth - depthPadding;
            }
            else {
                rightPadding += this._maxGroupDepth;
            }
        }

        // set foreground/background colors
        const previousStyle = this._useColors(writer, style);

        // render left padding
        writer.append(repeat(" ", leftPadding));

        // render contents
        writer.append(lines[lineIndex]);

        // render right padding
        writer.append(repeat(" ", rightPadding));

        // clear foreground/background colors
        this._restoreColors(writer, previousStyle);
        return Math.max(1, cell.columnSpan);
    }

    private _useColors(writer: StringWriter, style: Style | undefined) {
        if (writer instanceof ColorStringWriter && style) {
            const previousStyle = this._currentStyle;
            const newStyle = style.inherit(previousStyle);
            writer.foregroundColor = newStyle.foregroundColor;
            writer.backgroundColor = newStyle.backgroundColor;
            this._currentStyle = newStyle;
            return previousStyle;
        }
    }

    private _restoreColors(writer: StringWriter, previousStyle: Style | undefined) {
        if (writer instanceof ColorStringWriter) {
            writer.foregroundColor = previousStyle ? previousStyle.foregroundColor : "inherit";
            writer.backgroundColor = previousStyle ? previousStyle.backgroundColor : "inherit";
            this._currentStyle = previousStyle;
        }
    }

    private _getInitialCellStyle(rowIndex, columnIndex: number) {
        const above = this._getCell(rowIndex - 1, columnIndex);
        const below = this._getCell(rowIndex + 1, columnIndex);
        const left = this._getCell(rowIndex, columnIndex - 1);
        const right = this._getCell(rowIndex, columnIndex + 1);
        const border = this.style.border;
        return this.style.updateFrom({
            border: {
                top: above ? border.horizontal : border.top,
                bottom: below ? border.horizontal : border.bottom,
                left: left ? border.vertical : border.left,
                right: right ? border.vertical : border.right
            }
        });
    }

    private _getCorner(rowIndex: number, columnIndex: number) {
        const topLeft = this._getCell(rowIndex - 1, columnIndex - 1);
        const topRight = this._getCell(rowIndex - 1, columnIndex);
        const bottomLeft = this._getCell(rowIndex, columnIndex - 1);
        const bottomRight = this._getCell(rowIndex, columnIndex);

        let topLeftBorder = topLeft && topLeft._actualStyle && topLeft._actualStyle.border;
        let topRightBorder = topRight && topRight._actualStyle && topRight._actualStyle.border;
        let bottomLeftBorder = bottomLeft && bottomLeft._actualStyle && bottomLeft._actualStyle.border;
        let bottomRightBorder = bottomRight && bottomRight._actualStyle && bottomRight._actualStyle.border;

        if (topLeft === topRight && topLeftBorder && topRightBorder) {
            topLeftBorder = topLeftBorder.updateFrom({ right: "none" });
            topRightBorder = topRightBorder.updateFrom({ left: "none" });
        }

        if (bottomLeft === bottomRight && bottomLeftBorder && bottomRightBorder) {
            bottomLeftBorder = bottomLeftBorder.updateFrom({ right: "none" });
            bottomRightBorder = bottomRightBorder.updateFrom({ left: "none" });
        }

        if (topLeft === bottomLeft && topLeftBorder && bottomLeftBorder) {
            topLeftBorder = topLeftBorder.updateFrom({ bottom: "none" });
            bottomLeftBorder = bottomLeftBorder.updateFrom({ top: "none" });
        }

        if (topRight === bottomRight && topRightBorder && bottomRightBorder) {
            topRightBorder = topRightBorder.updateFrom({ bottom: "none" });
            bottomRightBorder = bottomRightBorder.updateFrom({ top: "none" });
        }

        return Border.getCorner(
            topLeftBorder,
            topRightBorder,
            bottomLeftBorder,
            bottomRightBorder);
    }

    private _hasHorizontalLine(rowIndex: number, columnIndex: number) {
        const top = this._getCell(rowIndex - 1, columnIndex);
        const bottom = this._getCell(rowIndex, columnIndex);

        let topBorder = top && top._actualStyle && top._actualStyle.border;
        let bottomBorder = bottom && bottom._actualStyle && bottom._actualStyle.border;

        if (top === bottom && topBorder && bottomBorder) {
            topBorder = topBorder.updateFrom({ bottom: "none" });
            bottomBorder = bottomBorder.updateFrom({ top: "none" });
        }

        return Border.hasHorizontalLine(
            topBorder,
            bottomBorder);
    }

    private _getHorizontalLine(rowIndex: number, columnIndex: number) {
        const top = this._getCell(rowIndex - 1, columnIndex);
        const bottom = this._getCell(rowIndex, columnIndex);

        let topBorder = top && top._actualStyle && top._actualStyle.border;
        let bottomBorder = bottom && bottom._actualStyle && bottom._actualStyle.border;

        if (top === bottom && topBorder && bottomBorder) {
            topBorder = topBorder.updateFrom({ bottom: "none" });
            bottomBorder = bottomBorder.updateFrom({ top: "none" });
        }

        return Border.getHorizontalLine(
            topBorder,
            bottomBorder);
    }

    private _getVerticalLine(rowIndex: number, columnIndex: number) {
        const left = this._getCell(rowIndex, columnIndex - 1);
        const right = this._getCell(rowIndex, columnIndex);

        let leftBorder = left && left._actualStyle && left._actualStyle.border;
        let rightBorder = right && right._actualStyle && right._actualStyle.border;

        if (left === right && leftBorder && rightBorder) {
            leftBorder = leftBorder.updateFrom({ right: "none" });
            rightBorder = rightBorder.updateFrom({ left: "none" });
        }

        return Border.getVerticalLine(
            leftBorder,
            rightBorder);
    }
}