import { Size } from "./size";
import { ClassNames } from "./style";
import { TableGroup } from "./group";
import { TableColumn } from "./column";
import { TableRow } from "./row";
import { TableCell } from "./cell";

export type BorderStyle = "single" | "double" | "inherit" | "none";
export type DarkColor = "dark-red" | "dark-green" | "dark-yellow" | "dark-blue" | "dark-magenta" | "dark-gray" | "dark-white";
export type BrightColor = "bright-red" | "bright-green" | "bright-yellow" | "bright-blue" | "bright-magenta" | "bright-gray" | "bright-white";
export type Color = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "gray" | "white" | DarkColor | BrightColor | "inherit";
export type HorizontalAlignment = "left" | "right" | "center" | "inherit";
export type VerticalAlignment = "top" | "bottom" | "middle" | "inherit";
export type TableColumnClassName = "first-column" | "last-column" | "even-column" | "odd-column";
export type TableRowClassName = "header" | "footer" | "group" | "body" | "first-row" | "last-row" | "even-row" | "odd-row";
export type TableCellClassName = TableRowClassName | TableColumnClassName;

export interface ReadonlyClassNames<T extends string> extends Iterable<T> {
    readonly size: number;
    has(className: T): boolean;
    equalsRange(range: Iterable<T>): boolean;
    supersetOf(range: Iterable<T>): boolean;
    subsetOf(range: Iterable<T>): boolean;
    union(range: Iterable<T>): ClassNames<T>;
    intersect(range: Iterable<T>): ClassNames<T>;
    relativeComplement(range: Iterable<T>): ClassNames<T>;
    xor(range: Iterable<T>): ClassNames<T>;
    toArray(): T[];
    toString(): string;
    values(): IterableIterator<T>;
    keys(): IterableIterator<T>;
    entries(): IterableIterator<[T, T]>;
}

export interface BorderDefinition {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
    horizontal?: BorderStyle; // horizontal lines between cells
    vertical?: BorderStyle; // vertical lines between cells
    all?: BorderStyle; // set all borders (override by setting individual values)
    outside?: BorderStyle; // set all outside borders (override by setting individual values)
    inside?: BorderStyle; // set all inside borders (override by setting individual values)
}

export interface StyleDefinition {
    border?: BorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface ClassNamesDefinition<TClassName extends string> {
    className?: string;
    classNames?: TClassName[];
}

export interface TableGroupBorderDefinition {
    top?: BorderStyle;
    bottom?: BorderStyle;
    horizontal?: BorderStyle; // horizontal lines between cells
    all?: BorderStyle; // set all borders (override by setting individual values)
    outside?: BorderStyle; // set all outside borders (override by setting individual values)
    inside?: BorderStyle; // set all inside borders (override by setting individual values)
}

export interface TableGroupDefinition<T> {
    by: (x: T) => any;
    header?: string | ((key: any) => any);
    footer?: string | ((key: any) => any);
    border?: TableGroupBorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface TableGroupStyleDefinition<T> {
    match?: (key: any, group: TableGroup<T>) => boolean;
    depth?: number;
    border?: BorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface TableColumnBorderDefinition {
    left?: BorderStyle;
    right?: BorderStyle;
    vertical?: BorderStyle; // vertical lines between cells
    all?: BorderStyle; // set all borders (override by setting individual values)
    outside?: BorderStyle; // set all outside borders (override by setting individual values)
    inside?: BorderStyle; // set all inside borders (override by setting individual values)
}

export interface TableColumnDefinition<T> {
    key?: any;
    header?: string;
    footer?: string;
    width?: number | string | "auto" | Size;
    maxWidth?: number;
    minWidth?: number;
    expression?: (x: T, key: any) => any;
    border?: TableColumnBorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
    visible?: boolean;
}

export interface TableColumnStyleDefinition<T> {
    className?: string;
    classNames?: TableColumnClassName[];
    key?: any;
    match?: (key: any, column: TableColumn<T>) => boolean;
    border?: TableColumnBorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface TableRowBorderDefinition {
    top?: BorderStyle;
    bottom?: BorderStyle;
    horizontal?: BorderStyle; // horizontal lines between cells
    all?: BorderStyle; // set all borders (override by setting individual values)
    outside?: BorderStyle; // set all outside borders (override by setting individual values)
    inside?: BorderStyle; // set all inside borders (override by setting individual values)
}

export interface TableRowStyleDefinition<T> {
    className?: string;
    classNames?: TableRowClassName[];
    match?: (dataItem: T, row: TableRow<T>) => boolean;
    border?: TableRowBorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface TableCellStyleDefinition<T> {
    className?: string;
    classNames?: TableCellClassName[];
    key?: any;
    match?: (dataItem: T, columnKey: any, cell: TableCell<T>) => boolean;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface TableDefinition<T> {
    padding?: number;
    width?: number;
    useColor?: boolean;
    group?: TableGroupDefinition<T>[];
    columns?: TableColumnDefinition<T>[];
    groupStyles?: TableGroupStyleDefinition<T>[];
    columnStyles?: TableColumnStyleDefinition<T>[];
    rowStyles?: ("*" | TableRowStyleDefinition<T>)[] | "*";
    cellStyles?: TableCellStyleDefinition<T>[];
    border?: BorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

declare module "tty" {
    function isatty(out: NodeJS.WritableStream): out is WriteStream;
}