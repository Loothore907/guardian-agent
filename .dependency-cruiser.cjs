/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolved",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "packages-do-not-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "executor-has-no-provider-or-broker-dependencies",
      severity: "error",
      from: { path: "^packages/executor/" },
      to: { path: "^packages/(research|guardian|authorization|broker|adapter-github)/" },
    },
    {
      name: "providers-have-no-privileged-dependencies",
      severity: "error",
      from: { path: "^packages/(research|guardian)/" },
      to: { path: "^packages/(authorization|broker|adapter-github)/" },
    },
    {
      name: "adapters-do-not-interpret-agent-context",
      severity: "error",
      from: { path: "^packages/adapter-github/" },
      to: { path: "^packages/(session|research|guardian)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(dist|coverage|\\.cache)/" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      conditionNames: ["types", "import", "default"],
      exportsFields: ["exports"],
    },
  },
};
