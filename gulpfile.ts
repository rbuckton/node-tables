import gulp = require("gulp");
import sourcemaps = require("gulp-sourcemaps");
import ts = require("gulp-tsb");
import del = require("del");

const project = ts.create("./src/tsconfig.json", { typescript: require("typescript") });

gulp.task("build", () => project.src()
    .pipe(sourcemaps.init())
    .pipe(project.compile())
    .pipe(sourcemaps.write(project.sourcemapPath, project.sourcemapOptions))
    .pipe(project.dest()));

gulp.task("default", ["build"]);