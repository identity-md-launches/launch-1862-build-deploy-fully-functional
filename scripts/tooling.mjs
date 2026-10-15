import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

// Optional external toolchain keeps dependency trees outside a restricted checkout.
const action = process.argv[2] || "build";
const at = process.argv.indexOf("--toolchain");
const root = at >= 0 ? resolve(process.argv[at + 1]) : resolve(".");
const req = createRequire(resolve(root, "package.json"));
const ts = req("typescript");
if (action === "typecheck") {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve("."),
  );
  parsed.options.paths = {
    react: [
      resolve(dirname(req.resolve("@types/react/package.json")), "index.d.ts"),
    ],
    "react/*": [
      resolve(dirname(req.resolve("@types/react/package.json")), "*"),
    ],
    "react-dom/*": [
      resolve(dirname(req.resolve("@types/react-dom/package.json")), "*"),
    ],
  };
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const errors = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (errors.length)
    console.error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => resolve("."),
        getCanonicalFileName: (x) => x,
        getNewLine: () => "\n",
      }),
    );
  else console.log("Typecheck passed.");
  process.exit(errors.length ? 1 : 0);
}
if (action === "test") {
  const temp = mkdtempSync(resolve(tmpdir(), "cryptovault-tests-"));
  try {
    const source = ts.sys.readFile("src/model.ts");
    writeFileSync(
      resolve(temp, "model.mjs"),
      ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText,
    );
    const result = spawnSync(
      process.execPath,
      ["tests/model.test.mjs", resolve(temp, "model.mjs")],
      { stdio: "inherit" },
    );
    process.exitCode = result.status ?? 1;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
} else {
  const vite = await import(pathToFileURL(req.resolve("vite")).href);
  const config = {
    configFile: false,
    envDir: false,
    base: "./",
    resolve: {
      alias: [
        {
          find: /^react-dom(\/.*)?$/,
          replacement: `${dirname(req.resolve("react-dom/package.json"))}$1`,
        },
        {
          find: /^react(\/.*)?$/,
          replacement: `${dirname(req.resolve("react/package.json"))}$1`,
        },
      ],
    },
    esbuild: { jsx: "automatic" },
    server: { host: "127.0.0.1" },
    preview: { host: "127.0.0.1" },
  };
  if (action === "build") await vite.build(config);
  else if (action === "preview") (await vite.preview(config)).printUrls();
  else if (action === "dev") {
    const server = await vite.createServer(config);
    await server.listen();
    server.printUrls();
  } else throw new Error(`Unknown action: ${action}`);
}
