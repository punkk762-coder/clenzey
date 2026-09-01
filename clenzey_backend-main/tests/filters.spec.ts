import { describe, expect, it } from "vitest";

import BaseFilter from "../src/filters/baseFilter.ts";
import UserFilter from "../src/filters/userFilter.ts";

describe("BaseFilter", () => {
  it("can be instantiated", () => {
    expect(new BaseFilter()).toBeInstanceOf(BaseFilter);
  });
});

describe("UserFilter", () => {
  it("extends BaseFilter", () => {
    expect(new UserFilter()).toBeInstanceOf(BaseFilter);
  });

  it("stores phoneNumber when provided", () => {
    const filter = new UserFilter({ phoneNumber: "+919999999999" });
    expect(filter.phoneNumber).toBe("+919999999999");
  });

  it("defaults phoneNumber to undefined when omitted", () => {
    const filter = new UserFilter();
    expect(filter.phoneNumber).toBeUndefined();
  });

  it("accepts an empty options object", () => {
    const filter = new UserFilter({});
    expect(filter.phoneNumber).toBeUndefined();
  });
});
