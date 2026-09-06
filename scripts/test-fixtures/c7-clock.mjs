// Synthetic Windows child tests only. Production entrypoints never import this.
const fixed = process.env.C7_SYNTHETIC_NOW;
if (fixed !== undefined) {
  const RealDate = Date;
  const timestamp = RealDate.parse(fixed);
  if (!Number.isFinite(timestamp)) throw new TypeError("invalid fixture clock");
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [timestamp]));
    }
    static now() { return timestamp; }
  };
}
