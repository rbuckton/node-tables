import { BorderDefinition, BorderStyle } from "./types";

export { BorderDefinition, BorderStyle } from "./types";

export class Border {
    static readonly inherit = new Border("inherit");
    static readonly single = new Border("single");
    static readonly double = new Border("double");
    static readonly none = new Border("none");
    static readonly defaultTableBorder = Border.from({ outside: "single", vertical: "single" });

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
    constructor(top: BorderStyle = "inherit", right: BorderStyle = "inherit", bottom: BorderStyle = "inherit", left: BorderStyle = "inherit", horizontal: BorderStyle = "inherit", vertical: BorderStyle = "inherit") {
        switch (arguments.length) {
            case 1: // top+right+bottom+left+horizontal+vertical
                vertical = horizontal = left = bottom = right = top;
                break;
            case 2: // top+bottom+horizontal | left+right+vertical
                horizontal = bottom = top;
                vertical = left = right;
                break;
            case 3: // top | right+left+vertical | bottom
                vertical = left = right;
                horizontal = chooseSharedBorder(top, bottom);
                break;
            case 4: // top | right | bottom | left
                horizontal = chooseSharedBorder(top, bottom);
                vertical = chooseSharedBorder(right, left);
                break;
            case 5: // top | right | bottom | left | horizontal+vertical
                vertical = horizontal;
                break;
        }

        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left = left;
        this.horizontal = horizontal;
        this.vertical = vertical;
    }

    static parse(text: string) {
        const parts = text.split(/\s+/g).map(toBorderStyle);
        switch (parts.length) {
            case 1: return new Border(parts[0]);
            case 2: return new Border(parts[0], parts[1]);
            case 3: return new Border(parts[0], parts[1], parts[2]);
            case 4: return new Border(parts[0], parts[1], parts[2], parts[4]);
            case 5: return new Border(parts[0], parts[1], parts[2], parts[4], parts[5]);
            default: return new Border(parts[0], parts[1], parts[2], parts[4], parts[5], parts[6]);
        }
    }

    static from(border: BorderDefinition | string) {
        if (typeof border === "string") {
            return this.parse(border);
        }

        if (border instanceof this) {
            return border;
        }

        const { top, right, bottom, left, horizontal, vertical, all, outside, inside } = border;
        return new Border(
            top || outside || all || "inherit",
            right || outside || all || "inherit",
            bottom || outside || all || "inherit",
            left || outside || all || "inherit",
            horizontal || inside || all || "inherit",
            vertical || inside || all || "inherit"
        );
    }

    static getCorner(topLeft: Border | undefined, topRight: Border | undefined, bottomLeft: Border | undefined, bottomRight: Border | undefined) {
        const left = chooseSharedBorder(topLeft ? topLeft.bottom : "none", bottomLeft ? bottomLeft.top : "none");
        const right = chooseSharedBorder(topRight ? topRight.bottom : "none", bottomRight ? bottomRight.top : "none");
        const up = chooseSharedBorder(topLeft ? topLeft.right : "none", topRight ? topRight.left : "none");
        const down = chooseSharedBorder(bottomLeft ? bottomLeft.right : "none", bottomRight ? bottomRight.left : "none");
        return boxLineChars.charAt(getBoxLine(left, right, up, down));
    }

    static hasHorizontalLine(top: Border | undefined, bottom: Border | undefined) {
        const horizontal = chooseSharedBorder(top ? top.bottom : "none", bottom ? bottom.top : "none");
        return getBoxLine(horizontal, horizontal, "none", "none") > BoxLine.none;
    }

    static getHorizontalLine(top: Border | undefined, bottom: Border | undefined) {
        const horizontal = chooseSharedBorder(top ? top.bottom : "none", bottom ? bottom.top : "none");
        return boxLineChars.charAt(getBoxLine(horizontal, horizontal, "none", "none"));
    }

    static hasVerticalLine(left: Border | undefined, right: Border | undefined) {
        const vertical = chooseSharedBorder(left ? left.right : "none", right ? right.left : "none");
        return getBoxLine("none", "none", vertical, vertical) > BoxLine.none;
    }

    static getVerticalLine(left: Border | undefined, right: Border | undefined) {
        const vertical = chooseSharedBorder(left ? left.right : "none", right ? right.left : "none");
        return boxLineChars.charAt(getBoxLine("none", "none", vertical, vertical));
    }

