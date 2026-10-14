import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { atomicWriteJson, safeReadJson } from "../lib/books/storage"

const TEST_FILE = path.join(process.cwd(), "data", "test-concurrent-orders.json")

async function worker(workerId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const list = await safeReadJson<any[]>(TEST_FILE, [])
    list.push({ worker: workerId, index: i, timestamp: Date.now() })
    await atomicWriteJson(TEST_FILE, list)
    // Small sleep
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10)))
  }
}

async function runChildProcess(workerId: string, count: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "tsx",
        "-e",
        `
        import { safeReadJson, atomicWriteJson } from "./lib/books/storage";
        const path = require("path");
        const file = path.join(process.cwd(), "data", "test-concurrent-orders.json");
        async function run() {
          for (let i = 0; i < ${count}; i++) {
            const list = await safeReadJson(file, []);
            list.push({ worker: "${workerId}", index: i, ts: Date.now() });
            await atomicWriteJson(file, list);
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 15)));
          }
        }
        run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
      `,
      ],
      { stdio: "inherit" }
    )

    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Worker ${workerId} failed with exit code ${code}`))
    })
  })
}

async function main() {
  console.log("=== Testing Cross-Process File Locking Under Concurrent Writes ===")
  // Clean initial state
  await fs.writeFile(TEST_FILE, "[]", "utf-8")
  await fs.unlink(`${TEST_FILE}.lock`).catch(() => {})

  const WRITES_PER_WORKER = 15
  console.log(`Spawning 2 separate OS processes, each executing ${WRITES_PER_WORKER} atomic read-modify-writes...`)

  const start = Date.now()
  await Promise.all([
    runChildProcess("process_A", WRITES_PER_WORKER),
    runChildProcess("process_B", WRITES_PER_WORKER),
  ])
  const elapsed = Date.now() - start
  console.log(`Both processes completed in ${elapsed}ms.`)

  // Verify file validity and completeness
  const rawContent = await fs.readFile(TEST_FILE, "utf-8")
  let parsed: any[]
  try {
    parsed = JSON.parse(rawContent)
  } catch (err: any) {
    throw new Error(`TEST FAILED: Corrupted JSON found on disk: ${err.message}`)
  }

  const expectedTotal = WRITES_PER_WORKER * 2
  console.log(`Total entries stored: ${parsed.length} (Expected: ${expectedTotal})`)

  if (parsed.length !== expectedTotal) {
    throw new Error(`TEST FAILED: Lost updates detected! Expected ${expectedTotal}, got ${parsed.length}`)
  }

  // Cleanup
  await fs.unlink(TEST_FILE).catch(() => {})
  await fs.unlink(`${TEST_FILE}.lock`).catch(() => {})

  console.log("✅ SUCCESS: Zero lost updates and zero file corruption across separate OS processes!")
}

main().catch((err) => {
  console.error("❌", err.message)
  process.exit(1)
})
