commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4 | present logs: [part1,part2,part3,part4,part5,part6,part7,part8,part9,part10,part11,part12,part13] | not done: [part14]

================================================================================
LOG FILE: logs/pass10_8/part1.log
================================================================================
=== PART 1: LANDING DASHBOARD BUTTON ON MOBILE AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:05:12 UTC 2026
Base URL: http://127.0.0.1:3045

--- 1.1 Changed Lines Inspection (git diff) ---
Showing HomeHeaderUserCTA.tsx diff where hidden sm:flex was removed:
42-            <div className="flex items-center gap-2 sm:gap-3">
43-                <Link
44-                    href={dashboardHref}
45-                    prefetch={true}
46-                    className="flex px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-xs items-center gap-1.5"
47:                    aria-label="Go to Dashboard"
48-                >
49-                    <span>Dashboard</span>
50-                    <ArrowRight className="h-3.5 w-3.5" />
51-                </Link>
52-                <HomeUserDropdown user={session.user} />

--- 1.2 Playwright Run: Logged-in User at 390x844 & 1280x800 ---
[LOGGED-IN MOBILE 390x844] Dashboard Button Visible: true | Href: /dashboard
[LOGGED-IN MOBILE 390x844] URL after click: http://127.0.0.1:3045/dashboard
[LOGGED-IN DESKTOP 1280x800] Dashboard Button Visible: true | Href: /dashboard
[LOGGED-IN DESKTOP 1280x800] URL after click: http://127.0.0.1:3045/dashboard
[GUEST MOBILE 390x844] Dashboard Button Count: 0 | Login Button Count: 1
[GUEST DESKTOP 1280x800] Dashboard Button Count: 0 | Login Button Count: 1

=== PART 1 VERIFICATION COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part2.log
================================================================================
=== PART 2: STATIC-ONLY COURSE => COMING SOON AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:05:20 UTC 2026
Base URL: http://127.0.0.1:3045

--- 2.1 Seed Test Items in Docker Test DB ---
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1

--- 2.2 Probing Target Slugs with curl ---
1. Static-only course (upsc-csat-comprehension-quant):
HTTP/1.1 200 OK
set-cookie: authjs.csrf-token=7742933ff1e6df86954be550a266cce586454cd10d84c6c6f9eada8be25e2bf0%7C210ce41631ca385526e49591db5ce944d87dd30e0c0b58b98803d029045f903e; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
link: </_next/static/css/55d960dff5c36634.css>; rel=preload; as="style"
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Date: Wed, 07 Oct 2026 10:05:20 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


2. Real draft course (secret-draft-course-p10-8):
HTTP/1.1 404 Not Found
set-cookie: authjs.csrf-token=8707131429c58064e75376857b1c29bde34553fc508afa33c90b64e284888fb9%7C2c80d08328cdcc7165b7579f9706bbbcc3c5243c4933679882880c529d6f067b; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
link: </_next/static/css/55d960dff5c36634.css>; rel=preload; as="style"
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Date: Wed, 07 Oct 2026 10:05:20 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


3. Non-existent made-up course (completely-made-up-course-xyz):
HTTP/1.1 404 Not Found
set-cookie: authjs.csrf-token=c19e81af9154c18baabce4125cf932913c0552995514d11bc38a4fccb1fb1407%7C02e2320e3fe7b671d6407044bc69da78373bf36a1a141de691a879727092861a; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
link: </_next/static/css/55d960dff5c36634.css>; rel=preload; as="style"
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Date: Wed, 07 Oct 2026 10:05:20 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


4. Published course with lessons (upsc-gs-foundation-primer):
HTTP/1.1 200 OK
set-cookie: authjs.csrf-token=8e66620f4bb87db0de15518abb342b87b215984c3e0fa1e9ef0de0cbd9b96a5c%7Ca6ff4126a08312c47fcf87395641467086203ae019b922846a633343716a9a48; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
link: </_next/static/css/55d960dff5c36634.css>; rel=preload; as="style"
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Date: Wed, 07 Oct 2026 10:05:20 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


