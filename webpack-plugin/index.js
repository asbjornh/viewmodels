const path = require("path");

const filterPaths = require("./filter-paths");
const getFileExtension = require("./get-file-extension");
const generateTypes = require("./generate-types");
const { log, logError } = require("./log");

const defaultOptions = {
  compilerOptions: {},
  exclude: ["node_modules"],
  fileExtension: undefined,
  include: [/\.jsx$/],
  log: false,
  path: ""
};

function PropTypesCSharpPlugin(options) {
  this.options = Object.assign({}, defaultOptions, options);
}

// TODO: Rename baseClass -> supertype
PropTypesCSharpPlugin.prototype.apply = function(compiler) {
  compiler.hooks.emit.tap(
    { name: "PropTypesCSharpPlugin" },
    compilation => runThePlugin(compilation, this.options) // This callback runs every time the 'emit' webpack event occurs
  );
};

function runThePlugin(compilation, options) {
  const assertArray = (arr, name) =>
    Array.isArray(arr)
      ? true
      : logError(compilation, `Bad configuration: ${name} is not an array`);

  if (
    compilation.errors.length || // Abort if compilation has errors
    !assertArray(options.exclude, "options.exclude") ||
    !assertArray(options.include, "options.include")
  ) {
    return;
  }

  if (options.log) {
    process.stdout.write("[ViewModel plugin]: Generating types...\n");
  }

  const modulePaths = filterPaths(
    Array.from(compilation.fileDependencies),
    options.include,
    options.exclude
  );

  const result = generateTypes(modulePaths, options.compilerOptions);
  log(options, compilation, result);

  const outputPath = path.normalize(options.path);
  const fileExtension =
    options.fileExtension ||
    getFileExtension(options.compilerOptions.generator) ||
    "cs";

  if (!result.error) {
    result.types.forEach(({ code, typeName }) => {
      if (code && typeName) {
        const fileName = `${typeName}.${fileExtension}`;
        const filePath = path.join(outputPath, fileName);
        const asset = { source: () => code, size: () => code.length };
        compilation.assets[filePath] = asset;
      }
    });
  }
}

PropTypesCSharpPlugin["default"] = PropTypesCSharpPlugin;
module.exports = PropTypesCSharpPlugin;
