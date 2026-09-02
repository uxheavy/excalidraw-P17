const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const REPOSITORY_ROOT = path.resolve(__dirname, "..");
const PACKAGES_DIRECTORY = path.join(REPOSITORY_ROOT, "packages");
const PUBLIC_BASE_COMMIT = "abeeaeba217ab3b5193b78c8d8d63c373b518ced";
const FORK_SOURCE_COMMIT = "660736105a2529566670d9988d61a1e01cac1aa3";
const PUBLIC_INTERNAL_PACKAGE_VERSION = "0.18.0-abeeaeb";
const FORK_PACKAGE_VERSION = "0.18.1-66073610";
const RELEASE_TAG = `packages-v${FORK_PACKAGE_VERSION}`;
const RELEASE_ASSET_BASE_URL = `https://github.com/uxheavy/excalidraw-P17/releases/download/${RELEASE_TAG}`;
const CHANGED_PACKAGES = ["common", "excalidraw"];

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `${command} ${args.join(" ")} failed${output ? `:\n${output}` : ""}`,
    );
  }

  return options.capture ? result.stdout.trim() : "";
};

const runAsync = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPOSITORY_ROOT,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with ${
              signal ? `signal ${signal}` : `exit code ${code}`
            }`,
          ),
        );
      }
    });
  });

const parseOutputDirectory = () => {
  const outputArgument = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--output="));

  if (!outputArgument) {
    throw new Error("Pass an empty output directory with --output=<path>.");
  }

  const outputDirectory = path.resolve(
    outputArgument.slice("--output=".length),
  );
  if (
    fs.existsSync(outputDirectory) &&
    fs.readdirSync(outputDirectory).length
  ) {
    throw new Error(`Output directory is not empty: ${outputDirectory}`);
  }
  return outputDirectory;
};

const assertSource = () => {
  const status = run(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { capture: true },
  );
  if (status) {
    throw new Error(`Source checkout is not clean:\n${status}`);
  }

  for (const commit of [PUBLIC_BASE_COMMIT, FORK_SOURCE_COMMIT]) {
    run("git", ["cat-file", "-e", `${commit}^{commit}`], { capture: true });
  }
  run("git", [
    "merge-base",
    "--is-ancestor",
    PUBLIC_BASE_COMMIT,
    FORK_SOURCE_COMMIT,
  ]);

  const packageSourceDiff = run(
    "git",
    ["diff", "--name-only", FORK_SOURCE_COMMIT, "--", "packages"],
    { capture: true },
  );
  if (packageSourceDiff) {
    throw new Error(
      `Package sources differ from ${FORK_SOURCE_COMMIT}:\n${packageSourceDiff}`,
    );
  }

  const changedPackages = new Set(
    run(
      "git",
      [
        "diff",
        "--name-only",
        `${PUBLIC_BASE_COMMIT}..${FORK_SOURCE_COMMIT}`,
        "--",
        "packages",
      ],
      { capture: true },
    )
      .split("\n")
      .filter(Boolean)
      .map((filename) => filename.split("/")[1]),
  );
  const actual = [...changedPackages].sort();
  const expected = [...CHANGED_PACKAGES].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected changed internal packages ${expected.join(", ")}; found ${
        actual.join(", ") || "none"
      }.`,
    );
  }
};

const readPackage = (packageName) =>
  JSON.parse(
    fs.readFileSync(
      path.join(PACKAGES_DIRECTORY, packageName, "package.json"),
      "utf8",
    ),
  );

const writePackage = (directory, manifest) => {
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
};

const stagePackage = (packageName, destination, manifest) => {
  const source = path.join(PACKAGES_DIRECTORY, packageName);
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(path.join(source, "dist"), path.join(destination, "dist"), {
    recursive: true,
  });
  for (const filename of ["README.md", "CHANGELOG.md"]) {
    const sourceFile = path.join(source, filename);
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, path.join(destination, filename));
    }
  }
  writePackage(destination, manifest);
};

const pack = (stagingDirectory, outputDirectory, npmCache) => {
  const result = run(
    "npm",
    ["pack", "--json", "--pack-destination", outputDirectory],
    {
      capture: true,
      cwd: stagingDirectory,
      env: { ...process.env, npm_config_cache: npmCache },
    },
  );
  const [{ filename }] = JSON.parse(result);
  return path.join(outputDirectory, filename);
};

const sha256 = (filename) =>
  crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");

