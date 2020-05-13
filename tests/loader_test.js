import { expect } from "chai";
import { loadImJoyCore, loadImJoyRPC } from "../src/imjoyLoader.js";

describe("imjoy-loader", async () => {
  it("should load imjoy core", async () => {
    const imjoyCore = await loadImJoyCore({ version: "0.12.6", debug: true });
    expect(typeof imjoyCore).to.equal("object");
    // expect(typeof imjoyCore.VERSION).to.equal('string')
    expect(typeof imjoyCore.ImJoy).to.equal("function");
    expect(typeof imjoyCore.Joy).to.equal("function");
    expect(typeof imjoyCore.ajv).to.equal("object");
    expect(typeof imjoyCore.utils).to.equal("object");
  });

  it("should load imjoy rpc", async () => {
    const imjoyRPC = await loadImJoyRPC({ base_url: "/" });
    expect(typeof imjoyRPC).to.equal("object");
    expect(typeof imjoyRPC.VERSION).to.equal("string");
    expect(typeof imjoyRPC.API_VERSION).to.equal("string");
    expect(typeof imjoyRPC.RPC).to.equal("function");
    expect(typeof imjoyRPC.setupRPC).to.equal("function");
    expect(typeof imjoyRPC.waitForInitialization).to.equal("function");
  });
});
