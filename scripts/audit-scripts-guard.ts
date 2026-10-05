import fs from "fs";
import path from "path";

const scriptsDir = "scripts";
const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".ts"));

const writeKeywords = [
  ".create(", ".update(", ".delete(", ".upsert(",
  ".createMany(", ".updateMany(", ".deleteMany(",
  "$executeRaw", "INSERT INTO", "UPDATE ", "DELETE FROM"
];

const results = [];

for (const file of files) {
  const filePath = path.join(scriptsDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  
  if (!content.includes("prisma")) continue;

  const hasWrite = writeKeywords.some(kw => content.includes(kw));
  const callsAssertTestDb = content.includes("assertTestDb") || content.includes("test-user-helper");

  results.push({
    script: file,
    writes: hasWrite ? "YES" : "NO",
    callsAssertTestDb: callsAssertTestDb ? "YES" : "NO"
  });
}

console.log(`Audited ${results.length} scripts referencing prisma:`);
console.table(results);
