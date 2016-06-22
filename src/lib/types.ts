import { Size } from "./size";
import { TableColumnSection } from "./column";
import { TableRowSection } from "./row";

export interface ReadonlyCollection<T> extends ReadonlyArray<T>, Iterable<T> {
}

export type BorderStyle = "single" | "double" | "inherit" | "none";

export interface BorderDefinition {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
    horizontal?: BorderStyle;
    vertical?: BorderStyle;
}

export type Color = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" | "dark-gray" | "inherit"; // | "dark-red" | "dark-green" | "dark-yellow" | "dark-blue" | "dark-magenta" | "dark-cyan" | "dark-gray"

export type HorizontalAlignment = "left" | "right" | "center" | "inherit";

export type VerticalAlignment = "top" | "bottom" | "middle" | "inherit";

export interface StyleDefinition {
    border?: BorderDefinition | string;
    align?: HorizontalAlignment;
    verticalAlign?: VerticalAlignment;
    backgroundColor?: Color;
    foregroundColor?: Color;
}

export interface TableGroupDefinition<T> extends StyleDefinition {
    by: (x: T) => any;
    header?: string | ((key: any) => any);
    footer?: string | ((key: any) => any);
}

export interface TableGroupStyleDefinition extends StyleDefinition {
    match?: (key: any) => boolean;
    depth?: number;
}

export interface TableColumnDefinition<T> extends StyleDefinition {
    key?: any;
    header?: string;
    footer?: string;
    width?: number | string | "auto" | Size;
    maxWidth?: number;
    minWidth?: number;
    expression?: (x: T, key: any) => any;
}

export type TableColumnSection = "first" | "last";

export interface TableColumnStyleDefinition extends StyleDefinition {
    section?: TableColumnSection | TableColumnSection[];
    match?: (key: any) => boolean;
}

export type TableRowSection = "header" | "footer" | "group" | "body" | "first" | "last";

export interface TableRowStyleDefinition<T> extends StyleDefinition {
    section?: TableRowSection | TableRowSection[];
    match?: (dataItem: T) => boolean;
}

export interface TableDefinition<T> extends StyleDefinition {
    padding?: number;
    groups?: TableGroupDefinition<T>[];
    columns?: TableColumnDefinition<T>[];
    groupStyles?: TableGroupStyleDefinition[];
    columnStyles?: TableColumnStyleDefinition[];
    rowStyles?: TableRowStyleDefinition<T>[];
    width?: number;
    useColor?: boolean;
}

declare module "tty" {
    function isatty(out: NodeJS.WritableStream): out is WriteStream;
}