const js = require("@eslint/js");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      "node_modules/",
      "vendor/",
      "dist/",
      "build/",
      "config.sample.js"
    ]
  },

  // config
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        // Node
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        URL: "readonly",
        // MagicMirror²
        Module: "readonly",
        Log: "readonly",
        document: "readonly",
        ihtml: "writable"
      }
    },
    rules: {

    }
  }
];
