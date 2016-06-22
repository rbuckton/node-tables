import { PassThrough, Readable, Writable, Duplex } from "stream";
import { fork } from "./build/fork";
import gulp = require("gulp");
import sourcemaps = require("gulp-sourcemaps");
import ts = require("gulp-typescript");
import typescript = require("typescript");
import del = require("del");
import merge2 = require("merge2");

declare module "gulp-typescript" {
    function createProject(settings?: Settings): Project;
    function createProject(tsConfigFileName: string, settings?: Settings): Project;
    interface CompileStream extends Duplex { }
}

const src = ts.createProject("./src/tsconfig.json", { typescript: typescript as any });

gulp.task("build", () => src.src()
    .pipe(sourcemaps.init())
    .pipe(fork(ts(src), ({ js, dts }) => [
        dts,
        js.pipe(sourcemaps.write(".", { includeContent: false, sourceRoot: "../src/" }))
    ]))
    .pipe(gulp.dest("out")));

gulp.task("default", ["build"]);