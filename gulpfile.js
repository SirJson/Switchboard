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
const cssglob = "src/styles/css/*.css";
const scssglob = "src/styles/*.scss";
const termuiscss = "extern/uiterminal/scss/**/*.scss";
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
        cssglob
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

const cssTask = series(compileSass, postStyles);


function watchCSS() {
    return watch([scssglob, termuiscss], cssTask)
}

exports.css = cssTask;
exports.watch = watchCSS;
exports.default = cssTask;