    static equals(x: Border | undefined, y: Border | undefined) {
        return x === y || (x !== undefined && x.equalTo(y));
    }

    equalTo(other: Border | undefined) {
        return this === other
            || (other !== undefined
                && this.top === other.top
                && this.right === other.right
                && this.bottom === other.bottom
                && this.left === other.left
                && this.horizontal === other.horizontal
                && this.vertical === other.vertical);
    }

    updateFrom(definition: BorderDefinition) {
        const { top = this.top, right = this.right, bottom = this.bottom, left = this.left, horizontal = this.horizontal, vertical = this.vertical } = definition;
        return this.update(top, right, bottom, left, horizontal, vertical);
    }

    update(top: BorderStyle, right: BorderStyle, bottom: BorderStyle, left: BorderStyle, horizontal: BorderStyle, vertical: BorderStyle) {
        if (this.top !== top
            || this.right !== right
            || this.bottom !== bottom
            || this.left !== left
            || this.horizontal !== horizontal
            || this.vertical !== vertical) {
            return new Border(top, right, bottom, left, horizontal, vertical);
        }
        return this;
    }

    inherit(border: Border | undefined) {
        return border
            ? this.update(
                inheritBorderStyle(this.top, border.top),
                inheritBorderStyle(this.right, border.right),
                inheritBorderStyle(this.bottom, border.bottom),
                inheritBorderStyle(this.left, border.left),
                inheritBorderStyle(this.horizontal, border.horizontal),
                inheritBorderStyle(this.vertical, border.vertical))
            : this;
    }

    asTableBorder() {
        return this.inherit(Border.defaultTableBorder);
    }

    asGroupBorder() {
        return this.update(
            this.top,
            "inherit",
            this.bottom,
            "inherit",
            this.horizontal,
            "inherit"
        );
    }

    asRowBorder() {
        return this.update(
            this.top,
            "inherit",
            this.bottom,
            "inherit",
            this.horizontal,
            "inherit"
        );
    }

    asColumnBorder() {
        return this.update(
            "inherit",
            this.right,
            "inherit",
            this.left,
            "inherit",
            this.vertical
        );
    }

    asCellBorder() {
        return this.update(
            this.top,
            this.right,
            this.bottom,
            this.left,
            "inherit",
            "inherit"
        );
    }

    adjustToAbove(aboveLeft: Border | undefined, aboveRight: Border | undefined) {
        let border: Border = this;
        if (aboveLeft) {
            border = border.updateFrom({
                top: chooseSharedBorder(aboveLeft.bottom, this.top),
                left: chooseContiguousBorder(aboveLeft.left, this.left),
                vertical: chooseContiguousBorder(aboveLeft.vertical, this.vertical)
            });
        }
        if (aboveRight) {
            border = border.updateFrom({
                top: chooseSharedBorder(aboveRight.bottom, this.top),
                right: chooseContiguousBorder(aboveRight.right, this.right),
                vertical: chooseContiguousBorder(aboveRight.vertical, this.vertical)
            });
        }
        return border;
    }

    adjustToLeft(leftTop: Border | undefined, leftBottom: Border | undefined) {
        let border: Border = this;
        if (leftTop) {
            border = border.updateFrom({
                top: chooseContiguousBorder(leftTop.top, this.top),
                left: chooseSharedBorder(leftTop.right, this.left),
                horizontal: chooseContiguousBorder(leftTop.horizontal, this.horizontal)
            });
        }
        if (leftBottom) {
            border = border.updateFrom({
                bottom: chooseContiguousBorder(leftBottom.bottom, this.bottom),
                left: chooseSharedBorder(leftBottom.right, this.left),
                horizontal: chooseContiguousBorder(leftBottom.horizontal, this.horizontal)
            });
        }
        return border;
    }

