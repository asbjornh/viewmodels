const test = require("ava");
const RuleTester = require("eslint-ava-rule-tester");
const path = require("path");

const messages = require("./messages");
const plugin = require("./index");

test("Compatibility with proxy plugin path", t => {
  t.notThrows(() => {
    // Be very careful when changing this! Moving the eslint plugin from '/eslint-plugin' will break compatibility with the proxy plugin
    require(path.join(__dirname, "..", "eslint-plugin"));
  });
});

const ruleTester = new RuleTester(test, {
  parser: path.resolve(__dirname, "../node_modules/babel-eslint/lib/index.js"),
  parserOptions: {
    ecmaVersion: 6,
    ecmaFeatures: { classes: true, jsx: true },
    sourceType: "module"
  }
});

const footer = "export default A;";

// These all have 'footer' appended further down
const validCases = [
  // Only export statement
  "",

  // Empty propTypes
  "A.propTypes = {};",

  // No object literal in propTypes
  "A.propTypes = B.propTypes;",

  // Weird value for propTypes
  "A.propTypes = false;",

  // Empty viewModelMeta
  "A.viewModelMeta = {};",

  // No object literal
  "A.viewModelMeta;",

  // No object literal (class component)
  "class A { static viewModelMeta }",

  // Non-object viewModelMeta
  "A.viewModelMeta = false;",

  // No object literal in propTypes (class component)
  "class A { static propTypes = B.propTypes; }",

  // Ignored with viewModelMeta
  'A.propTypes = { b: PropTypes.object }; A.viewModelMeta = "ignore";',

  // Ignored with viewModelMeta (class)
  'class A { static propTypes = { b: PropTypes.object }; static viewModelMeta = "ignore"; }',

  // Invalid 'object' with meta type
  'A.propTypes = { b: PropTypes.object }; A.viewModelMeta = { b: "ignore" };',

  // Invalid 'object' with meta type (class component)
  'class A { static propTypes = { b: PropTypes.object }; static viewModelMeta = { b: "ignore" };}',

  // Invalid required 'object' with meta type
  'A.propTypes = { b: PropTypes.object.isRequired }; A.viewModelMeta = { b: "ignore" };',

  // Invalid required 'object' with meta type (class component)
  'class A { static propTypes = { b: PropTypes.object.isRequired }; static viewModelMeta = { b: "ignore" }; }',

  // Invalid 'array' with meta type
  'A.propTypes = { b: PropTypes.array }; A.viewModelMeta = { b: "ignore" };',

  // Invalid 'array' with meta type (class component)
  'class A { static propTypes = { b: PropTypes.array }; static viewModelMeta = { b: "ignore" }; }',

  // Invalid 'oneOfType' with meta type
  'A.propTypes = { b: PropTypes.oneOfType() }; A.viewModelMeta = { b: "ignore" };',

  // Invalid 'oneOfType' with meta type (class component)
  'class A { static propTypes = { b: PropTypes.oneOfType() }; static viewModelMeta = { b: "ignore" }; }',

  // Invalid function call with meta type
  'A.propTypes = { b: someFunc() }; A.viewModelMeta = { b: "ignore" };',

  // Invalid function call with meta type (class component)
  'class A { static propTypes = { b: someFunc() }; static viewModelMeta = { b: "ignore" }; }',

  // Valid meta type component reference
  "A.viewModelMeta = { b: B };",

  // Valid meta type array
  "A.viewModelMeta = { b: [B] };",

  // Valid meta type array (class component)
  "class A { static viewModelMeta = { b: [B] }; }",

  // Valid meta type 'ignore'
  'A.viewModelMeta = { b: "ignore" };',

  // Valid meta type 'ignore' (class component)
  'class A { static viewModelMeta = { b: "ignore" }; }',

  // Valid meta types
  `A.viewModelMeta = {
    b: 'int',
    c: 'int?',
    d: 'float',
    e: 'float?',
    f: 'double',
    g: 'double?'
  };`,

  // Valid meta types (class component)
  `class A {
    static viewModelMeta = {
      b: 'int',
      c: 'int?',
      d: 'float',
      e: 'float?',
      f: 'double',
      g: 'double?'
    };
  }`,

  // Object with nested meta
  "A.propTypes = { b: PropTypes.object }; A.viewModelMeta = { b: { c: Link } };",

  // Empty shape
  "A.propTypes = { b: PropTypes.shape() };",

  // Nested shape with bad prop and nested meta
  "A.propTypes = { b: PropTypes.shape({ c: PropTypes.object }) }; A.viewModelMeta = { b: { c: Link } };",

  // Reference to object literal in Object.keys
  'const obj = { c: "d" }; A.propTypes = { c: PropTypes.oneOf(Object.keys(obj)) };',

  // Reference to object literal in Object.values
  'const obj = { c: "d" }; A.propTypes = { c: PropTypes.oneOf(Object.values(obj)) };',

  // Reference to component in PropTypes.shape
  "A.propTypes = { b: PropTypes.shape(C.propTypes) };",

  // Reference to array literal in oneOf
  "const arr = [1,2]; A.propTypes = { c: PropTypes.oneOf(arr) };"
].map(code => code + footer);