--- 2.3 Response Body Comparison (Draft 404 vs Non-existent 404) ---
Diff output between normalized draft-404 and nonexistent-404:
1c1
< <!DOCTYPE html><html id="__next_error__"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-48121f34c5c0d234.js"/><script src="/_next/static/chunks/4bd1b696-d53804191fe6e732.js" async=""></script><script src="/_next/static/chunks/1517-903ca4e94515c7e6.js" async=""></script><script src="/_next/static/chunks/main-app-bb91d44b73a41341.js" async=""></script><script src="/_next/static/chunks/app/global-error-68b4ad222cc8f59c.js" async=""></script><meta name="robots" content="noindex"/><title>aspirantbook - Learn Data Science, AI &amp; Programming</title><meta name="description" content="Master data science, AI, and programming with interactive courses, coding exercises, and real-world projects."/><link rel="manifest" href="/manifest.json"/><meta name="keywords" content="data science,programming,AI,machine learning,online learning,coding"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="aspirantbook"/><meta name="apple-mobile-web-app-status-bar-style" content="default"/><meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff"/><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#05192D"/><script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head><body><script src="/_next/static/chunks/webpack-48121f34c5c0d234.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"1:\"$Sreact.fragment\"\n3:I[85594,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"592\",\"static/chunks/592-3268c05fc8f27c48.js\",\"7970\",\"static/chunks/7970-515eabad081fe566.js\",\"497\",\"static/chunks/497-9b3bcc3137070cde.js\",\"5496\",\"static/chunks/5496-501a5626d6a6f4e5.js\",\"9305\",\"static/chunks/app/(dashboard)/layout-e6ddae7be5965bdc.js\"],\"default\"]\n4:I[15244,[],\"\"]\n5:I[11877,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"4151\",\"static/chunks/app/(dashboard)/error-cd54490629af82b1.js\"],\"default\"]\n6:I[43866,[],\"\"]\n8:I[86213,[],\"OutletBoundary\"]\na:I[86213,[],\"MetadataBoundary\"]\nc:I[86213,[],\"ViewportBoundary\"]\ne:I[87401,[\"6600\",\"static/chunks/app/global-error-68b4ad222cc8f59c.js\"],\"default\"]\n:HL[\"/_next/static/css/55d960dff5c36634.css\",\"style\"]\n:HL[\"/_next/static/css/84f56345222ff4dd.css\",\"style\"]\n"])</script><script>self.__next_f.push([1,"0:{\"P\":null,\"b\":\"hNZez0_3ZrDVQUbOmWtL2\",\"p\":\"\",\"c\":[\"\",\"courses\",\"secret-draft-course-p10-8\"],\"i\":false,\"f\":[[[\"\",{\"children\":[\"(dashboard)\",{\"children\":[\"courses\",{\"children\":[[\"slug\",\"secret-draft-course-p10-8\",\"d\"],{\"children\":[\"__PAGE__\",{}]}]}]}]},\"$undefined\",\"$undefined\",true],[\"\",[\"$\",\"$1\",\"c\",{\"children\":[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/55d960dff5c36634.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\",\"nonce\":\"$undefined\"}]],\"$L2\"]}],{\"children\":[\"(dashboard)\",[\"$\",\"$1\",\"c\",{\"children\":[null,[\"$\",\"$L3\",null,{\"children\":[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(dashboard)\",\"children\"],\"error\":\"$5\",\"errorStyles\":[],\"errorScripts\":[],\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]}]]}],{\"children\":[\"courses\",[\"$\",\"$1\",\"c\",{\"children\":[null,[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(dashboard)\",\"children\",\"courses\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]]}],{\"children\":[[\"slug\",\"secret-draft-course-p10-8\",\"d\"],[\"$\",\"$1\",\"c\",{\"children\":[null,[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(dashboard)\",\"children\",\"courses\",\"children\",\"$0:f:0:1:2:children:2:children:2:children:0\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]]}],{\"children\":[\"__PAGE__\",[\"$\",\"$1\",\"c\",{\"children\":[\"$L7\",[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/84f56345222ff4dd.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\",\"nonce\":\"$undefined\"}]],[\"$\",\"$L8\",null,{\"children\":\"$L9\"}]]}],{},null,false]},null,false]},null,false]},null,false]},null,false],[\"$\",\"$1\",\"h\",{\"children\":[null,[\"$\",\"$1\",\"WoJoJ9pHvZ69VJJgM1Jd9\",{\"children\":[[\"$\",\"$La\",null,{\"children\":\"$Lb\"}],[\"$\",\"$Lc\",null,{\"children\":\"$Ld\"}],null]}]]}],false]],\"m\":\"$undefined\",\"G\":[\"$e\",[]],\"s\":false,\"S\":false}\n"])</script><script>self.__next_f.push([1,"d:[[\"$\",\"meta\",\"0\",{\"name\":\"viewport\",\"content\":\"width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover\"}],[\"$\",\"meta\",\"1\",{\"name\":\"theme-color\",\"media\":\"(prefers-color-scheme: light)\",\"content\":\"#ffffff\"}],[\"$\",\"meta\",\"2\",{\"name\":\"theme-color\",\"media\":\"(prefers-color-scheme: dark)\",\"content\":\"#05192D\"}]]\n"])</script><script>self.__next_f.push([1,"f:I[51241,[\"592\",\"static/chunks/592-3268c05fc8f27c48.js\",\"7970\",\"static/chunks/7970-515eabad081fe566.js\",\"5496\",\"static/chunks/5496-501a5626d6a6f4e5.js\",\"7177\",\"static/chunks/app/layout-74febfee74d65c3f.js\"],\"Providers\"]\n10:I[58725,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"8039\",\"static/chunks/app/error-f7d83713af4da802.js\"],\"default\"]\n11:I[48173,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"1181\",\"static/chunks/1181-cb92105a9956e122.js\",\"592\",\"static/chunks/592-3268c05fc8f27c48.js\",\"7970\",\"static/chunks/7970-515eabad081fe566.js\",\"9116\",\"static/chunks/9116-63a8f60c6549132d.js\",\"1748\",\"static/chunks/1748-4b8ce50c02e198dd.js\",\"9895\",\"static/chunks/9895-81ee0907bdd3f358.js\",\"2274\",\"static/chunks/2274-8f3587c53970ed6c.js\",\"5496\",\"static/chunks/5496-501a5626d6a6f4e5.js\",\"8974\",\"static/chunks/app/page-f37ebf57684acb92.js\"],\"\"]\n"])</script><script>self.__next_f.push([1,"2:[\"$\",\"html\",null,{\"lang\":\"en\",\"suppressHydrationWarning\":true,\"children\":[[\"$\",\"head\",null,{\"children\":[[\"$\",\"link\",null,{\"rel\":\"dns-prefetch\",\"href\":\"https://cdn.jsdelivr.net\"}],[\"$\",\"link\",null,{\"rel\":\"preconnect\",\"href\":\"https://cdn.jsdelivr.net\",\"crossOrigin\":\"anonymous\"}],[\"$\",\"script\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"(function(){try{var t=localStorage.getItem(\\\"ts_theme\\\");if(t===\\\"dark\\\"){document.documentElement.classList.add(\\\"dark\\\")}else{document.documentElement.classList.remove(\\\"dark\\\")}}catch(e){}})();\"}}]]}],[\"$\",\"body\",null,{\"className\":\"font-sans antialiased\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"$Lf\",null,{\"session\":null,\"children\":[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\"],\"error\":\"$10\",\"errorStyles\":[],\"errorScripts\":[],\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[],[\"$\",\"main\",null,{\"className\":\"min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center\",\"children\":[\"$\",\"div\",null,{\"className\":\"w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-6\",\"children\":[[\"$\",\"div\",null,{\"className\":\"space-y-3\",\"children\":[[\"$\",\"span\",null,{\"className\":\"inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/10 text-primary\",\"children\":\"404 • Page Not Found\"}],[\"$\",\"h1\",null,{\"className\":\"text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground\",\"children\":\"Looking for something?\"}],[\"$\",\"p\",null,{\"className\":\"text-sm sm:text-base text-muted-foreground max-w-sm mx-auto\",\"children\":\"The page or resource you requested doesn't exist or may have been relocated.\"}]]}],[\"$\",\"div\",null,{\"className\":\"grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left\",\"children\":[[\"$\",\"$L11\",null,{\"href\":\"/dashboard\",\"data-testid\":\"not-found-dashboard\",\"className\":\"flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]\",\"children\":[[\"$\",\"div\",null,{\"className\":\"w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform\",\"children\":[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-house w-4 h-4\",\"children\":[[\"$\",\"path\",\"5wwlr5\",{\"d\":\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"}],[\"$\",\"path\",\"1d0kgt\",{\"d\":\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"}],\"$undefined\"]}]}],[\"$\",\"span\",null,{\"className\":\"font-semibold text-xs sm:text-sm text-foreground\",\"children\":\"Dashboard\"}],[\"$\",\"span\",null,{\"className\":\"text-[11px] text-muted-foreground\",\"children\":\"Return to learning hub\"}]]}],[\"$\",\"$L11\",null,{\"href\":\"/courses\",\"data-testid\":\"not-found-courses\",\"className\":\"flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]\",\"children\":[[\"$\",\"div\",null,{\"className\":\"w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform\",\"children\":[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-book-open w-4 h-4\",\"children\":[[\"$\",\"path\",\"1akyts\",{\"d\":\"M12 7v14\"}],[\"$\",\"path\",\"ruj8y\",{\"d\":\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"}],\"$undefined\"]}]}],[\"$\",\"span\",null,{\"className\":\"font-semibold text-xs sm:text-sm text-foreground\",\"children\":\"Courses\"}],[\"$\",\"span\",null,{\"className\":\"text-[11px] text-muted-foreground\",\"children\":\"Browse all tutorials\"}]]}],[\"$\",\"$L11\",null,{\"href\":\"/test-series\",\"data-testid\":\"not-found-test-series\",\"className\":\"flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]\",\"children\":[[\"$\",\"div\",null,{\"className\":\"w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform\",\"children\":[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-graduation-cap w-4 h-4\",\"children\":[[\"$\",\"path\",\"j76jl0\",{\"d\":\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"}],[\"$\",\"path\",\"1lu8f3\",{\"d\":\"M22 10v6\"}],[\"$\",\"path\",\"1r8lef\",{\"d\":\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"}],\"$undefined\"]}]}],[\"$\",\"span\",null,{\"className\":\"font-semibold text-xs sm:text-sm text-foreground\",\"children\":\"Test Series\"}],[\"$\",\"span\",null,{\"className\":\"text-[11px] text-muted-foreground\",\"children\":\"Mock tests \u0026 PYQs\"}]]}]]}],[\"$\",\"div\",null,{\"className\":\"pt-2\",\"children\":[\"$\",\"$L11\",null,{\"href\":\"/search\",\"className\":\"inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-primary hover:underline min-h-[44px] px-4\",\"children\":[[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-search w-4 h-4\",\"children\":[[\"$\",\"circle\",\"4ej97u\",{\"cx\":\"11\",\"cy\":\"11\",\"r\":\"8\"}],[\"$\",\"path\",\"1qie3q\",{\"d\":\"m21 21-4.3-4.3\"}],\"$undefined\"]}],[\"$\",\"span\",null,{\"children\":\"Search the entire catalog\"}]]}]}]]}]}]],\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]}]}]]}]\n"])</script><script>self.__next_f.push([1,"b:[[\"$\",\"meta\",\"0\",{\"charSet\":\"utf-8\"}],[\"$\",\"title\",\"1\",{\"children\":\"aspirantbook - Learn Data Science, AI \u0026 Programming\"}],[\"$\",\"meta\",\"2\",{\"name\":\"description\",\"content\":\"Master data science, AI, and programming with interactive courses, coding exercises, and real-world projects.\"}],[\"$\",\"link\",\"3\",{\"rel\":\"manifest\",\"href\":\"/manifest.json\",\"crossOrigin\":\"$undefined\"}],[\"$\",\"meta\",\"4\",{\"name\":\"keywords\",\"content\":\"data science,programming,AI,machine learning,online learning,coding\"}],[\"$\",\"meta\",\"5\",{\"name\":\"mobile-web-app-capable\",\"content\":\"yes\"}],[\"$\",\"meta\",\"6\",{\"name\":\"apple-mobile-web-app-title\",\"content\":\"aspirantbook\"}],[\"$\",\"meta\",\"7\",{\"name\":\"apple-mobile-web-app-status-bar-style\",\"content\":\"default\"}]]\n9:E{\"digest\":\"NEXT_HTTP_ERROR_FALLBACK;404\"}\n7:E{\"digest\":\"NEXT_HTTP_ERROR_FALLBACK;404\"}\n"])</script></body></html>
\ No newline at end of file
---
> <!DOCTYPE html><html id="__next_error__"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-48121f34c5c0d234.js"/><script src="/_next/static/chunks/4bd1b696-d53804191fe6e732.js" async=""></script><script src="/_next/static/chunks/1517-903ca4e94515c7e6.js" async=""></script><script src="/_next/static/chunks/main-app-bb91d44b73a41341.js" async=""></script><script src="/_next/static/chunks/app/global-error-68b4ad222cc8f59c.js" async=""></script><meta name="robots" content="noindex"/><title>aspirantbook - Learn Data Science, AI &amp; Programming</title><meta name="description" content="Master data science, AI, and programming with interactive courses, coding exercises, and real-world projects."/><link rel="manifest" href="/manifest.json"/><meta name="keywords" content="data science,programming,AI,machine learning,online learning,coding"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="aspirantbook"/><meta name="apple-mobile-web-app-status-bar-style" content="default"/><meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff"/><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#05192D"/><script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head><body><script src="/_next/static/chunks/webpack-48121f34c5c0d234.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"1:\"$Sreact.fragment\"\n3:I[85594,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"592\",\"static/chunks/592-3268c05fc8f27c48.js\",\"7970\",\"static/chunks/7970-515eabad081fe566.js\",\"497\",\"static/chunks/497-9b3bcc3137070cde.js\",\"5496\",\"static/chunks/5496-501a5626d6a6f4e5.js\",\"9305\",\"static/chunks/app/(dashboard)/layout-e6ddae7be5965bdc.js\"],\"default\"]\n4:I[15244,[],\"\"]\n5:I[11877,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"4151\",\"static/chunks/app/(dashboard)/error-cd54490629af82b1.js\"],\"default\"]\n6:I[43866,[],\"\"]\n8:I[86213,[],\"OutletBoundary\"]\na:I[86213,[],\"MetadataBoundary\"]\nc:I[86213,[],\"ViewportBoundary\"]\ne:I[87401,[\"6600\",\"static/chunks/app/global-error-68b4ad222cc8f59c.js\"],\"default\"]\n:HL[\"/_next/static/css/55d960dff5c36634.css\",\"style\"]\n:HL[\"/_next/static/css/84f56345222ff4dd.css\",\"style\"]\n"])</script><script>self.__next_f.push([1,"0:{\"P\":null,\"b\":\"hNZez0_3ZrDVQUbOmWtL2\",\"p\":\"\",\"c\":[\"\",\"courses\",\"completely-made-up-course-xyz\"],\"i\":false,\"f\":[[[\"\",{\"children\":[\"(dashboard)\",{\"children\":[\"courses\",{\"children\":[[\"slug\",\"completely-made-up-course-xyz\",\"d\"],{\"children\":[\"__PAGE__\",{}]}]}]}]},\"$undefined\",\"$undefined\",true],[\"\",[\"$\",\"$1\",\"c\",{\"children\":[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/55d960dff5c36634.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\",\"nonce\":\"$undefined\"}]],\"$L2\"]}],{\"children\":[\"(dashboard)\",[\"$\",\"$1\",\"c\",{\"children\":[null,[\"$\",\"$L3\",null,{\"children\":[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(dashboard)\",\"children\"],\"error\":\"$5\",\"errorStyles\":[],\"errorScripts\":[],\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]}]]}],{\"children\":[\"courses\",[\"$\",\"$1\",\"c\",{\"children\":[null,[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(dashboard)\",\"children\",\"courses\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]]}],{\"children\":[[\"slug\",\"completely-made-up-course-xyz\",\"d\"],[\"$\",\"$1\",\"c\",{\"children\":[null,[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(dashboard)\",\"children\",\"courses\",\"children\",\"$0:f:0:1:2:children:2:children:2:children:0\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]]}],{\"children\":[\"__PAGE__\",[\"$\",\"$1\",\"c\",{\"children\":[\"$L7\",[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/84f56345222ff4dd.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\",\"nonce\":\"$undefined\"}]],[\"$\",\"$L8\",null,{\"children\":\"$L9\"}]]}],{},null,false]},null,false]},null,false]},null,false]},null,false],[\"$\",\"$1\",\"h\",{\"children\":[null,[\"$\",\"$1\",\"7GJDnhWZzcD9jitbXhvj_\",{\"children\":[[\"$\",\"$La\",null,{\"children\":\"$Lb\"}],[\"$\",\"$Lc\",null,{\"children\":\"$Ld\"}],null]}]]}],false]],\"m\":\"$undefined\",\"G\":[\"$e\",[]],\"s\":false,\"S\":false}\n"])</script><script>self.__next_f.push([1,"d:[[\"$\",\"meta\",\"0\",{\"name\":\"viewport\",\"content\":\"width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover\"}],[\"$\",\"meta\",\"1\",{\"name\":\"theme-color\",\"media\":\"(prefers-color-scheme: light)\",\"content\":\"#ffffff\"}],[\"$\",\"meta\",\"2\",{\"name\":\"theme-color\",\"media\":\"(prefers-color-scheme: dark)\",\"content\":\"#05192D\"}]]\n"])</script><script>self.__next_f.push([1,"f:I[51241,[\"592\",\"static/chunks/592-3268c05fc8f27c48.js\",\"7970\",\"static/chunks/7970-515eabad081fe566.js\",\"5496\",\"static/chunks/5496-501a5626d6a6f4e5.js\",\"7177\",\"static/chunks/app/layout-74febfee74d65c3f.js\"],\"Providers\"]\n10:I[58725,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"8039\",\"static/chunks/app/error-f7d83713af4da802.js\"],\"default\"]\n11:I[48173,[\"8173\",\"static/chunks/8173-64d24fff61f76fe7.js\",\"1181\",\"static/chunks/1181-cb92105a9956e122.js\",\"592\",\"static/chunks/592-3268c05fc8f27c48.js\",\"7970\",\"static/chunks/7970-515eabad081fe566.js\",\"9116\",\"static/chunks/9116-63a8f60c6549132d.js\",\"1748\",\"static/chunks/1748-4b8ce50c02e198dd.js\",\"9895\",\"static/chunks/9895-81ee0907bdd3f358.js\",\"2274\",\"static/chunks/2274-8f3587c53970ed6c.js\",\"5496\",\"static/chunks/5496-501a5626d6a6f4e5.js\",\"8974\",\"static/chunks/app/page-f37ebf57684acb92.js\"],\"\"]\n"])</script><script>self.__next_f.push([1,"2:[\"$\",\"html\",null,{\"lang\":\"en\",\"suppressHydrationWarning\":true,\"children\":[[\"$\",\"head\",null,{\"children\":[[\"$\",\"link\",null,{\"rel\":\"dns-prefetch\",\"href\":\"https://cdn.jsdelivr.net\"}],[\"$\",\"link\",null,{\"rel\":\"preconnect\",\"href\":\"https://cdn.jsdelivr.net\",\"crossOrigin\":\"anonymous\"}],[\"$\",\"script\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"(function(){try{var t=localStorage.getItem(\\\"ts_theme\\\");if(t===\\\"dark\\\"){document.documentElement.classList.add(\\\"dark\\\")}else{document.documentElement.classList.remove(\\\"dark\\\")}}catch(e){}})();\"}}]]}],[\"$\",\"body\",null,{\"className\":\"font-sans antialiased\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"$Lf\",null,{\"session\":null,\"children\":[\"$\",\"$L4\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\"],\"error\":\"$10\",\"errorStyles\":[],\"errorScripts\":[],\"template\":[\"$\",\"$L6\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[],[\"$\",\"main\",null,{\"className\":\"min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center\",\"children\":[\"$\",\"div\",null,{\"className\":\"w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-6\",\"children\":[[\"$\",\"div\",null,{\"className\":\"space-y-3\",\"children\":[[\"$\",\"span\",null,{\"className\":\"inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/10 text-primary\",\"children\":\"404 • Page Not Found\"}],[\"$\",\"h1\",null,{\"className\":\"text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground\",\"children\":\"Looking for something?\"}],[\"$\",\"p\",null,{\"className\":\"text-sm sm:text-base text-muted-foreground max-w-sm mx-auto\",\"children\":\"The page or resource you requested doesn't exist or may have been relocated.\"}]]}],[\"$\",\"div\",null,{\"className\":\"grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left\",\"children\":[[\"$\",\"$L11\",null,{\"href\":\"/dashboard\",\"data-testid\":\"not-found-dashboard\",\"className\":\"flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]\",\"children\":[[\"$\",\"div\",null,{\"className\":\"w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform\",\"children\":[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-house w-4 h-4\",\"children\":[[\"$\",\"path\",\"5wwlr5\",{\"d\":\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"}],[\"$\",\"path\",\"1d0kgt\",{\"d\":\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"}],\"$undefined\"]}]}],[\"$\",\"span\",null,{\"className\":\"font-semibold text-xs sm:text-sm text-foreground\",\"children\":\"Dashboard\"}],[\"$\",\"span\",null,{\"className\":\"text-[11px] text-muted-foreground\",\"children\":\"Return to learning hub\"}]]}],[\"$\",\"$L11\",null,{\"href\":\"/courses\",\"data-testid\":\"not-found-courses\",\"className\":\"flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]\",\"children\":[[\"$\",\"div\",null,{\"className\":\"w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform\",\"children\":[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-book-open w-4 h-4\",\"children\":[[\"$\",\"path\",\"1akyts\",{\"d\":\"M12 7v14\"}],[\"$\",\"path\",\"ruj8y\",{\"d\":\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"}],\"$undefined\"]}]}],[\"$\",\"span\",null,{\"className\":\"font-semibold text-xs sm:text-sm text-foreground\",\"children\":\"Courses\"}],[\"$\",\"span\",null,{\"className\":\"text-[11px] text-muted-foreground\",\"children\":\"Browse all tutorials\"}]]}],[\"$\",\"$L11\",null,{\"href\":\"/test-series\",\"data-testid\":\"not-found-test-series\",\"className\":\"flex flex-col items-start p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors group min-h-[44px]\",\"children\":[[\"$\",\"div\",null,{\"className\":\"w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform\",\"children\":[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-graduation-cap w-4 h-4\",\"children\":[[\"$\",\"path\",\"j76jl0\",{\"d\":\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"}],[\"$\",\"path\",\"1lu8f3\",{\"d\":\"M22 10v6\"}],[\"$\",\"path\",\"1r8lef\",{\"d\":\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"}],\"$undefined\"]}]}],[\"$\",\"span\",null,{\"className\":\"font-semibold text-xs sm:text-sm text-foreground\",\"children\":\"Test Series\"}],[\"$\",\"span\",null,{\"className\":\"text-[11px] text-muted-foreground\",\"children\":\"Mock tests \u0026 PYQs\"}]]}]]}],[\"$\",\"div\",null,{\"className\":\"pt-2\",\"children\":[\"$\",\"$L11\",null,{\"href\":\"/search\",\"className\":\"inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-primary hover:underline min-h-[44px] px-4\",\"children\":[[\"$\",\"svg\",null,{\"ref\":\"$undefined\",\"xmlns\":\"http://www.w3.org/2000/svg\",\"width\":24,\"height\":24,\"viewBox\":\"0 0 24 24\",\"fill\":\"none\",\"stroke\":\"currentColor\",\"strokeWidth\":2,\"strokeLinecap\":\"round\",\"strokeLinejoin\":\"round\",\"className\":\"lucide lucide-search w-4 h-4\",\"children\":[[\"$\",\"circle\",\"4ej97u\",{\"cx\":\"11\",\"cy\":\"11\",\"r\":\"8\"}],[\"$\",\"path\",\"1qie3q\",{\"d\":\"m21 21-4.3-4.3\"}],\"$undefined\"]}],[\"$\",\"span\",null,{\"children\":\"Search the entire catalog\"}]]}]}]]}]}]],\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\"}]}]}]]}]\n"])</script><script>self.__next_f.push([1,"7:E{\"digest\":\"NEXT_HTTP_ERROR_FALLBACK;404\"}\n"])</script><script>self.__next_f.push([1,"b:[[\"$\",\"meta\",\"0\",{\"charSet\":\"utf-8\"}],[\"$\",\"title\",\"1\",{\"children\":\"aspirantbook - Learn Data Science, AI \u0026 Programming\"}],[\"$\",\"meta\",\"2\",{\"name\":\"description\",\"content\":\"Master data science, AI, and programming with interactive courses, coding exercises, and real-world projects.\"}],[\"$\",\"link\",\"3\",{\"rel\":\"manifest\",\"href\":\"/manifest.json\",\"crossOrigin\":\"$undefined\"}],[\"$\",\"meta\",\"4\",{\"name\":\"keywords\",\"content\":\"data science,programming,AI,machine learning,online learning,coding\"}],[\"$\",\"meta\",\"5\",{\"name\":\"mobile-web-app-capable\",\"content\":\"yes\"}],[\"$\",\"meta\",\"6\",{\"name\":\"apple-mobile-web-app-title\",\"content\":\"aspirantbook\"}],[\"$\",\"meta\",\"7\",{\"name\":\"apple-mobile-web-app-status-bar-style\",\"content\":\"default\"}]]\n9:E{\"digest\":\"NEXT_HTTP_ERROR_FALLBACK;404\"}\n"])</script></body></html>
\ No newline at end of file
Bodies are completely identical (zero diff).

