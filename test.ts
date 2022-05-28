import { runOnce } from "./mod.ts";
import { assert } from "./deps.ts";

//** All environmental variables need to be defined */
Deno.test("runOnce", async () => {
  const output = await runOnce({
    origin: Deno.env.get("ARUBAOS_SWITCH_ORIGIN")!,
  }, "show system");
  assert(output);
});
