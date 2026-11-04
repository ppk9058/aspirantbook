;(process.env as any).NODE_ENV = "production";
delete process.env.APP_ENV;
delete process.env.DEMO_MODE_ENABLED;
delete process.env.ENABLE_DEMO_ROLE;
delete process.env.ALLOW_DEV_MOBILE_LOGIN;
process.env.MESSAGE_CENTRAL_CUSTOMER_ID = "";
process.env.MESSAGE_CENTRAL_AUTH_KEY = "";

async function main() {
  const provider = await import("../../lib/services/sms-otp/provider");
  const dev = await import("../../lib/services/sms-otp/dev.adapter");
  const demo = await import("../../lib/auth/demo-role");
  const bypass = await import("../../lib/api/v1/dev-bypass");
  const otp = await import("../../lib/services/sms-otp/service");

  let overrideBlocked = false;
  try { provider.__setOtpProviderForTests(new dev.DevOtpProvider()); } catch (e:any) { overrideBlocked = /forbidden in production/.test(e.message); }
  console.log("TEST_OVERRIDE_BLOCKED_IN_PROD:", overrideBlocked);
  console.log("DEV_BYPASS_ALLOWED_IN_PROD:", provider.isOtpDevBypassAllowed());
  let devSendThrew = false;
  try { await new dev.DevOtpProvider().sendOtp({ phone:"+919876500000", countryCode:"91", nationalNumber:"9876500000", otpLength:6 }); } catch { devSendThrew = true; }
  console.log("DEV_ADAPTER_SEND_THREW_IN_PROD:", devSendThrew);
  console.log("DEMO_ROLE_ENABLED_IN_PROD:", demo.isDemoRoleEnabled({ NODE_ENV:"production", APP_ENV:"test", DEMO_MODE_ENABLED:"true", ENABLE_DEMO_ROLE:"true" } as any));
  console.log("RESOLVE_DEMO_ADMIN_IN_PROD:", demo.resolveDemoRole("ADMIN", { NODE_ENV:"production", APP_ENV:"test", DEMO_MODE_ENABLED:"true" } as any));
  console.log("DEV_BYPASS_FN_IN_PROD_APPENV_TEST:", bypass.isDevBypassAllowed());

  process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
  const out = await otp.otpService.sendOtp({ rawPhone: "9876500000", ip: "203.0.113.9" });
  console.log("OTP_SEND_WITH_PROVIDER_UNCONFIGURED_PROD:", JSON.stringify(out));
}
main().catch(e => { console.error("UNEXPECTED", e); process.exit(1); });
