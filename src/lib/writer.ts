import * as os from "os";

export class StringWriter {
    private _text: string;

    constructor(text = "") {
        this._text = text;
    }

    get size() {
        return this._text.length;
    }

    append(text = "") {
        this._text += text;
        return this;
    }

    appendLine(text = "") {
        this.append(text + os.EOL);
        return this;
    }

    clear() {
        this._text = "";
        return this;
    }

    toString() {
        return this._text;
    }
}
