import { logger, getRecentEntries, clearRecentEntries } from "@/utils/logger";

declare const global: typeof globalThis & { __DEV__: boolean };

function withDev<T>(value: boolean, fn: () => T): T {
  const original = global.__DEV__;
  global.__DEV__ = value;
  try {
    return fn();
  } finally {
    global.__DEV__ = original;
  }
}

describe("logger", () => {
  beforeEach(() => {
    clearRecentEntries();
    jest.restoreAllMocks();
  });

  it("prints to the console in development", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    withDev(true, () => logger.error("PASSKEY_ASSERTION_FAILED", { err: new Error("x") }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("[PASSKEY_ASSERTION_FAILED]");
  });

  it("is silent on the console in release", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const info = jest.spyOn(console, "info").mockImplementation(() => {});
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    withDev(false, () => {
      logger.debug("D");
      logger.info("I");
      logger.warn("W");
      logger.error("E", { err: new Error("boom") });
    });

    expect(log).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("retains only { ts, level, code } — context never reaches the record", () => {
    const secret = { deviceWalletAddress: "0xABCDEF", token: "eyJhbGciOi..." };
    withDev(false, () => logger.error("WALLET_DEPLOYMENT_FAILED", secret));

    const entries = getRecentEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({ level: "error", code: "WALLET_DEPLOYMENT_FAILED" })
    );
    expect(Object.keys(entries[0]).sort()).toEqual(["code", "level", "ts"]);

    expect(JSON.stringify(entries)).not.toContain("0xABCDEF");
    expect(JSON.stringify(entries)).not.toContain("eyJhbGciOi");
  });

  it("records in development as well (buffer is always on)", () => {
    jest.spyOn(console, "info").mockImplementation(() => {});
    withDev(true, () => logger.info("BFF_HEALTH_STATUS", { healthy: true }));
    const entries = getRecentEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].code).toBe("BFF_HEALTH_STATUS");
  });

  it("bounds the ring buffer and evicts oldest first", () => {
    withDev(false, () => {
      for (let i = 0; i < 150; i += 1) logger.debug(`E_${i}`);
    });
    const entries = getRecentEntries();
    expect(entries).toHaveLength(100);
    // Oldest 50 (E_0..E_49) evicted; newest retained, oldest-first ordering.
    expect(entries[0].code).toBe("E_50");
    expect(entries[entries.length - 1].code).toBe("E_149");
  });

  it("clears retained records", () => {
    withDev(false, () => logger.warn("CONFIG_MISSING_API_BASE_URL"));
    expect(getRecentEntries()).toHaveLength(1);
    clearRecentEntries();
    expect(getRecentEntries()).toHaveLength(0);
  });
});
