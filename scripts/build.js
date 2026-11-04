// scripts/build.js — esbuild: production build, watch, or dev server.
//   node scripts/build.js           -> minified main.js + main.css
//   node scripts/build.js --serve   -> dev server on :3000 with live reload

const esbuild = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");

const fs = require("fs");
const path = require("path");

const isWatch = process.argv.includes("--watch");
const isServe = process.argv.includes("--serve");
const isDev = isWatch || isServe;

// Liste des communes du comparateur (nom + code postal) pour le bandeau
// « Bail commercial ou Work & Share ? » : extraite du tableau C de
// src/comparateur/comparateur.js, seule source des communes connues.
function buildCommunes() {
  const src = fs.readFileSync(path.join(__dirname, "../src/comparateur/comparateur.js"), "utf8");
  const start = src.indexOf("var C=[");
  const end = src.indexOf("\n];", start);
  const rows = [...src.slice(start, end).matchAll(/^\["([^"]+)","(\d{5})"/gm)].map((m) => [m[1], m[2]]);
  if (rows.length < 100) throw new Error(`Communes du comparateur introuvables (${rows.length})`);
  fs.writeFileSync(
    path.join(__dirname, "../src/comparateur/communes.json"),
    JSON.stringify(rows) + "\n",
  );
}

async function run() {
  buildCommunes();
  const ctx = await esbuild.context({
    entryPoints: [
      { in: "src/index.js", out: "main" },
      { in: "src/styles/main.scss", out: "main" },
      // Comparateur : fichiers à part, chargés seulement sur sa page
      { in: "src/comparateur/comparateur.js", out: "comparateur" },
      { in: "src/comparateur/comparateur.css", out: "comparateur" },
    ],
    bundle: true,
    outdir: ".",
    minify: !isDev,
    sourcemap: isDev,
    target: ["es2018"],
    legalComments: "none",
    define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ")) },
    logLevel: "info",
    plugins: [sassPlugin()],
  });

  if (isServe) {
    await ctx.watch();
    const { host, port } = await ctx.serve({
      servedir: ".",
      port: 3000,
      cors: { origin: "*" },
    });

    const displayHost = host && host !== "0.0.0.0" ? host : "localhost";
    console.log(`\n✅ Dev server sur http://${displayHost}:${port}`);
    console.log(`   → http://${displayHost}:${port}/main.css`);
    console.log(`   → http://${displayHost}:${port}/main.js`);
    console.log(`   → Live reload actif sur http://${displayHost}:${port}/esbuild\n`);
    console.log('Astuce : lance ensuite "npx cloudflared tunnel --url http://localhost:3000"');
    console.log("pour tester depuis ton site .webflow.io (staging).\n");
  } else if (isWatch) {
    await ctx.watch();
    console.log("Watching...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("✅ Build terminé : main.js + main.css (+ comparateur.js / .css)");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});