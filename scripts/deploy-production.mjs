import { spawnSync } from "node:child_process";

const productionBranch = process.env.PRODUCTION_BRANCH ?? "master";
const workersCiBranch = process.env.WORKERS_CI_BRANCH;
const isWorkersCi = process.env.WORKERS_CI === "1" || process.env.WORKERS_CI === "true";

run("npm", ["run", "docs:prepare"]);

if (isWorkersCi && workersCiBranch !== productionBranch) {
  console.log(
    `Skipping production deploy for Workers CI branch "${workersCiBranch ?? "(unknown)"}"; production branch is "${productionBranch}".`,
  );
  process.exit(0);
}

run("npx", ["--yes", "wrangler", "d1", "migrations", "apply", "DB", "--remote"]);
run("npx", ["--yes", "wrangler", "deploy"]);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
