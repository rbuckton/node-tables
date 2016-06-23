import { Color } from "./types";
import { StringWriter } from "./writer";

export { Color } from "./types";

const resetAttributes = "\x1b[0m";

const backgroundColors: { [key: string]: string; reset: string; } = {
    "black": "\x1b[40m",
    "red": "\x1b[41m",
    "green": "\x1b[42m",
    "yellow": "\x1b[43m",
    "blue": "\x1b[44m",
    "magenta": "\x1b[45m",
    "cyan": "\x1b[46m",
    "gray": "\x1b[47m",
    "white": "\x1b[47m",
    "dark-red": "\x1b[41m",
    "dark-green": "\x1b[42m",
    "dark-yellow": "\x1b[43m",
    "dark-blue": "\x1b[44m",
    "dark-magenta": "\x1b[45m",
    "dark-cyan": "\x1b[46m",
    "dark-white": "\x1b[47m",
    "dark-gray": "\x1b[100m",
    "bright-red": "\x1b[101m",
    "bright-green": "\x1b[102m",
    "bright-yellow": "\x1b[103m",
    "bright-blue": "\x1b[104m",
    "bright-magenta": "\x1b[105m",
    "bright-cyan": "\x1b[106m",
    "bright-gray": "\x1b[47m",
    "bright-white": "\x1b[107m",
    reset: "\x1b[49m"
};

const foregroundColors: { [key: string]: string; reset: string; } = {
    "black": "\x1b[30m",
    "red": "\x1b[91m",
    "green": "\x1b[92m",
    "yellow": "\x1b[93m",
    "blue": "\x1b[94m",
    "magenta": "\x1b[95m",
    "cyan": "\x1b[96m",
    "gray": "\x1b[37m",
    "white": "\x1b[97m",
    "dark-red": "\x1b[31m",
    "dark-green": "\x1b[32m",
    "dark-yellow": "\x1b[33m",
    "dark-blue": "\x1b[34m",
    "dark-magenta": "\x1b[35m",
    "dark-cyan": "\x1b[36m",
    "dark-white": "\x1b[37m",
    "dark-gray": "\x1b[90m",
    "bright-red": "\x1b[91m",
    "bright-green": "\x1b[92m",
    "bright-yellow": "\x1b[93m",
    "bright-blue": "\x1b[94m",
    "bright-magenta": "\x1b[95m",
    "bright-cyan": "\x1b[96m",
    "bright-gray": "\x1b[37m",
    "bright-white": "\x1b[97m",
    reset: "\x1b[39m"
};

export class ColorStringWriter extends StringWriter {
    public foregroundColor: Color = "inherit";
    public backgroundColor: Color = "inherit";

    private _hasWrittenColors = false;

    append(text = "") {
        if (text) {
            if (this.foregroundColor !== "inherit") {
                text = foregroundColors[this.foregroundColor] + text + foregroundColors.reset;
                this._hasWrittenColors = true;
            }

            if (this.backgroundColor !== "inherit") {
                text = backgroundColors[this.backgroundColor] + text + backgroundColors.reset;
                this._hasWrittenColors = true;
            }
        }

        super.append(text);
        return this;
    }

    clear() {
        super.clear();
        this._hasWrittenColors = false;
        return this;
    }

    toString() {
        const text = super.toString();
        return this._hasWrittenColors ? text + resetAttributes : text;
    }
}