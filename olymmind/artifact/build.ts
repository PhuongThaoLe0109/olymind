import { compile } from "/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const TW = "/opt/npm-tools/node_modules/tailwindcss";

// ---- JS
const shim = (n: string) => join(root, "artifact/shims", n);
const result = await Bun.build({
  entrypoints: [join(root, "artifact/main.tsx")],
  target: "browser",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "shims",
      setup(b) {
        const map: Record<string, string> = {
          "next/link": shim("next-link.tsx"),
          "next/navigation": shim("next-navigation.ts"),
          "framer-motion": shim("framer-motion.tsx"),
          "lucide-react": shim("lucide-react.tsx"),
          "recharts": shim("recharts.tsx"),
          "@anthropic-ai/sdk": shim("empty.ts"),
        };
        b.onResolve({ filter: /^(next\/link|next\/navigation|framer-motion|lucide-react|recharts|@anthropic-ai\/sdk)$/ }, (a) => ({ path: map[a.path] }));
      },
    },
  ],
});
if (!result.success) { console.error(result.logs); process.exit(1); }
const js = (await result.outputs[0].text()).replaceAll("</script", "<\\/script");

// ---- CSS: gom ứng viên lớp từ mã nguồn rồi biên dịch bằng Tailwind v4
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && files.push(p); } };
walk(join(root, "src")); walk(join(root, "artifact"));
const cands = new Set<string>();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/[^\s"'`<>{}=;,]+/g)) cands.add(m[0]);
const globals = readFileSync(join(root, "src/app/globals.css"), "utf8").replace(/@tailwind \w+;\n?/g, "");
const base = readFileSync(join(root, "artifact/app.css"), "utf8");
const comp = await compile(base + "\n" + globals, {
  base: root,
  loadStylesheet: async (id: string, b: string) => {
    const path = id === "tailwindcss" ? join(TW, "index.css") : id.startsWith("tailwindcss/") ? join(TW, id.slice(12)) : resolve(b, id);
    return { path, base: dirname(path), content: readFileSync(path, "utf8") };
  },
});
const css = comp.build([...cands]);

const html = `<title>OlymMind</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&display=swap">
<style>
:root{color-scheme:dark}
body{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:0;background:#1E0826;color:#FFF4D6;font-family:"Source Sans 3",ui-sans-serif,system-ui,sans-serif;font-size:16px;min-height:100vh}
${css}
.anim-in{animation:riseIn .4s ease-out}
</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync(join(root, "artifact/dist.html"), html);
console.log("html", (html.length / 1024).toFixed(0), "KB; css", (css.length / 1024).toFixed(0), "KB; js", (js.length / 1024).toFixed(0), "KB");
