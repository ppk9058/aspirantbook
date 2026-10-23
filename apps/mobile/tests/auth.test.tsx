import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import LoginScreen from "../src/app/(auth)/login";
import RegisterScreen from "../src/app/(auth)/register";
import ForgotPasswordScreen from "../src/app/(auth)/forgot-password";
import ResetPasswordScreen from "../src/app/(auth)/reset-password";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { api } from "../src/lib/api";
import { Storage } from "../src/lib/storage";

const { __setMockParams, __mockPush, __mockReplace } = require("expo-router");

function RefreshProfileHarness() {
  const { user, refreshProfile } = useAuth();
  return (
    <>
      <Text testID="profile-user-id">{user?.id ?? "none"}</Text>
      <TouchableOpacity testID="refresh-profile" onPress={() => void refreshProfile()}>
        <Text>Refresh</Text>
      </TouchableOpacity>
    </>
  );
}

describe("T2: Critical Screens - Auth Mounted Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockParams({});
  });

  describe("1. Login Screen (Password Errors, Lockout, Deactivated)", () => {
    it("validates empty email and password", async () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <LoginScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      // Tap Sign In without filling in credentials
      const signInBtn = screen.getByTestId("login-submit-btn");
      fireEvent.press(signInBtn);

      await waitFor(() => {
        expect(screen.getByText("Please enter both email and password.")).toBeTruthy();
      });
    });

    it("displays error banner on invalid credentials", async () => {
      const loginSpy = jest.spyOn(api, "login").mockResolvedValue({
        ok: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password. Please try again." },
      } as any);

      render(
        <ThemeProvider>
          <AuthProvider>
            <LoginScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      fireEvent.changeText(screen.getByPlaceholderText("name@example.com"), "wrong@example.com");
      fireEvent.changeText(screen.getByPlaceholderText("Enter password"), "wrongpass");

      const signInBtn = screen.getByTestId("login-submit-btn");
      fireEvent.press(signInBtn);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password. Please try again.")).toBeTruthy();
      });

      loginSpy.mockRestore();
    });

    it("displays lockout error message when account is locked", async () => {
      const loginSpy = jest.spyOn(api, "login").mockResolvedValue({
        ok: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message: "Too many failed attempts. Account is temporarily locked for 15 minutes.",
        },
      } as any);

      render(
        <ThemeProvider>
          <AuthProvider>
            <LoginScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      fireEvent.changeText(screen.getByPlaceholderText("name@example.com"), "locked@example.com");
      fireEvent.changeText(screen.getByPlaceholderText("Enter password"), "attempt5");

      const signInBtn = screen.getByTestId("login-submit-btn");
      fireEvent.press(signInBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Too many failed attempts. Account is temporarily locked for 15 minutes.")
        ).toBeTruthy();
      });

      loginSpy.mockRestore();
    });

    it("displays deactivated account error message when account is deactivated", async () => {
      const loginSpy = jest.spyOn(api, "login").mockResolvedValue({
        ok: false,
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "This account has been deactivated. Please contact support.",
        },
      } as any);

      render(
        <ThemeProvider>
          <AuthProvider>
            <LoginScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      fireEvent.changeText(screen.getByPlaceholderText("name@example.com"), "deactivated@example.com");
      fireEvent.changeText(screen.getByPlaceholderText("Enter password"), "anypass123");

      const signInBtn = screen.getByTestId("login-submit-btn");
      fireEvent.press(signInBtn);

      await waitFor(() => {
        expect(
          screen.getByText("This account has been deactivated. Please contact support.")
        ).toBeTruthy();
      });

      loginSpy.mockRestore();
    });

    it("omits Phone OTP toggle tab when otpAuthEnabled is false", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/config")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({
              ok: true,
              data: {
                minSupportedVersion: "1.0.0",
                latestVersion: "1.0.0",
                isMaintenance: false,
                maintenanceMessage: null,
                allowPurchases: false,
                googleAuthEnabled: false,
                otpAuthEnabled: false,
                supportEmail: "support@example.com",
                websiteUrl: "https://example.com",
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

      render(
        <ThemeProvider>
          <AuthProvider>
            <LoginScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy();
      });

      // Phone (OTP) toggle must be absent when flag is false
      expect(screen.queryByText("Phone (OTP)")).toBeNull();

      global.fetch = originalFetch;
    });
  });

  describe("2. Register Screen (13+ Consent Blocks Submit, Strength Meter)", () => {
    it("disables submit button and blocks submit when 13+ consent is unchecked", async () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <RegisterScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      // Fill in user details
      fireEvent.changeText(screen.getByPlaceholderText("Aarav Sharma"), "Aarav Sharma");
      fireEvent.changeText(screen.getByPlaceholderText("name@example.com"), "aarav@example.com");
      fireEvent.changeText(screen.getByPlaceholderText("Create strong password"), "Aarav@12345");

      // Verify button is disabled when consent is false
      const submitBtn = screen.getByTestId("register-submit-btn");
      expect(submitBtn).toBeTruthy();
      expect(submitBtn.props.accessibilityState.disabled).toBe(true);

      // Attempting to press should not trigger api.register
      const registerSpy = jest.spyOn(api, "register");
      fireEvent.press(submitBtn);
      expect(registerSpy).not.toHaveBeenCalled();

      // Check the consent checkbox
      const consentCheckbox = screen.getByLabelText("Consent checkbox");
      fireEvent.press(consentCheckbox);

      // Now register is enabled
      registerSpy.mockResolvedValue({
        ok: true,
        data: {
          tokens: { accessToken: "reg-access", refreshToken: "reg-refresh" },
          user: { id: "u-1", name: "Aarav Sharma", email: "aarav@example.com" },
        },
      } as any);

      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalled();
        expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home");
      });

      registerSpy.mockRestore();
    });

    it("updates password strength meter from Weak to Medium to Strong", async () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <RegisterScreen />
          </AuthProvider>
        </ThemeProvider>
      );

      const passwordInput = screen.getByPlaceholderText("Create strong password");

      // Weak: only lowercase short
      fireEvent.changeText(passwordInput, "pass");
      await waitFor(() => {
        expect(screen.getByText("Weak")).toBeTruthy();
      });

      // Medium: >= 8 chars with uppercase
      fireEvent.changeText(passwordInput, "Password1");
      await waitFor(() => {
        expect(screen.getByText("Medium")).toBeTruthy();
      });

      // Strong: >= 8 chars with upper, number, and special character
      fireEvent.changeText(passwordInput, "Password#99!");
      await waitFor(() => {
        expect(screen.getByText("Strong")).toBeTruthy();
      });
    });
  });

  describe("3. Forgot Password Screen", () => {
    it("validates empty email", async () => {
      render(
        <ThemeProvider>
          <ForgotPasswordScreen />
        </ThemeProvider>
      );

      const submitBtn = screen.getByText("Send Reset Instructions");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Please enter your account email address.")).toBeTruthy();
      });
    });

    it("sends password reset link and renders success state", async () => {
      const forgotSpy = jest.spyOn(api, "forgotPassword").mockResolvedValue({
        ok: true,
        data: { sent: true },
      } as any);

      render(
        <ThemeProvider>
          <ForgotPasswordScreen />
        </ThemeProvider>
      );

      fireEvent.changeText(
        screen.getByPlaceholderText("name@example.com"),
        "learner@aspirantbook.com"
      );

      const submitBtn = screen.getByText("Send Reset Instructions");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(forgotSpy).toHaveBeenCalledWith("learner@aspirantbook.com");
        expect(screen.getByText("Check Your Inbox")).toBeTruthy();
      });

      forgotSpy.mockRestore();
    });
  });

  describe("4. Reset Password Screen", () => {
    it("validates missing token, password length, and mismatch", async () => {
      // Missing token
      __setMockParams({});
      const { rerender } = render(
        <ThemeProvider>
          <ResetPasswordScreen />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByText("No password reset token detected. Please open the link received in your email or request a new one.")
        ).toBeTruthy();
      });

      // With token, but short password (< 8 chars)
      __setMockParams({ token: "valid-jwt-token" });
      rerender(
        <ThemeProvider>
          <ResetPasswordScreen />
        </ThemeProvider>
      );

      const submitBtn = screen.getByTestId("reset-submit-btn");
      fireEvent.changeText(screen.getByPlaceholderText("At least 8 characters"), "short");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters long.")).toBeTruthy();
      });

      // Password mismatch
      fireEvent.changeText(screen.getByPlaceholderText("At least 8 characters"), "ValidPass123!");
      fireEvent.changeText(screen.getByPlaceholderText("Re-enter your new password"), "DifferentPass123!");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match.")).toBeTruthy();
      });
    });

    it("submits valid new password and shows confirmation message", async () => {
      __setMockParams({ token: "valid-reset-token" });
      const resetSpy = jest.spyOn(api, "resetPassword").mockResolvedValue({
        ok: true,
        data: { reset: true },
      } as any);

      render(
        <ThemeProvider>
          <ResetPasswordScreen />
        </ThemeProvider>
      );

      fireEvent.changeText(screen.getByPlaceholderText("At least 8 characters"), "ValidPass123#");
      fireEvent.changeText(screen.getByPlaceholderText("Re-enter your new password"), "ValidPass123#");

      const submitBtn = screen.getByTestId("reset-submit-btn");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalledWith({
          token: "valid-reset-token",
          password: "ValidPass123#",
        });
        expect(screen.getByText("Password Updated")).toBeTruthy();
      });

      resetSpy.mockRestore();
    });
  });

  describe("5. AuthProvider profile refresh race", () => {
    it("ignores a stale refreshProfile response that resolves after a newer one", async () => {
      await Storage.clearAllAuthTokens();
      await Storage.setAccessToken("access-token-a");

      let resolveFirst!: (value: any) => void;
      let resolveSecond!: (value: any) => void;
      const first = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const second = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      const meSpy = jest
        .spyOn(api, "getMe")
        .mockReturnValueOnce(first as any)
        .mockReturnValueOnce(second as any);

      render(
        <ThemeProvider>
          <AuthProvider>
            <RefreshProfileHarness />
          </AuthProvider>
        </ThemeProvider>
      );

      // Mount-triggered refresh #1 is in flight.
      await waitFor(() => expect(meSpy).toHaveBeenCalledTimes(1));

      fireEvent.press(screen.getByTestId("refresh-profile"));
      await waitFor(() => expect(meSpy).toHaveBeenCalledTimes(2));

      // Newest request resolves first.
      resolveSecond({
        ok: true,
        data: { id: "user-new", name: "New", email: "new@example.com", role: "STUDENT" },
      });
      await waitFor(() => {
        expect(screen.getByTestId("profile-user-id").props.children).toBe("user-new");
      });

      // Stale request resolves later and must be discarded, not overwrite the user.
      resolveFirst({
        ok: true,
        data: { id: "user-old", name: "Old", email: "old@example.com", role: "STUDENT" },
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId("profile-user-id").props.children).toBe("user-new");

      meSpy.mockRestore();
      await Storage.clearAllAuthTokens();
    });
  });
});
