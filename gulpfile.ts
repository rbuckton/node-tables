import { PassThrough, Readable, Writable, Duplex } from "stream";
import fork = require("fork-pipe");
import gulp = require("gulp");
import sourcemaps = require("gulp-sourcemaps");
import ts = require("gulp-typescript");
import del = require("del");
import merge2 = require("merge2");

const src = ts.createProject("./src/tsconfig.json", { typescript: require("typescript") });

gulp.task("build", () => src.src()
    .pipe(sourcemaps.init())
    .pipe(ts(src))
    .pipe(fork())
    .add(ts => ts.dts)
    .add(ts => ts.js)
    .pipe(sourcemaps.write(".", { includeContent: false, sourceRoot: "../src/" }))
    .pipe(gulp.dest("out")));

gulp.task("default", ["build"]);