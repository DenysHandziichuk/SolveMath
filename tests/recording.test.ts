import assert from "node:assert/strict";
import { test } from "node:test";
import { isCaptureConstraintError, recordingExtension, supportedRecordingType } from "../lib/recording";

test("video downloads use their real container instead of relabeling WebM as MP4", () => {
  assert.equal(recordingExtension("video/webm;codecs=vp9,opus"), "webm");
  assert.equal(recordingExtension("video/mp4;codecs=avc1"), "mp4");
  assert.equal(recordingExtension("video/ogg"), "ogv");
  assert.equal(recordingExtension("application/octet-stream"), "bin");
});

test("the fallback encoder only requests supported recording types", () => {
  assert.equal(supportedRecordingType((type) => type === "video/webm"), "video/webm");
  assert.equal(supportedRecordingType(() => false), undefined);
  assert.equal(supportedRecordingType(() => { throw new Error("Unavailable"); }), undefined);
});

test("screen-sharing cancellation does not count as a reason to ask for capture again", () => {
  assert.equal(isCaptureConstraintError({ name: "NotAllowedError" }), false);
  assert.equal(isCaptureConstraintError({ name: "AbortError" }), false);
  assert.equal(isCaptureConstraintError({ name: "OverconstrainedError" }), true);
  assert.equal(isCaptureConstraintError(new TypeError("Unsupported option")), true);
});
