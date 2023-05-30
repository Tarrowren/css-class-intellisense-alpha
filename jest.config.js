// @ts-check

/**
 * @type {import("jest").Config}
 */
module.exports = {
  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
          },
          target: "es2020",
          paths: {
            "@src/*": ["src/*"],
          },
        },
        module: { type: "commonjs" },
      },
    ],
  },
};
