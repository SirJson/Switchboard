$PKGMETA = Get-Content package.json | ConvertFrom-Json -AsHashtable
$PKGVER = $PKGMETA['version']
$DISTFILE = "relpkgs/switchboard-$PKGVER.tar.gz"
mkdir -Force .\relpkgs
npm run clean
npm run copy-assets
parcel build src/index.ts --target node --bundle-node-modules
Copy-Item .\env.example .\dist
Move-Item .\dist .\switchboard
tar cfzv $DISTFILE switchboard
Remove-Item -Recurse -Force -Confirm:$false .\switchboard

Write-Output "Created new release: $DISTFILE"