const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

const realNM = fs.existsSync(path.resolve(monorepoRoot, "node_modules"))
  ? fs.realpathSync(path.resolve(monorepoRoot, "node_modules"))
  : null;
const realMobileNM = fs.existsSync(path.resolve(projectRoot, "node_modules"))
  ? fs.realpathSync(path.resolve(projectRoot, "node_modules"))
  : null;

// Watch all files within the monorepo while preserving defaults
config.watchFolders = [
  ...(config.watchFolders || []),
  monorepoRoot,
  ...(realNM ? [realNM] : []),
  ...(realMobileNM ? [realMobileNM] : []),
];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
  ...(realMobileNM ? [realMobileNM] : []),
  ...(realNM ? [realNM] : []),
];

module.exports = config;
