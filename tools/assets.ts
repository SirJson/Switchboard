import * as shell from "shelljs";

// Copy all the view templates
shell.cp("-R", "src/views", "dist/");
shell.cp("-R", "public", "dist/public")
shell.rm("dist/public/pages.json")