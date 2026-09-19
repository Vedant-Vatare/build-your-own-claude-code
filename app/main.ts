import { debug } from "./debug";
import { startTui } from "./tui/app";

startTui().catch((error) => {
  debug(error);
  console.error(error);
  process.exit(1);
});
