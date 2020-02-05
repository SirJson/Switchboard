#!/bin/bash

ARCHIVE="switchboard"
DISTDIR="dist"
PACKAGE_VERSION=$(grep '"version"' package.json | cut -d '"' -f 4)

DISTFILE="relpkgs/switchboard-$PACKAGE_VERSION.tar.gz"

if [[ -d $DISTDIR ]]; then
    rm -rfv $DISTDIR
fi

if [[ -e $DISTFILE ]]; then
    rm -fv $DISTFILE
fi

mkdir -pv relpkgs
mkdir -pv dist/public/css
mkdir -pv dist/views

npm run build-style
parcel build src/index.ts --target node --bundle-node-modules

cp -v env.example dist
cp -v public/pages.example.json dist
cp -v public/css/* dist/public/css
cp -v src/views/* dist/views

mv -v dist $ARCHIVE

tar cfzv $DISTFILE $ARCHIVE

rm -rvf $ARCHIVE

echo "Created new release: $DISTFILE"
