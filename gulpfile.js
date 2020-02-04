/// <binding BeforeBuild='default' />
'use strict';

const { src, dest, series, watch } = require('gulp');
const sass = require('gulp-sass');
const path = require('path');
const concat = require('gulp-concat');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const postcss = require('gulp-postcss');


const nodemods = path.join(__dirname, 'node_modules');
const external = path.join(__dirname, 'extern');
const cssfiles = "src/styles/css/*.css";
const stylefiles = "src/styles/*.scss";
const mainstyle = "src/styles/site.scss";

sass.compiler = require('sass');

function compileSass() {
    return src(mainstyle)
        .pipe(
            sass({
                includePaths: [
                    nodemods,
                    external
                ]
            }).on('error', sass.logError))
        .pipe(dest('src/styles/css'))
}

function postStyles() {
    const includes = [
        cssfiles
    ];
    const plugins = [
        autoprefixer(),
        cssnano()
    ];
    return src(includes)
        .pipe(postcss(plugins))
        .pipe(concat('switchboard.css'))
        .pipe(dest("public/css"));
}

function copyFonts() {
    return src(["src/styles/fonts/*.woff", "src/styles/fonts/*.woff2"]).pipe(dest("public/css/fonts"))
}

const cssTask = series(compileSass, postStyles, copyFonts);


function watchCSS() {
    return watch([stylefiles], cssTask)
}

exports.css = cssTask;
exports.watch = watchCSS;
exports.default = cssTask;