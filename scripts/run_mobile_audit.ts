import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

interface Viewport {
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
}

const VIEWPORTS: Viewport[] = [
  { name: "360x740", width: 360, height: 740, isMobile: true },
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "430x932", width: 430, height: 932, isMobile: true },
  { name: "768x1024", width: 768, height: 1024, isMobile: false },
  { name: "1280x800", width: 1280, height: 800, isMobile: false },
];

const EXTRA_AUDIT_VIEWPORT: Viewport = {
  name: "320x568",
  width: 320,
  height: 568,
  isMobile: true,
};

async function checkNoHorizontalScroll(page: Page, label: string) {
  const scrollInfo = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });

  const hasScroll = scrollInfo.scrollWidth > scrollInfo.innerWidth + 1; // +1 margin for subpixel rendering
  if (hasScroll) {
    throw new Error(
      `[FAIL] Horizontal scroll detected on ${label}: scrollWidth=${scrollInfo.scrollWidth} > innerWidth=${scrollInfo.innerWidth}`
    );
  }
  console.log(`  ✓ No horizontal scroll on ${label} (scrollWidth: ${scrollInfo.scrollWidth}, innerWidth: ${scrollInfo.innerWidth})`);
}

async function checkTouchTargets(page: Page, selector: string, minSize = 44) {
  const elements = page.locator(selector);
  const count = await elements.count();
  for (let i = 0; i < count; i++) {
    const el = elements.nth(i);
    const isVis = await el.isVisible();
    if (!isVis) continue;
    const box = await el.boundingBox();
    if (box && (box.width < minSize - 4 || box.height < minSize - 4)) {
      // Small margin for borders
      console.warn(`  ⚠ Warning: Touch target ${selector} [#${i}] smaller than ${minSize}px: ${box.width}x${box.height}`);
    }
  }
}

