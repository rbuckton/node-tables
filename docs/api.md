# API
The following is a summary of the API exposed by `table-style`:

```ts
declare module "table-style" {
    // Borders

    type BorderStyle = "single" | "double" | "none" | "inherit";

    interface BorderDefinition {
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

    class Border {
        static readonly inherit: Border;
        static readonly single: Border;
        static readonly double: Border;
        static readonly none: Border;
        static readonly default: Border;
        readonly top: BorderStyle;
        readonly bottom: BorderStyle;
        readonly left: BorderStyle;
        readonly right: BorderStyle;
        readonly horizontal: BorderStyle;
        readonly vertical: BorderStyle;
        constructor();
        constructor(all: BorderStyle | undefined);
        constructor(horizontal: BorderStyle | undefined, vertical: BorderStyle | undefined);
        constructor(top: BorderStyle | undefined, vertical: BorderStyle | undefined, bottom: BorderStyle | undefined);
        constructor(top: BorderStyle | undefined, right: BorderStyle | undefined, bottom: BorderStyle | undefined, left: BorderStyle | undefined);
        constructor(top: BorderStyle | undefined, right: BorderStyle | undefined, bottom: BorderStyle | undefined, left: BorderStyle | undefined, inside: BorderStyle | undefined);
        constructor(top: BorderStyle | undefined, right: BorderStyle | undefined, bottom: BorderStyle | undefined, left: BorderStyle | undefined, horizontal: BorderStyle | undefined, vertical: BorderStyle | undefined);
        static parse(text: string): Border;
        static from(border: BorderDefinition | string): Border;
        static getCorner(topLeft: Border | undefined, topRight: Border | undefined, bottomLeft: Border | undefined, bottomRight: Border | undefined): string;
        static hasHorizontalLine(top: Border | undefined, bottom: Border | undefined): boolean;
        static getHorizontalLine(top: Border | undefined, bottom: Border | undefined): string;
        static hasVerticalLine(left: Border | undefined, right: Border | undefined): boolean;
        static getVerticalLine(left: Border | undefined, right: Border | undefined): string;
        updateFrom(definition: BorderDefinition): Border;
        update(top: BorderStyle, right: BorderStyle, bottom: BorderStyle, left: BorderStyle, horizontal: BorderStyle, vertical: BorderStyle): Border;
        inherit(border: Border | undefined): Border;
        asTableBorder(): Border;
        asGroupBorder(): Border;
        asRowBorder(): Border;
        asColumnBorder(): Border;
        asCellBorder(): Border;
        adjustToAbove(aboveLeft: Border | undefined, aboveRight: Border | undefined): Border;
        adjustToLeft(leftTop: Border | undefined, leftBottom: Border | undefined): Border;
        toString(): string;
        toJSON(): any;
    }

    // Colors
    type Color = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" | "dark-gray" | "inherit";

    // Alignment
    type HorizontalAlignment = "left" | "right" | "center" | "inherit";
    type VerticalAlignment = "top" | "bottom" | "middle" | "inherit";

    // Styles
    interface StyleDefinition {
        border?: BorderDefinition | string;
        align?: HorizontalAlignment;
        verticalAlign?: VerticalAlignment;
        backgroundColor?: Color;
        foregroundColor?: Color;
    }

    class Style {
        static readonly default: Style;
        static readonly inherit: Style;
        readonly border: Border;
        readonly align: HorizontalAlignment;
        readonly verticalAlign: VerticalAlignment;
        readonly backgroundColor: Color;
        readonly foregroundColor: Color;
        constructor(border?: BorderDefinition | string, align?: HorizontalAlignment, verticalAlign?: VerticalAlignment, backgroundColor?: Color, foregroundColor?: Color);
        static from(definition: StyleDefinition): Style;
        updateFrom(definition: StyleDefinition): Style;
        update(border: Border, align: HorizontalAlignment, verticalAlign: VerticalAlignment, backgroundColor: Color, foregroundColor: Color): Style;
        inherit(style: Style | undefined): Style;
        asTableStyle(): Style;
        asGroupStyle(): Style;
        asRowStyle(): Style;
        asColumnStyle(): Style;
        asCellStyle(): Style;
        toJSON(): any;
    }

    interface TableGroupStyleDefinition extends StyleDefinition {
        match?: (key: any) => boolean;
        depth?: number;
    }

    type TableColumnSection = "first" | "last";

    interface TableColumnStyleDefinition extends StyleDefinition {
        section?: TableColumnSection | TableColumnSection[];
        match?: (key: any) => boolean;
    }

    type TableRowSection = "header" | "footer" | "group" | "body" | "first" | "last";

    interface TableRowStyleDefinition<T> extends StyleDefinition {
        section?: TableRowSection | TableRowSection[];
        match?: (dataItem: T) => boolean;
    }

    // Tables
    interface TableGroupDefinition<T> extends StyleDefinition {
        by: (x: T) => any;
        header?: string | ((key: any) => any);
        footer?: string | ((key: any) => any);
    }

    interface TableColumnDefinition<T> extends StyleDefinition {
        key?: any;
        header?: string;
        footer?: string;
        width?: number | string | "auto" | Size;
        maxWidth?: number;
        minWidth?: number;
        expression?: (x: T, key: any) => any;
    }

    const enum SizeUnit {
        fixed = 0,
        auto = 1,
        star = 2,
    }

    class Size {
        readonly unit: SizeUnit;
        readonly value: number;
        readonly isFixed: boolean;
        readonly isAuto: boolean;
        readonly isStar: boolean;
        constructor(value: number, unit?: SizeUnit);
        static auto(): Size;
        static star(value: number): Size;
        static fixed(value: number): Size;
        static parse(value: number | string): Size;
        toString(extended?: boolean): string;
    }

    interface TableDefinition<T> extends StyleDefinition {
        padding?: number;
        groups?: TableGroupDefinition<T>[];
        columns?: TableColumnDefinition<T>[];
        groupStyles?: TableGroupStyleDefinition[];
        columnStyles?: TableColumnStyleDefinition[];
        rowStyles?: TableRowStyleDefinition<T>[];
        width?: number;
        useColor?: boolean;
    }

    class Table<T> {
        readonly style: Style;
        readonly padding: number;
        readonly groups: ReadonlyCollection<TableGroup<T>>;
        readonly columns: ReadonlyCollection<TableColumn<T>>;
        readonly groupStyles: ReadonlyCollection<TableGroupStyle<T>>;
        readonly columnStyles: ReadonlyCollection<TableColumnStyle<T>>;
        readonly rowStyles: ReadonlyCollection<TableRowStyle<T>>;
        readonly width: number | undefined;
        readonly useColor: boolean | undefined;
        constructor(definition: TableDefinition<T>);
        render(itemsSource: Iterable<T>, out?: NodeJS.WritableStream): string;
    }
}
```