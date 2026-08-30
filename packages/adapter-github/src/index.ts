export type GitHubOperation =
  | {
      readonly type: "github.pull_request.read";
      readonly owner: string;
      readonly repository: string;
      readonly pullRequest: number;
    }
  | {
      readonly type: "github.pull_request.merge";
      readonly owner: string;
      readonly repository: string;
      readonly pullRequest: number;
      readonly expectedHeadSha: string;
      readonly method: "squash";
    };
