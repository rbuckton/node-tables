import { StyleDefinition, ClassNamesDefinition } from "./types";
import { Border, BorderStyle, BorderDefinition } from "./border";
import { Color } from "./color";
import { HorizontalAlignment, VerticalAlignment } from "./text";

export { StyleDefinition, ClassNamesDefinition } from "./types";

export class Style {
    static readonly defaultTableStyle = new Style(Border.defaultTableBorder, "left");
    static readonly inherit = new Style(Border.inherit, "inherit");

    readonly border: Border;
    readonly align: HorizontalAlignment;
    readonly verticalAlign: VerticalAlignment;
    readonly backgroundColor: Color;
    readonly foregroundColor: Color;

    constructor(border: BorderDefinition | string = "inherit", align: HorizontalAlignment = "inherit", verticalAlign: VerticalAlignment = "inherit", backgroundColor: Color = "inherit", foregroundColor: Color = "inherit") {
        this.border = Border.from(border);
        this.align = align;
        this.verticalAlign = verticalAlign;
        this.backgroundColor = backgroundColor;
        this.foregroundColor = foregroundColor;
    }

    static from(definition: StyleDefinition) {
        if (definition instanceof Style) {
            return definition;
        }

        const { border, align, verticalAlign, backgroundColor, foregroundColor } = definition;
        return new Style(border, align, verticalAlign, backgroundColor, foregroundColor);
    }

    static equals(x: Style | undefined, y: Style | undefined) {
        return x === y || (x !== undefined && x.equalTo(y));
    }

    equalTo(other: Style | undefined) {
        return this === other
            || (other !== undefined
                && this.border.equalTo(other.border)
                && this.align === other.align
                && this.verticalAlign === other.verticalAlign
                && this.backgroundColor === other.backgroundColor
                && this.foregroundColor === other.foregroundColor);
    }

    updateFrom(definition: StyleDefinition) {
        const { border = this.border, align = this.align, verticalAlign = this.verticalAlign, backgroundColor = this.backgroundColor, foregroundColor = this.foregroundColor } = definition;
        return this.update(Border.from(border), align, verticalAlign, backgroundColor, foregroundColor);
    }

    update(border: Border, align: HorizontalAlignment, verticalAlign: VerticalAlignment, backgroundColor: Color, foregroundColor: Color) {
        if (this.border !== border || this.align !== align || this.verticalAlign !== verticalAlign || this.backgroundColor !== backgroundColor || this.foregroundColor !== foregroundColor) {
            return new Style(border, align, verticalAlign, backgroundColor, foregroundColor);
        }
        return this;
    }

    inherit(style: Style | undefined) {
        return style
            ? this.update(
                this.border.inherit(style.border),
                this.align === "inherit" ? style.align : this.align,
                this.verticalAlign === "inherit" ? style.verticalAlign : this.verticalAlign,
                this.backgroundColor === "inherit" ? style.backgroundColor : this.backgroundColor,
                this.foregroundColor === "inherit" ? style.foregroundColor : this.foregroundColor)
            : this;
    }

    asTableStyle() {
        return this.inherit(Style.defaultTableStyle);
    }

    asGroupStyle() {
        return this.update(
            this.border.asGroupBorder(),
            this.align,
            this.verticalAlign,
            this.backgroundColor,
            this.foregroundColor);
    }

    asRowStyle() {
        return this.update(
            this.border.asRowBorder(),
            this.align,
            this.verticalAlign,
            this.backgroundColor,
            this.foregroundColor);
    }

    asColumnStyle() {
        return this.update(
            this.border.asColumnBorder(),
            this.align,
            this.verticalAlign,
            this.backgroundColor,
            this.foregroundColor);
    }

    asCellStyle() {
        return this.update(
            this.border.asCellBorder(),
            this.align,
            this.verticalAlign,
            this.backgroundColor,
            this.foregroundColor);
    }

    toJSON() {
        let style: any;
        const border = this.border.toJSON();
        const { align, verticalAlign, foregroundColor, backgroundColor } = this;
        if (border) (style || (style = {})).border = border;
        if (align !== "inherit") (style || (style = {})).align = align;
        if (verticalAlign !== "inherit") (style || (style = {})).verticalAlign = verticalAlign;
        if (foregroundColor !== "inherit") (style || (style = {})).foregroundColor = foregroundColor;
        if (backgroundColor !== "inherit") (style || (style = {})).backgroundColor = backgroundColor;
        return style;
    }
}

export class ClassNames<T extends string> extends Set<T> {
    constructor(classNames?: Iterable<T>) {
        super(classNames as any);
    }

    addRange(range: Iterable<T>) {
        for (const className of range) {
            this.add(className);
        }

        return this;
    }

    deleteRange(range: Iterable<T>) {
        for (const className of range) {
            this.delete(className);
        }
    }

    equalsRange(range: Iterable<T>) {
        if (range === this) return true;

        let count = 0;
        for (const element of range) {
            if (!this.has(element)) return false;
            count++;
        }

        return this.size === count;
    }

    supersetOf(range: Iterable<T>) {
        for (const element of range) {
            if (!this.has(element)) {
                return false;
            }
        }
        return true;
    }

    subsetOf(range: Iterable<T>) {
        const set = new Set(range);
        for (const element of this) {
            if (!set.has(element)) {
                return false;
            }
        }
        return true;
    }

    union(range: Iterable<T>) {
        return this._create()
            .addRange(this)
            .addRange(range);
    }

    intersect(range: Iterable<T>) {
        const result = this._create();
        const set = new Set(range);
        for (const className of this) {
            if (set.delete(className)) {
                result.add(className);
            }
        }
        return result;
    }

    relativeComplement(range: Iterable<T>) {
        const result = this._create();
        for (const element of range) {
            if (!this.has(element)) {
                result.add(element);
            }
        }
        return result;
    }

    xor(range: Iterable<T>) {
        const result = this._create();
        const set = new Set(range);
        for (const className of this) {
            if (!set.delete(className)) {
                result.add(className);
            }
        }
        result.addRange(set);
        return result;
    }

    toArray() {
        return Array.from(this);
    }

    toJSON() {
        return this.toArray();
    }

    toString() {
        return Array.from(this).join(" ");
    }

    protected _create() {
        return new ClassNames<T>();
    }
}

export function parseClassNames<T extends string>(validate: (value: string) => value is T, text: string) {
    const classNames = new ClassNames<T>();
    for (const className of text.split(/\s+/g)) {
        if (!validate(className)) throw new Error("Invalid className.");
        classNames.add(<T>className);
    }

    return classNames;
}

export function fromClassNames<T extends string>(validate: (value: String) => value is T, definition: ClassNamesDefinition<T>) {
    const { className, classNames } = definition;
    const result = new ClassNames<T>(classNames);
    if (className) {
        result.addRange(parseClassNames(validate, className));
    }

    return result;
}

