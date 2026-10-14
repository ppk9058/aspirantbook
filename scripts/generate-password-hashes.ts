import bcrypt from "bcryptjs"
import { DEFAULT_TEST_PASSWORD } from "../tests/support/test-credentials"

async function generatePasswordHashes() {
    const password = DEFAULT_TEST_PASSWORD

    console.log("Generating bcrypt hashes for test users...")
    console.log(`Password for all test users: ${DEFAULT_TEST_PASSWORD}`)
    console.log("")

    // Generate 4 hashes (one for each user)
    const hash1 = await bcrypt.hash(password, 10)
    const hash2 = await bcrypt.hash(password, 10)
    const hash3 = await bcrypt.hash(password, 10)
    const hash4 = await bcrypt.hash(password, 10)

    console.log("Copy these hashed passwords into your SQL script:")
    console.log("")
    console.log("-- Free User 1 hash:")
    console.log(`'${hash1}'`)
    console.log("")
    console.log("-- Free User 2 hash:")
    console.log(`'${hash2}'`)
    console.log("")
    console.log("-- Premium User hash:")
    console.log(`'${hash3}'`)
    console.log("")
    console.log("-- Admin User hash:")
    console.log(`'${hash4}'`)
    console.log("")
    console.log("✅ All hashes generated!")
}

generatePasswordHashes().catch(console.error)
