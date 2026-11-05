import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { pluralize, formatLecturesAndHours } from "../../lib/i18n/pluralize"

describe("Pluralization Helper (EN and HI)", () => {
  test("English: singular (count = 1) vs plural (count = 0, 2, 5)", () => {
    assert.equal(pluralize(1, "lecture", "en"), "1 lecture")
    assert.equal(pluralize(0, "lecture", "en"), "0 lectures")
    assert.equal(pluralize(2, "lecture", "en"), "2 lectures")
    assert.equal(pluralize(9, "lecture", "en"), "9 lectures")

    assert.equal(pluralize(1, "hour", "en"), "1 hour")
    assert.equal(pluralize(0, "hour", "en"), "0 hours")
    assert.equal(pluralize(14, "hour", "en"), "14 hours")

    assert.equal(pluralize(1, "theme", "en"), "1 theme")
    assert.equal(pluralize(41, "theme", "en"), "41 themes")

    assert.equal(pluralize(1, "unit", "en"), "1 unit")
    assert.equal(pluralize(9, "unit", "en"), "9 units")

    assert.equal(pluralize(1, "question", "en"), "1 question")
    assert.equal(pluralize(215, "question", "en"), "215 questions")

    assert.equal(pluralize(1, "paper", "en"), "1 paper")
    assert.equal(pluralize(3, "paper", "en"), "3 papers")
  })

  test("Hindi: singular vs plural forms", () => {
    assert.equal(pluralize(1, "lecture", "hi"), "1 लेक्चर")
    assert.equal(pluralize(0, "lecture", "hi"), "0 लेक्चर्स")
    assert.equal(pluralize(5, "lecture", "hi"), "5 लेक्चर्स")

    assert.equal(pluralize(1, "hour", "hi"), "1 घंटा")
    assert.equal(pluralize(14, "hour", "hi"), "14 घंटे")

    assert.equal(pluralize(1, "theme", "hi"), "1 थीम")
    assert.equal(pluralize(41, "theme", "hi"), "41 थीम्स")

    assert.equal(pluralize(1, "unit", "hi"), "1 यूनिट")
    assert.equal(pluralize(9, "unit", "hi"), "9 यूनिट्स")

    assert.equal(pluralize(1, "question", "hi"), "1 प्रश्न")
    assert.equal(pluralize(50, "question", "hi"), "50 प्रश्न")
  })

  test("formatLecturesAndHours handles combinations", () => {
    assert.equal(formatLecturesAndHours(1, 1, "en"), "1 lecture, 1 hour")
    assert.equal(formatLecturesAndHours(9, 14, "en"), "9 lectures, 14 hours")
    assert.equal(formatLecturesAndHours(1, 1, "hi"), "1 लेक्चर, 1 घंटा")
    assert.equal(formatLecturesAndHours(9, 14, "hi"), "9 लेक्चर्स, 14 घंटे")
  })

  test("Guards against NaN or negative numbers", () => {
    assert.equal(pluralize(NaN, "lecture", "en"), "0 lectures")
    assert.equal(pluralize(-5, "hour", "en"), "0 hours")
    assert.equal(pluralize(undefined as any, "theme", "en"), "0 themes")
  })
})
