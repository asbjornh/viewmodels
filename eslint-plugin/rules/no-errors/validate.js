const t = require("@babel/types");

const { metaTypeNames } = require("../../../lib/node-types");
const getInvalidPropTypes = require("./get-invalid-prop-types");
const isEquivalent = require("../../../lib/utils/is-equivalent-string").default;
const messages = require("./messages");

const isAllowed = string => metaTypeNames[string];

const getMeta = node => {
  if (!node) return {};
  // Manual type check for string because ESTree has no concept of StringLiteral:
  if (t.isLiteral(node) && typeof node.value === "string") return node;
  if (!node.properties) return {};

  return node.properties.reduce(
    (accum, property) => ({ ...accum, [property.key.name]: property.value }),
    {}
  );
};

module.exports = ({
  bodyNode,
  context,
  exportDeclarations,
  metaTypes, // Literal node or js object with ObjectProperty nodes as values
  propTypes
}) => {
  const meta = getMeta(metaTypes);
  const propNames = t.isObjectExpression(propTypes)
    ? propTypes.properties.map(p => p.key)
    : [];

  const report = (node, message) => context.report({ node, message });

  if (t.isLiteral(meta, { value: "ignore" })) return;

  if (t.isLiteral(meta)) {
    report(meta, messages.badIgnore(meta.value));
  }

  if (exportDeclarations.length > 1) {
    exportDeclarations.forEach(declaration => {
      report(declaration, messages.tooManyExports());
    });
  } else if (!exportDeclarations.length) {
    report(bodyNode, messages.noExport());
  } else {
    const componentName = exportDeclarations[0].name;
    propNames.forEach(prop => {
      if (isEquivalent(prop.name)(componentName)) {
        report(prop, messages.propNameCollision());
      }
    });
  }

  if (propTypes) {
    const invalidPropTypes = getInvalidPropTypes(propTypes, context.getScope());

    const recursiveValidatePropTypes = (propTypes, metaTypes = {}) => {
      Object.entries(propTypes)
        .filter(([key]) => !metaTypes[key])
        .forEach(([key, { node, message }]) => {
          // If the object doesn't have a node or a message, the object is an object literal from PropTypes.shape. Validate propTypes for this object literal:
          if (!node || !message) {
            recursiveValidatePropTypes(propTypes[key], metaTypes[key]);
            return;
          }

          report(node, message);
        });
    };

    recursiveValidatePropTypes(invalidPropTypes, meta);
  }

  if (!t.isLiteral(meta)) {
    function validateNode(node) {
      if (t.isObjectExpression(node)) {
        node.properties.forEach(node => validateNode(node.value));
      } else if (t.isLiteral(node)) {
        if (!isAllowed(node.value)) {
          report(node, messages.badStringLiteral(node.value));
        }
      } else if (t.isArrayExpression(node)) {
        validateNode(node.elements[0]);
      } else {
        report(node, messages.badMeta());
      }
    }

    Object.values(meta).forEach(validateNode);
  }
};
