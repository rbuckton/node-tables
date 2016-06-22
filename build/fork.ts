import { PassThrough } from "stream";
import merge2 = require("merge2");

export function fork<T extends NodeJS.WritableStream>(stream: T, fork: (stream: T) => NodeJS.ReadableStream[]): Fork<T> {
    return new Fork(stream, fork);
}

export class Fork<T extends NodeJS.WritableStream> extends PassThrough {
    private _forks: NodeJS.ReadableStream[];

    constructor(stream: T, fork: (stream: T) => NodeJS.ReadableStream[]) {
        super({ objectMode: true });
        this._forks = fork(super.pipe(stream));
    }

    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T {
        return merge2(this._forks).pipe(destination, options);
    }
}