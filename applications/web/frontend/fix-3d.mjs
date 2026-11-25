// Usage (run from D:\CSE499AB\applications\web\frontend):
//   node fix-3d.mjs nomsaa   -> step 1: turn off 4x MSAA on the bloom render target (keeps bloom)
//   node fix-3d.mjs lite     -> step 2: force "lite" mode (no bloom/composer, direct render)
//   node fix-3d.mjs bust     -> rename patched files (new filenames) so browsers/Vercel can't serve cached old copies
//   node fix-3d.mjs undo     -> restore the original files from the .orig backups (only works before 'bust')
import fs from "node:fs";
import path from "node:path";

const dir = path.join("public", "3d", "assets");
const find = (prefix) => {
  const f = fs.readdirSync(dir).find((n) => n.startsWith(prefix) && n.endsWith(".js"));
  if (!f) throw new Error(`Cannot find ${prefix}*.js in ${dir}. Run this from the frontend folder.`);
  return path.join(dir, f);
};

const mode = process.argv[2];

if (mode === "bust") {
  // Give the two patched files new names and update every place that mentions them.
  const tag = "-fix" + Date.now().toString(36);
  const root = path.join("public", "3d");
  const targets = ["engine-", "index-"].map((p) => path.basename(find(p)));
  const renamed = targets.map((old) => [old, old.replace(/\.js$/, tag + ".js")]);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(root).filter((f) => /\.(js|html|css)$/.test(f))) {
    let src = fs.readFileSync(f, "utf8"), out = src;
    for (const [from, to] of renamed) out = out.split(from).join(to);
    if (out !== src) { fs.writeFileSync(f, out); console.log("updated references in", f); }
  }
  for (const [from, to] of renamed) {
    fs.renameSync(path.join(dir, from), path.join(dir, to));
    console.log("renamed", from, "->", to);
    for (const ext of [".orig"]) if (fs.existsSync(path.join(dir, from + ext))) fs.unlinkSync(path.join(dir, from + ext));
  }
  console.log("Done. Deploy, then open the page in an InPrivate window.");
  process.exit(0);
}

const engine = find("engine-");
const index = find("index-");

const patches = {
  nomsaa: [[engine, "{type:h,samples:4}", "{type:h,samples:0}"]],
  lite: [[index, "La=matchMedia(`(max-width: 760px)`).matches||(navigator.hardwareConcurrency||8)<=4", "La=!0"]],
};

if (mode === "undo") {
  for (const f of [engine, index]) {
    if (fs.existsSync(f + ".orig")) { fs.copyFileSync(f + ".orig", f); console.log("restored", f); }
  }
} else if (patches[mode]) {
  for (const [file, from, to] of patches[mode]) {
    let src = fs.readFileSync(file, "utf8");
    if (src.includes(to) && !src.includes(from)) { console.log("already patched:", file); continue; }
    if (!src.includes(from)) throw new Error(`Expected text not found in ${file}`);
    if (!fs.existsSync(file + ".orig")) fs.writeFileSync(file + ".orig", src);
    fs.writeFileSync(file, src.replace(from, to));
    console.log("patched", file);
  }
  console.log("Done. Hard-reload the page (Ctrl+Shift+R).");
} else {
  console.log("Usage: node fix-3d.mjs nomsaa | lite | undo");
}