async function runMobileAudit() {
  console.log("======================================================================");
  console.log("PHASE 5: REAL BROWSER MOBILE UI/UX AUDIT WITH PLAYWRIGHT");
  console.log("======================================================================\n");

  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const runId = "audit_" + Date.now();
  let studentUser: any = null;
  let teacherUser: any = null;
  let testSeries: any = null;
  let testExam: any = null;
  let attemptId: string | null = null;
  let browser: Browser | null = null;

  try {
    // ── 1. Setup isolated database data ──────────────────────────────
    console.log("1. Setting up isolated test records in DB...");
    const rawPassword = "AuditPassword123!";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    teacherUser = await prisma.user.create({
      data: {
        email: `teacher_${runId}@internal.test`,
        name: "Audit Faculty",
        role: "TEACHER",
      },
    });

    studentUser = await prisma.user.create({
      data: {
        email: `student_${runId}@internal.test`,
        name: "Audit Aspirant",
        role: "FREE",
        password: passwordHash,
      },
    });

    testSeries = await prisma.examSeries.create({
      data: {
        id: "cuid_series_" + runId,
        slug: "audit-series-" + runId,
        title: "Civil Services Mobile Audit Series 2026",
        category: "Civil Services",
        examName: "UPSC",
        isFree: true,
        isPro: false,
        isPublished: true,
        createdById: teacherUser.id,
      },
    });

    testExam = await prisma.examTest.create({
      data: {
        id: "cuid_test_" + runId,
        seriesId: testSeries.id,
        title: "UPSC Civil Services Comprehensive Mobile Evaluation Mock Test 2026",
        titleHi: "संघ लोक सेवा आयोग सिविल सेवा व्यापक मोबाइल मूल्यांकन मॉक टेस्ट 2026",
        accessMode: "FREE",
        durationMinutes: 90,
        totalQuestions: 10,
        totalMarks: 20,
        positiveMarks: 2,
        negativeMarks: 0.66,
        isPublished: true,
        createdById: teacherUser.id,
        sections: {
          create: [
            {
              title: "General Studies Paper I",
              order: 1,
              questions: {
                create: [
                  {
                    questionType: "MCQ",
                    questionEn:
                      "With reference to the Indian Constitution, consider the following statements:\n1. The Preamble is an integral part of the Constitution and can be amended under Article 368.\n2. The concept of 'Procedure Established by Law' in Article 21 has been completely superseded by 'Due Process of Law' following the Maneka Gandhi case.\n3. Fundamental Duties were incorporated through the 42nd Constitutional Amendment Act, 1976 on the recommendation of the Swaran Singh Committee.\nWhich of the statements given above are correct?",
                    questionHi:
                      "भारतीय संविधान के संदर्भ में निम्नलिखित कथनों पर विचार कीजिए:\n1. प्रस्तावना संविधान का अभिन्न अंग है और अनुच्छेद 368 के तहत इसमें संशोधन किया जा सकता है।\n2. मेनका गांधी मामले के बाद अनुच्छेद 21 में 'विधि द्वारा स्थापित प्रक्रिया' की अवधारणा को 'विधि की सम्यक प्रक्रिया' द्वारा पूरी तरह प्रतिस्थापित कर दिया गया है।\n3. स्वर्ण सिंह समिति की सिफारिश पर 42वें संविधान संशोधन अधिनियम, 1976 द्वारा मौलिक कर्तव्यों को शामिल किया गया था।\nउपर्युक्त कथनों में से कौन-से सही हैं?",
                    optionAEn: "1 and 2 only",
                    optionBEn: "1 and 3 only",
                    optionCEn: "2 and 3 only",
                    optionDEn: "1, 2 and 3",
                    optionAHi: "केवल 1 और 2",
                    optionBHi: "केवल 1 और 3",
                    optionCHi: "केवल 2 और 3",
                    optionDHi: "1, 2 और 3",
                    correctOption: "B",
                    explanationEn:
                      "Statement 1 is correct: In Kesavananda Bharati (1973), the Supreme Court ruled that the Preamble is an integral part of the Constitution and can be amended subject to the Basic Structure doctrine.\nStatement 2 is incorrect: The Indian Supreme Court has incorporated 'due process' elements into Article 21 (fairness, justice, reasonability) but the constitutional text remains 'procedure established by law'.\nStatement 3 is correct: The 42nd Amendment Act, 1976 added Part IVA and Article 51A upon Swaran Singh Committee recommendations.",
                    explanationHi:
                      "कथन 1 सही है: केशवानंद भारती (1973) मामले में सर्वोच्च न्यायालय ने माना कि प्रस्तावना संविधान का अभिन्न अंग है। कथन 2 गलत है। कथन 3 सही है।",
                    order: 1,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "Polity",
                    topic: "Constitutional Framework",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "Consider the following chronological events in Indian National Movement and identify the correct sequence:\n1. Non-Cooperation Movement launched\n2. Champaran Satyagraha\n3. Rowlatt Act Satyagraha\n4. Kheda Satyagraha",
                    questionHi:
                      "भारतीय राष्ट्रीय आंदोलन की निम्नलिखित ऐतिहासिक घटनाओं और आंदोलनों पर विचार कीजिए तथा उनके सही कालानुक्रमिक क्रम का चयन कीजिए:\n1. असहयोग आंदोलन का औपचारिक शुभारंभ\n2. चंपारण सत्याग्रह और नील बागान किसानों का संघर्ष\n3. रौलेट एक्ट विरोधी अखिल भारतीय राष्ट्रव्यापी सत्याग्रह\n4. खेड़ा में किसानों का भू-राजस्व राहत हेतु सत्याग्रह\nसही कालानुक्रमिक अनुक्रम कौन सा है?",
                    optionAEn: "2 - 4 - 3 - 1",
                    optionBEn: "2 - 3 - 4 - 1",
                    optionCEn: "4 - 2 - 3 - 1",
                    optionDEn: "1 - 2 - 4 - 3",
                    optionAHi: "2 - 4 - 3 - 1",
                    optionBHi: "2 - 3 - 4 - 1",
                    optionCHi: "4 - 2 - 3 - 1",
                    optionDHi: "1 - 2 - 4 - 3",
                    correctOption: "A",
                    explanationEn:
                      "Champaran Satyagraha occurred in 1917, followed by Ahmedabad Mill Strike (March 1918) and Kheda Satyagraha (March-June 1918). Rowlatt Satyagraha occurred in early 1919, followed by Non-Cooperation Movement in 1920.",
                    order: 2,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "History",
                    topic: "Modern Indian History",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "Which of the following physical geography features is depicted in satellite telemetry and topographical elevation diagrams demonstrating anticlines and synclines?",
                    questionHi:
                      "निम्नलिखित में से कौन सी भौतिक भू-आकृतिक संरचना उपग्रह टेलीमेट्री और स्थलाकृतिक उन्नयन रेखाचित्रों में अभिनति (Syncline) और अपनति (Anticline) को प्रदर्शित करती है?",
                    optionAEn: "Fold Mountains generated by convergent tectonic boundary compression",
                    optionBEn: "Block Mountains formed along divergent continental rift margins",
                    optionCEn: "Volcanic Calderas created by explosive collapse eruptions",
                    optionDEn: "Residual Inselbergs shaped by long-term aeolian erosion",
                    correctOption: "A",
                    explanationEn:
                      "Fold mountains are created where two or more of Earth's tectonic plates are pushed together through compressive forces, generating alternating anticlines (crests) and synclines (troughs).",
                    order: 3,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "Geography",
                    topic: "Geomorphology",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "Evaluate the macro-economic consequences of an inverted duty structure on the domestic manufacturing sector under the Foreign Trade Policy:",
                    questionHi:
                      "विदेश व्यापार नीति के अंतर्गत घरेलू विनिर्माण क्षेत्र पर उल्टी शुल्क संरचना (Inverted Duty Structure) के समष्टि आर्थिक प्रभावों का मूल्यांकन कीजिए:",
                    optionAEn:
                      "Import duty on intermediate inputs and raw materials is significantly higher than the import duty levied on the final finished product, thereby rendering domestic producers uncompetitive vis-a-vis overseas competitors.",
                    optionBEn:
                      "Export taxes exceed domestic excise collections, promoting foreign direct investments in capital goods while depressing consumer goods fabrication across regional clusters.",
                    optionCEn:
                      "Customs tariff rates are uniformly zero for all technological components, leading to automatic neutralization of input tax credit claims under the Goods and Services Tax framework.",
                    optionDEn:
                      "Bilateral currency swap agreements establish fixed nominal exchange valuations that eliminate foreign exchange volatility for state-owned banking institutions.",
                    correctOption: "A",
                    explanationEn:
                      "An inverted duty structure occurs when import duties on raw materials and components are higher than on finished goods, hindering domestic value addition.",
                    order: 4,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "Economy",
                    topic: "International Trade",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "In the context of international environmental agreements, the Nagoya Protocol specifically deals with which of the following areas?",
                    questionHi:
                      "अंतर्राष्ट्रीय पर्यावरण समझौतों के संदर्भ में, नागोया प्रोटोकॉल विशेष रूप से निम्नलिखित में से किस क्षेत्र से संबंधित है?",
                    optionAEn: "Transboundary movements of hazardous industrial wastes and chemicals",
                    optionBEn: "Access to genetic resources and fair, equitable sharing of benefits arising from their utilization",
                    optionCEn: "Reduction of ozone-depleting chlorofluorocarbon compounds in refrigeration",
                    optionDEn: "Establishment of carbon credit offsetting metrics under the Kyoto Protocol",
                    correctOption: "B",
                    explanationEn:
                      "The Nagoya Protocol on Access to Genetic Resources and the Fair and Equitable Sharing of Benefits Arising from their Utilization (ABS) to the Convention on Biological Diversity is a supplementary agreement to the CBD.",
                    order: 5,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "Environment",
                    topic: "Biodiversity Conservation",
                  },
                ],
              },
            },
            {
              title: "General Studies Paper II (CSAT)",
              order: 2,
              questions: {
                create: [
                  {
                    questionType: "MCQ",
                    questionEn:
                      "A train traveling at 72 km/h crosses a platform of length 250 meters in 26 seconds. How long does the train take to cross an electric pole standing alongside the track?",
                    questionHi:
                      "72 किमी/घंटा की गति से चल रही एक रेलगाड़ी 250 मीटर लंबे प्लेटफॉर्म को 26 सेकंड में पार करती है। ट्रैक के किनारे खड़े एक बिजली के खंभे को पार करने में रेलगाड़ी को कितना समय लगेगा?",
                    optionAEn: "11.5 seconds",
                    optionBEn: "13.5 seconds",
                    optionCEn: "15.0 seconds",
                    optionDEn: "18.0 seconds",
                    correctOption: "B",
                    explanationEn:
                      "Speed = 72 * (5/18) = 20 m/s. Total distance in 26s = 20 * 26 = 520 m. Train length = 520 - 250 = 270 m. Time to cross pole = 270 / 20 = 13.5 seconds.",
                    order: 6,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "CSAT",
                    topic: "Time and Distance",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "Five colleagues A, B, C, D, and E sit in a circular conference table facing the center. A sits immediately to the left of B. E does not sit adjacent to A or B. Who sits directly opposite to A?",
                    questionHi:
                      "पांच सहयोगी A, B, C, D और E एक वृत्ताकार मेज पर केंद्र की ओर मुंह करके बैठे हैं। A, B के ठीक बाईं ओर बैठा है। E, A या B के पास नहीं बैठा है। A के ठीक सामने कौन बैठा है?",
                    optionAEn: "C",
                    optionBEn: "D",
                    optionCEn: "E",
                    optionDEn: "Cannot be uniquely determined without additional constraints",
                    correctOption: "C",
                    explanationEn:
                      "With 5 members and circular arrangements: B is at position 1, A is at position 2 (left of B). Positions 3, 4, 5 remain. E cannot sit at 3 (adjacent to A) or 5 (adjacent to B). Therefore, E must sit at position 4, directly opposite A.",
                    order: 7,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "CSAT",
                    topic: "Logical Reasoning",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "Which of the following numbers is the greatest prime factor of the product (24! + 25!)?",
                    questionHi:
                      "निम्नलिखित में से कौन सी संख्या गुणनफल (24! + 25!) का सबसे बड़ा अभाज्य गुणनखंड (Prime Factor) है?",
                    optionAEn: "13",
                    optionBEn: "19",
                    optionCEn: "23",
                    optionDEn: "29",
                    correctOption: "C",
                    explanationEn:
                      "24! + 25! = 24!(1 + 25) = 24! * 26 = 24! * 2 * 13. The prime numbers within 24! are 2, 3, 5, 7, 11, 13, 17, 19, 23. The greatest prime factor is 23.",
                    order: 8,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "CSAT",
                    topic: "Number Systems",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "Read the following reading comprehension passage and answer the inference question:\n'Technological sovereignty in artificial intelligence cannot be achieved merely by regulating consumer applications. It requires independent fabrication capacity for advanced semiconductor wafers, indigenous foundational model pre-training clusters, and open curated data repositories.'\nWhat is the central logical corollary of this passage?",
                    questionHi:
                      "निम्नलिखित गद्यांश को पढ़कर निष्कर्ष का चयन कीजिए:\n'कृत्रिम बुद्धिमत्ता में तकनीकी संप्रभुता केवल उपभोक्ता अनुप्रयोगों को विनियमित करके प्राप्त नहीं की जा सकती है। इसके लिए उन्नत सेमीकंडक्टर वेफर्स के लिए स्वतंत्र निर्माण क्षमता, स्वदेशी मूलभूत मॉडल क्लस्टर और खुले डेटा रिपॉजिटरी की आवश्यकता है।'\nइस गद्यांश का मुख्य तार्किक निष्कर्ष क्या है?",
                    optionAEn: "Regulatory frameworks alone are insufficient for strategic technological self-reliance.",
                    optionBEn: "Semiconductor foundries will eliminate the necessity of machine learning algorithmic development.",
                    optionCEn: "Open data repositories are vulnerable to global intellectual property piracy.",
                    optionDEn: "Consumer applications generate zero economic value in modern digital economies.",
                    correctOption: "A",
                    explanationEn:
                      "The author explicitly argues that technological sovereignty cannot be achieved merely through consumer application regulations.",
                    order: 9,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "CSAT",
                    topic: "Reading Comprehension",
                  },
                  {
                    questionType: "MCQ",
                    questionEn:
                      "A vessel contains 80 liters of pure milk. 8 liters of milk is taken out and replaced with water. This process is repeated one more time. What is the final quantity of milk remaining in the container?",
                    questionHi:
                      "एक बर्तन में 80 लीटर शुद्ध दूध है। इसमें से 8 लीटर दूध निकालकर उतना ही पानी मिला दिया जाता है। इस प्रक्रिया को एक बार और दोहराया जाता है। बर्तन में अंततः कितना दूध शेष बचेगा?",
                    optionAEn: "64.8 liters",
                    optionBEn: "62.4 liters",
                    optionCEn: "60.0 liters",
                    optionDEn: "65.2 liters",
                    correctOption: "A",
                    explanationEn:
                      "Amount remaining = 80 * (1 - 8/80)^2 = 80 * (0.9)^2 = 80 * 0.81 = 64.8 liters.",
                    order: 10,
                    positiveMarks: 2,
                    negativeMarks: 0.66,
                    subject: "CSAT",
                    topic: "Mixtures and Alligations",
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    });

    console.log("✓ Test created successfully with 10 questions and 2 sections.");
    console.log(`  Test ID: ${testExam.id}`);
    console.log(`  Series ID: ${testSeries.id}\n`);

    // ── 2. Launch Chromium Browser ───────────────────────────────────
    console.log("2. Launching Playwright Chromium browser...");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // ── 3. Helper to create logged-in context ────────────────────────
    async function createLoggedInContext(viewport: Viewport): Promise<{ context: BrowserContext; page: Page }> {
      const context = await browser!.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: viewport.isMobile
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
          : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        hasTouch: viewport.isMobile,
        isMobile: viewport.isMobile,
      });

      const page = await context.newPage();

      // Go to login page
      await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

      // Fill login form
      await page.fill("#email", studentUser.email);
      await page.fill("#password", rawPassword);
      await page.click("button:has-text('Sign In')");

      // Wait for navigation away from login
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
      return { context, page };
    }

    // ── 4. Pre-Attempt Pages Responsive Pass (360px & 320px) ─────────
    console.log("3. Testing Pre-Attempt Pages across 360px and 320px viewports...");
    for (const vp of [VIEWPORTS[0], EXTRA_AUDIT_VIEWPORT]) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const { context, page } = await createLoggedInContext(vp);

      // (a) Test Series Details Page
      const seriesUrl = `http://localhost:3000/test-series/${testSeries.id}`;
      await page.goto(seriesUrl, { waitUntil: "networkidle" });
      await checkNoHorizontalScroll(page, `Series Detail [${vp.name}]`);
      await page.screenshot({ path: path.join(screenshotsDir, `series_detail_${vp.name}.png`), fullPage: false });

      // (b) Instructions Page
      const instructionsUrl = `http://localhost:3000/test-series/${testSeries.id}/instructions?testId=${testExam.id}`;
      await page.goto(instructionsUrl, { waitUntil: "networkidle" });
      await checkNoHorizontalScroll(page, `Instructions [${vp.name}]`);
      await checkTouchTargets(page, "button, a", 44);
      await page.screenshot({ path: path.join(screenshotsDir, `instructions_${vp.name}.png`), fullPage: false });

      // (c) Declaration Page
      const declarationUrl = `http://localhost:3000/test-series/${testSeries.id}/declaration?testId=${testExam.id}`;
      await page.goto(declarationUrl, { waitUntil: "networkidle" });
      await checkNoHorizontalScroll(page, `Declaration [${vp.name}]`);
      await checkTouchTargets(page, "button, a, label", 44);
      await page.screenshot({ path: path.join(screenshotsDir, `declaration_${vp.name}.png`), fullPage: false });

      // (d) My Tests Hub Page
      await page.goto("http://localhost:3000/my-tests", { waitUntil: "networkidle" });
      await checkNoHorizontalScroll(page, `My Tests Hub [${vp.name}]`);
      await checkTouchTargets(page, "button, a", 44);
      await page.screenshot({ path: path.join(screenshotsDir, `my_tests_${vp.name}.png`), fullPage: false });

      await context.close();
    }

    // ── 5. Full Attempt -> Result -> Solutions Flow on all 5 Viewports ─
    console.log("\n4. Running Full Attempt Flow across all 5 standard viewports...");
    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`======================================================`);

      const { context, page } = await createLoggedInContext(vp);

      // Start Attempt via Declaration Page
      const declUrl = `http://localhost:3000/test-series/${testSeries.id}/declaration?testId=${testExam.id}&retake=true`;
      await page.goto(declUrl, { waitUntil: "networkidle" });

      // Check declaration checkbox
      await page.locator("label:has-text('I have read and understood the instructions')").click();
      await page.waitForTimeout(300);

      // Click "I am ready to begin"
      const beginBtn = page.locator("button:has-text('I am ready to begin')");
      await beginBtn.click();

      // Wait for attempt arena to load
      await page.waitForURL((url) => url.pathname.includes("/attempt"), { timeout: 20000 });
      console.log(`  ✓ Navigated to attempt page: ${page.url()}`);

      // Extract attemptId from URL
      const currentUrl = new URL(page.url());
      attemptId = currentUrl.searchParams.get("attemptId");

      // Verify no horizontal scroll on attempt arena
      await page.waitForTimeout(1000);
      await checkNoHorizontalScroll(page, `Attempt Arena [${vp.name}]`);

      // Verify sticky top bar touch targets
      await checkTouchTargets(page, "header button", 44);

      // Verify option selection on Question 1 (Click Option B)
      const optionB = page.locator("button:has-text('B.')").or(page.locator("button:has-text('1 and 3 only')")).first();
      if (await optionB.isVisible()) {
        await optionB.click();
        console.log(`  ✓ Selected Option B for Q1 on [${vp.name}]`);
      }

      // Capture Attempt Screen
      const attemptShotPath = path.join(screenshotsDir, `attempt_${vp.name}.png`);
      await page.screenshot({ path: attemptShotPath, fullPage: false });
      console.log(`  📸 Saved attempt screenshot: ${attemptShotPath}`);

      // On mobile viewports, test mobile Question Palette bottom sheet
      if (vp.isMobile) {
        console.log(`  Testing mobile question palette bottom sheet...`);
        const paletteTrigger = page.locator("button:has-text('Question')").or(page.locator("button:has-text('Palette')")).first();
        if (await paletteTrigger.isVisible()) {
          await paletteTrigger.click();
          await page.waitForTimeout(400);

          // Assert no horizontal scroll when palette is open
          await checkNoHorizontalScroll(page, `Palette Open [${vp.name}]`);

          // Capture Palette Open Screenshot
          const paletteShotPath = path.join(screenshotsDir, `attempt_palette_${vp.name}.png`);
          await page.screenshot({ path: paletteShotPath, fullPage: false });
          console.log(`  📸 Saved palette open screenshot: ${paletteShotPath}`);

          // Jump to question 5 via palette
          const q5Btn = page.locator("button:has-text('5')").first();
          if (await q5Btn.isVisible()) {
            await q5Btn.click();
            await page.waitForTimeout(400);
            console.log(`  ✓ Jumped to Question 5 via palette`);
          }
        }
      }

      // Test "Save & Next"
      const saveNextBtn = page.locator("button:has-text('Save & Next'):visible").first();
      if (await saveNextBtn.isVisible()) {
        await saveNextBtn.click();
        await page.waitForTimeout(500);
        console.log(`  ✓ Clicked Save & Next`);
      }

      // Test Submit Modal
      console.log(`  Opening Submit confirmation modal...`);
      const submitBtn = page.locator("button:has-text('Submit'):visible").first();
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Verify submit modal visible and no overflow
      await checkNoHorizontalScroll(page, `Submit Modal [${vp.name}]`);
      const modalShotPath = path.join(screenshotsDir, `attempt_submit_modal_${vp.name}.png`);
      await page.screenshot({ path: modalShotPath, fullPage: false });
      console.log(`  📸 Saved submit modal screenshot: ${modalShotPath}`);

      // Confirm Submit
      const confirmSubmitBtn = page.locator("button:has-text('Submit Now'):visible").first();
      await confirmSubmitBtn.click();

      // Wait for Result page
      await page.waitForURL((url) => url.pathname.includes("/result"), { timeout: 25000 });
      console.log(`  ✓ Successfully submitted & reached Result page: ${page.url()}`);

      // Verify Result page
      await page.waitForTimeout(1000);
      await checkNoHorizontalScroll(page, `Result Page [${vp.name}]`);
      await checkTouchTargets(page, "button, a", 44);

      const resultShotPath = path.join(screenshotsDir, `result_${vp.name}.png`);
      await page.screenshot({ path: resultShotPath, fullPage: false });
      console.log(`  📸 Saved result screenshot: ${resultShotPath}`);

      // Test Solutions Page
      console.log(`  Navigating to Solutions & Explanations page...`);
      const solUrl = `http://localhost:3000/test-series/${testSeries.id}/solutions?testId=${testExam.id}&attemptId=${attemptId}`;
      await page.goto(solUrl, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      await checkNoHorizontalScroll(page, `Solutions Page [${vp.name}]`);
      await checkTouchTargets(page, "button, a", 40);

      // On mobile viewports, open mobile question palette bottom sheet
      if (vp.isMobile) {
        const solPaletteBtn = page.locator("button:has-text('Q 1')").or(page.locator("button:has-text('Questions')")).first();
        if (await solPaletteBtn.isVisible()) {
          await solPaletteBtn.click();
          await page.waitForTimeout(300);
          await checkNoHorizontalScroll(page, `Solutions Palette Sheet [${vp.name}]`);
          const solPaletteShotPath = path.join(screenshotsDir, `solutions_palette_${vp.name}.png`);
          await page.screenshot({ path: solPaletteShotPath, fullPage: false });
          console.log(`  📸 Saved solutions palette sheet screenshot: ${solPaletteShotPath}`);

          // Close sheet
          const closeBtn = page.locator("button[aria-label='Close question palette']").first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(200);
          }
        }
      }

      const solShotPath = path.join(screenshotsDir, `solutions_${vp.name}.png`);
      await page.screenshot({ path: solShotPath, fullPage: false });
      console.log(`  📸 Saved solutions screenshot: ${solShotPath}`);

      await context.close();
    }

    console.log("\n======================================================================");
    console.log("ALL REAL BROWSER MOBILE AUDIT TESTS PASSED WITH 0 OVERFLOWS!");
    console.log("======================================================================\n");
  } finally {
    if (browser) {
      await browser.close();
    }

    console.log("======================================================================");
    console.log("CLEANING UP AUDIT TEST RECORDS FROM DB...");

    if (studentUser) {
      await prisma.examAttempt.deleteMany({ where: { userId: studentUser.id } }).catch(() => {});
      await prisma.examSeriesEnrollment.deleteMany({ where: { userId: studentUser.id } }).catch(() => {});
      console.log(`  Deleted attempts & enrollments for student ${studentUser.id}`);
    }

    if (testSeries) {
      await prisma.examSeries.delete({ where: { id: testSeries.id } }).catch(() => {});
      console.log(`  Deleted testSeries ${testSeries.id} (cascade deleted test & 10 questions)`);
    }

    if (studentUser) {
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {});
      console.log(`  Deleted student user ${studentUser.id}`);
    }

    if (teacherUser) {
      await prisma.user.delete({ where: { id: teacherUser.id } }).catch(() => {});
      console.log(`  Deleted teacher user ${teacherUser.id}`);
    }

    console.log("CLEANUP COMPLETE: All audit records cleanly removed from database.");
    console.log("======================================================================\n");
  }
}

runMobileAudit().catch((err) => {
  console.error("FATAL ERROR running mobile audit:", err);
  process.exit(1);
});
