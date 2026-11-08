import esbuild from "esbuild";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "main.js",
    format: "cjs",
    target: "es2021",
    charset: "utf8",
    sourcemap: isProduction ? false : "inline",
    minify: isProduction,
    treeShaking: true,
    logLevel: "info",
    // Obsidian provides these modules at runtime; bundling a second copy of CodeMirror breaks editor extensions.
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
    ],
});

if (isWatch) {
    await context.watch();
} else {
    await context.rebuild();
    await context.dispose();
}
