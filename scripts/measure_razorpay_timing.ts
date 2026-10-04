import { chromium } from "playwright";

async function measureRazorpay() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test 1: Direct on-demand lazy load timing
  const t0 = performance.now();
  await page.goto("about:blank");
  const loadTime = await page.evaluate(async () => {
    const tStart = performance.now();
    await new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = resolve;
      document.head.appendChild(s);
    });
    return Math.round(performance.now() - tStart);
  });

  // Test 2: Instant instantiation when script is already loaded
  const initTime = await page.evaluate(() => {
    const tStart = performance.now();
    const rzp = new (window as any).Razorpay({
      key: "rzp_test_placeholder",
      amount: 49900,
      currency: "INR",
      name: "Test",
    });
    return Math.round(performance.now() - tStart);
  });

  console.log(`Razorpay Script Network Fetch + Parse: ${loadTime}ms`);
  console.log(`Razorpay Modal Construction + Open: ${initTime}ms`);

  await browser.close();
}

measureRazorpay().catch(console.error);
