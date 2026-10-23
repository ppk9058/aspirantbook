import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import ReaderScreen from "../src/app/reader/[id]";

const { __setMockParams } = require("expo-router");

// Mutable so each test can control whether storage is available and how the
// download behaves, without re-mocking the module.
var mockFs: {
  documentDirectory: string | null;
  getInfoAsync: jest.Mock;
  makeDirectoryAsync: jest.Mock;
  createDownloadResumable: jest.Mock;
};

jest.mock("expo-file-system/legacy", () => ({
  get documentDirectory() {
    return mockFs.documentDirectory;
  },
  getInfoAsync: (...args: any[]) => mockFs.getInfoAsync(...args),
  makeDirectoryAsync: (...args: any[]) => mockFs.makeDirectoryAsync(...args),
  createDownloadResumable: (...args: any[]) => mockFs.createDownloadResumable(...args),
}));

function jsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as any;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider skipStorage>{children}</ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe("Reader offline storage guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockParams({ id: "doc-1", type: "library", title: "Polity Notes" });

    mockFs = {
      documentDirectory: "/tmp/mock-docs/",
      getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
      makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
      createDownloadResumable: jest.fn(),
    };

    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/v1/library")) {
        return jsonResponse({
          ok: true,
          data: [{ id: "doc-1", title: "Polity Notes", author: "AspirantBook" }],
        });
      }
      return jsonResponse({ ok: true, data: {} });
    }) as any;
  });

  it("Bug #7: shows 'Storage unavailable' instead of building a path from a null documentDirectory", async () => {
    mockFs.documentDirectory = null;

    const { findByText, queryByText } = render(<ReaderScreen />, {
      wrapper: createWrapper(),
    });

    expect(await findByText("Storage unavailable")).toBeTruthy();
    expect(queryByText("Saved Offline")).toBeNull();
    expect(mockFs.getInfoAsync).not.toHaveBeenCalled();
    expect(mockFs.createDownloadResumable).not.toHaveBeenCalled();
  });

  it("Bug #8: a failed download never shows 'Saved Offline' or exposes a fake local URI", async () => {
    mockFs.createDownloadResumable.mockReturnValue({
      downloadAsync: jest.fn().mockRejectedValue(new Error("network down")),
    });

    const { findByText, queryByText } = render(<ReaderScreen />, {
      wrapper: createWrapper(),
    });

    fireEvent.press(await findByText("Save Offline to App"));

    expect(
      await findByText("Download failed. Please check your connection and try again.")
    ).toBeTruthy();
    expect(queryByText("Saved Offline")).toBeNull();
    expect(queryByText("Online Stream")).toBeTruthy();

    // The renderer keeps the remote stream, never a non-existent local file.
    expect(mockFs.createDownloadResumable).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/library/doc-1/file"),
      "/tmp/mock-docs/secure_docs/doc_doc-1.pdf",
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("Bug #8: only a real download URI flips the badge to 'Saved Offline'", async () => {
    const downloadedUri = "/tmp/mock-docs/secure_docs/doc_doc-1.pdf";
    mockFs.createDownloadResumable.mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue({ uri: downloadedUri }),
    });

    const { findByText, queryByText } = render(<ReaderScreen />, {
      wrapper: createWrapper(),
    });

    fireEvent.press(await findByText("Save Offline to App"));

    expect(await findByText("Saved Offline")).toBeTruthy();
    expect(
      queryByText("Download failed. Please check your connection and try again.")
    ).toBeNull();
  });
});