    toString() {
        const { top, right, bottom, left, horizontal, vertical } = this;
        if (top === right && right === bottom && bottom === left && left === horizontal && horizontal === vertical) {
            return top;
        }
        else if (top === bottom && bottom === horizontal && right === left && left === vertical) {
            return top + " " + right;
        }
        else if (right === left && left === vertical && horizontal === chooseSharedBorder(top, bottom)) {
            return top + " " + right + " " + bottom;
        }
        else if (horizontal === chooseSharedBorder(top, bottom) && vertical === chooseSharedBorder(left, right)) {
            return top + " " + right + " " + bottom + " " + left;
        }
        else if (horizontal === vertical) {
            return top + " " + right + " " + bottom + " " + left + " " + horizontal;
        }
        else {
            return top + " " + right + " " + bottom + " " + left + " " + horizontal + " " + vertical;
        }
    }

    toJSON() {
        let borders: any;
        const { top, left, bottom, right, horizontal, vertical } = this;
        if (top !== "inherit") (borders || (borders = {})).top = top;
        if (right !== "inherit") (borders || (borders = {})).right = right;
        if (bottom !== "inherit") (borders || (borders = {})).bottom = bottom;
        if (left !== "inherit") (borders || (borders = {})).left = left;
        if (horizontal !== "inherit") (borders || (borders = {})).horizontal = horizontal;
        if (vertical !== "inherit") (borders || (borders = {})).vertical = vertical;
        return borders;
    }
}

function inheritBorderStyle(current: BorderStyle, base: BorderStyle) {
    return current === "inherit" ? base : current;
}

function toBorderStyle(text: string) {
    if (text === "double"
        || text === "single"
        || text === "none"
        || text === "inherit") {
        return text as BorderStyle;
    }
    throw new SyntaxError();
}

function chooseSharedBorder(x: BorderStyle, y: BorderStyle) {
    if (x === "inherit") return y;
    if (y === "inherit") return x;
    return (getBorderSize(x) > getBorderSize(y)) ? x : y;
}

function chooseContiguousBorder(x: BorderStyle, y: BorderStyle) {
    const xSize = getBorderSize(x);
    const ySize = getBorderSize(y);
    return xSize === 0 || ySize === 0 || xSize > ySize ? x : y;
}

function getBorderSize(x: BorderStyle) {
    switch (x) {
        case "none": return 0;
        case "inherit": return 0;
        case "single": return 1;
        case "double": return 2;
    }
}

const boxLineChars = " ─═│║┌╒╓╔┐╕╖╗└╘╙╚┘╛╜╝├╞╟╠┤╡╢╣┬╤╥╦┴╧╨╩┼╪╫╬";

const enum BoxLine {
    none,
    singleHorizontal,
    doubleHorizontal,
    singleVertical,
    doubleVertical,
    singleDownAndRight,
    singleDownAndDoubleRight,
    doubleDownAndSingleRight,
    doubleDownAndRight,
    singleDownAndLeft,
    singleDownAndDoubleLeft,
    doubleDownAndSingleLeft,
    doubleDownAndLeft,
    singleUpAndRight,
    singleUpAndDoubleRight,
    doubleUpAndSingleRight,
    doubleUpAndRight,
    singleUpAndLeft,
    singleUpAndDoubleLeft,
    doubleUpAndSingleLeft,
    doubleUpAndLeft,
    singleVerticalAndRight,
    singleVerticalAndDoubleRight,
    doubleVerticalAndSingleRight,
    doubleVerticalAndRight,
    singleVerticalAndLeft,
    singleVerticalAndDoubleLeft,
    doubleVerticalAndSingleLeft,
    doubleVerticalAndLeft,
    singleDownAndHorizontal,
    singleDownAndDoubleHorizontal,
    doubleDownAndSingleHorizontal,
    doubleDownAndHorizontal,
    singleUpAndHorizontal,
    singleUpAndDoubleHorizontal,
    doubleUpAndSingleHorizontal,
    doubleUpAndHorizontal,
    singleVerticalAndHorizontal,
    singleVerticalAndDoubleHorizontal,
    doubleVerticalAndSingleHorizontal,
    doubleVerticalAndHorizontal
}