const writeConsumer = (directory, mainTarball) => {
  fs.mkdirSync(path.join(directory, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: {
          build: "tsc --noEmit && vite build",
        },
        dependencies: {
          "@uxheavy/excalidraw": `file:${mainTarball}`,
          react: "19.0.0",
          "react-dom": "19.0.0",
        },
        devDependencies: {
          "@types/react": "19.0.10",
          "@types/react-dom": "19.0.4",
          typescript: "5.9.3",
          vite: "5.0.12",
        },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(directory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(directory, "index.html"),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n',
  );
  fs.writeFileSync(
    path.join(directory, "src", "main.tsx"),
    `import React from "react";
import { createRoot } from "react-dom/client";
import {
  Excalidraw,
  getSyncableElements,
  isSyncableElement,
  type SyncableExcalidrawElement,
} from "@uxheavy/excalidraw";

type OnPaste = NonNullable<React.ComponentProps<typeof Excalidraw>["onPaste"]>;
const onPaste: OnPaste = async () => [] as const;
const syncableElements: readonly SyncableExcalidrawElement[] =
  getSyncableElements([]);
const syncabilityCheck = isSyncableElement;

void syncableElements;
void syncabilityCheck;

createRoot(document.getElementById("root")!).render(
  <Excalidraw
    onPaste={onPaste}
    hostToolbarItems={[
      {
        id: "consumer-command",
        label: "Consumer command",
        shortcuts: [{ key: "w" }],
        onSelect: () => undefined,
      },
    ]}
    toolShortcutOverrides={{ freedraw: [{ key: "d" }] }}
  />,
);
`,
  );
};

const verifyConsumer = async ({
  commonTarball,
  mainStage,
  npmCache,
  temporaryDirectory,
}) => {
  const server = http.createServer((request, response) => {
    if (request.url === `/${path.basename(commonTarball)}`) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": fs.statSync(commonTarball).size,
      });
      fs.createReadStream(commonTarball).pipe(response);
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not resolve the verification server address.");
    }
    const verificationStage = path.join(
      temporaryDirectory,
      "verification-main",
    );
    fs.cpSync(mainStage, verificationStage, { recursive: true });
    const verificationManifest = JSON.parse(
      fs.readFileSync(path.join(verificationStage, "package.json"), "utf8"),
    );
    verificationManifest.dependencies[
      "@excalidraw/common"
    ] = `http://127.0.0.1:${address.port}/${path.basename(commonTarball)}`;
    writePackage(verificationStage, verificationManifest);

    const verificationArtifacts = path.join(
      temporaryDirectory,
      "verification-artifacts",
    );
    fs.mkdirSync(verificationArtifacts);
    const verificationMainTarball = pack(
      verificationStage,
      verificationArtifacts,
      npmCache,
    );
    const consumer = path.join(temporaryDirectory, "consumer");
    writeConsumer(consumer, verificationMainTarball);
    const environment = { ...process.env, npm_config_cache: npmCache };
    await runAsync(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
      { cwd: consumer, env: environment },
    );
    run("npm", ["run", "build"], { cwd: consumer, env: environment });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const main = async () => {
  const outputDirectory = parseOutputDirectory();
  assertSource();

  run("yarn", ["--cwd", "./packages/common", "build:esm"]);
  run("yarn", ["--cwd", "./packages/excalidraw", "build:esm"]);

  const temporaryDirectory = fs.mkdtempSync(
    path.join(require("os").tmpdir(), "excalidraw-package-artifacts-"),
  );
  fs.mkdirSync(path.dirname(outputDirectory), { recursive: true });
  const artifactStagingDirectory = fs.mkdtempSync(
    path.join(path.dirname(outputDirectory), ".excalidraw-package-artifacts-"),
  );
  const npmCache = path.join(temporaryDirectory, "npm-cache");

  try {
    const commonStage = path.join(temporaryDirectory, "common");
    const mainStage = path.join(temporaryDirectory, "excalidraw");
    const commonManifest = {
      ...readPackage("common"),
      name: "@uxheavy/excalidraw-common",
      version: FORK_PACKAGE_VERSION,
    };
    const mainManifest = {
      ...readPackage("excalidraw"),
      name: "@uxheavy/excalidraw",
      version: FORK_PACKAGE_VERSION,
    };
    mainManifest.dependencies = {
      ...mainManifest.dependencies,
      "@excalidraw/common": `${RELEASE_ASSET_BASE_URL}/uxheavy-excalidraw-common-${FORK_PACKAGE_VERSION}.tgz`,
      "@excalidraw/element": PUBLIC_INTERNAL_PACKAGE_VERSION,
      "@excalidraw/math": PUBLIC_INTERNAL_PACKAGE_VERSION,
    };

    stagePackage("common", commonStage, commonManifest);
    stagePackage("excalidraw", mainStage, mainManifest);

    const commonTarball = pack(commonStage, artifactStagingDirectory, npmCache);
    const mainTarball = pack(mainStage, artifactStagingDirectory, npmCache);
    const artifacts = [commonTarball, mainTarball].map((filename) => ({
      filename: path.basename(filename),
      sha256: sha256(filename),
    }));
    const artifactManifest = {
      schemaVersion: 1,
      source: {
        publicBaseCommit: PUBLIC_BASE_COMMIT,
        forkCommit: FORK_SOURCE_COMMIT,
      },
      release: {
        tag: RELEASE_TAG,
        assetBaseUrl: RELEASE_ASSET_BASE_URL,
      },
      packages: artifacts,
    };
    fs.writeFileSync(
      path.join(artifactStagingDirectory, "artifact-manifest.json"),
      `${JSON.stringify(artifactManifest, null, 2)}\n`,
    );

    await verifyConsumer({
      commonTarball,
      mainStage,
      npmCache,
      temporaryDirectory,
    });

    if (fs.existsSync(outputDirectory)) {
      fs.rmdirSync(outputDirectory);
    }
    fs.renameSync(artifactStagingDirectory, outputDirectory);
    console.info(
      `Packed and verified ${artifacts.length} artifacts in ${outputDirectory}.`,
    );
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    fs.rmSync(artifactStagingDirectory, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
