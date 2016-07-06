import { HorizontalAlignment, VerticalAlignment } from "./types";
import stripAnsi = require("strip-ansi");
export { HorizontalAlignment, VerticalAlignment } from "./types";

export interface TextRange {
    pos: number; // Range start (including whitespace)
    start: number; // Range start (excluding whitespace)
    end: number; // Range end
    newLine: boolean; // Range is a new line.
}

export interface TextMeasurements {
    minWidth: number;
    width: number;
    height: number;
}

const horizontalAlignmentFunctions: { [key: string]: typeof horizontalAlignLeft } = {
    left: horizontalAlignLeft,
    right: horizontalAlignRight,
    center: horizontalAlignCenter,
    inherit: horizontalAlignLeft
};

const verticalAlignmentFunctions: { [key: string]: typeof verticalAlignTop } = {
    top: verticalAlignTop,
    bottom: verticalAlignBottom,
    middle: verticalAlignMiddle,
    inherit: verticalAlignTop
};

export function fit(text: string, height: number, width: number, horizontalAlignment: HorizontalAlignment, verticalAlignment: VerticalAlignment) {
    let lines = wordWrap(text, width);
    lines = verticalAlign(lines, height, verticalAlignment);
    lines = horizontalAlign(lines, width, horizontalAlignment);
    return lines;
}

export function horizontalAlign(lines: string[], width: number, align: HorizontalAlignment) {
    const alignFunction = horizontalAlignmentFunctions[align];
    return alignFunction(lines, width);
}

function horizontalAlignLeft(lines: string[], width: number) {
    return lines.map(line => padRight(line, width, " "));
}

function horizontalAlignRight(lines: string[], width: number) {
    return lines.map(line => padLeft(line, width, " "));
}

function horizontalAlignCenter(lines: string[], width: number) {
    return lines.map(line => padLeftAndRight(line, width, " "));
}

export function verticalAlign(lines: string[], height: number, align: VerticalAlignment) {
    const alignFunction = verticalAlignmentFunctions[align];
    return alignFunction(lines, height);
}

function verticalAlignTop(lines: string[], height: number) {
    while (lines.length < height) {
        lines = [...(lines as Iterable<string>), ""];
    }
    return lines;
}

function verticalAlignBottom(lines: string[], height: number) {
    while (lines.length < height) {
        lines = ["", ...(lines as Iterable<string>)];
    }
    return lines;
}

function verticalAlignMiddle(lines: string[], height: number) {
    let top = false;
    while (lines.length < height) {
        lines = top ? ["", ...(lines as Iterable<string>)] : [...(lines as Iterable<string>), ""];
        top = !top;
    }
    return lines;
}

export function repeat(ch: string, size: number) {
    return padLeft("", size, ch.length > 0 ? ch.charAt(0) : " ");
}

export function padLeft(text: string, size: number, ch: string) {
    ch = stripAnsi(ch);

    let length = stripAnsi(text).length;
    while (length < size) {
        text = ch + text;
        length++;
    }

    return text;
}

export function padRight(text: string, size: number, ch: string) {
    ch = stripAnsi(ch);
    let length = stripAnsi(text).length;
    while (length < size) {
        text += ch;
        length++;
    }

    return text;
}

function padLeftAndRight(text: string, size: number, ch: string) {
    ch = stripAnsi(ch);
    let length = stripAnsi(text).length;
    let left = false;
    while (length < size) {
        text = left ? ch + text : text + ch;
        left = !left;
        length++;
    }

    return text;
}

export function wordWrap(text: string, maxWidth: number) {
    const lines: string[] = [];
    let line: string = "";
    for (const word of wordScan(text)) {
        if (word.newLine) {
            lines.push(line);
            line = "";
        }
        else {
            const fullWidth = stripAnsi(text.substring(word.pos, word.end)).length;
            if (line.length > 0 && line.length + fullWidth > maxWidth) {
                if (line || lines.length) lines.push(line);
                line = text.substring(word.start, word.end);
            }
            else {
                line += text.substring(word.pos, word.end);
            }
        }
    }

    if (line) {
        lines.push(line);
    }

    return lines;
}

export function measureText(text: string, maxWidth: number): TextMeasurements {
    let minWidth = 0;
    let height = 1;
    let width = 0;
    let lineWidth = 0;
    for (const word of wordScan(text)) {
        if (word.newLine) {
            if (lineWidth > width) {
                width = lineWidth;
            }

            lineWidth = 0;
            height++;
        }
        else {
            const tokenWidth = stripAnsi(text.substring(word.start, word.end)).length;
            if (minWidth < tokenWidth) minWidth = tokenWidth;

            const fullWidth = stripAnsi(text.substring(word.pos, word.end)).length;
            if (lineWidth > 0 && lineWidth + fullWidth > maxWidth) {
                if (lineWidth > width) {
                    width = lineWidth;
                }

                height++;
                lineWidth = tokenWidth;
            }
            else {
                lineWidth += fullWidth;
            }
        }
    }

    if (lineWidth > width) {
        width = lineWidth;
    }

    return { minWidth, width, height };
}

const whitespacePattern = /^\s$/;

function* wordScan(text: string): Iterable<TextRange> {
    let end = 0;
    let pos = 0;
    while (end < text.length) {
        const ch = text.charAt(end);
        if (ch === '\r') {
            const start = end;
            end++;
            if (end < text.length && text.charAt(end) === '\n') {
                end++;
            }

            yield { pos, start, end, newLine: true };
            pos = end;
        }
        else if (ch === '\n') {
            const start = end;
            end++;
            yield { pos, start, end, newLine: true  };
            pos = end;
        }
        else if (!whitespacePattern.test(ch)) {
            const start = end;
            while (end < text.length) {
                const ch = text.charAt(end);
                if (whitespacePattern.test(ch)) {
                    break;
                }
                end++;
            }

            yield { pos, start, end, newLine: false };
            pos = end;
        }
        else {
            end++;
        }
    }
}
