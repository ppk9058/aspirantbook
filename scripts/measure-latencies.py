import urllib.request
import time
import statistics

BASE_URL = "http://127.0.0.1:3045"

endpoints = [
    ("/api/exam/test/list?category=Current%20Affairs&limit=20", "GET", None),
    ("/api/exam/series/list?includeAll=true", "GET", None),
    ("/api/user/goal", "GET", None),
    ("/api/exam/attempt/user-status?ids=cmv5d7r52003oxpzv4x54dnie,test-id-2,test-id-3", "GET", None),
]

# Warm-up
for url_path, method, body in endpoints:
    try:
        req = urllib.request.Request(f"{BASE_URL}{url_path}", method=method)
        with urllib.request.urlopen(req, timeout=5) as res:
            res.read()
    except Exception as e:
        pass

print("=== 50-REQUEST LATENCY BENCHMARK (TEST DB: 127.0.0.1:54329) ===")
print("| Endpoint | Method | p50 (ms) | p95 (ms) | Min (ms) | Max (ms) |")
print("|---|---|---|---|---|---|")

for url_path, method, body in endpoints:
    latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        try:
            req = urllib.request.Request(f"{BASE_URL}{url_path}", method=method)
            with urllib.request.urlopen(req, timeout=5) as res:
                res.read()
            elapsed_ms = (time.perf_counter() - t0) * 1000
            latencies.append(elapsed_ms)
        except Exception as e:
            pass
    if latencies:
        latencies.sort()
        p50 = statistics.median(latencies)
        p95 = latencies[int(len(latencies) * 0.95)]
        min_v = min(latencies)
        max_v = max(latencies)
        short_path = url_path.split("?")[0]
        print(f"| `{short_path}` | {method} | {p50:.1f}ms | {p95:.1f}ms | {min_v:.1f}ms | {max_v:.1f}ms |")