const enum BoxLines {
    none = 0,
    up = 1 << 0,
    down = 1 << 1,
    left = 1 << 2,
    right = 1 << 3,
    horizontal = left | right,
    vertical = up | down,
    downAndRight = down | right,
    downAndLeft = down | left,
    upAndRight = up | right,
    upAndLeft = up | left,
    upAndHorizontal = up | horizontal,
    downAndHorizontal = down | horizontal,
    verticalAndRight = vertical | right,
    verticalAndLeft = vertical | left,
    verticalAndHorizontal = vertical | horizontal,
    horizontalDoubleThickness = 1 << 4,
    verticalDoubleThickness = 1 << 5,
    bothDoubleThickness = horizontalDoubleThickness | verticalDoubleThickness,

    singleHorizontal = horizontal,
    doubleHorizontal = horizontal | horizontalDoubleThickness,
    singleVertical = vertical,
    doubleVertical = vertical | verticalDoubleThickness,
    singleDownAndRight = downAndRight,
    singleDownAndDoubleRight = downAndRight | horizontalDoubleThickness,
    doubleDownAndSingleRight = downAndRight | verticalDoubleThickness,
    doubleDownAndRight = downAndRight | bothDoubleThickness,
    singleDownAndLeft = downAndLeft,
    singleDownAndDoubleLeft = downAndLeft | horizontalDoubleThickness,
    doubleDownAndSingleLeft = downAndLeft | verticalDoubleThickness,
    doubleDownAndLeft = downAndLeft | bothDoubleThickness,
    singleUpAndRight = upAndRight,
    singleUpAndDoubleRight = upAndRight | horizontalDoubleThickness,
    doubleUpAndSingleRight = upAndRight | verticalDoubleThickness,
    doubleUpAndRight = upAndRight | bothDoubleThickness,
    singleUpAndLeft = upAndLeft,
    singleUpAndDoubleLeft = upAndLeft | horizontalDoubleThickness,
    doubleUpAndSingleLeft = upAndLeft | verticalDoubleThickness,
    doubleUpAndLeft = upAndLeft | bothDoubleThickness,
    singleVerticalAndRight = verticalAndRight,
    singleVerticalAndDoubleRight = verticalAndRight | horizontalDoubleThickness,
    doubleVerticalAndSingleRight = verticalAndRight | verticalDoubleThickness,
    doubleVerticalAndRight = verticalAndRight | bothDoubleThickness,
    singleVerticalAndLeft = verticalAndLeft,
    singleVerticalAndDoubleLeft = verticalAndLeft | horizontalDoubleThickness,
    doubleVerticalAndSingleLeft = verticalAndLeft | verticalDoubleThickness,
    doubleVerticalAndLeft = verticalAndLeft | bothDoubleThickness,
    singleDownAndHorizontal = downAndHorizontal,
    singleDownAndDoubleHorizontal = downAndHorizontal | horizontalDoubleThickness,
    doubleDownAndSingleHorizontal = downAndHorizontal | verticalDoubleThickness,
    doubleDownAndHorizontal = downAndHorizontal | bothDoubleThickness,
    singleUpAndHorizontal = upAndHorizontal,
    singleUpAndDoubleHorizontal = upAndHorizontal | horizontalDoubleThickness,
    doubleUpAndSingleHorizontal = upAndHorizontal | verticalDoubleThickness,
    doubleUpAndHorizontal = upAndHorizontal | bothDoubleThickness,
    singleVerticalAndHorizontal = verticalAndHorizontal,
    singleVerticalAndDoubleHorizontal = verticalAndHorizontal | horizontalDoubleThickness,
    doubleVerticalAndSingleHorizontal = verticalAndHorizontal | verticalDoubleThickness,
    doubleVerticalAndHorizontal = verticalAndHorizontal | bothDoubleThickness,
}

