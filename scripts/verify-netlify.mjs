import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = [
  'FoodLab_AI_Portal',
  'Food_Product_Development_AI',
  'Food_Sensory_AI',
  'Food_Shelf_Life_Predictor',
  'Food_QA_Dashboard',
];
const spaRedirect = '/* /index.html 200';
const portalEnvironment = new Map([
  ['VITE_PRODUCT_DEVELOPMENT_URL', 'https://foodlab-product-development.netlify.app'],
  ['VITE_SENSORY_URL', 'https://foodlab-sensory.netlify.app'],
  ['VITE_SHELF_LIFE_URL', 'https://foodlab-shelf-life.netlify.app'],
  ['VITE_QA_URL', 'https://foodlab-qa.netlify.app'],
]);

const results = [];

function record(label, passed, detail = '') {
  results.push({ label, passed, detail });
}

function readUtf8(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function checkFile(relativePath, label) {
  const present = existsSync(path.join(rootDir, relativePath));
  record(label, present, present ? '' : `Missing ${relativePath}`);
  return present;
}

function isSpaRedirectFile(content) {
  return content.replace(/\r\n/g, '\n').trim() === spaRedirect;
}

function inspectApp(app) {
  const packagePath = `${app}/package.json`;
  if (checkFile(packagePath, `${app}: package.json exists`)) {
    try {
      const packageJson = JSON.parse(readUtf8(packagePath));
      const buildScript = packageJson?.scripts?.build;
      record(
        `${app}: build script is declared`,
        typeof buildScript === 'string' && buildScript.trim().length > 0,
        'package.json must declare a non-empty scripts.build command',
      );
    } catch {
      record(`${app}: package.json is valid JSON`, false, 'Could not parse package.json');
    }
  }

  const configPath = `${app}/netlify.toml`;
  if (checkFile(configPath, `${app}: netlify.toml exists`)) {
    const config = readUtf8(configPath);
    record(
      `${app}: Netlify build command`,
      /^\s*command\s*=\s*["']npm run build["']\s*$/m.test(config),
      'Expected command = "npm run build"',
    );
    record(
      `${app}: Netlify publish directory`,
      /^\s*publish\s*=\s*["']dist["']\s*$/m.test(config),
      'Expected publish = "dist"',
    );
    record(
      `${app}: Netlify Node version`,
      /^\s*NODE_VERSION\s*=\s*["']20["']\s*$/m.test(config),
      'Expected NODE_VERSION = "20"',
    );
    record(
      `${app}: Netlify SPA catch-all`,
      /\[\[redirects\]\]\s*(?:\r?\n)+\s*from\s*=\s*["']\/\*["']\s*(?:\r?\n)+\s*to\s*=\s*["']\/index\.html["']\s*(?:\r?\n)+\s*status\s*=\s*200\b/.test(
        config,
      ),
      'Expected /* -> /index.html with status 200',
    );
  }

  for (const redirectPath of [`${app}/public/_redirects`, `${app}/dist/_redirects`]) {
    if (checkFile(redirectPath, `${app}: ${redirectPath.includes('/public/') ? 'source' : 'built'} _redirects exists`)) {
      record(
        `${app}: ${redirectPath.includes('/public/') ? 'source' : 'built'} SPA redirect is exact`,
        isSpaRedirectFile(readUtf8(redirectPath)),
        `Expected exactly: ${spaRedirect}`,
      );
    }
  }

  const indexRelativePath = `${app}/dist/index.html`;
  if (checkFile(indexRelativePath, `${app}: dist/index.html exists`)) {
    const distDir = path.resolve(rootDir, app, 'dist');
    const indexHtml = readUtf8(indexRelativePath);
    const missingAssets = [];
    const unsafeAssets = [];
    const references = indexHtml.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi);

    for (const match of references) {
      const reference = match[2].trim();
      if (
        !reference ||
        /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)
      ) {
        continue;
      }

      const cleanReference = reference.split(/[?#]/, 1)[0];
      let decodedReference;
      try {
        decodedReference = decodeURIComponent(cleanReference);
      } catch {
        unsafeAssets.push(reference);
        continue;
      }

      const referencedPath = path.resolve(
        distDir,
        decodedReference.startsWith('/') ? `.${decodedReference}` : decodedReference,
      );
      const staysInsideDist =
        referencedPath === distDir || referencedPath.startsWith(`${distDir}${path.sep}`);
      if (!staysInsideDist) {
        unsafeAssets.push(reference);
      } else if (!existsSync(referencedPath)) {
        missingAssets.push(reference);
      }
    }

    record(
      `${app}: index asset paths stay inside dist`,
      unsafeAssets.length === 0,
      unsafeAssets.length ? `Unsafe local references: ${unsafeAssets.join(', ')}` : '',
    );
    record(
      `${app}: referenced local assets exist`,
      missingAssets.length === 0,
      missingAssets.length ? `Missing local assets: ${missingAssets.join(', ')}` : '',
    );
  }
}

function inspectPortalEnvironment() {
  const environmentPath = 'FoodLab_AI_Portal/.env.example';
  if (!checkFile(environmentPath, 'Portal: .env.example exists')) {
    return;
  }

  const entries = new Map();
  const malformedLines = [];
  for (const rawLine of readUtf8(environmentPath).replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator < 1) {
      malformedLines.push(line);
      continue;
    }
    entries.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const exact =
    malformedLines.length === 0 &&
    entries.size === portalEnvironment.size &&
    [...portalEnvironment].every(([key, value]) => entries.get(key) === value);
  record(
    'Portal: .env.example has the four exact HTTPS module URLs',
    exact,
    'Expected only the documented Product, Sensory, Shelf Life, and QA Netlify URLs',
  );
}

function sourceFiles() {
  try {
    return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: rootDir,
      encoding: 'utf8',
      windowsHide: true,
    })
      .split('\0')
      .filter(Boolean);
  } catch {
    record('Source control: tracked files can be inspected', false, 'git ls-files failed');
    return [];
  }
}

function inspectSourceFiles(files) {
  const forbiddenGenerated = files.filter((file) =>
    /(?:^|\/)(?:node_modules|dist|build|\.netlify)(?:\/|$)/i.test(file),
  );
  record(
    'Source control: generated dependency/build directories are not tracked',
    forbiddenGenerated.length === 0,
    forbiddenGenerated.length ? `Tracked forbidden paths: ${forbiddenGenerated.join(', ')}` : '',
  );

  const realEnvironmentFiles = files.filter((file) => {
    const name = path.posix.basename(file);
    return /^\.env(?:\.|$)/i.test(name) && name.toLowerCase() !== '.env.example';
  });
  record(
    'Source control: real environment files are not tracked',
    realEnvironmentFiles.length === 0,
    realEnvironmentFiles.length ? `Tracked environment files: ${realEnvironmentFiles.join(', ')}` : '',
  );

  const secretRules = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
    ['OpenAI-style API key', /\bsk-(?:proj-|svcacct-|ant-)?[A-Za-z\d_-]{20,}\b/],
    ['GitHub token', /\bgh[pousr]_[A-Za-z\d]{20,}\b/],
    ['AWS access key', /\b(?:AKIA|ASIA)[A-Z\d]{16}\b/],
    ['Google API key', /\bAIza[A-Za-z\d_-]{35}\b/],
    ['Slack token', /\bxox[baprs]-[A-Za-z\d-]{20,}\b/],
    ['npm token', /\bnpm_[A-Za-z\d]{30,}\b/],
    ['Netlify token', /\bnfp_[A-Za-z\d_-]{20,}\b/],
    ['Hugging Face token', /\bhf_[A-Za-z\d]{20,}\b/],
    ['live Stripe secret', /\b(?:sk|rk)_live_[A-Za-z\d]{16,}\b/],
    ['credential-bearing URL', /https?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/i],
  ];
  const findings = [];

  for (const file of files) {
    const absolutePath = path.join(rootDir, ...file.split('/'));
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      continue;
    }
    const buffer = readFileSync(absolutePath);
    if (buffer.includes(0)) {
      continue;
    }
    const content = buffer.toString('utf8');
    for (const [label, pattern] of secretRules) {
      if (pattern.test(content)) {
        findings.push(`${file} (${label})`);
      }
    }
  }

  record(
    'Source control: no likely API keys or personal secrets detected',
    findings.length === 0,
    findings.length ? `Potential secret patterns found in: ${findings.join(', ')}` : '',
  );
}

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function inspectBuiltLocalhostReferences() {
  // React Router contains an internal, non-navigation `http://localhost` URL-parsing
  // base. Release failures target deployable local app URLs (development ports) and
  // any loopback-IP URL, which are the unsafe production navigation dependencies.
  const localUrlPattern = /(?:https?:)?(?:\\?\/){2}(?:localhost:\d+|127\.0\.0\.1(?::\d+)?)\b/i;
  const findings = [];

  for (const app of apps) {
    const distDir = path.join(rootDir, app, 'dist');
    if (!existsSync(distDir)) {
      findings.push(`${app}/dist (missing)`);
      continue;
    }
    for (const file of walkFiles(distDir)) {
      if (!/\.(?:html|js|css)$/i.test(file)) {
        continue;
      }
      if (localUrlPattern.test(readFileSync(file, 'utf8'))) {
        findings.push(path.relative(rootDir, file).split(path.sep).join('/'));
      }
    }
  }

  record(
    'Production bundles: no localhost or 127.0.0.1 URL references',
    findings.length === 0,
    findings.length ? `Local URL references found in: ${findings.join(', ')}` : '',
  );
}

for (const app of apps) {
  inspectApp(app);
}
inspectPortalEnvironment();
const files = sourceFiles();
if (files.length > 0) {
  record('Source control: tracked and untracked release files can be inspected', true);
  inspectSourceFiles(files);
}
inspectBuiltLocalhostReferences();

for (const result of results) {
  const status = result.passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${result.label}${result.detail && !result.passed ? ` — ${result.detail}` : ''}`);
}

const failures = results.filter((result) => !result.passed);
console.log(`\nNetlify readiness: ${results.length - failures.length}/${results.length} checks passed.`);
if (failures.length > 0) {
  console.error(`Netlify readiness verification failed with ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Netlify readiness verification passed.');
}
