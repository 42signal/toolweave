import { executeTool } from "./execute-tool";

addEventListener("message", (event: MessageEvent<unknown>) => {
  postMessage(executeTool(event.data));
});