function getBoxLine(left: BorderStyle, right: BorderStyle, up: BorderStyle, down: BorderStyle) {
    let boxLines: BoxLines = 0;
    if (left !== "none" && left !== "inherit") boxLines |= BoxLines.left;
    if (right !== "none" && right !== "inherit") boxLines |= BoxLines.right;
    if (up !== "none" && up !== "inherit") boxLines |= BoxLines.up;
    if (down !== "none" && down !== "inherit") boxLines |= BoxLines.down;
    if (left === "double" || right === "double") boxLines |= BoxLines.horizontalDoubleThickness;
    if (up === "double" || down === "double") boxLines |= BoxLines.verticalDoubleThickness;
    switch (boxLines) {
        case BoxLines.singleHorizontal:
            return BoxLine.singleHorizontal;
        case BoxLines.doubleHorizontal:
            return BoxLine.doubleHorizontal;
        case BoxLines.singleVertical:
            return BoxLine.singleVertical;
        case BoxLines.doubleVertical:
            return BoxLine.doubleVertical;
        case BoxLines.singleDownAndRight:
            return BoxLine.singleDownAndRight;
        case BoxLines.singleDownAndDoubleRight:
            return BoxLine.singleDownAndDoubleRight;
        case BoxLines.doubleDownAndSingleRight:
            return BoxLine.doubleDownAndSingleRight;
        case BoxLines.doubleDownAndRight:
            return BoxLine.doubleDownAndRight;
        case BoxLines.singleDownAndLeft:
            return BoxLine.singleDownAndLeft;
        case BoxLines.singleDownAndDoubleLeft:
            return BoxLine.singleDownAndDoubleLeft;
        case BoxLines.doubleDownAndSingleLeft:
            return BoxLine.doubleDownAndSingleLeft;
        case BoxLines.doubleDownAndLeft:
            return BoxLine.doubleDownAndLeft;
        case BoxLines.singleUpAndRight:
            return BoxLine.singleUpAndRight;
        case BoxLines.singleUpAndDoubleRight:
            return BoxLine.singleUpAndDoubleRight;
        case BoxLines.doubleUpAndSingleRight:
            return BoxLine.doubleUpAndSingleRight;
        case BoxLines.doubleUpAndRight:
            return BoxLine.doubleUpAndRight;
        case BoxLines.singleUpAndLeft:
            return BoxLine.singleUpAndLeft;
        case BoxLines.singleUpAndDoubleLeft:
            return BoxLine.singleUpAndDoubleLeft;
        case BoxLines.doubleUpAndSingleLeft:
            return BoxLine.doubleUpAndSingleLeft;
        case BoxLines.doubleUpAndLeft:
            return BoxLine.doubleUpAndLeft;
        case BoxLines.singleVerticalAndRight:
            return BoxLine.singleVerticalAndRight;
        case BoxLines.singleVerticalAndDoubleRight:
            return BoxLine.singleVerticalAndDoubleRight;
        case BoxLines.doubleVerticalAndSingleRight:
            return BoxLine.doubleVerticalAndSingleRight;
        case BoxLines.doubleVerticalAndRight:
            return BoxLine.doubleVerticalAndRight;
        case BoxLines.singleVerticalAndLeft:
            return BoxLine.singleVerticalAndLeft;
        case BoxLines.singleVerticalAndDoubleLeft:
            return BoxLine.singleVerticalAndDoubleLeft;
        case BoxLines.doubleVerticalAndSingleLeft:
            return BoxLine.doubleVerticalAndSingleLeft;
        case BoxLines.doubleVerticalAndLeft:
            return BoxLine.doubleVerticalAndLeft;
        case BoxLines.singleDownAndHorizontal:
            return BoxLine.singleDownAndHorizontal;
        case BoxLines.singleDownAndDoubleHorizontal:
            return BoxLine.singleDownAndDoubleHorizontal;
        case BoxLines.doubleDownAndSingleHorizontal:
            return BoxLine.doubleDownAndSingleHorizontal;
        case BoxLines.doubleDownAndHorizontal:
            return BoxLine.doubleDownAndHorizontal;
        case BoxLines.singleUpAndHorizontal:
            return BoxLine.singleUpAndHorizontal;
        case BoxLines.singleUpAndDoubleHorizontal:
            return BoxLine.singleUpAndDoubleHorizontal;
        case BoxLines.doubleUpAndSingleHorizontal:
            return BoxLine.doubleUpAndSingleHorizontal;
        case BoxLines.doubleUpAndHorizontal:
            return BoxLine.doubleUpAndHorizontal;
        case BoxLines.singleVerticalAndHorizontal:
            return BoxLine.singleVerticalAndHorizontal;
        case BoxLines.singleVerticalAndDoubleHorizontal:
            return BoxLine.singleVerticalAndDoubleHorizontal;
        case BoxLines.doubleVerticalAndSingleHorizontal:
            return BoxLine.doubleVerticalAndSingleHorizontal;
        case BoxLines.doubleVerticalAndHorizontal:
            return BoxLine.doubleVerticalAndHorizontal;
        default:
            return BoxLine.none;
    }
}