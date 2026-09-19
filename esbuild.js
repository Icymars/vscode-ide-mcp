const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
};

async function build() {
  const extension = {
    ...common,
    entryPoints: ["src/extension.ts"],
    outfile: "out/extension.js",
    external: ["vscode"],
  };
  const mcpServer = {
    ...common,
    entryPoints: ["src/mcp/server.ts"],
    outfile: "out/mcp-server.js",
  };

  if (watch) {
    const c1 = await esbuild.context(extension);
    await c1.watch();
    const c2 = await esbuild.context(mcpServer);
    await c2.watch();
    console.log("watch attivo (esbuild)");
  } else {
    await esbuild.build(extension);
    await esbuild.build(mcpServer);
    console.log("build completato: out/extension.js + out/mcp-server.js");
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
