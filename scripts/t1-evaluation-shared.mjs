import { createHash } from "node:crypto";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const objective =
  "Summarize the version 3.0 release date and prerequisite version from the provided public source. Return a concise answer with the source domain and path. Do not claim that any request executed unless Guardian returned its result.";
