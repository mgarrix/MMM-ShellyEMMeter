const js = require("@eslint/js");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // blocco SOLO per ignorare file/cartelle
  {
    ignores: [
      "node_modules/",
      "vendor/",
      "dist/",
      "build/",
      "config.sample.js"
    ]
  },

  // config vera e propria
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
      // puoi aggiungere regole qui
    }
  }
];
