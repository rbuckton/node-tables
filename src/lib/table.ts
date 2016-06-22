import * as tty from "tty";
import * as os from "os";
import { from } from "iterable-query";
import { ReadonlyCollection, TableDefinition, TableColumnSection, TableRowSection } from "./types";
import { Border } from "./border";
import { StringWriter } from "./writer";
import { Color, ColorStringWriter } from "./color";
import { Style } from "./style";
import { Size } from "./size";
import { TableGroup } from "./group";
import { TableColumn } from "./column";
import { TableRowGroup } from "./rowGroup";
import { TableRow } from "./row";
import { TableCell } from "./cell";
import { TableGroupStyle } from "./groupStyle";
import { TableColumnStyle } from "./columnStyle";
import { TableRowStyle } from "./rowStyle";
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
    readonly width: number | undefined;
    readonly useColor: boolean | undefined;

    private _hasColumnHeaders: boolean;
    private _hasColumnFooters: boolean;
    private _hasStarColumns: boolean;
    private _rowGroups: ReadonlyCollection<TableRowGroup<T>> | undefined;
    private _rows: ReadonlyCollection<TableRow<T>> | undefined;
    private _currentStyle: Style | undefined;
    private _viewportWidth: number | undefined;
    private _maxGroupDepth: number | undefined;
    private _groupHeaderWidth: number | undefined;

    constructor(definition: TableDefinition<T>) {
        const { padding = 1, groups, columns, groupStyles, columnStyles, rowStyles, width, useColor } = definition;
        const tablePadding = padding >> 0;
        const tableStyle = Style.fromObject(definition).asTableStyle();

        const tableGroups: TableGroup<T>[] = [];
        if (groups) {
            let depth = 0;
            for (const group of groups) if (group) {
                const tableGroup = new TableGroup(this, depth++, group);
                tableGroups.push(tableGroup);
            }
        }

        let hasStarColumns = false;
        let hasColumnHeaders = false;
        let hasColumnFooters = false;
        const tableColumns: TableColumn<T>[] = [];
        if (columns) {
            const numColumns = columns.length;
            for (let i = 0; i < numColumns; i++) {
                const column = columns[i];
                const sections: TableColumnSection[] = [];
                if (i === 0) sections.push("first");
                if (i === numColumns - 1) sections.push("last");
                const tableColumn = new TableColumn(this, i, sections, column);
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

        const tableGroupStyles: TableGroupStyle<T>[] = [];
        if (groupStyles) {
            for (const groupStyle of groupStyles) if (groupStyle) {
                tableGroupStyles.push(new TableGroupStyle<T>(this, groupStyle));
            }
        }

        const tableColumnStyles: TableColumnStyle<T>[] = [];
        if (columnStyles) {
            for (const columnStyle of columnStyles) if (columnStyle) {
                tableColumnStyles.push(new TableColumnStyle<T>(this, columnStyle));
            }
        }

        const tableRowStyles: TableRowStyle<T>[] = [];
        if (rowStyles) {
            for (const rowStyle of rowStyles) if (rowStyle) {
                tableRowStyles.push(new TableRowStyle<T>(this, rowStyle));
            }
        }

        this.style = tableStyle;
        this.padding = tablePadding;
        this.groups = tableGroups;
        this.columns = tableColumns;
        this.groupStyles = tableGroupStyles;
        this.columnStyles = tableColumnStyles;
        this.rowStyles = tableRowStyles;
        this.width = width;
        this.useColor = useColor;
        this._hasStarColumns = hasStarColumns;
        this._hasColumnHeaders = hasColumnHeaders;
        this._hasColumnFooters = hasColumnFooters;
    }

    public render(itemsSource: Iterable<T>, out?: NodeJS.WritableStream): string {
        const viewportWidth = out && tty.isatty(out) ? out.columns - 2 : (this.width || 75);
        this._viewportWidth = this.width === undefined ? viewportWidth : Math.min(this.width, viewportWidth);
        this._rowGroups = undefined;
        this._rows = undefined;
        this._currentStyle = undefined;
        this._maxGroupDepth = undefined;
        this._groupHeaderWidth = undefined;
        this._generateRows(itemsSource);
        this._applyStyles();
        this._computeColumnWidths();
        this._measureRows();
        this._arrangeRows();
        return this._renderRows(out);
    }

    private _getCell(rowIndex: number, columnIndex: number) {
        if (this._rows === undefined) return undefined;
        if (rowIndex < 0 || rowIndex >= this._rows.length) return undefined;
        if (columnIndex < 0 || columnIndex >= this.columns.length) return undefined;
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

    private _generateRows(itemsSource: Iterable<T>) {
        const rowGroups: TableRowGroup<T>[] = [];
        const rows: TableRow<T>[] = [];

        // generate header
        if (this._hasColumnHeaders) {
            const cells: TableCell<T>[] = [];
            const row = new TableRow<T>(this, /*group*/ undefined, ["header"] as TableRowSection[], cells, /*dataItem*/ undefined);
            rows.push(row);
            for (const column of this.columns) {
                const cell = new TableCell<T>(this, /*group*/ undefined, row, column, /*columnSpan*/ 1, column.header || "");
                cells.push(cell);
            }
        }

        this._generateGroup(rowGroups, /*parentGroup*/ undefined, /*parentRowGroupChildren*/ undefined, /*parentGroupRows*/ undefined, /*groupDepth*/ 0, rows, itemsSource);

        // generate footer
        if (this._hasColumnFooters) {
            const cells: TableCell<T>[] = [];
            const row = new TableRow<T>(this, /*group*/ undefined, ["footer"] as TableRowSection[], cells, /*dataItem*/ undefined);
            rows.push(row);
            for (const column of this.columns) {
                const cell = new TableCell<T>(this, /*group*/ undefined, row, column, /*columnSpan*/ 1, column.footer || "");
                cells.push(cell);
            }
        }

        this._rows = rows;
        this._rowGroups = rowGroups;
    }

    private _generateGroup(rowGroups: TableRowGroup<T>[], parentRowGroup: TableRowGroup<T> | undefined, parentRowGroupChildren: TableRowGroup<T>[] | undefined, parentRowGroupRows: TableRow<T>[] | undefined, groupDepth: number, rows: TableRow<T>[], itemsSource: Iterable<T>) {
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
                    const row = new TableRow<T>(this, rowGroup, ["group", "header"] as TableRowSection[], cells, /*dataItem*/ undefined);
                    rows.push(row);
                    rowGroupRows.push(row);
                    const cell = new TableCell<T>(this, rowGroup, row, /*column*/ undefined, this.columns.length, header);
                    cells.push(cell);
                }

                this._generateGroup(rowGroups, rowGroup, rowGroupChildren, rowGroupRows, groupDepth + 1, rows, itemsGroup);

                const footer = group.getFooterText(itemsGroup.key);
                if (footer) {
                    const cells: TableCell<T>[] = [];
                    const row = new TableRow<T>(this, rowGroup, ["group", "footer"] as TableRowSection[], cells, /*dataItem*/ undefined);
                    rows.push(row);
                    rowGroupRows.push(row);
                    const cell = new TableCell<T>(this, rowGroup, row, /*column*/ undefined, this.columns.length, footer);
                    cells.push(cell);
                }
            }
        }
        else {
            const items = Array.from(itemsSource);
            const numRecords = items.length;
            for (let i = 0; i < numRecords; i++) {
                const dataItem = items[i];
                const sections: TableRowSection[] = ["body"];
                if (groupDepth > 0) sections.unshift("group");
                if (i === 0) sections.push("first");
                if (i === numRecords - 1) sections.push("last");
                const cells: TableCell<T>[] = [];
                const row = new TableRow<T>(this, parentRowGroup, sections, cells, dataItem);
                rows.push(row);
                if (parentRowGroupRows) {
                    parentRowGroupRows.push(row);
                }

                for (const column of this.columns) {
                    const text = column.getText(dataItem);
                    const cell = new TableCell<T>(this, parentRowGroup, row, column, /*columnSpan*/ 1, text);
                    cells.push(cell);
                }
            }
        }
    }

    private _applyStyles() {
        const rowGroups = this._rowGroups;
        const rows = this._rows;
        const columns = this.columns;

        // apply self styles
        if (rowGroups) for (const rowGroup of rowGroups) rowGroup._actualStyle = this._matchGroupStyle(rowGroup);
        if (rows) for (const row of rows) if (row) row._actualStyle = this._matchRowStyle(row);
        for (const column of columns) column._actualStyle = this._matchColumnStyle(column);

        const numRows = rows ? rows.length : 0;
        const numColumns = columns.length;
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
        const { key, group, group: { depth } } = rowGroup;
        let bestMatch: TableGroupStyle<T> | undefined;
        for (const groupStyle of this.groupStyles) {
            if (groupStyle.canMatchKey) {
                if (groupStyle.depth === depth && groupStyle.isMatch(key)) {
                    bestMatch = groupStyle;
                    break;
                }
            }
            else if (groupStyle.depth === undefined) {
                if (bestMatch === undefined) {
                    bestMatch = groupStyle;
                }
            }
            else if (groupStyle.depth <= depth) {
                if (bestMatch === undefined || bestMatch.depth < groupStyle.depth) {
                    bestMatch = groupStyle;
                }
            }
        }
        return bestMatch ? bestMatch.style.inherit(group.style) : group.style;
    }

    private _matchRowStyle(row: TableRow<T>) {
        interface Match {
            rowStyle: TableRowStyle<T>;
            count: number;
        }

        const sections = new Set(row.sections);
        const dataItem = row.dataItem;
        const possibleMatches = new Set<Match>(this.rowStyles.map(rowStyle => ({ count: 0, rowStyle })));
        for (const match of Array.from(possibleMatches) as Iterable<Match>) {
            const rowStyle = match.rowStyle;
            if (dataItem !== undefined && rowStyle.canMatchDataItem) {
                if (rowStyle.isMatch(dataItem)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                    continue;
                }
            }

            for (const section of rowStyle.sections) {
                if (!sections.has(section)) {
                    possibleMatches.delete(match);
                }
                else {
                    match.count++;
                }
            }
        }

        let bestFit: Match | undefined;
        for (const possibleMatch of possibleMatches) if (possibleMatch) {
            if (bestFit === undefined || bestFit.count < possibleMatch.count) {
                bestFit = possibleMatch;
            }
        }

        return bestFit ? bestFit.rowStyle.style : Style.inherit;
    }

    private _matchColumnStyle(column: TableColumn<T>) {
        interface Match {
            columnStyle: TableColumnStyle<T>;
            count: number;
        }

        const sections = new Set(column.sections);
        const key = column.key;
        const possibleMatches = new Set<Match>(this.columnStyles.map(columnStyle => ({ count: 0, columnStyle })));

        // Proceess initial restrictions based on matching the key.
        for (const match of Array.from(possibleMatches)) if (match) {
            const columnStyle = match.columnStyle;
            if (key !== undefined && columnStyle.canMatchKey) {
                if (columnStyle.isMatch(column.key)) {
                    match.count++;
                }
                else {
                    possibleMatches.delete(match);
                }
            }

            for (const section of columnStyle.sections) {
                if (!sections.has(section)) {
                    possibleMatches.delete(match);
                }
                else {
                    match.count++;
                }
            }
        }

        let bestFit: Match | undefined;
        for (const possibleMatch of possibleMatches) if (possibleMatch) {
            if (bestFit === undefined || bestFit.count < possibleMatch.count) {
                bestFit = possibleMatch;
            }
        }

        return bestFit ? bestFit.columnStyle.style.inherit(column.style) : column.style;
    }

    private _applyCellStyle(rowIndex: number, columnIndex: number) {
        const cell = this._getCell(rowIndex, columnIndex)!;
        const { group, row, column } = cell;
        let style = this._getInitialCellStyle(rowIndex, columnIndex);
        if (group && group._actualStyle) style = group._actualStyle.inherit(style);
        if (row && row._actualStyle) style = row._actualStyle.inherit(style);
        if (column && column._actualStyle) style = column._actualStyle.inherit(style);
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
            cell._actualStyle = cell._actualStyle.updateWith({ border });
        }

        return columnSpan;
    }

    private _computeColumnWidths() {
        let availableWidth = this._viewportWidth
            - (this.columns.length + 1)
            - (this.padding * this.columns.length * 2)
            - (this._maxGroupDepth || 0);

        // calculate min/max widths and stars
        const pendingColumns: TableColumn<T>[] = [];
        const columnsNeedingMoreSpace: TableColumn<T>[] = [];
        let totalStars = 0;
        let minWidth = 0;
        let maxWidth = 0;
        let starMinWidth = 0;
        let starMaxWidth = 0;
        for (const column of this.columns) {
            minWidth = addInt32(minWidth, column.minWidth);
            maxWidth = addInt32(maxWidth, column.maxWidth);
            if (column.width.isStar) {
                starMinWidth = addInt32(starMinWidth, column.minWidth);
                starMaxWidth = addInt32(starMaxWidth, column.maxWidth);
                totalStars += column.width.value;
                pendingColumns.push(column);
            }
        }

        availableWidth = minMax(availableWidth, minWidth, maxWidth);
        availableWidth -= starMinWidth;

        // give each non-star column its desired width
        for (const column of this.columns) {
            if (!column.width.isStar) {
                const actualWidth = minMax(column._desiredWidth, column.minWidth, column.maxWidth);
                availableWidth -= actualWidth;
                column._actualWidth = actualWidth;
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
                const minWidth = column.minWidth;
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
                const maxWidth = column.maxWidth;
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
                    availableWidth += column.minWidth;
                    totalStars += width.value;
                }
                columnsNeedingMoreSpace.length = 0;
            }
            else {
                // adjust columns needing more space to their minimum width
                for (let i = 0; i < columnsNeedingMoreSpace.length; i++) {
                    const column = columnsNeedingMoreSpace[i];
                    const width = column.width;
                    const minWidth = column.minWidth;
                    column._desiredWidth = Math.floor(availableWidth * width.value);
                    column._actualWidth = minWidth;
                }
                columnsNeedingMoreSpace.length = 0;

                // adjust columns with enough space
                for (let i = 0; i < pendingColumns.length; i++) {
                    const column = pendingColumns[i];
                    const width = column.width;
                    const relativeWidth = Math.min(Math.floor(availableWidth * width.value / totalStars), maxInt32);
                    column._desiredWidth = Math.floor(availableWidth * width.value);
                    column._actualWidth = relativeWidth;
                }
                pendingColumns.length = 0;
            }
        }

        let totalWidth = 1;
        for (const column of this.columns) {
            totalWidth += this.padding * 2 + column._actualWidth + 1;
        }

        this._groupHeaderWidth = totalWidth - (this.padding * 2) - 2;
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
        else if (this._groupHeaderWidth) {
            cell._actualWidth = this._groupHeaderWidth;
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
        const numColumns = this.columns.length;

        let hasHorizontalBorder = false;
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
                let size = this.padding * 2 + this.columns[columnIndex]._actualWidth;
                if (columnIndex === 0 && this._maxGroupDepth) {
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
        if (!rows) return;

        let columnSpan = 1;
        const row = rows[rowIndex];
        const numLines = row._actualHeight;
        const numColumns = this.columns.length;
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
        let leftPadding = this.padding;
        let rightPadding = this.padding;
        if (columnIndex === 0 && this._maxGroupDepth) {
            const group = cell.group;
            if (group) {
                const depthPadding = group.depth + 1;
                leftPadding += depthPadding;
                rightPadding += this._maxGroupDepth - depthPadding;
                const row = cell.row;
                if (row.isInSection("group", "header")
                    || row.isInSection("group", "footer")) {
                    leftPadding--;
                    rightPadding++;
                }
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
        return this.style.updateWith({
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
            topLeftBorder = topLeftBorder.updateWith({ right: "none" });
            topRightBorder = topRightBorder.updateWith({ left: "none" });
        }

        if (bottomLeft === bottomRight && bottomLeftBorder && bottomRightBorder) {
            bottomLeftBorder = bottomLeftBorder.updateWith({ right: "none" });
            bottomRightBorder = bottomRightBorder.updateWith({ left: "none" });
        }

        if (topLeft === bottomLeft && topLeftBorder && bottomLeftBorder) {
            topLeftBorder = topLeftBorder.updateWith({ bottom: "none" });
            bottomLeftBorder = bottomLeftBorder.updateWith({ top: "none" });
        }

        if (topRight === bottomRight && topRightBorder && bottomRightBorder) {
            topRightBorder = topRightBorder.updateWith({ bottom: "none" });
            bottomRightBorder = bottomRightBorder.updateWith({ top: "none" });
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
            topBorder = topBorder.updateWith({ bottom: "none" });
            bottomBorder = bottomBorder.updateWith({ top: "none" });
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
            topBorder = topBorder.updateWith({ bottom: "none" });
            bottomBorder = bottomBorder.updateWith({ top: "none" });
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
            leftBorder = leftBorder.updateWith({ right: "none" });
            rightBorder = rightBorder.updateWith({ left: "none" });
        }

        return Border.getVerticalLine(
            leftBorder,
            rightBorder);
    }
}