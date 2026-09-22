import { scoreGoldenEval } from "../src/lib/eval-handoff";
import { scoreReleaseTicketWiring } from "../src/lib/copilot-studio";

const checks = [
  ...scoreGoldenEval(),
  ...scoreReleaseTicketWiring().map((check) => ({
    ...check,
    id: `releaseticket-${check.id}`,
  })),
];
for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.id} — ${check.detail}`);
}
const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`\n${failed.length} golden eval check(s) failed.`);
  process.exit(1);
}
console.log("\nAll golden eval checks passed.");
