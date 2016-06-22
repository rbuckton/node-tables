import { StyleDefinition } from "./types";
import { Border, BorderStyle, BorderDefinition } from "./border";
import { Color } from "./color";
import { HorizontalAlignment, VerticalAlignment } from "./text";

export { StyleDefinition } from "./types";

export class Style {
    static readonly default = new Style(Border.default, "left");
    static readonly inherit = new Style(Border.inherit, "inherit");

    readonly border: Border;
    readonly align: HorizontalAlignment;
    readonly verticalAlign: VerticalAlignment;
    readonly backgroundColor: Color;
    readonly foregroundColor: Color;

    constructor(border: BorderDefinition | string = "inherit", align: HorizontalAlignment = "inherit", verticalAlign: VerticalAlignment = "inherit", backgroundColor: Color = "inherit", foregroundColor: Color = "inherit") {
        this.border = Border.fromObject(border);
        this.align = align;
        this.verticalAlign = verticalAlign;
        this.backgroundColor = backgroundColor;
        this.foregroundColor = foregroundColor;
    }

    static fromObject(definition: StyleDefinition) {
        if (definition instanceof Style) {
            return definition;
        }

        const { border, align, verticalAlign, backgroundColor, foregroundColor } = definition;
        return new Style(border, align, verticalAlign, backgroundColor, foregroundColor);
    }

    updateWith(definition: StyleDefinition) {
        const { border = this.border, align = this.align, verticalAlign = this.verticalAlign, backgroundColor = this.backgroundColor, foregroundColor = this.foregroundColor } = definition;
        return this.update(Border.fromObject(border), align, verticalAlign, backgroundColor, foregroundColor);
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
        return this.inherit(Style.default);
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

