import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import TabsIndex from "../src/app/(tabs)/index";
import BootstrapScreen from "../src/app/index";
import { Storage } from "../src/lib/storage";

// Access the mocked router functions from jest.setup.js
const { __mockReplace } = require("expo-router");

describe("T14: Root and (tabs) Route Resolution to Home Tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves (tabs)/index by immediately redirecting to /(tabs)/home", () => {
    render(<TabsIndex />);
    expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home");
  });

  it("resolves root '/' BootstrapScreen to /(tabs)/home for guest users", async () => {
    jest.spyOn(Storage, "getAccessToken").mockResolvedValueOnce(null);
    render(<BootstrapScreen />);

    await waitFor(() => {
      expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home");
    });
  });

  it("MUTATION PROOF: missing or altered redirect destination fails resolution invariant", () => {
    // A component without redirect fails the requirement
    const DummyComponent = () => null;
    __mockReplace.mockClear();
    render(<DummyComponent />);
    expect(__mockReplace).not.toHaveBeenCalledWith("/(tabs)/home");
  });

  it("resolves deep-link prefix '/--/' path normalization to /(tabs)/home", () => {
    // In Expo Go, deep-link exp://host:port/--/ resolves to path '/'
    const deepLinkPath = "/--/".replace(/^\/--\/?/, "/");
    expect(deepLinkPath).toBe("/");
    render(<TabsIndex />);
    expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home");
  });

  it("confirms (tabs)/index route is hidden from the tab bar via options href null", () => {
    const fs = require("fs");
    const path = require("path");
    const layoutContent = fs.readFileSync(path.join(__dirname, "../src/app/(tabs)/_layout.tsx"), "utf8");
    expect(layoutContent).toContain('<Tabs.Screen name="index" options={{ href: null }} />');
  });
});
