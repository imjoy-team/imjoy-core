import { expect } from "chai";
import { loadImJoyCore, loadImJoyRPC } from "../src/imjoyLoader.js";

describe("imjoy-loader", async () => {
  it("should load imjoy core", async () => {
    const core_version = "0.12.6";
    const imjoyCore = await loadImJoyCore({
      version: core_version,
      debug: true,
    });
    expect(typeof imjoyCore).to.equal("object");
    expect(imjoyCore.VERSION).to.equal(core_version);
    expect(typeof imjoyCore.ImJoy).to.equal("function");
    expect(typeof imjoyCore.Joy).to.equal("function");
    expect(typeof imjoyCore.ajv).to.equal("object");
    expect(typeof imjoyCore.utils).to.equal("object");
  }).timeout(20000);

  it("should load imjoy rpc", async () => {
    const imjoyRPC = await loadImJoyRPC({ base_url: "/" });
    expect(typeof imjoyRPC).to.equal("object");
    expect(typeof imjoyRPC.VERSION).to.equal("string");
    expect(typeof imjoyRPC.API_VERSION).to.equal("string");
    expect(typeof imjoyRPC.RPC).to.equal("function");
    expect(typeof imjoyRPC.setupRPC).to.equal("function");
    expect(typeof imjoyRPC.waitForInitialization).to.equal("function");
  }).timeout(20000);
});
