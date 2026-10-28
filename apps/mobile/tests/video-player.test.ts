import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveVideoState,
  isValidPlaybackSpeed,
  ALLOWED_PLAYBACK_SPEEDS,
  computeCurriculumNavigation,
  flattenCurriculumLessons,
} from "../src/lib/video-player-helper";

describe("T5: Video Player URL Resolution & Provider Classification", () => {
  it("resolves direct mp4/hls video url as native player", () => {
    const res = resolveVideoState({
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      isLocked: false,
    });
    assert.equal(res.isPlayable, true);
    assert.equal(res.provider, "native");
    assert.equal(
      res.streamUrl,
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    );
    assert.equal(res.externalUrl, null);
  });

  it("resolves Mux playback ID to https://stream.mux.com/<id>.m3u8", () => {
    const res = resolveVideoState({
      muxPlaybackId: "DS00Spx1CV902MCtPjdNaW02W",
      isLocked: false,
    });
    assert.equal(res.isPlayable, true);
    assert.equal(res.provider, "native");
    assert.equal(
      res.streamUrl,
      "https://stream.mux.com/DS00Spx1CV902MCtPjdNaW02W.m3u8"
    );
  });

  it("resolves mux: prefix in videoUrl to HLS stream", () => {
    const res = resolveVideoState({
      videoUrl: "mux:DS00Spx1CV902MCtPjdNaW02W",
      isLocked: false,
    });
    assert.equal(res.isPlayable, true);
    assert.equal(res.provider, "native");
    assert.equal(
      res.streamUrl,
      "https://stream.mux.com/DS00Spx1CV902MCtPjdNaW02W.m3u8"
    );
  });

  it("classifies YouTube URLs as external embed with badge label", () => {
    const urls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ];
    for (const url of urls) {
      const res = resolveVideoState({ videoUrl: url, isLocked: false });
      assert.equal(res.isPlayable, false, `Should not play directly natively: ${url}`);
      assert.equal(res.provider, "embed_youtube");
      assert.equal(res.embedLabel, "Opens YouTube");
      assert.equal(res.externalUrl, url);
      assert.equal(res.streamUrl, null);
    }
  });

  it("classifies Vimeo URLs as external embed with badge label", () => {
    const urls = [
      "https://vimeo.com/76979871",
      "https://player.vimeo.com/video/76979871",
    ];
    for (const url of urls) {
      const res = resolveVideoState({ videoUrl: url, isLocked: false });
      assert.equal(res.isPlayable, false);
      assert.equal(res.provider, "embed_vimeo");
      assert.equal(res.embedLabel, "Opens Vimeo");
      assert.equal(res.externalUrl, url);
      assert.equal(res.streamUrl, null);
    }
  });

  it("handles missing or invalid video URLs safely", () => {
    const resEmpty = resolveVideoState({ videoUrl: "", isLocked: false });
    assert.equal(resEmpty.isPlayable, false);
    assert.equal(resEmpty.provider, "none");
    assert.equal(resEmpty.streamUrl, null);

    const resNull = resolveVideoState({ videoUrl: null, isLocked: false });
    assert.equal(resNull.isPlayable, false);
    assert.equal(resNull.provider, "none");
  });
});

