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
      to: {
        path: "^packages/(authority-store|research|guardian|interaction|worker|authorization|broker|adapter-github)/",
      },
    },
    {
      name: "workspace-materializer-only-depends-on-contracts-and-canonicalization",
      severity: "error",
      from: { path: "^packages/workspace/" },
      to: { path: "^packages/(?!workspace/|contracts/|canonical/)" },
    },
    {
      name: "providers-have-no-privileged-dependencies",
      severity: "error",
      from: { path: "^packages/(research|guardian|interaction|worker)/" },
      to: { path: "^packages/(authority-store|authorization|broker|adapter-github)/" },
    },
    {
      name: "credential-store-is-not-agent-accessible",
      severity: "error",
      from: {
        path: "^(?!packages/credential-store/|apps/(guardian-cli|interaction-service|worker-service|guardian-service|research-service|broker-service)/)",
      },
      to: { path: "^packages/credential-store/" },
    },
    {
      name: "credential-store-only-depends-on-contracts",
      severity: "error",
      from: { path: "^packages/credential-store/" },
      to: { path: "^packages/(?!credential-store/|contracts/)" },
    },
    {
      name: "credential-verification-only-depends-on-contracts",
      severity: "error",
      from: { path: "^packages/credential-verification/" },
      to: { path: "^packages/(?!credential-verification/|contracts/)" },
    },
    {
      name: "credential-verification-is-setup-only",
      severity: "error",
      from: { path: "^(?!packages/credential-verification/|apps/guardian-cli/)" },
      to: { path: "^packages/credential-verification/" },
    },
    {
      name: "interaction-service-has-no-privileged-dependencies",
      severity: "error",
      from: { path: "^apps/interaction-service/", pathNot: "\\.test\\.ts$" },
      to: { path: "^packages/(authority-store|authorization|broker|adapter-github)/" },
    },
    {
      name: "worker-service-has-no-privileged-dependencies",
      severity: "error",
      from: { path: "^apps/worker-service/", pathNot: "\\.test\\.ts$" },
      to: { path: "^packages/(authority-store|authorization|broker|adapter-github)/" },
    },
    {
      name: "authority-store-only-depends-on-contracts",
      severity: "error",
      from: { path: "^packages/authority-store/" },
      to: { path: "^packages/(?!authority-store/|contracts/)" },
    },
    {
      name: "authority-store-is-only-opened-by-the-authority-service",
      severity: "error",
      from: {
        path: "^(?!apps/authority-service/|packages/authority-store/)",
        pathNot: "\\.test\\.ts$",
      },
      to: { path: "^packages/authority-store/" },
    },
    {
      name: "broker-does-not-own-authority-persistence",
      severity: "error",
      from: {
        path: "^(apps/broker-service|packages/broker)/",
        pathNot: "\\.test\\.ts$",
      },
      to: { path: "^packages/authority-store/" },
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
