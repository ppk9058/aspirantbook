import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import LoginScreen from "../src/app/(auth)/login";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <GoalProvider>{children}</GoalProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe("G7: OTP Auth Specification Tests [otp:flag-*]", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("[otp:flag-false] OTP toggle omitted when config flag is false", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: false },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy();
    });

    expect(screen.queryByText("Phone (OTP)")).toBeNull();
  });

  it("[otp:flag-missing] OTP toggle omitted when config flag is missing", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: {},
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy();
    });

    expect(screen.queryByText("Phone (OTP)")).toBeNull();
  });

  it("[otp:config-500] OTP toggle omitted when config returns 500 error", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: false,
          status: 500,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: false,
            error: { message: "Internal server error" },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy();
    });

    expect(screen.queryByText("Phone (OTP)")).toBeNull();
  });

  it("[otp:flag-true] OTP toggle present and interactive when flag is true", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: true },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Phone (OTP)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Phone (OTP)"));

    await waitFor(() => {
      expect(screen.getByText("Send Verification Code")).toBeTruthy();
    });
  });

  it("[otp:two-step] two-step phone->code flow operates correctly", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: true },
          }),
        } as Response;
      }
      if (url.includes("/auth/otp/request") || url.includes("/auth/otp")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: {
              message: "Verification code sent successfully",
              verificationId: "vid-two-step-123",
              resendAfter: 30,
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Phone (OTP)")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Phone (OTP)"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("+91 9876543210")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("+91 9876543210"), "9876543210");
    fireEvent.press(screen.getByText("Send Verification Code"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("6-digit code")).toBeTruthy();
      expect(screen.getByText("Verify & Sign In")).toBeTruthy();
    });
  });

  it("[otp:wrong-code] wrong-code returns visible error banner", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: true },
          }),
        } as Response;
      }
      if (url.includes("/auth/otp/verify") || url.includes("/verify")) {
        return {
          ok: false,
          status: 400,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: false,
            error: { message: "Invalid or expired verification code." },
          }),
        } as Response;
      }
      if (url.includes("/auth/otp/request") || url.includes("/auth/otp")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: {
              message: "Code sent",
              verificationId: "vid-wrong-code-123",
              resendAfter: 30,
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("Phone (OTP)")).toBeTruthy());
    fireEvent.press(screen.getByText("Phone (OTP)"));
    await waitFor(() => expect(screen.getByPlaceholderText("+91 9876543210")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("+91 9876543210"), "9876543210");
    fireEvent.press(screen.getByText("Send Verification Code"));

    await waitFor(() => expect(screen.getByPlaceholderText("6-digit code")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("6-digit code"), "111111");
    fireEvent.press(screen.getByText("Verify & Sign In"));

    await waitFor(() => {
      expect(screen.getByText("Invalid or expired verification code.")).toBeTruthy();
    });
  });

  it("[otp:501] 501 returns friendly message without crash", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: true },
          }),
        } as Response;
      }
      if (url.includes("/auth/otp/request") || url.includes("/auth/otp")) {
        return {
          ok: false,
          status: 501,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: false,
            error: { message: "SMS gateway not configured in this environment" },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("Phone (OTP)")).toBeTruthy());
    fireEvent.press(screen.getByText("Phone (OTP)"));
    await waitFor(() => expect(screen.getByPlaceholderText("+91 9876543210")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("+91 9876543210"), "9876543210");
    fireEvent.press(screen.getByText("Send Verification Code"));

    await waitFor(() => {
      expect(screen.getByText("SMS gateway not configured in this environment")).toBeTruthy();
    });
  });

  it("[otp:lockout] lockout displays explicit account lockout message", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: true },
          }),
        } as Response;
      }
      if (url.includes("/auth/login") || url.includes("/login")) {
        return {
          ok: false,
          status: 403,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: false,
            error: {
              code: "ACCOUNT_LOCKED",
              message: "Account locked due to 5 consecutive failed login attempts. Try again in 15 minutes.",
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("name@example.com"), "locked@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter password"), "wrongpass");
    fireEvent.press(screen.getByTestId("login-submit-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Account locked due to 5 consecutive failed login attempts. Try again in 15 minutes.")
      ).toBeTruthy();
    });
  });

  it("[otp:deactivated] deactivated displays explicit account deactivation message", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { otpAuthEnabled: true },
          }),
        } as Response;
      }
      if (url.includes("/auth/login") || url.includes("/login")) {
        return {
          ok: false,
          status: 403,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: false,
            error: {
              code: "ACCOUNT_DEACTIVATED",
              message: "Your account has been deactivated. Please contact support@aspirantbook.com for assistance.",
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("name@example.com"), "deact@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter password"), "anypass");
    fireEvent.press(screen.getByTestId("login-submit-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Your account has been deactivated. Please contact support@aspirantbook.com for assistance.")
      ).toBeTruthy();
    });
  });

  it("[otp:missing-verification-id] a request response without verificationId shows an error and stays on the phone step", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ ok: true, data: { otpAuthEnabled: true } }),
        } as Response;
      }
      if (url.includes("/auth/otp/request")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ ok: true, data: { message: "Code sent" } }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("Phone (OTP)")).toBeTruthy());
    fireEvent.press(screen.getByText("Phone (OTP)"));
    await waitFor(() => expect(screen.getByPlaceholderText("+91 9876543210")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("+91 9876543210"), "9876543210");
    fireEvent.press(screen.getByText("Send Verification Code"));

    await waitFor(() => {
      expect(
        screen.getByText("The verification service returned an invalid response. Please try again.")
      ).toBeTruthy();
    });
    expect(screen.queryByPlaceholderText("6-digit code")).toBeNull();
  });

  it("[otp:verification-id] the verify call sends the verificationId returned by the request call", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/config")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ ok: true, data: { otpAuthEnabled: true } }),
        } as Response;
      }
      if (url.includes("/auth/otp/request")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: { message: "Code sent", verificationId: "vid-bound-456", resendAfter: 30 },
          }),
        } as Response;
      }
      if (url.includes("/auth/otp/verify")) {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: false,
            error: { message: "Invalid or expired verification code." },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true, data: {} }),
      } as Response;
    });
    global.fetch = fetchMock;

    render(<LoginScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("Phone (OTP)")).toBeTruthy());
    fireEvent.press(screen.getByText("Phone (OTP)"));
    await waitFor(() => expect(screen.getByPlaceholderText("+91 9876543210")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("+91 9876543210"), "9876543210");
    fireEvent.press(screen.getByText("Send Verification Code"));

    await waitFor(() => expect(screen.getByPlaceholderText("6-digit code")).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText("6-digit code"), "123456");
    fireEvent.press(screen.getByText("Verify & Sign In"));

    await waitFor(() => {
      const verifyCall = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/auth/otp/verify")
      );
      expect(verifyCall).toBeTruthy();
      const init = verifyCall?.[1] as RequestInit | undefined;
      expect(String(init?.body)).toContain('"verificationId":"vid-bound-456"');
    });
  });
});