describe("T5: Locked Lesson Protection & Mutation Proof", () => {
  it("never exposes streamUrl or externalUrl when lesson is locked", () => {
    const res = resolveVideoState({
      videoUrl: "https://s3.amazonaws.com/bucket/super-secret-lesson.mp4",
      muxPlaybackId: "SECRET_PLAYBACK_ID",
      isLocked: true,
    });
    assert.equal(res.isPlayable, false);
    assert.equal(res.isLocked, true);
    assert.equal(res.provider, "none");
    assert.equal(res.streamUrl, null, "streamUrl MUST be null for locked lesson");
    assert.equal(res.externalUrl, null, "externalUrl MUST be null for locked lesson");
    assert.match(res.errorMessage || "", /enroll|locked/i);
  });

  it("MUTATION PROOF: Leaking streamUrl when locked fails the security invariant", () => {
    // Simulated vulnerable resolver that forgets the isLocked check
    const vulnerableResolver = (input: any) => ({
      isPlayable: true,
      isLocked: input.isLocked,
      streamUrl: input.videoUrl,
      externalUrl: null,
      provider: "native",
    });

    const leakCheck = vulnerableResolver({
      videoUrl: "https://s3.amazonaws.com/bucket/secret.mp4",
      isLocked: true,
    });
    assert.notEqual(
      leakCheck.streamUrl,
      null,
      "Mutation check: vulnerable resolver incorrectly leaked streamUrl"
    );

    // Real resolver must NOT leak
    const secureCheck = resolveVideoState({
      videoUrl: "https://s3.amazonaws.com/bucket/secret.mp4",
      isLocked: true,
    });
    assert.equal(
      secureCheck.streamUrl,
      null,
      "Real resolver strictly protects locked content"
    );
  });
});

describe("T5: Playback Speeds Allowlist", () => {
  it("allows only approved speeds: 0.5, 0.75, 1, 1.25, 1.5, 2", () => {
    assert.deepEqual([...ALLOWED_PLAYBACK_SPEEDS], [0.5, 0.75, 1, 1.25, 1.5, 2]);

    assert.equal(isValidPlaybackSpeed(0.5), true);
    assert.equal(isValidPlaybackSpeed(0.75), true);
    assert.equal(isValidPlaybackSpeed(1), true);
    assert.equal(isValidPlaybackSpeed(1.25), true);
    assert.equal(isValidPlaybackSpeed(1.5), true);
    assert.equal(isValidPlaybackSpeed(2), true);

    assert.equal(isValidPlaybackSpeed(0.25), false);
    assert.equal(isValidPlaybackSpeed(1.75), false);
    assert.equal(isValidPlaybackSpeed(3), false);
    assert.equal(isValidPlaybackSpeed(0), false);
    assert.equal(isValidPlaybackSpeed(-1), false);
  });
});

describe("T5: Curriculum Order Navigation (Prev / Next)", () => {
  const sampleChapters = [
    {
      id: "ch-1",
      title: "Chapter 1: Intro",
      lessons: [
        { id: "l-1", title: "Lesson 1.1" },
        { id: "l-2", title: "Lesson 1.2" },
      ],
    },
    {
      id: "ch-2",
      title: "Chapter 2: Deep Dive",
      lessons: [
        { id: "l-3", title: "Lesson 2.1" },
        { id: "l-4", title: "Lesson 2.2" },
      ],
    },
  ];

  it("flattens chapters into sequential ordered lesson array", () => {
    const flat = flattenCurriculumLessons(sampleChapters);
    assert.equal(flat.length, 4);
    assert.deepEqual(
      flat.map((l) => l.id),
      ["l-1", "l-2", "l-3", "l-4"]
    );
  });

  it("computes prev/next correctly for first, middle, and last lessons", () => {
    const first = computeCurriculumNavigation("l-1", sampleChapters);
    assert.equal(first.prevLessonId, null);
    assert.equal(first.nextLessonId, "l-2");

    const middle = computeCurriculumNavigation("l-2", sampleChapters);
    assert.equal(middle.prevLessonId, "l-1");
    assert.equal(middle.nextLessonId, "l-3");

    const last = computeCurriculumNavigation("l-4", sampleChapters);
    assert.equal(last.prevLessonId, "l-3");
    assert.equal(last.nextLessonId, null);
  });

  it("handles unknown lesson ID gracefully", () => {
    const unknown = computeCurriculumNavigation("non-existent", sampleChapters);
    assert.equal(unknown.prevLessonId, null);
    assert.equal(unknown.nextLessonId, null);
  });
});