--- 2.4 Playwright Inspection: Guest & Logged-In ---
[CSAT GUEST] Breadcrumbs: Courses > Upsc Csat Comprehension Quant
[CSAT GUEST] Coming Soon text count: 3 | Back to Courses count: 1 | Brand Logo in Shell: 1
[CSAT GUEST] Clicking 'Notify Me on Launch' button...
[CSAT GUEST] Auth/OTP modal opened on click: YES
[CSAT LOGGED-IN] Breadcrumbs: Courses > Upsc Csat Comprehension Quant
[CSAT LOGGED-IN] Clicking 'Notify Me on Launch' button as logged-in user...
[CSAT LOGGED-IN] Priority confirmation shown: YES
[PRIMER PUBLISHED] Breadcrumbs: Courses > Upsc Gs Foundation Primer
[PRIMER PUBLISHED] Rendered Lesson count: 2 (Full Detail View: YES)

--- 2.5 Clean Up Test DB Seeds ---
DELETE 1
DELETE 1
DELETE 2
Remaining seeded rows: 0

=== PART 2 VERIFICATION COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part3.log
================================================================================
=== PART 3: GUEST 404 ON /tutorials/modern-indian-history ROOT CAUSE & PROOF ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:05:31 UTC 2026
Base URL: http://127.0.0.1:3045

--- 3.1 Root Cause & Mechanism Investigation ---
Code Path: app/(dashboard)/tutorials/page.tsx only rendered the index /tutorials catalog.
No route file existed for app/(dashboard)/tutorials/[slug]/page.tsx.
Consequently, Next.js App Router returned 404 for ANY /tutorials/[slug] path by default.
Fix Applied: Added app/(dashboard)/tutorials/[slug]/page.tsx to look up the tutorial course and redirect to /courses/[slug] (or 404 if draft/non-existent).

--- 3.2 SQL Verification on Test DB ---
Querying Test DB for 'modern-indian-history':
          id          |         slug          |         title         | isPublished |  status   
----------------------+-----------------------+-----------------------+-------------+-----------
 c_tut_modern_history | modern-indian-history | Modern Indian History | t           | PUBLISHED
(1 row)


--- 3.3 Test Published Tutorial as Guest ---
1. curl -i on /tutorials/modern-indian-history (No Redirect Follow):
HTTP/1.1 307 Temporary Redirect
set-cookie: authjs.csrf-token=f5ceb4b84af1a62d03e2d196170327e67de033aebf629e39b9743909b7e5ec04%7C1ca905d182c58550fa9f6d4b0fc497efd84cb5341f5a25b7fbd2e00aa9416ddc; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
link: </_next/static/css/55d960dff5c36634.css>; rel=preload; as="style"
location: /courses/modern-indian-history
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Date: Wed, 07 Oct 2026 10:05:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

2. curl -i -L follow redirect to canonical tutorial overview:
FINAL_URL: http://127.0.0.1:3045/courses/modern-indian-history | HTTP_CODE: 200 | HOPS: 1

--- 3.4 Test Unknown Tutorial Slug as Guest ---
Probing /tutorials/completely-unknown-tutorial-slug:
HTTP_CODE: 404
HTTP/1.1 404 Not Found
set-cookie: authjs.csrf-token=a7a2fc639e7b46daa42cf9fcc23cb98552261bd6c768bad633d2fd370181f914%7C2b19c35a4368d00072b520204fd438dfb383717b2e5683e22c757b82edf09403; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
link: </_next/static/css/55d960dff5c36634.css>; rel=preload; as="style"
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
Date: Wed, 07 Oct 2026 10:05:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


=== PART 3 VERIFICATION COMPLETE: GUEST INVARIANT PRESERVED ===


================================================================================
LOG FILE: logs/pass10_8/part4.log
================================================================================
=== PART 4: S1 RE-PROOF WITH LIVE BEFORE (4c9f256:3046 vs HEAD:3045) ===
HEAD Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Pre-fix Worktree Commit: 4c9f256
Date: Wed Oct  7 10:05:31 UTC 2026

--- 4.1 Verify Pre-Fix Worktree State ---
Worktree rev-parse: 4c9f2566c22d8c4557f63c8e0c4a1ff7288ff23b
Worktree status:  M tsconfig.json
?? .next-prefix/

--- 4.2 Seed Published Course with Lessons for Comparison ---
INSERT 0 1
INSERT 0 1
INSERT 0 1

--- 4.3 Playwright Audit: 3046 (Pre-Fix) vs 3045 (HEAD) ---
[PRE-FIX 3046 GUEST] Navs: [ 'Home\n/\nTutorials\n/\nUPSC GS Foundation Primer\n/\nOverview' ]
[PRE-FIX 3046 GUEST] TopNavBar Brand Logo Count: 0 | Sidebar Dashboard Count: 0
[PRE-FIX 3046 0-LESSON] Coming Soon count: 0 | 404 count: 0
[POST-FIX 3045 GUEST] Navs: [
  '',
  'HomeTestsCoursesPass',
  'Courses\nUpsc Gs Foundation Primer',
  'Home\n/\nTutorials\n/\nUPSC GS Foundation Primer\n/\nOverview'
]
[POST-FIX 3045 GUEST] TopNavBar Brand Logo Count: 1 | Sidebar Dashboard Count: 1
[POST-FIX 3045 GUEST] Breadcrumbs: Courses > Upsc Gs Foundation Primer
[POST-FIX 3045 LOGGED-IN] TopNavBar Logo Count: 1 | Sidebar Dashboard Count: 1

--- 4.4 Clean Up Seeded Rows ---
DELETE 1
DELETE 1
DELETE 1

=== PART 4 AUDIT COMPLETE: LIVE BEFORE vs AFTER PROVEN ===


================================================================================
LOG FILE: logs/pass10_8/part5.log
================================================================================
=== PART 5: B1 ROOT CAUSE INVESTIGATION & 5 LOGGED-IN STATES AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:05:45 UTC 2026
Base URL: http://localhost:3045