// These all have 'footer' appended further down
const invalidCases = [
  // Misspelled 'ignore' literal

  ['A.viewModelMeta = "igno";', messages.badIgnore("igno")],

  // PropTypes.object
  ["A.propTypes = { b: PropTypes.object };", messages.object()],

  // PropTypes.object (class component)
  ["class A { static propTypes = { b: PropTypes.object };}", messages.object()],

  // PropTypes.array
  ["A.propTypes = { b: PropTypes.array };", messages.array()],

  // PropTypes.array (class component)
  ["class A { static propTypes = { b: PropTypes.array }; }", messages.array()],

  // PropTypes.object.isRequired
  ["A.propTypes = { b: PropTypes.object.isRequired };", messages.object()],

  // Object in arrayOf
  [
    "A.propTypes = { b: PropTypes.arrayOf(PropTypes.object) };",
    messages.object()
  ],

  // PropTypes.object.isRequired (class component)
  [
    "class A { static propTypes = { b: PropTypes.object.isRequired }; }",
    messages.object()
  ],

  // PropTypes.oneOfType
  ["A.propTypes = { b: PropTypes.oneOfType() };", messages.oneOfType()],

  // PropTypes.oneOfType (class component)
  [
    "class A { static propTypes = { b: PropTypes.oneOfType() }; }",
    messages.oneOfType()
  ],

  // Name collision
  ["A.propTypes = { a: PropTypes.string };", messages.propNameCollision()],

  // Name collision (class component)
  [
    "class A { static propTypes = { a: PropTypes.string }; }",
    messages.propNameCollision()
  ],

  // Invalid function call
  ["A.propTypes = { b: someFunc() };", messages.illegalFunctionCall()],

  // Invalid function call (class component)
  [
    "class A { static propTypes = { b: someFunc() }; }",
    messages.illegalFunctionCall()
  ],

  // Invalid identifier
  [
    "class A { static propTypes = { b: someIdentifier }; }",
    messages.illegalIdentifier()
  ],

  // Nested without meta
  [
    "A.propTypes = { b: PropTypes.shape({ c: PropTypes.object }) };",
    messages.object()
  ],

  // Typos in string literals
  ['A.viewModelMeta = { b: "igno" };', messages.badStringLiteral("igno")],

  // Invalid meta (function)
  ["A.viewModelMeta = { b: someFunc(B) };", messages.badMeta()],

  // Invalid meta in array
  [
    'A.viewModelMeta = { b: ["abcdefg"] };',
    messages.badStringLiteral("abcdefg")
  ],

  // Imported object in Object.keys
  [
    'import obj from "./obj"; A.propTypes = { c: PropTypes.oneOf(Object.keys(obj)) };',
    messages.importedObjectReference()
  ],

  // Imported object in Object.values
  [
    'import obj from "./obj"; A.propTypes = { c: PropTypes.oneOf(Object.values(obj)) };',
    messages.importedObjectReference()
  ],

  // Incomplete statement (should not make the plugin crash)
  [
    "const arr = [1,2]; A.propTypes = { c: PropTypes.oneOf(Object.values()) };",
    messages.missingObjectReference()
  ],

  // Imported arrays in oneOf
  [
    'import arr from "./arr"; A.propTypes = { c: PropTypes.oneOf(arr) };',
    messages.importedArrayReference()
  ],

  // Invalid reference in shape
  [
    "A.propTypes = { b: PropTypes.shape(Something.somethingElse) };",
    messages.illegalReference()
  ],

  // Invalid reference in exact
  [
    "A.propTypes = { b: PropTypes.exact(Something.somethingElse) };",
    messages.illegalReference()
  ]
]
  .map(([code, ...errors]) => [code + footer, ...errors])
  .concat([
    // Missing export
    ["const A = () => {};", messages.noExport()],

    // Too many exports
    [
      "const A = {}, B = {}; export { A, B };",
      messages.tooManyExports(),
      messages.tooManyExports()
    ],

    // Too many exports
    [
      "const A = {}, B = {}, C = {}; export default A; export { B, C };",
      messages.tooManyExports(),
      messages.tooManyExports(),
      messages.tooManyExports()
    ]
  ]);

// The eslint plugin will only run for .jsx files, so a filename is added for all tests
ruleTester.run("all", plugin.rules.all, {
  valid: validCases.map(code => ({ code, filename: "a.jsx" })),
  invalid: invalidCases.map(([code, ...errors]) => ({
    code,
    filename: "a.jsx",
    errors: errors.map(error => ({ message: error }))
  }))
});

// Test non-jsx files
ruleTester.run("all", plugin.rules.all, {
  valid: [{ code: "C.propTypes = { a: propTypes.object };", filename: "a.js" }],
  invalid: []
});