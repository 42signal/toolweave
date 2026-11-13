export class TestWorker extends EventTarget {
  static instances: TestWorker[] = [];
  static failConstruction = false;
  terminated = false;
  requests: unknown[] = [];

  constructor() {
    super();
    if (TestWorker.failConstruction) throw new Error("Worker unavailable");
    TestWorker.instances.push(this);
  }

  postMessage(request: unknown) {
    this.requests.push(request);
  }

  terminate() {
    this.terminated = true;
  }

  respond(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

export function latestWorker() {
  const worker = TestWorker.instances.at(-1);
  if (!worker) throw new Error("Expected an active Worker");
  return worker;
}