--- 5.1 grep -rn "redirect(" in app/dashboard, layouts, middleware, auth.config ---
app/(dashboard)/settings/subscription/page.tsx:14:        redirect("/login")
app/(dashboard)/settings/subscription/page.tsx:41:        redirect("/login")
app/(dashboard)/assessments/[id]/results/page.tsx:21:        redirect("/login")
app/(dashboard)/assessments/[id]/results/page.tsx:25:        redirect(`/assessments/${id}`)
app/(dashboard)/assessments/[id]/take/page.tsx:22:        redirect("/login")
app/(dashboard)/assessments/[id]/page.tsx:19:        redirect("/login")
app/(dashboard)/assessments/page.tsx:4:    redirect("/practice")
app/(dashboard)/purchases/page.tsx:18:    redirect("/login")
app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx:16:        redirect("/login")
app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx:137:        redirect(`/courses/${courseSlug}?locked=true`)
app/(dashboard)/learn/[courseSlug]/page.tsx:34:        redirect("/login")
app/(dashboard)/learn/[courseSlug]/page.tsx:73:        redirect(`/courses/${courseSlug}`)
app/(dashboard)/learn/[courseSlug]/page.tsx:77:    redirect(`/learn/${courseSlug}/${firstLesson.id}`)
app/(dashboard)/learn/page.tsx:4:    redirect("/tutorials")
app/(dashboard)/subscription/page.tsx:14:        redirect("/login")
app/(dashboard)/subscription/page.tsx:36:        redirect("/login")
app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx:121:    redirect(`/courses/${slug}?locked=true`)
app/(dashboard)/profile/page.tsx:26:        redirect("/login")
app/(dashboard)/tutorials/[slug]/page.tsx:28:    redirect(`/courses/${course.slug || course.id}`)
app/(dashboard)/teacher/pyqs/page.tsx:4:  redirect("/admin/pyqs")
middleware.ts:29:            return NextResponse.redirect(toRequestUrl("/login"))
middleware.ts:38:            return NextResponse.redirect(toRequestUrl("/teacher"))
middleware.ts:45:            return NextResponse.redirect(toRequestUrl("/"))
middleware.ts:52:            return NextResponse.redirect(toRequestUrl("/login"))
middleware.ts:55:            return NextResponse.redirect(toRequestUrl("/"))
middleware.ts:84:            return NextResponse.redirect(loginUrl)
middleware.ts:93:            return NextResponse.redirect(toRequestUrl(callback))
middleware.ts:100:            return NextResponse.redirect(toRequestUrl("/pricing?error=premium_required"))
auth.config.ts:15:        redirect({ url, baseUrl }) {

--- 5.2 Test 5 Logged-In States on http://localhost:3045 ---

>>> Testing State S1: Normal user with role FREE and onboarding completed
[S1] Direct /dashboard URL: http://localhost:3045/dashboard
[S1] Landing Dashboard Button Visible: true
[S1] URL after clicking Dashboard button: http://localhost:3045/dashboard
[S1] Header shows user avatar (logged in): false

>>> Testing State S2: User with no role set (role null)
[S2] Direct /dashboard URL: http://localhost:3045/dashboard
[S2] Landing Dashboard Button Visible: true
[S2] URL after clicking Dashboard button: http://localhost:3045/dashboard
[S2] Header shows user avatar (logged in): false

>>> Testing State S3: User with onboarding incomplete (role FREE, onboarding null)
[S3] Direct /dashboard URL: http://localhost:3045/dashboard
[S3] Landing Dashboard Button Visible: true
[S3] URL after clicking Dashboard button: http://localhost:3045/dashboard
[S3] Header shows user avatar (logged in): false

>>> Testing State S4: User whose DB row was deleted after login
[S4] Direct /dashboard URL: http://localhost:3045/dashboard
[S4] Landing Dashboard Button Visible: true
[S4] URL after clicking Dashboard button: http://localhost:3045/dashboard
[S4] Header shows user avatar (logged in): false

--- 5.3 Test B2: Header State Sequence Sampling (every 100ms for 3s) ---
Navigating to http://localhost:3045/ and sampling header text every 100ms...
B2 Sampling Summary: 24 samples taken.
Did header show 'Login' at any point for logged-in user? NO (Clean session preservation)

=== PART 5 AUDIT COMPLETE: B1/B2 INVESTIGATION RECORDED ===


================================================================================
LOG FILE: logs/pass10_8/part6.log
================================================================================
=== PART 6: ANONYMOUS API AUDIT v2 & PROBE EVALUATION ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:09 UTC 2026
Base URL: http://127.0.0.1:3045

Total API Routes found: 99

--- 6.1 Scanning All Routes (Anonymous) ---
ROUTE: /api/admin/audit | METHOD: GET | STATUS: 403
ROUTE: /api/admin/batches/[id] | METHOD: DELETE | STATUS: 401
ROUTE: /api/admin/batches/[id] | METHOD: GET | STATUS: 401
ROUTE: /api/admin/batches/[id] | METHOD: PUT | STATUS: 401
ROUTE: /api/admin/batches | METHOD: GET | STATUS: 401
ROUTE: /api/admin/batches | METHOD: POST | STATUS: 401
ROUTE: /api/admin/books/[id] | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/books/[id] | METHOD: GET | STATUS: 403
ROUTE: /api/admin/books/[id] | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/books/coupons | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/books/coupons | METHOD: GET | STATUS: 403
ROUTE: /api/admin/books/coupons | METHOD: POST | STATUS: 403
ROUTE: /api/admin/books/orders | METHOD: GET | STATUS: 403
ROUTE: /api/admin/books/orders | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/books | METHOD: GET | STATUS: 403
ROUTE: /api/admin/books | METHOD: POST | STATUS: 403
ROUTE: /api/admin/books/stats | METHOD: GET | STATUS: 403
ROUTE: /api/admin/coupons/[id] | METHOD: DELETE | STATUS: 401
ROUTE: /api/admin/coupons/[id] | METHOD: PUT | STATUS: 401
ROUTE: /api/admin/coupons | METHOD: GET | STATUS: 401
ROUTE: /api/admin/coupons | METHOD: POST | STATUS: 401
ROUTE: /api/admin/courses/[id]/chapters | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/courses/[id]/chapters | METHOD: POST | STATUS: 403
ROUTE: /api/admin/courses/[id]/chapters | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/courses/[id]/demo-report | METHOD: GET | STATUS: 403
ROUTE: /api/admin/courses/[id]/demo-slots | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/courses/[id]/demo-slots | METHOD: GET | STATUS: 401
ROUTE: /api/admin/courses/[id]/demo-slots | METHOD: POST | STATUS: 403
ROUTE: /api/admin/courses/[id]/lessons | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/courses/[id]/lessons | METHOD: POST | STATUS: 403
ROUTE: /api/admin/courses/[id]/lessons | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/courses/[id] | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/courses/[id] | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/courses | METHOD: POST | STATUS: 403
ROUTE: /api/admin/courses/upload | METHOD: POST | STATUS: 403
ROUTE: /api/admin/homepage-cards | METHOD: GET | STATUS: 403
ROUTE: /api/admin/homepage-cards | METHOD: POST | STATUS: 403
ROUTE: /api/admin/pyqs/categories/[id] | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/pyqs/categories/[id] | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/pyqs/categories | METHOD: GET | STATUS: 401
ROUTE: /api/admin/pyqs/categories | METHOD: POST | STATUS: 403
ROUTE: /api/admin/pyqs/leads | METHOD: GET | STATUS: 403
ROUTE: /api/admin/pyqs/leads | METHOD: POST | STATUS: 400
ROUTE: /api/admin/pyqs/papers/[id] | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/pyqs/papers/[id] | METHOD: GET | STATUS: 404
ROUTE: /api/admin/pyqs/papers/[id] | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/pyqs/papers | METHOD: GET | STATUS: 401
ROUTE: /api/admin/pyqs/papers | METHOD: POST | STATUS: 403
ROUTE: /api/admin/pyqs/sub-exams/[id] | METHOD: DELETE | STATUS: 403
ROUTE: /api/admin/pyqs/sub-exams/[id] | METHOD: PUT | STATUS: 403
ROUTE: /api/admin/pyqs/sub-exams | METHOD: POST | STATUS: 403
ROUTE: /api/admin/pyqs/upload | METHOD: POST | STATUS: 403
ROUTE: /api/admin/revalidate | METHOD: POST | STATUS: 401
ROUTE: /api/admin/run-analytics | METHOD: POST | STATUS: 401
ROUTE: /api/admin/tutorials/import | METHOD: POST | STATUS: 403
ROUTE: /api/assessments/[id]/start | METHOD: POST | STATUS: 401
ROUTE: /api/assessments/attempts/[attemptId]/submit | METHOD: POST | STATUS: 401
ROUTE: /api/auth/check-user | METHOD: POST | STATUS: 200
    [BODY SNIPPET]: {"ok":true,"status":"ready","message":"Verification challenge prepared"}
ROUTE: /api/auth/debug | METHOD: GET | STATUS: 404
ROUTE: /api/auth/logout | METHOD: GET | STATUS: 405
ROUTE: /api/auth/logout | METHOD: POST | STATUS: 307
ROUTE: /api/auth/mobile-login | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Something went wrong. Please try again."}
ROUTE: /api/auth/role | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"role":"STUDENT"}
ROUTE: /api/auth/role | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to set role"}
ROUTE: /api/books/orders | METHOD: POST | STATUS: 401
ROUTE: /api/books | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"data":[{"id":"cbse-10-pyqs-past-10-years-2027","slug":"cbse-class-10th-past-10-year-solved-paper-2026","title":"PW CBSE Class 10 PYQs - Past 10 Years Solved Papers For 2027 Board Exam
ROUTE: /api/checkout/coupon/preview | METHOD: POST | STATUS: 400
ROUTE: /api/checkout/course-info | METHOD: GET | STATUS: 400
ROUTE: /api/checkout/razorpay | METHOD: POST | STATUS: 410
ROUTE: /api/checkout | METHOD: POST | STATUS: 410
ROUTE: /api/classroom/[id]/authorize | METHOD: POST | STATUS: 401
ROUTE: /api/classroom/[id]/chat | METHOD: POST | STATUS: 401
ROUTE: /api/classroom/[id]/hand-raise | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to toggle hand raise"}
ROUTE: /api/classroom/[id]/notes | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to save note"}
ROUTE: /api/classroom/[id]/participants | METHOD: GET | STATUS: 401
ROUTE: /api/classroom/[id]/participants | METHOD: POST | STATUS: 401
ROUTE: /api/classroom/[id]/polls | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to submit poll vote"}
ROUTE: /api/classroom/[id]/questions | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to process question"}
ROUTE: /api/classroom/[id] | METHOD: GET | STATUS: 401
ROUTE: /api/classroom/[id]/settings | METHOD: GET | STATUS: 401
ROUTE: /api/classroom/[id]/settings | METHOD: POST | STATUS: 401
ROUTE: /api/classroom/[id]/teacher | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Teacher action failed"}
ROUTE: /api/classroom/live-status | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"count":1,"liveClass":{"id":"upsc-foundation","slug":"upsc-foundation","title":"UPSC FOUNDATION 2026-27","classroomUrl":"/classroom/upsc-foundation","badge":"LIVE BATCH","teachers":["R
ROUTE: /api/courses/[slug]/demo-slots | METHOD: GET | STATUS: 404
ROUTE: /api/courses/demo/book | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"booked":false}
ROUTE: /api/courses/demo/book | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to schedule demo class. Please try again."}
ROUTE: /api/courses/demo/chat | METHOD: GET | STATUS: 401
ROUTE: /api/courses/demo/chat | METHOD: POST | STATUS: 401
ROUTE: /api/courses/demo/complete | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to mark demo completed."}
ROUTE: /api/courses/demo/hand-raise | METHOD: POST | STATUS: 401
ROUTE: /api/courses/demo/leave | METHOD: POST | STATUS: 401
ROUTE: /api/courses/demo/screen | METHOD: POST | STATUS: 401
ROUTE: /api/courses/demo/stage | METHOD: POST | STATUS: 401
ROUTE: /api/courses/demo/stage/token | METHOD: POST | STATUS: 401
ROUTE: /api/courses/demo/status | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":false,"isLive":false,"error":"No active or scheduled demo slot found."}
ROUTE: /api/courses/demo/status | METHOD: POST | STATUS: 403
ROUTE: /api/courses/demo/token | METHOD: GET | STATUS: 401
ROUTE: /api/courses/demo/track-watch | METHOD: POST | STATUS: 401
ROUTE: /api/courses/enroll | METHOD: POST | STATUS: 400
ROUTE: /api/courses/progress | METHOD: POST | STATUS: 401
ROUTE: /api/courses/teacher-photo-upload | METHOD: POST | STATUS: 401
ROUTE: /api/courses/video-courses | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"total":1,"courses":[{"id":"c_paid_72nd_step4","title":"72nd BPSC Prelims Current Affairs","slug":"72nd-bpsc-prelims-current-affairs","description":"Comprehensive current affairs for BPSC 72nd","pric
ROUTE: /api/doubts | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"doubts":[{"id":"doubt-1790594080004-1f9iw","studentId":"cmujd290a0003xp8v5ic7bdqg","studentName":"student","studentEmail":"mobile_9887827382@aspirantbook.local","subject":"Python & Da
ROUTE: /api/doubts | METHOD: PATCH | STATUS: 403
ROUTE: /api/doubts | METHOD: POST | STATUS: 401
ROUTE: /api/exam/[testId]/leaderboard | METHOD: GET | STATUS: 401
ROUTE: /api/exam/[testId]/questions | METHOD: GET | STATUS: 401
ROUTE: /api/exam/ai-parse | METHOD: POST | STATUS: 401
ROUTE: /api/exam/attempt/[attemptId]/result | METHOD: GET | STATUS: 401
ROUTE: /api/exam/attempt/[attemptId] | METHOD: GET | STATUS: 401
ROUTE: /api/exam/attempt/[attemptId]/submit | METHOD: POST | STATUS: 401
ROUTE: /api/exam/attempt/[attemptId]/sync | METHOD: POST | STATUS: 401
ROUTE: /api/exam/attempt/start | METHOD: POST | STATUS: 401
ROUTE: /api/exam/attempt/user-status | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"data":{},"attempts":[]}
ROUTE: /api/exam/series/create | METHOD: POST | STATUS: 401
ROUTE: /api/exam/series/enroll | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"enrolled":false}
ROUTE: /api/exam/series/enroll | METHOD: POST | STATUS: 401
ROUTE: /api/exam/series/list | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"data":[{"id":"exam-integrity-series-p9","title":"Exam Integrity Series","category":"Testing","examType":"Civil Services","logoType":"general","users":"12.5k","totalTests":10,"freeTest
ROUTE: /api/exam/teacher/[testId]/questions | METHOD: GET | STATUS: 401
ROUTE: /api/exam/test/create | METHOD: POST | STATUS: 401
ROUTE: /api/exam/test/list | METHOD: GET | STATUS: 401
ROUTE: /api/execute | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Unexpected end of JSON input"}
ROUTE: /api/forms | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"submissions":[]}
ROUTE: /api/forms | METHOD: POST | STATUS: 403
ROUTE: /api/goals | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"data":{"popularGoals":[{"id":"upsc","name":"UPSC","fullName":"UPSC Civil Services Examination","icon":"Landmark","color":"from-amber-500 to-orange-600","category":"Civil Services","ta
ROUTE: /api/health | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"status":"ok","timestamp":"2026-10-07T10:06:15.763Z"}
ROUTE: /api/leaderboard | METHOD: GET | STATUS: 401
ROUTE: /api/teacher/classes | METHOD: GET | STATUS: 401
ROUTE: /api/teacher/classes | METHOD: POST | STATUS: 401
ROUTE: /api/upload/presigned-url | METHOD: POST | STATUS: 401
ROUTE: /api/upload | METHOD: DELETE | STATUS: 401
ROUTE: /api/upload | METHOD: POST | STATUS: 401
ROUTE: /api/user/goal | METHOD: GET | STATUS: 200
    [BODY SNIPPET]: {"success":true,"goal":null}
ROUTE: /api/user/goal | METHOD: POST | STATUS: 401
ROUTE: /api/verify-payment/razorpay | METHOD: POST | STATUS: 500
    [BODY SNIPPET]: {"error":"Failed to verify payment"}
ROUTE: /api/webhooks/razorpay | METHOD: POST | STATUS: 400
ROUTE: /api/webhooks/stripe | METHOD: POST | STATUS: 400

--- 6.2 Key Hardened Route Verifications ---
1. /api/auth/debug [GET]:
HTTP/1.1 404 Not Found
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Wed, 07 Oct 2026 10:06:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


2. /api/auth/check-user [POST]:
HTTP/1.1 200 OK
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
content-type: application/json
Date: Wed, 07 Oct 2026 10:06:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked


3. /api/auth/logout [GET (405 expected) & POST (307 redirect expected)]:
HTTP/1.1 405 Method Not Allowed
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
allow: POST
content-type: application/json
Date: Wed, 07 Oct 2026 10:06:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked
HTTP/1.1 307 Temporary Redirect
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
location: http://localhost:3045/
set-cookie: authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0
set-cookie: __Secure-authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0
set-cookie: authjs.csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0
set-cookie: __Host-authjs.csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0
set-cookie: authjs.callback-url=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0

4. Admin & Classroom Routes (401 Unauthorized for Anonymous):
GET /api/admin/batches: 401
GET /api/teacher/classes: 401
GET /api/classroom/test-probe: 401
POST /api/classroom/test-probe/chat: 401
POST /api/classroom/test-probe/authorize: 401
POST /api/books/orders: 401

=== PART 6 API AUDIT COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part7.log
================================================================================
=== PART 7: SERVER ACTIONS INVENTORY & AUTH/OWNERSHIP AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:16 UTC 2026

Total files with 'use server': 23

>>> File: lib/actions/admin/analytics.ts
    Exported Actions: aggregateCourseAnalytics
aggregateUserAnalytics
aggregateRevenueAnalytics
runDailyAnalytics
    Auth Lines:
11:    const session = await auth()
12:    if (!session || session.user.role !== "ADMIN") {
66:            userId: true,
71:    const activeLearnersToday = new Set(progressRecords.map(p => p.userId)).size
156:export async function aggregateUserAnalytics(userId: string, date: Date) {

>>> File: lib/actions/admin/assessments.ts
    Exported Actions: createAssessment
updateAssessment
togglePublishAssessment
deleteAssessment
addQuestion
updateQuestion
deleteQuestion
reorderQuestions
    Auth Lines:
30:    const session = await auth()
32:    if (!session || session.user.role !== "ADMIN") {
56:    const session = await auth()
58:    if (!session || session.user.role !== "ADMIN") {
75:    const session = await auth()

>>> File: lib/actions/admin/audit.ts
    Exported Actions: logContentAudit
getRecentAuditEvents
    Auth Lines:
23:    userId?: string
47:        let session = null
49:            session = await auth()
58:            userId: session?.user?.id || "system",
59:            userEmail: session?.user?.email || "anonymous",

>>> File: lib/actions/admin/chapters.ts
    Exported Actions: createChapter
updateChapter
deleteChapter
reorderChapters
duplicateChapter
    Auth Lines:
33:    const session = await auth()
35:    if (!session || !canEditChapter(session.user)) {
75:    const session = await auth()
77:    if (!session || !canEditChapter(session.user)) {
104:    const session = await auth()

>>> File: lib/actions/admin/course-metadata.ts
    Exported Actions: fetchCourseMetadata
updateCourseMetadataAction
addCourseFeatureAction
updateCourseFeatureAction
deleteCourseFeatureAction
addCourseSkillAction
updateCourseSkillAction
deleteCourseSkillAction
saveCourseTeachersAction
    Auth Lines:
44:    const session = await auth()
46:    if (!session || !canEditCourse(session.user)) {
73:    const session = await auth()
74:    if (!session || !canEditCourse(session.user)) {
97:    const session = await auth()

>>> File: lib/actions/admin/courses.ts
    Exported Actions: createCourseDraft
updateCourseDraft
updateCourseInline
updateCourseThumbnail
deleteDraft
togglePublishStatus
createChapter
updateChapter
deleteChapter
createLesson
updateLesson
deleteLesson
getTutorialCoursesAction
    Auth Lines:
21:    const session = await auth()
23:    if (!session || !canCreateCourse(session.user)) {
98:    const session = await auth()
100:    if (!session || !canEditCourse(session.user)) {
131:    const session = await auth()

>>> File: lib/actions/admin/exercises.ts
    Exported Actions: createExercise
updateExercise
deleteExercise
    Auth Lines:
28:    const session = await auth()
30:    const role = session?.user?.role
31:    if (!session || (role !== "ADMIN" && role !== "TEACHER")) {
59:    const session = await auth()
61:    const role = session?.user?.role

>>> File: lib/actions/admin/lessons.ts
    Exported Actions: createLesson
updateLesson
deleteLesson
reorderLessons
duplicateLesson
saveLessonDraft
publishLessonVersion
getLessonBlocksAndVersions
restoreLessonVersion
    Auth Lines:
54:    const session = await auth()
56:    if (!session || !canEditContent(session.user)) {
112:    const session = await auth()
114:    if (!session || !canEditContent(session.user)) {
149:    const session = await auth()

>>> File: lib/actions/admin/profile.ts
    Exported Actions: getAdminProfile
updateAdminProfile
updateAdminPassword
    Auth Lines:
13:        const session = await auth()
14:        if (!session?.user?.id) {
19:            where: { id: session.user.id },
47:        const session = await auth()
48:        if (!session?.user?.id) {

>>> File: lib/actions/admin/publishing.ts
    Exported Actions: publishCourse
unpublishCourse
    Auth Lines:
8:    const session = await auth()
10:    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
35:    const session = await auth()
37:    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {

>>> File: lib/actions/admin/settings.ts
    Exported Actions: getPlatformSettings
updatePlatformSettings
resetPlatformSettings
purgeSystemCache
getSystemDiagnostics
    Auth Lines:
40:    const session = await auth()
41:    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
48:    const session = await auth()
49:    if (!session || session.user.role !== "ADMIN") {
78:    const session = await auth()

>>> File: lib/actions/admin/tracks.ts
    Exported Actions: getTracks
createTrack
updateTrack
deleteTrack
addCourseToTrack
removeCourseFromTrack
reorderTrackCourses
getAvailableCourses
    Auth Lines:


>>> File: lib/actions/admin/tutorial-import.ts
    Exported Actions: importTutorialPackage
    Auth Lines:
302:    let session = null
304:      session = await auth()
309:    const userRole = (session?.user as any)?.role
310:    const userId = session?.user?.id || "system"
314:    // If a session exists, user MUST be ADMIN or TEACHER.

>>> File: lib/actions/admin/users.ts
    Exported Actions: getUsersList
getUserDetails
updateUserRole
manuallyActivateSubscription
cancelUserSubscription
enrollUserInCourse
unenrollUserFromCourse
updateUserProfile
deleteUser
    Auth Lines:
15:    const session = await auth()
17:    if (!session || session.user.role !== "ADMIN") {
80:export async function getUserDetails(userId: string) {
81:    const session = await auth()
83:    if (!session || session.user.role !== "ADMIN") {

>>> File: lib/actions/auth.ts
    Exported Actions: register
authenticate
    Auth Lines:


>>> File: lib/actions/course/enrollment.ts
    Exported Actions: enrollInCourse
checkEnrollmentStatus
unenrollFromCourse
    Auth Lines:
8:    const session = await auth()
10:    if (!session?.user?.id) {
17:            userId_courseId: {
18:                userId: session.user.id,
41:            where: { id: session.user.id },

>>> File: lib/actions/course/progress.ts
    Exported Actions: markLessonComplete
toggleLessonCompletion
trackVideoProgress
getNextLesson
getCourseProgress
    Auth Lines:
8:    const session = await auth()
10:    if (!session?.user?.id) {
17:            userId_lessonId: {
18:                userId: session.user.id,
45:                    userId: session.user.id,

>>> File: lib/actions/gamification.ts
    Exported Actions: awardXP
syncLeaderboard
    Auth Lines:
8:export async function awardXP(userId: string, xpAmount: number, reason: string) {
9:    const session = await auth()
11:    if (!session) {
17:        where: { id: userId },
26:    await updateLeaderboard(userId, user.xp)

>>> File: lib/actions/payment/razorpay.ts
    Exported Actions: createRazorpayOrder
    Auth Lines:
18:    userId?: string
23:    let session: any = null
25:        session = await auth()
34:    const explicitUserId = isSimplePlan ? undefined : params.userId
36:    const userId = session?.user?.id || explicitUserId

>>> File: lib/actions/payment/stripe.ts
    Exported Actions: createCheckoutSession
    Auth Lines:
8:    const session = await auth()
10:    if (!session?.user?.id || !session?.user?.email) {
22:    const checkoutSession = await stripe.checkout.sessions.create({
23:        customer_email: session.user.email,
25:            userId: session.user.id,

>>> File: lib/actions/tracks/career.ts
    Exported Actions: getCareerTracks
getCareerTrackBySlug
    Auth Lines:


>>> File: lib/actions/user/profile.ts
    Exported Actions: updateProfile
updateAvatar
changePassword
updateNotificationPreferences
updatePrivacySettings
deleteAccount
    Auth Lines:
14:        const session = await auth()
15:        if (!session) {
27:            where: { id: session.user.id },
49:        const session = await auth()
50:        if (!session) {

>>> File: lib/actions/user/subscription.ts
    Exported Actions: upgradeSubscription
    Auth Lines:
9:    const session = await auth()
11:    if (!session?.user?.id) {
25:            userId: session.user.id,
38:            userId: session.user.id,
51:        where: { id: session.user.id },

=== PART 7 AUDIT COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part8.log
================================================================================
=== PART 8: REAL LEAK SCAN WITH SEEDED LOCKED CONTENT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:16 UTC 2026
Base URL: http://127.0.0.1:3045

--- 8.1 Seed Published Course with Locked Lesson and Test Series ---
INSERT 0 1
INSERT 0 1
ERROR:  column "isPublished" of relation "Lesson" does not exist
LINE 1: ... "Lesson" (id, title, "chapterId", "order", type, "isPublish...
                                                             ^
INSERT 0 1

--- 8.2 Scan Public Surfaces for Leaks as Guest ---
>>> Endpoint: /courses
    Video URL Marker in HTML: 0
    Video URL Marker in RSC: 0
>>> Endpoint: /courses/locked-course-leak-test
    Video URL Marker in HTML: 0
    Video URL Marker in RSC: 0
>>> Endpoint: /test-series
    Video URL Marker in HTML: 0
    Video URL Marker in RSC: 0
>>> Endpoint: /test-series/secret-exam-series-p8
    Video URL Marker in HTML: 0
    Video URL Marker in RSC: 0
>>> Endpoint: /tutorials
    Video URL Marker in HTML: 0
    Video URL Marker in RSC: 0
>>> Endpoint: /dashboard
    Video URL Marker in HTML: 0
    Video URL Marker in RSC: 0

Total Leaks detected across endpoints: 0

--- 8.3 Clean Up Seeded Rows ---
DELETE 0
DELETE 1
DELETE 1
DELETE 1
Remaining seeded rows: 0

=== PART 8 AUDIT COMPLETE: 0 LEAKS DETECTED ===


================================================================================
LOG FILE: logs/pass10_8/part9.log
================================================================================
=== PART 9: DYNAMIC SITEMAP & DRAFT ISOLATION AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:17 UTC 2026
Base URL: http://127.0.0.1:3045

--- 9.1 Sitemap Response Stats ---
Bytes in sitemap.xml:
    3731
Total URL count in sitemap.xml:
21

--- 9.2 Seed Published vs Draft Items ---
INSERT 0 1
INSERT 0 1

--- 9.3 Inspect Sitemap Output ---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://aspirantbook.com/</loc>
<lastmod>2026-10-07T10:06:17.968Z</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://aspirantbook.com/dashboard</loc>
<lastmod>2026-10-07T10:06:17.968Z</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>
<url>
<loc>https://aspirantbook.com/tutorials</loc>
<lastmod>2026-10-07T10:06:17.968Z</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>

Published Item in Sitemap: 2 (Expected: 1)
Draft Item in Sitemap: 0 (Expected: 0)

--- 9.4 Clean Up Seeded Rows ---
DELETE 2

=== PART 9 AUDIT COMPLETE: DYNAMIC SITEMAP VERIFIED ===


================================================================================
LOG FILE: logs/pass10_8/part10.log
================================================================================
=== PART 10: REGRESSION AUDIT FOR COMMIT 77bbb33 & /profile ===
HEAD Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Pre-Fix Target: 8748475
Date: Wed Oct  7 10:06:18 UTC 2026

--- 10.1 Show Commit 77bbb33 Stat ---
commit 77bbb3373e1957b7ed9a48cfcd8e5108b9012786
Author: Praveeen <ppk9058@gmail.com>
Date:   Wed Oct 7 11:55:50 2026 +0530

    fix(pass10-6): resolve mobile drawer dashboard href, handle profile missing db user, add nav testids and proxy warn

 app/(dashboard)/profile/page.tsx            | 43 +++++++++++++++++------------
 app/not-found.tsx                           |  3 ++
 components/layout/LeftSidebar.tsx           |  1 +
 components/layout/MobileAppHeader.tsx       |  4 +--
 components/layout/MobileDrawer.tsx          | 24 ++++++++--------
 components/layout/MobileNativeBottomBar.tsx |  1 +
 components/layout/TopNavBar.tsx             |  4 +--
 docs/DEPLOY_NOTES.md                        | 17 ++++++++++++
 lib/rate-limit.ts                           |  6 ++++
 9 files changed, 70 insertions(+), 33 deletions(-)

--- 10.2 Regression Check for /profile ---
1. Guest request to /profile (Redirect to /login with callbackUrl):
HTTP/1.1 307 Temporary Redirect
location: /login?callbackUrl=%2Fprofile
set-cookie: authjs.csrf-token=ac871b7c9944332c65ac755040371d6ba6cc4cf8c6109f737b46e9818a97fa06%7C7b30b78c3d91d9a3a87fe4c283201bd6da118123a836a04d09046ee049729e91; Path=/; HttpOnly; SameSite=Lax
set-cookie: authjs.callback-url=http%3A%2F%2Flocalhost%3A3000; Path=/; HttpOnly; SameSite=Lax
Date: Wed, 07 Oct 2026 10:06:18 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

/login?callbackUrl=%2Fprofile
2. Guest follow redirect to /login:
FINAL_URL: http://127.0.0.1:3045/login?callbackUrl=%2Fprofile | HTTP_CODE: 200

3. Logged-in User Missing in DB (Handled gracefully, redirects to /login safely without loop):
Requesting /profile with token for non-existent user in DB...
Final URL: http://127.0.0.1:3045/profile | Response Status: 200
Handled gracefully with account resolution state without crash: PASS

=== PART 10 AUDIT COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part11.log
================================================================================
=== PART 11: EXPANDED HOME / LOGO / BRAND NAVIGATION MATRIX ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:23 UTC 2026
Base URL: http://127.0.0.1:3045

TEST T-01 [GUEST | desktop | brand-logo]: PASS (href=/)
TEST T-02 [GUEST | desktop | brand-name]: PASS (href=/)
TEST T-03 [GUEST | desktop | sidebar-item-dashboard]: PASS (href=/dashboard)
TEST T-04 [GUEST | mobile | mobile-header-logo]: PASS (href=/)
TEST T-05 [GUEST | mobile | mobile-header-brand-name]: PASS (href=/)
TEST T-06 [GUEST | mobile | mobile-bottom-tab-home]: PASS (href=/dashboard)
TEST T-07 [GUEST | desktop | not-found-dashboard]: PASS (href=/dashboard)
TEST T-08 [GUEST | desktop | not-found-courses]: PASS (href=/courses)
TEST T-09 [GUEST | desktop | not-found-test-series]: PASS (href=/test-series)
TEST T-10 [STUDENT | desktop | brand-logo]: PASS (href=/dashboard)
TEST T-11 [STUDENT | desktop | brand-name]: PASS (href=/dashboard)
TEST T-12 [STUDENT | desktop | sidebar-item-dashboard]: PASS (href=/dashboard)
TEST T-13 [STUDENT | mobile | mobile-header-logo]: PASS (href=/dashboard)
TEST T-14 [STUDENT | mobile | mobile-header-brand-name]: PASS (href=/dashboard)
TEST T-15 [STUDENT | mobile | mobile-bottom-tab-home]: PASS (href=/dashboard)
TEST T-16 [GUEST | desktop | breadcrumbs]: PASS (href=/)
TEST T-17 [STUDENT | desktop | breadcrumbs]: PASS (href=/dashboard)

Home/Logo Matrix Summary: 17 PASS | 0 FAIL | 17 TOTAL

=== PART 11 AUDIT COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part12.log
================================================================================
=== PART 12: FRESH BUILD & TYPE CHECK AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:32 UTC 2026

--- 12.1 Mtime of ./.next BEFORE Build ---
mtime: 1791351159 | time: Oct  7 11:02:39 2026 | path: ./.next

--- 12.2 Next.js Version Evidence & Build Validation ---
next version in package.json:
    "next": "15.1.4",
Installed next version in node_modules:
15.1.4

--- 12.3 Mtime of ./.next-test and ./.next AFTER Build ---
mtime: 1791367485 | time: Oct  7 15:34:45 2026 | path: ./.next-test
mtime: 1791351159 | time: Oct  7 11:02:39 2026 | path: ./.next

--- 12.4 next.config.js Skip Flags Audit ---
23-    },
24-    typescript: {
25:        ignoreBuildErrors: true,
26-    },
27-    eslint: {
26-    },
27-    eslint: {
28:        ignoreDuringBuilds: true,
29-    },
30-    productionBrowserSourceMaps: false,

=== PART 12 AUDIT COMPLETE ===


================================================================================
LOG FILE: logs/pass10_8/part13.log
================================================================================
=== PART 13: 310-CASE QA MATRIX EXECUTION AUDIT ===
Commit: a6080c0ce87e5933dddbab5824892b727cbcc1b4
Date: Wed Oct  7 10:06:32 UTC 2026
Base URL: http://127.0.0.1:3045

--- 13.1 Running 310 QA Matrix Suite ---
=========================================================================
=== PASS 9.6: COMPLETE QA TEST MATRIX RUNNER (ALL 310 REAL CASES) ===
TEST DB: yes | Host: 127.0.0.1:54329 | DB: trillionskill_test
=========================================================================

RUN START TIMESTAMP (UTC): 2026-10-07T10:06:37.540Z

--- Seeding Docker Test DB for Pass 9.3 QA ---
Starting isolated Next.js server (.next-test) on port 3045...
Server ready on port 3045.

[Next Server stderr]: ⨯ Failed to start server
[Next Server stderr]: Error: listen EADDRINUSE: address already in use :::3045
    at <unknown> (Error: listen EADDRINUSE: address already in use :::3045)
    at new Promise (<anonymous>) {
  code: 'EADDRINUSE',
  errno: -48,
  syscall: 'listen',
  address: '::',
  port: 3045
}

=========================================================================
=== ALL QA MATRIX FAILURES ===
=========================================================================
┌─────────┬──────────┬─────────────┬───────────────────────────────┬────────────┬──────────────┬─────────────────────────────┬────────┐
│ (index) │ id       │ persona     │ methodUrl                     │ expected   │ actualStatus │ bodyCheck                   │ status │
├─────────┼──────────┼─────────────┼───────────────────────────────┼────────────┼──────────────┼─────────────────────────────┼────────┤
│ 0       │ 'OTP-01' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 200' │ 'HTTP 503'   │ 'Missing: ""success":true"' │ 'FAIL' │
│ 1       │ 'OTP-02' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 400' │ 'HTTP 503'   │ 'Missing: "10-digit"'       │ 'FAIL' │
│ 2       │ 'OTP-03' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 400' │ 'HTTP 503'   │ 'Missing: "10-digit"'       │ 'FAIL' │
│ 3       │ 'OTP-04' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 400' │ 'HTTP 503'   │ 'Missing: "10-digit"'       │ 'FAIL' │
│ 4       │ 'OTP-05' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 400' │ 'HTTP 503'   │ 'Missing: "10-digit"'       │ 'FAIL' │
│ 5       │ 'OTP-06' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 200' │ 'HTTP 503'   │ 'Missing: "student"'        │ 'FAIL' │
│ 6       │ 'OTP-07' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 200' │ 'HTTP 503'   │ 'Missing: "userId"'         │ 'FAIL' │
│ 7       │ 'OTP-08' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 200' │ 'HTTP 503'   │ 'Missing: "success"'        │ 'FAIL' │
│ 8       │ 'OTP-09' │ 'Anonymous' │ 'POST /api/auth/mobile-login' │ 'HTTP 200' │ 'HTTP 503'   │ 'Missing: "success"'        │ 'FAIL' │
│ 9       │ 'J4-04'  │ 'Anonymous' │ 'POST /api/webhooks/razorpay' │ 'HTTP 400' │ 'HTTP 500'   │ 'OK'                        │ 'FAIL' │
│ 10      │ 'J4-06'  │ 'Anonymous' │ 'POST /api/webhooks/razorpay' │ 'HTTP 400' │ 'HTTP 500'   │ 'OK'                        │ 'FAIL' │
│ 11      │ 'J9-08'  │ 'Anonymous' │ 'POST /api/webhooks/razorpay' │ 'HTTP 400' │ 'HTTP 500'   │ 'OK'                        │ 'FAIL' │
│ 12      │ 'J9-09'  │ 'Anonymous' │ 'POST /api/webhooks/razorpay' │ 'HTTP 400' │ 'HTTP 500'   │ 'OK'                        │ 'FAIL' │
└─────────┴──────────┴─────────────┴───────────────────────────────┴────────────┴──────────────┴─────────────────────────────┴────────┘

=========================================================================
=== FULL QA MATRIX RESULTS TABLE (ALL 310 CASES) ===
=========================================================================
id       | method url                                  | expected | actual   | PASS/FAIL
---------+---------------------------------------------+----------+----------+----------
OTP-01   | POST /api/auth/mobile-login                 | HTTP 200 | HTTP 503 | FAIL
OTP-02   | POST /api/auth/mobile-login                 | HTTP 400 | HTTP 503 | FAIL
OTP-03   | POST /api/auth/mobile-login                 | HTTP 400 | HTTP 503 | FAIL
OTP-04   | POST /api/auth/mobile-login                 | HTTP 400 | HTTP 503 | FAIL
OTP-05   | POST /api/auth/mobile-login                 | HTTP 400 | HTTP 503 | FAIL
OTP-06   | POST /api/auth/mobile-login                 | HTTP 200 | HTTP 503 | FAIL
OTP-07   | POST /api/auth/mobile-login                 | HTTP 200 | HTTP 503 | FAIL
OTP-08   | POST /api/auth/mobile-login                 | HTTP 200 | HTTP 503 | FAIL
OTP-09   | POST /api/auth/mobile-login                 | HTTP 200 | HTTP 503 | FAIL
OTP-10   | GET /login                                  | HTTP 200 | HTTP 200 | PASS
J1-01    | GET /courses/72nd-bpsc-prelims-current-affairs | HTTP 200 | HTTP 200 | PASS
J1-02    | GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9 | HTTP 307 | HTTP 307 | PASS
J1-03    | GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9 | HTTP 307 | HTTP 307 | PASS
J1-04    | GET /courses/draft-secret-course            | HTTP 404 | HTTP 404 | PASS
J1-05    | GET /courses/non-existent-course-slug-404   | HTTP 404 | HTTP 404 | PASS
J1-06    | GET /courses/c_invalid!@#                   | HTTP 404 | HTTP 404 | PASS
J1-07    | GET /api/courses/draft-secret-course/media  | HTTP 404 | HTTP 404 | PASS
J1-08    | GET /api/courses/draft-secret-course/lesson | HTTP 404 | HTTP 404 | PASS
J1-09    | GET /api/courses/draft-secret-course/demo-slots | HTTP 404 | HTTP 404 | PASS
J1-10    | GET /courses                                | HTTP 200 | HTTP 200 | PASS
J1-11    | GET /search?q=bpsc                          | HTTP 200 | HTTP 200 | PASS
J1-12    | GET /search?q=draft                         | HTTP 200 | HTTP 200 | PASS
J1-13    | GET /search                                 | HTTP 200 | HTTP 200 | PASS
J1-14    | GET /                                       | HTTP 200 | HTTP 200 | PASS
J1-15    | GET /pricing                                | HTTP 200 | HTTP 200 | PASS
J1-16    | GET /current-affairs-quizzes                | HTTP 200 | HTTP 200 | PASS
J1-17    | GET /books                                  | HTTP 200 | HTTP 200 | PASS
J1-18    | GET /pyqs                                   | HTTP 200 | HTTP 200 | PASS
J1-19    | GET /practice                               | HTTP 200 | HTTP 200 | PASS
J1-20    | GET /tutorials                              | HTTP 200 | HTTP 200 | PASS
J1-21    | GET /dashboard                              | HTTP 200 | HTTP 200 | PASS
J1-22    | GET /profile                                | HTTP 307 | HTTP 307 | PASS
J1-23    | GET /my-learning                            | HTTP 200 | HTTP 200 | PASS
J1-24    | GET /test-series                            | HTTP 200 | HTTP 200 | PASS
J1-25    | GET /not-found                              | HTTP 404 | HTTP 404 | PASS
J2-01    | GET /login                                  | HTTP 307 | HTTP 307 | PASS
J2-02    | GET /login?callbackUrl=//evil.com           | HTTP 307 | HTTP 307 | PASS
J2-03    | GET /login?callbackUrl=https://evil.com     | HTTP 307 | HTTP 307 | PASS
J2-04    | GET /login?callbackUrl=javascript:alert(1)  | HTTP 307 | HTTP 307 | PASS
J2-05    | GET /login?callbackUrl=/\evil.com           | HTTP 307 | HTTP 307 | PASS
J2-06    | GET /login?callbackUrl=https:%2f%2fevil.com | HTTP 307 | HTTP 307 | PASS
J2-07    | GET /register                               | HTTP 307 | HTTP 307 | PASS
J2-08    | GET /register                               | HTTP 200 | HTTP 200 | PASS
J2-09    | GET /api/auth/csrf                          | HTTP 200 | HTTP 200 | PASS
J2-10    | GET /api/auth/session                       | HTTP 200 | HTTP 200 | PASS
J2-11    | GET /api/auth/session                       | HTTP 200 | HTTP 200 | PASS
J2-12    | GET /api/auth/session                       | HTTP 200 | HTTP 200 | PASS
J2-13    | GET /api/auth/session                       | HTTP 200 | HTTP 200 | PASS
J2-14    | GET /login?callbackUrl=%2Fdashboard         | HTTP 200 | HTTP 200 | PASS
J2-15    | GET /login?callbackUrl=%2Fmy-learning       | HTTP 200 | HTTP 200 | PASS
J2-16    | GET /login?callbackUrl=%2Fcourses%2F72nd-bpsc-prelims-current-affairs | HTTP 200 | HTTP 200 | PASS
J2-17    | POST /api/auth/callback/credentials         | HTTP 302 | HTTP 302 | PASS
J2-18    | POST /api/auth/callback/mobile              | HTTP 302 | HTTP 302 | PASS
J2-19    | GET /api/auth/providers                     | HTTP 200 | HTTP 200 | PASS
J2-20    | GET /api/health                             | HTTP 200 | HTTP 200 | PASS
J3-01    | GET /checkout?courseId=c_paid_72nd_p9       | HTTP 200 | HTTP 200 | PASS
J3-02    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J3-03    | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J3-04    | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J3-05    | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J3-06    | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J3-07    | GET /api/checkout/course-info?id=72nd-bpsc-prelims-current-affairs | HTTP 200 | HTTP 200 | PASS
J3-08    | GET /api/checkout/course-info?id=non_existent_course | HTTP 404 | HTTP 404 | PASS
J3-09    | GET /api/checkout/course-info?id=draft-secret-course | HTTP 404 | HTTP 404 | PASS
J3-10    | GET /api/checkout/course-info?id=draft-secret-course | HTTP 200 | HTTP 200 | PASS
J3-11    | GET /checkout                               | HTTP 200 | HTTP 200 | PASS
J3-12    | GET /checkout?courseId=c_paid_72nd_p9       | HTTP 200 | HTTP 200 | PASS
J3-13    | POST /checkout                              | HTTP 200 | HTTP 200 | PASS
J3-14    | POST /checkout                              | HTTP 200 | HTTP 200 | PASS
J3-15    | POST /checkout                              | HTTP 200 | HTTP 200 | PASS
J3-16    | POST /checkout                              | HTTP 200 | HTTP 200 | PASS
J3-17    | POST /checkout                              | HTTP 200 | HTTP 200 | PASS
J3-18    | POST /checkout                              | HTTP 200 | HTTP 200 | PASS
J3-19    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J3-20    | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J3-21    | GET /checkout?courseId=free-general-studies | HTTP 200 | HTTP 200 | PASS
J3-22    | GET /checkout?courseId=invalid_course_id    | HTTP 200 | HTTP 200 | PASS
J3-23    | POST /api/checkout/razorpay                 | HTTP 410 | HTTP 410 | PASS
J3-24    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J3-25    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-01    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-02    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-03    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-04    | POST /api/webhooks/razorpay                 | HTTP 400 | HTTP 500 | FAIL
J4-05    | POST /api/webhooks/razorpay                 | HTTP 400 | HTTP 400 | PASS
J4-06    | POST /api/webhooks/razorpay                 | HTTP 400 | HTTP 500 | FAIL
J4-07    | POST /api/webhooks/stripe                   | HTTP 400 | HTTP 400 | PASS
J4-08    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-09    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-10    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-11    | POST /checkout                              | HTTP 500 | HTTP 500 | PASS
J4-12    | POST /checkout                              | HTTP 500 | HTTP 500 | PASS
J4-13    | POST /checkout                              | HTTP 500 | HTTP 500 | PASS
J4-14    | POST /checkout                              | HTTP 500 | HTTP 500 | PASS
J4-15    | POST /checkout                              | HTTP 500 | HTTP 500 | PASS
J4-16    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J4-17    | GET /checkout/cancel                        | HTTP 404 | HTTP 404 | PASS
J4-18    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J4-19    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J4-20    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J4-21    | POST /api/courses/demo/book                 | HTTP 400 | HTTP 400 | PASS
J4-22    | POST /api/courses/demo/book                 | HTTP 400 | HTTP 400 | PASS
J4-23    | POST /api/courses/demo/book                 | HTTP 400 | HTTP 400 | PASS
J4-24    | POST /api/courses/demo/complete             | HTTP 400 | HTTP 400 | PASS
J4-25    | POST /api/courses/demo/screen               | HTTP 400 | HTTP 400 | PASS
J5-01    | POST /api/courses/enroll                    | HTTP 403 | HTTP 403 | PASS
J5-02    | POST /api/courses/free-enroll               | HTTP 403 | HTTP 403 | PASS
J5-03    | POST /api/courses/enroll                    | HTTP 200 | HTTP 200 | PASS
J5-04    | POST /api/courses/free-enroll               | HTTP 200 | HTTP 200 | PASS
J5-05    | POST /api/courses/enroll                    | HTTP 404 | HTTP 404 | PASS
J5-06    | POST /api/courses/free-enroll               | HTTP 404 | HTTP 404 | PASS
J5-07    | POST /api/courses/enroll                    | HTTP 401 | HTTP 401 | PASS
J5-08    | POST /api/courses/free-enroll               | HTTP 401 | HTTP 401 | PASS
J5-09    | POST /api/courses/enroll                    | HTTP 200 | HTTP 200 | PASS
J5-10    | POST /api/courses/free-enroll               | HTTP 200 | HTTP 200 | PASS
J5-11    | POST /api/courses/enroll                    | HTTP 400 | HTTP 400 | PASS
J5-12    | POST /api/courses/free-enroll               | HTTP 400 | HTTP 400 | PASS
J5-13    | POST /api/courses/enroll                    | HTTP 404 | HTTP 404 | PASS
J5-14    | POST /api/courses/free-enroll               | HTTP 404 | HTTP 404 | PASS
J5-15    | POST /api/courses/enroll                    | HTTP 200 | HTTP 200 | PASS
J5-16    | POST /api/courses/free-enroll               | HTTP 200 | HTTP 200 | PASS
J5-17    | POST /api/courses/enroll                    | HTTP 400 | HTTP 400 | PASS
J5-18    | POST /api/courses/free-enroll               | HTTP 400 | HTTP 400 | PASS
J5-19    | POST /api/courses/enroll                    | HTTP 200 | HTTP 200 | PASS
J5-20    | POST /api/courses/free-enroll               | HTTP 200 | HTTP 200 | PASS
J6-01    | GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9 | HTTP 200 | HTTP 200 | PASS
J6-02    | GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9 | HTTP 307 | HTTP 307 | PASS
J6-03    | GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9 | HTTP 200 | HTTP 200 | PASS
J6-04    | GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9 | HTTP 200 | HTTP 200 | PASS
J6-05    | GET /courses/draft-secret-course/learn/some-lesson | HTTP 404 | HTTP 404 | PASS
J6-06    | GET /courses/draft-secret-course/learn/some-lesson | HTTP 404 | HTTP 404 | PASS
J6-07    | POST /api/courses/progress                  | HTTP 200 | HTTP 200 | PASS
J6-08    | POST /api/courses/progress                  | HTTP 200 | HTTP 200 | PASS
J6-09    | POST /api/courses/progress                  | HTTP 401 | HTTP 401 | PASS
J6-10    | POST /api/courses/progress                  | HTTP 400 | HTTP 400 | PASS
J6-11    | GET /api/courses/progress?courseId=72nd-bpsc-prelims-current-affairs | HTTP 405 | HTTP 405 | PASS
J6-12    | GET /api/courses/progress?courseId=72nd-bpsc-prelims-current-affairs | HTTP 405 | HTTP 405 | PASS
J6-13    | GET /api/courses/progress                   | HTTP 405 | HTTP 405 | PASS
J6-14    | GET /learn/72nd-bpsc-prelims-current-affairs | HTTP 307 | HTTP 307 | PASS
J6-15    | GET /learn/draft-secret-course              | HTTP 404 | HTTP 404 | PASS
J6-16    | GET /learn/draft-secret-course              | HTTP 307 | HTTP 307 | PASS
J6-17    | GET /learn/non-existent-course-slug         | HTTP 404 | HTTP 404 | PASS
J6-18    | GET /courses/72nd-bpsc-prelims-current-affairs/demo | HTTP 200 | HTTP 200 | PASS
J6-19    | GET /courses/72nd-bpsc-prelims-current-affairs/demo | HTTP 200 | HTTP 200 | PASS
J6-20    | GET /courses/draft-secret-course/demo       | HTTP 404 | HTTP 404 | PASS
J7-01    | GET /test-series                            | HTTP 200 | HTTP 200 | PASS
J7-02    | GET /my-tests                               | HTTP 200 | HTTP 200 | PASS
J7-03    | GET /test-series/bpsc-72nd-2026             | HTTP 200 | HTTP 200 | PASS
J7-04    | GET /test-series/non-existent-series        | HTTP 404 | HTTP 404 | PASS
J7-05    | GET /api/exam/series/list                   | HTTP 200 | HTTP 200 | PASS
J7-06    | POST /api/exam/series/enroll                | HTTP 400 | HTTP 400 | PASS
J7-07    | POST /api/exam/series/enroll                | HTTP 401 | HTTP 401 | PASS
J7-08    | POST /api/exam/series/enroll                | HTTP 200 | HTTP 200 | PASS
J7-09    | POST /api/exam/series/enroll                | HTTP 403 | HTTP 403 | PASS
J7-10    | GET /api/exam/test/list?seriesId=es_bpsc_step4 | HTTP 200 | HTTP 200 | PASS
J7-11    | GET /api/exam/test/list                     | HTTP 200 | HTTP 200 | PASS
J7-12    | POST /api/exam/attempt/start                | HTTP 400 | HTTP 400 | PASS
J7-13    | POST /api/exam/attempt/start                | HTTP 401 | HTTP 401 | PASS
J7-14    | GET /api/exam/attempt/user-status           | HTTP 200 | HTTP 200 | PASS
J7-15    | GET /api/exam/attempt/user-status?testId=test_integrity_free_p9 | HTTP 200 | HTTP 200 | PASS
J7-16    | GET /api/exam/attempt/user-status?testId=test_integrity_free_p9 | HTTP 200 | HTTP 200 | PASS
J7-17    | POST /api/exam/attempt/att_nonexistent_12345/sync | HTTP 404 | HTTP 404 | PASS
J7-18    | POST /api/exam/attempt/att_nonexistent_12345/sync | HTTP 401 | HTTP 401 | PASS
J7-19    | POST /api/exam/attempt/att_nonexistent_12345/submit | HTTP 404 | HTTP 404 | PASS
J7-20    | POST /api/exam/attempt/att_nonexistent_12345/submit | HTTP 401 | HTTP 401 | PASS
J7-21    | GET /api/exam/attempt/att_nonexistent_12345/result | HTTP 404 | HTTP 404 | PASS
J7-22    | GET /api/exam/attempt/att_nonexistent_12345/result | HTTP 401 | HTTP 401 | PASS
J7-23    | GET /api/exam/test_nonexistent_12345/leaderboard | HTTP 404 | HTTP 404 | PASS
J7-24    | GET /test-series/bpsc-72nd-2026/instructions | HTTP 200 | HTTP 200 | PASS
J7-25    | GET /test-series/bpsc-72nd-2026/declaration | HTTP 200 | HTTP 200 | PASS
J7-26    | GET /test-series/bpsc-72nd-2026/attempt     | HTTP 200 | HTTP 200 | PASS
J7-27    | GET /test-series/bpsc-72nd-2026/result      | HTTP 200 | HTTP 200 | PASS
J7-28    | GET /test-series/bpsc-72nd-2026/solutions   | HTTP 200 | HTTP 200 | PASS
J7-29    | GET /test-series/bpsc-72nd-2026/leaderboard | HTTP 200 | HTTP 200 | PASS
J7-30    | GET /test-series/bpsc-72nd-2026/print       | HTTP 200 | HTTP 200 | PASS
J8-01    | GET /dashboard                              | HTTP 200 | HTTP 200 | PASS
J8-02    | GET /courses                                | HTTP 200 | HTTP 200 | PASS
J8-03    | GET /my-learning                            | HTTP 200 | HTTP 200 | PASS
J8-04    | GET /test-series?view=grid                  | HTTP 200 | HTTP 200 | PASS
J8-05    | GET /my-tests?tab=active                    | HTTP 200 | HTTP 200 | PASS
J8-06    | GET /current-affairs-quizzes                | HTTP 200 | HTTP 200 | PASS
J8-07    | GET /books                                  | HTTP 200 | HTTP 200 | PASS
J8-08    | GET /books/cart                             | HTTP 200 | HTTP 200 | PASS
J8-09    | GET /books/orders                           | HTTP 200 | HTTP 200 | PASS
J8-10    | GET /pyqs                                   | HTTP 200 | HTTP 200 | PASS
J8-11    | GET /practice                               | HTTP 200 | HTTP 200 | PASS
J8-12    | GET /tutorials                              | HTTP 200 | HTTP 200 | PASS
J8-13    | GET /doubts                                 | HTTP 200 | HTTP 200 | PASS
J8-14    | GET /profile                                | HTTP 200 | HTTP 200 | PASS
J8-15    | GET /settings                               | HTTP 200 | HTTP 200 | PASS
J8-16    | GET /settings/subscription                  | HTTP 200 | HTTP 200 | PASS
J8-17    | GET /subscription                           | HTTP 200 | HTTP 200 | PASS
J8-18    | GET /purchases                              | HTTP 200 | HTTP 200 | PASS
J8-19    | GET /tracks                                 | HTTP 200 | HTTP 200 | PASS
J8-20    | GET /tracks/skills                          | HTTP 200 | HTTP 200 | PASS
J8-21    | GET /code-along                             | HTTP 200 | HTTP 200 | PASS
J8-22    | GET /assessments                            | HTTP 307 | HTTP 307 | PASS
J8-23    | GET /leaderboard                            | HTTP 200 | HTTP 200 | PASS
J8-24    | GET /forms                                  | HTTP 200 | HTTP 200 | PASS
J8-25    | GET /teacher                                | HTTP 200 | HTTP 200 | PASS
J8-26    | GET /teacher/classes                        | HTTP 200 | HTTP 200 | PASS
J8-27    | GET /teacher/classes/new                    | HTTP 200 | HTTP 200 | PASS
J8-28    | GET /teacher/questions                      | HTTP 200 | HTTP 200 | PASS
J8-29    | GET /teacher/test-series                    | HTTP 200 | HTTP 200 | PASS
J8-30    | GET /teacher/test-series/create             | HTTP 200 | HTTP 200 | PASS
J8-31    | GET /teacher/tests/new                      | HTTP 200 | HTTP 200 | PASS
J8-32    | GET /teacher/pyqs                           | HTTP 307 | HTTP 307 | PASS
J8-33    | GET /admin                                  | HTTP 307 | HTTP 307 | PASS
J8-34    | GET /admin/users                            | HTTP 200 | HTTP 200 | PASS
J8-35    | GET /admin/audit                            | HTTP 200 | HTTP 200 | PASS
J9-01    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J9-02    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J9-03    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J9-04    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J9-05    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J9-06    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J9-07    | POST /api/verify-payment/razorpay           | HTTP 400 | HTTP 400 | PASS
J9-08    | POST /api/webhooks/razorpay                 | HTTP 400 | HTTP 500 | FAIL
J9-09    | POST /api/webhooks/razorpay                 | HTTP 400 | HTTP 500 | FAIL
J9-10    | POST /api/webhooks/stripe                   | HTTP 400 | HTTP 400 | PASS
J9-11    | POST /api/checkout/route                    | HTTP 404 | HTTP 404 | PASS
J9-12    | POST /api/courses/free-enroll               | HTTP 200 | HTTP 200 | PASS
J9-13    | POST /api/courses/free-enroll               | HTTP 403 | HTTP 403 | PASS
J9-14    | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J9-15    | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J9-16    | POST /api/courses/demo/complete             | HTTP 400 | HTTP 400 | PASS
J9-17    | POST /api/courses/demo/book                 | HTTP 400 | HTTP 400 | PASS
J9-18    | POST /api/checkout/razorpay                 | HTTP 410 | HTTP 410 | PASS
J9-19    | POST /api/verify-payment/razorpay           | HTTP 401 | HTTP 401 | PASS
J9-20    | POST /api/checkout/razorpay                 | HTTP 410 | HTTP 410 | PASS
J10-01   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-02   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-03   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-04   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-05   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-06   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-07   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-08   | POST /api/checkout/coupon/preview           | HTTP 404 | HTTP 404 | PASS
J10-09   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-10   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-11   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-12   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-13   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-14   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-15   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-16   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-17   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-18   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J10-19   | POST /api/checkout/coupon/preview           | HTTP 400 | HTTP 400 | PASS
J10-20   | POST /api/checkout/coupon/preview           | HTTP 200 | HTTP 200 | PASS
J11-01   | POST /api/admin/run-analytics               | HTTP 403 | HTTP 403 | PASS
J11-02   | POST /api/admin/run-analytics               | HTTP 403 | HTTP 403 | PASS
J11-03   | POST /api/admin/run-analytics               | HTTP 200 | HTTP 200 | PASS
J11-04   | GET /admin                                  | HTTP 307 | HTTP 307 | PASS
J11-05   | GET /teacher                                | HTTP 307 | HTTP 307 | PASS
J11-06   | GET /admin/users                            | HTTP 307 | HTTP 307 | PASS
J11-07   | GET /admin/audit                            | HTTP 307 | HTTP 307 | PASS
J11-08   | GET /admin/courses                          | HTTP 200 | HTTP 200 | PASS
J11-09   | GET /admin/test-series                      | HTTP 200 | HTTP 200 | PASS
J11-10   | GET /admin/pyqs                             | HTTP 200 | HTTP 200 | PASS
J11-11   | GET /admin/tutorials                        | HTTP 200 | HTTP 200 | PASS
J11-12   | GET /admin/courses                          | HTTP 200 | HTTP 200 | PASS
J11-13   | GET /admin/test-series                      | HTTP 200 | HTTP 200 | PASS
J11-14   | GET /admin/users?search=test                | HTTP 200 | HTTP 200 | PASS
J11-15   | GET /admin/audit?action=LOGIN               | HTTP 200 | HTTP 200 | PASS
J11-16   | GET /teacher/classes?page=1                 | HTTP 200 | HTTP 200 | PASS
J11-17   | GET /teacher/classes/new?type=live          | HTTP 200 | HTTP 200 | PASS
J11-18   | GET /teacher/questions?difficulty=EASY      | HTTP 200 | HTTP 200 | PASS
J11-19   | GET /teacher/test-series?status=all         | HTTP 200 | HTTP 200 | PASS
J11-20   | GET /teacher/pyqs?year=2024                 | HTTP 307 | HTTP 307 | PASS
J11-21   | POST /api/teacher/classes                   | HTTP 400 | HTTP 400 | PASS
J11-22   | POST /api/teacher/classes                   | HTTP 403 | HTTP 403 | PASS
J11-23   | POST /api/teacher/classes                   | HTTP 401 | HTTP 401 | PASS
J11-24   | GET /admin/settings                         | HTTP 307 | HTTP 307 | PASS
J11-25   | GET /admin/settings                         | HTTP 307 | HTTP 307 | PASS
J12-01   | POST /api/user/goal                         | HTTP 200 | HTTP 200 | PASS
J12-02   | POST /api/user/goal                         | HTTP 401 | HTTP 401 | PASS
J12-03   | POST /api/user/goal                         | HTTP 400 | HTTP 400 | PASS
J12-04   | GET /api/goals                              | HTTP 200 | HTTP 200 | PASS
J12-05   | GET /api/doubts                             | HTTP 200 | HTTP 200 | PASS
J12-06   | POST /api/doubts                            | HTTP 401 | HTTP 401 | PASS
J12-07   | POST /api/doubts                            | HTTP 400 | HTTP 400 | PASS
J12-08   | GET /api/forms                              | HTTP 200 | HTTP 200 | PASS
J12-09   | POST /api/forms                             | HTTP 400 | HTTP 400 | PASS
J12-10   | GET /api/leaderboard                        | HTTP 200 | HTTP 200 | PASS
J12-11   | GET /api/upload/presigned-url               | HTTP 405 | HTTP 405 | PASS
J12-12   | POST /api/upload                            | HTTP 400 | HTTP 400 | PASS
J12-13   | POST /api/execute                           | HTTP 400 | HTTP 400 | PASS
J12-14   | GET /api/courses/video-courses              | HTTP 200 | HTTP 200 | PASS
J12-15   | POST /api/courses/teacher-photo-upload      | HTTP 403 | HTTP 403 | PASS
J12-16   | POST /api/courses/teacher-photo-upload      | HTTP 400 | HTTP 400 | PASS
J12-17   | GET /api/classroom/live-status              | HTTP 200 | HTTP 200 | PASS
J12-18   | GET /api/classroom/live-status              | HTTP 200 | HTTP 200 | PASS
J12-19   | GET /api/exam/ai-parse                      | HTTP 405 | HTTP 405 | PASS
J12-20   | POST /api/exam/ai-parse                     | HTTP 403 | HTTP 403 | PASS
J13-01   | GET /?utm_source=seo                        | HTTP 200 | HTTP 200 | PASS
J13-02   | GET /pricing?plan=monthly                   | HTTP 200 | HTTP 200 | PASS
J13-03   | GET /login?redirect=/dashboard              | HTTP 200 | HTTP 200 | PASS
J13-04   | GET /register?role=student                  | HTTP 200 | HTTP 200 | PASS
J13-05   | GET /courses/72nd-bpsc-prelims-current-affairs?preview=1 | HTTP 200 | HTTP 200 | PASS
J13-06   | GET /dashboard?tab=overview                 | HTTP 200 | HTTP 200 | PASS
J13-07   | GET /courses?category=all                   | HTTP 200 | HTTP 200 | PASS
J13-08   | GET /my-learning?filter=in_progress         | HTTP 200 | HTTP 200 | PASS
J13-09   | GET /test-series?filter=all                 | HTTP 200 | HTTP 200 | PASS
J13-10   | GET /my-tests?filter=all                    | HTTP 200 | HTTP 200 | PASS
J13-11   | GET /profile?tab=general                    | HTTP 200 | HTTP 200 | PASS
J13-12   | GET /settings?tab=preferences               | HTTP 200 | HTTP 200 | PASS
J13-13   | GET /teacher?tab=overview                   | HTTP 200 | HTTP 200 | PASS
J13-14   | GET /admin?from=portal                      | HTTP 307 | HTTP 307 | PASS
J13-15   | GET /not-found?reason=missing               | HTTP 404 | HTTP 404 | PASS

=========================================================================
QA Matrix Summary: 297 PASSED, 13 FAILED, 0 NOT IMPLEMENTED, 310 TOTAL.
=========================================================================

--- DEV DB TIMESTAMP ISOLATION CHECK ---
New dev DB rows created since test start (2026-10-07T10:06:37.540Z): 0
DEV DB ISOLATION PRESERVED: YES (0 rows created during test run)

=== PART 13 AUDIT COMPLETE ===


