"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Square,
  Download,
  Mic,
  MicOff,
  Video,
  RotateCcw,
  Volume2,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [withAudio, setWithAudio] = useState(true);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  // Permission & Audio Monitoring States
  const [micPermission, setMicPermission] = useState<"granted" | "prompt" | "denied" | "unknown">("prompt");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // Normalized 0 to 1 for live VU meter

  // Resulting MP4 Blob reference (guaranteed genuine ISO-BMFF MP4)
  const mp4BlobRef = useRef<Blob | null>(null);

  // Active recording control refs
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // WebCodecs / Muxer / Audio Graph References
  const videoEncoderRef = useRef<VideoEncoder | null>(null);
  const audioEncoderRef = useRef<AudioEncoder | null>(null);
  const muxerRef = useRef<Muxer<ArrayBufferTarget> | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioProcessorReaderRef = useRef<ReadableStreamDefaultReader<unknown> | null>(null);

  // Check microphone permissions status on mount and subscribe to changes
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        navigator.permissions.query({ name: "microphone" as PermissionName }).then((status: PermissionStatus) => {
          setMicPermission(status.state as "granted" | "prompt" | "denied");
          status.onchange = () => {
            setMicPermission(status.state as "granted" | "prompt" | "denied");
          };
        }).catch(() => {
          setMicPermission("unknown");
        });
      } catch {
        setMicPermission("unknown");
      }
    }
  }, []);

  // Timer logic for recording HUD
  useEffect(() => {
    if (isRecording) {
      setRecordedSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Live audio VU meter animation loop during active recording
  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      return;
    }
    let animId: number;
    const sampleAudioLevel = () => {
      if (analyserRef.current && isRecordingRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const avg = sum / data.length;
        setAudioLevel(Math.min(1, Math.pow(avg / 64, 1.2)));
      }
      animId = requestAnimationFrame(sampleAudioLevel);
    };
    animId = requestAnimationFrame(sampleAudioLevel);
    return () => cancelAnimationFrame(animId);
  }, [isRecording]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Helper to proactively request and test microphone permission
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      setWithAudio(true);
      setShowPermissionModal(false);
      return true;
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicPermission("denied");
        setShowPermissionModal(true);
      } else {
        console.warn("Microphone test error:", err);
      }
      return false;
    }
  };

  // Handle clicking the microphone button in the toolbar
  const handleMicToggle = async () => {
    if (micPermission === "denied") {
      setShowPermissionModal(true);
      return;
    }

    if (!withAudio) {
      setWithAudio(true);
      if (micPermission !== "granted") {
        await requestMicPermission();
      }
    } else {
      setWithAudio(false);
    }
  };

  // Helper to detect supported H.264 video codec for WebCodecs
  const getSupportedAvcCodec = async (): Promise<string | null> => {
    if (typeof VideoEncoder === "undefined") return null;
    const candidates = [
      "avc1.42002a", // Baseline Profile Level 4.2 (Native 1080p60)
      "avc1.4d002a", // Main Profile Level 4.2 (Native 1080p60)
      "avc1.64002a", // High Profile Level 4.2 (Native 1080p60)
      "avc1.42E01F", // Baseline Profile Level 3.1
      "avc1.4D401F", // Main Profile Level 3.1
      "avc1.640028", // High Profile Level 4.0
    ];
    for (const codec of candidates) {
      try {
        const res = await VideoEncoder.isConfigSupported({
          codec,
          width: 1920,
          height: 1080,
          bitrate: 10_000_000,
          framerate: 60,
        });
        if (res.supported) return codec;
      } catch {
        // try next
      }
    }
    return null;
  };

  // Helper to sanitize AVC AVCDecoderConfigurationRecord for universal Windows Media Player compatibility
  const sanitizeAvcMetadata = (meta?: EncodedVideoChunkMetadata): EncodedVideoChunkMetadata | undefined => {
    if (!meta?.decoderConfig?.description) return meta;
    try {
      const raw = meta.decoderConfig.description;
      const u8 =
        raw instanceof Uint8Array
          ? raw
          : new Uint8Array(raw instanceof ArrayBuffer ? raw : (raw as ArrayBufferView).buffer);

      if (u8.length < 11 || u8[0] !== 1) return meta;

      let profile = u8[1];
      const compat = u8[2];
      let level = u8[3];
      const numSps = u8[5] & 0x1f;
      if (numSps === 0) return meta;

      let offset = 6;
      const cleanedSpsList: Uint8Array[] = [];
      for (let i = 0; i < numSps; i++) {
        if (offset + 2 > u8.length) break;
        const spsLen = (u8[offset] << 8) | u8[offset + 1];
        offset += 2;
        if (offset + spsLen > u8.length) break;
        let sps = u8.slice(offset, offset + spsLen);
        offset += spsLen;

        // Fix Chromium Windows Media Foundation duplicated NAL byte bug:
        // SPS NAL unit header is 0x67. Chromium sometimes emits duplicate 0x67 0x67 at the start.
        if (sps.length > 2 && sps[0] === 0x67 && sps[1] === 0x67) {
          sps = sps.slice(1);
        }
        if (sps.length >= 4 && (sps[0] & 0x1f) === 7) {
          profile = sps[1]; // True profile_idc
          level = sps[3]; // True level_idc
        }
        cleanedSpsList.push(sps);
      }

      if (offset >= u8.length) return meta;
      const numPps = u8[offset++];
      const cleanedPpsList: Uint8Array[] = [];
      for (let i = 0; i < numPps; i++) {
        if (offset + 2 > u8.length) break;
        const ppsLen = (u8[offset] << 8) | u8[offset + 1];
        offset += 2;
        if (offset + ppsLen > u8.length) break;
        let pps = u8.slice(offset, offset + ppsLen);
        offset += ppsLen;

        // Fix duplicate PPS NAL byte 0x68 0x68
        if (pps.length > 2 && pps[0] === 0x68 && pps[1] === 0x68) {
          pps = pps.slice(1);
        }
        cleanedPpsList.push(pps);
      }

      // Rebuild 100% standard-compliant AVCDecoderConfigurationRecord
      let totalLen = 6;
      for (const s of cleanedSpsList) totalLen += 2 + s.length;
      totalLen += 1;
      for (const p of cleanedPpsList) totalLen += 2 + p.length;

      const out = new Uint8Array(totalLen);
      out[0] = 1; // configurationVersion
      out[1] = profile;
      out[2] = compat;
      out[3] = level;
      out[4] = 0xff; // 6 reserved bits '111111' + lengthSizeMinusOne=3 (4-byte NAL length)
      out[5] = 0xe0 | cleanedSpsList.length; // 3 reserved bits '111' + numOfSequenceParameterSets

      let w = 6;
      for (const s of cleanedSpsList) {
        out[w++] = (s.length >> 8) & 0xff;
        out[w++] = s.length & 0xff;
        out.set(s, w);
        w += s.length;
      }
      out[w++] = cleanedPpsList.length;
      for (const p of cleanedPpsList) {
        out[w++] = (p.length >> 8) & 0xff;
        out[w++] = p.length & 0xff;
        out.set(p, w);
        w += p.length;
      }

      return {
        ...meta,
        decoderConfig: {
          ...meta.decoderConfig,
          description: out.buffer,
          // Omit colorSpace to avoid non-standard colr atoms in mp4-muxer
          colorSpace: undefined,
        },
      };
    } catch {
      return meta;
    }
  };

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    // Clean up audio processor reader
    if (audioProcessorReaderRef.current) {
      try {
        await audioProcessorReaderRef.current.cancel();
      } catch {}
      audioProcessorReaderRef.current = null;
    }

    // Clean up Web Audio nodes
    if (scriptNodeRef.current) {
      try {
        scriptNodeRef.current.disconnect();
      } catch {}
      scriptNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        await audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Stop all media stream tracks (both display and mic)
    activeStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    activeStreamsRef.current = [];

    // If using WebCodecs + mp4-muxer (Primary Engine)
    if (videoEncoderRef.current && muxerRef.current) {
      try {
        if (audioEncoderRef.current && audioEncoderRef.current.state === "configured") {
          try {
            await audioEncoderRef.current.flush();
          } catch (e) {
            console.warn("AudioEncoder flush error:", e);
          }
        }
        if (videoEncoderRef.current && videoEncoderRef.current.state === "configured") {
          try {
            await videoEncoderRef.current.flush();
          } catch (e) {
            console.warn("VideoEncoder flush error:", e);
          }
        }
        muxerRef.current.finalize();

        const buffer = muxerRef.current.target.buffer;
        mp4BlobRef.current = new Blob([buffer], { type: "video/mp4" });
        setHasRecorded(true);
      } catch (err) {
        console.error("Finalizing MP4 muxer error:", err);
      } finally {
        try {
          if (videoEncoderRef.current && videoEncoderRef.current.state !== "closed") {
            videoEncoderRef.current.close();
          }
        } catch {}
        try {
          if (audioEncoderRef.current && audioEncoderRef.current.state !== "closed") {
            audioEncoderRef.current.close();
          }
        } catch {}
        videoEncoderRef.current = null;
        audioEncoderRef.current = null;
        muxerRef.current = null;
        setIsRecording(false);
      }
      return;
    }

    // If using MediaRecorder fallback
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  const startRecording = async () => {
    mp4BlobRef.current = null;
    chunksRef.current = [];
    setHasRecorded(false);
    activeStreamsRef.current = [];

    try {
      // 1. Proactively capture microphone upfront with fresh user click gesture
      let micStream: MediaStream | null = null;
      if (withAudio) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
            },
          });
          activeStreamsRef.current.push(micStream);
          setMicPermission("granted");
        } catch (err: unknown) {
          const errName = (err as { name?: string })?.name;
          console.warn("Microphone access error:", err);
          if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
            setMicPermission("denied");
            const proceed = window.confirm(
              "Microphone permission is blocked in your browser settings.\n\n" +
              "• Click OK to record presentation video with system/tab audio only.\n" +
              "• Click Cancel to open permission settings and enable your microphone."
            );
            if (!proceed) {
              setShowPermissionModal(true);
              return;
            }
          }
        }
      }

      // 2. Capture display stream with video + audio constraints
      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          // @ts-expect-error - Chromium hint for auto-selecting current tab
          preferCurrentTab: true,
          selfBrowserSurface: "include",
        });
      } catch {
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 60 } },
            audio: true,
          });
        } catch (err: unknown) {
          if (err instanceof TypeError || (err as { name?: string })?.name === "TypeError") {
            displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: { frameRate: { ideal: 60 } },
              audio: false,
            });
          } else {
            throw err;
          }
        }
      }
      activeStreamsRef.current.push(displayStream);

      // 2. Locate Presentation Stage
      const presentationElement =
        document.getElementById("presentation-slide-stage") ||
        document.getElementById("presentation-area");
      if (!presentationElement) throw new Error("Presentation slide area not found");

      // Hidden video element to read display stream frames
      const hiddenVideo = document.createElement("video");
      hiddenVideo.srcObject = displayStream;
      hiddenVideo.muted = true;
      hiddenVideo.playsInline = true;
      await hiddenVideo.play();

      // 3. Fixed 1920x1080 (16:9) Target Canvas
      const TARGET_WIDTH = 1920;
      const TARGET_HEIGHT = 1080;
      const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT; // exactly 16:9

      const canvas = document.createElement("canvas");
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Could not initialize canvas context");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const dpr = window.devicePixelRatio || 1;
      const track = displayStream.getVideoTracks()[0];
      const settings = track.getSettings();
      const trackWidth = settings.width || hiddenVideo.videoWidth;
      const trackHeight = settings.height || hiddenVideo.videoHeight;

      // 1. Detect Capture Surface Type
      const isFullscreen = Boolean(document.fullscreenElement);
      const isTabCapture =
        isFullscreen ||
        settings.displaySurface === "browser" ||
        Math.abs(trackWidth - window.innerWidth * dpr) < 25;

      // Detect Window Capture (Zen Browser, Firefox, or Chrome Window share)
      const screenPhysicalW = (window.screen.width || 1920) * dpr;
      const isWindowCapture =
        !isTabCapture &&
        (settings.displaySurface === "window" ||
          Math.abs(trackWidth - window.outerWidth * dpr) < 40 ||
          trackWidth < screenPhysicalW * 0.95);

      // Gecko / Zen Browser properties for exact content viewport location
      const hasMozScreen =
        typeof (window as unknown as { mozInnerScreenX?: number }).mozInnerScreenX === "number";

      // Canvas Rendering Function with Strict 16:9 Aspect Ratio & Zero UI Bleed
      const renderFrameToCanvas = () => {
        if (!ctx || hiddenVideo.readyState < 2) return;
        const rect = presentationElement.getBoundingClientRect();

        // Calculate dynamic scale and offsets based on surface type
        let offsetX = 0;
        let offsetY = 0;
        let scaleX = 1;
        let scaleY = 1;

        if (isTabCapture) {
          // In tab capture / fullscreen, the video stream corresponds exactly to the inner viewport
          offsetX = 0;
          offsetY = 0;
          scaleX = trackWidth / window.innerWidth;
          scaleY = trackHeight / window.innerHeight;
        } else if (isWindowCapture) {
          // In window capture (Zen Browser / Firefox window sharing):
          if (hasMozScreen) {
            const mozX = (window as unknown as { mozInnerScreenX: number }).mozInnerScreenX || 0;
            const mozY = (window as unknown as { mozInnerScreenY: number }).mozInnerScreenY || 0;
            // Exact viewport position inside the Zen window, excluding Zen's vertical tab sidebar!
            offsetX = mozX - window.screenX;
            offsetY = mozY - window.screenY;
          } else {
            // Chromium window borders
            offsetX = (window.outerWidth - window.innerWidth) / 2;
            offsetY = window.outerHeight - window.innerHeight;
          }
          scaleX = trackWidth / window.outerWidth;
          scaleY = trackHeight / window.outerHeight;
        } else {
          // Entire desktop monitor capture
          if (hasMozScreen) {
            const mozX = (window as unknown as { mozInnerScreenX: number }).mozInnerScreenX || 0;
            const mozY = (window as unknown as { mozInnerScreenY: number }).mozInnerScreenY || 0;
            offsetX = mozX;
            offsetY = mozY;
          } else {
            offsetX = (window.screenLeft || window.screenX) + (window.outerWidth - window.innerWidth) / 2;
            offsetY = (window.screenTop || window.screenY) + (window.outerHeight - window.innerHeight);
          }
          scaleX = trackWidth / (window.screen.width || 1920);
          scaleY = trackHeight / (window.screen.height || 1080);
        }

        let srcX = (rect.left + offsetX) * scaleX;
        let srcY = (rect.top + offsetY) * scaleY;
        let srcW = rect.width * scaleX;
        let srcH = rect.height * scaleY;

        srcX = Math.max(0, Math.min(srcX, hiddenVideo.videoWidth - 10));
        srcY = Math.max(0, Math.min(srcY, hiddenVideo.videoHeight - 10));
        srcW = Math.min(srcW, hiddenVideo.videoWidth - srcX);
        srcH = Math.min(srcH, hiddenVideo.videoHeight - srcY);

        const currentAspect = srcW / srcH;
        if (Math.abs(currentAspect - TARGET_ASPECT) > 0.005) {
          if (currentAspect > TARGET_ASPECT) {
            const idealW = srcH * TARGET_ASPECT;
            srcX += (srcW - idealW) / 2;
            srcW = idealW;
          } else {
            const idealH = srcW / TARGET_ASPECT;
            srcY += (srcH - idealH) / 2;
            srcH = idealH;
          }
        }

        ctx.drawImage(hiddenVideo, srcX, srcY, srcW, srcH, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      };

      // 4. Multi-Source Web Audio Graph Mixing (Mic + Tab/System Sound)
      let mixedAudioTrack: MediaStreamTrack | null = null;
      const hasMic = Boolean(micStream && micStream.getAudioTracks().length > 0);
      const hasDisplayAudio = Boolean(displayStream.getAudioTracks().length > 0);

      if (hasMic || hasDisplayAudio) {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextClass({ sampleRate: 48000 });
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          audioContextRef.current = audioCtx;

          const destination = audioCtx.createMediaStreamDestination();

          if (hasMic && micStream) {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            const micGain = audioCtx.createGain();
            micGain.gain.value = 1.0;
            micSource.connect(micGain);
            micGain.connect(destination);
          }

          if (hasDisplayAudio) {
            const displayAudioStream = new MediaStream(displayStream.getAudioTracks());
            const displaySource = audioCtx.createMediaStreamSource(displayAudioStream);
            const displayGain = audioCtx.createGain();
            displayGain.gain.value = 1.0;
            displaySource.connect(displayGain);
            displayGain.connect(destination);
          }

          // Live audio analyser for real-time speech meter HUD
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          destination.connect(analyser);
          analyserRef.current = analyser;

          mixedAudioTrack = destination.stream.getAudioTracks()[0] || null;
        } catch (audioErr) {
          console.warn("Web Audio mixing fallback:", audioErr);
          mixedAudioTrack = micStream?.getAudioTracks()[0] || displayStream.getAudioTracks()[0] || null;
        }
      }

      // 5. Try WebCodecs + MP4-Muxer for Genuine ISO-BMFF MP4 Output
      const avcCodec = await getSupportedAvcCodec();

      if (avcCodec && typeof VideoEncoder !== "undefined") {
        console.log("Encoding with WebCodecs MP4 Muxer, video codec:", avcCodec);
        const target = new ArrayBufferTarget();

        // Audio Codec Selection for MP4
        let audioCodecName: "aac" | "opus" | null = null;
        let audioEncoderCodec: string | null = null;

        if (mixedAudioTrack && typeof AudioEncoder !== "undefined") {
          try {
            // Check AAC first (universal for Windows Media Player, iOS, Web)
            const aacRes = await AudioEncoder.isConfigSupported({
              codec: "mp4a.40.2",
              sampleRate: 48000,
              numberOfChannels: 1,
              bitrate: 128_000,
            }).catch(() => ({ supported: false }));

            if (aacRes.supported) {
              audioCodecName = "aac";
              audioEncoderCodec = "mp4a.40.2";
            } else {
              const opusRes = await AudioEncoder.isConfigSupported({
                codec: "opus",
                sampleRate: 48000,
                numberOfChannels: 1,
                bitrate: 128_000,
              }).catch(() => ({ supported: false }));

              if (opusRes.supported) {
                audioCodecName = "opus";
                audioEncoderCodec = "opus";
              }
            }
          } catch (e) {
            console.warn("AudioEncoder support probe error:", e);
          }
        }

        const muxer = new Muxer({
          target,
          video: {
            codec: "avc",
            width: TARGET_WIDTH,
            height: TARGET_HEIGHT,
            frameRate: 60,
          },
          ...(audioCodecName && mixedAudioTrack
            ? {
                audio: {
                  codec: audioCodecName,
                  numberOfChannels: 1,
                  sampleRate: 48000,
                },
              }
            : {}),
          fastStart: "in-memory",
          firstTimestampBehavior: "offset",
        });
        muxerRef.current = muxer;

        // Configure VideoEncoder
        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => {
            try {
              const data = new Uint8Array(chunk.byteLength);
              chunk.copyTo(data);
              const duration =
                chunk.duration != null && Number.isFinite(chunk.duration) && chunk.duration >= 0
                  ? chunk.duration
                  : Math.round(1_000_000 / 60); // 16667 microseconds for 60 FPS
              const sanitizedMeta = sanitizeAvcMetadata(meta);
              muxer.addVideoChunkRaw(data, chunk.type, chunk.timestamp, duration, sanitizedMeta);
            } catch (err) {
              console.error("Muxer addVideoChunkRaw error:", err);
            }
          },
          error: (e) => console.error("VideoEncoder error:", e),
        });
        videoEncoder.configure({
          codec: avcCodec,
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
          bitrate: 10_000_000, // 10 Mbps for crisp 1080p60 math
          framerate: 60,
        });
        videoEncoderRef.current = videoEncoder;

        // Configure AudioEncoder if available
        if (audioCodecName && audioEncoderCodec && mixedAudioTrack) {
          const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              try {
                const data = new Uint8Array(chunk.byteLength);
                chunk.copyTo(data);
                const duration =
                  chunk.duration != null && Number.isFinite(chunk.duration) && chunk.duration >= 0
                    ? chunk.duration
                    : Math.round((1024 / 48000) * 1_000_000); // 21333 microseconds
                muxer.addAudioChunkRaw(data, chunk.type, chunk.timestamp, duration, meta);
              } catch (err) {
                console.error("Muxer addAudioChunkRaw error:", err);
              }
            },
            error: (e) => console.error("AudioEncoder error:", e),
          });
          audioEncoder.configure({
            codec: audioEncoderCodec,
            sampleRate: 48000,
            numberOfChannels: 1,
            bitrate: 128_000,
          });
          audioEncoderRef.current = audioEncoder;

          // Route audio frames to AudioEncoder:
          // Chromium standard: MediaStreamTrackProcessor
          // @ts-expect-error - Chromium standard
          if (typeof MediaStreamTrackProcessor !== "undefined") {
            // @ts-expect-error - Chromium standard
            const processor = new MediaStreamTrackProcessor({ track: mixedAudioTrack });
            const reader = processor.readable.getReader();
            audioProcessorReaderRef.current = reader;
            (async () => {
              try {
                while (isRecordingRef.current) {
                  const { value: audioFrame, done } = await reader.read();
                  if (done || !audioFrame) break;
                  if (audioEncoder && audioEncoder.state === "configured") {
                    audioEncoder.encode(audioFrame);
                  }
                  audioFrame.close();
                }
              } catch (e) {
                console.warn("TrackProcessor reader loop ended:", e);
              }
            })();
          } else if (audioContextRef.current && typeof AudioData !== "undefined") {
            // Gecko / Zen Browser / Firefox: Web Audio ScriptProcessorNode bridge
            try {
              const audioCtx = audioContextRef.current;
              const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
              scriptNodeRef.current = scriptNode;

              let sampleIndex = 0;

              scriptNode.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;
                if (!audioEncoder || audioEncoder.state !== "configured") return;
                const channelData = e.inputBuffer.getChannelData(0);
                const numFrames = channelData.length;
                const planarData = new Float32Array(channelData);
                const timestamp = Math.round((sampleIndex / audioCtx.sampleRate) * 1_000_000);
                sampleIndex += numFrames;

                try {
                  const audioData = new AudioData({
                    format: "f32-planar",
                    sampleRate: audioCtx.sampleRate,
                    numberOfFrames: numFrames,
                    numberOfChannels: 1,
                    timestamp,
                    data: planarData,
                  });
                  audioEncoder.encode(audioData);
                  audioData.close();
                } catch (encodeErr) {
                  console.warn("AudioData encode error:", encodeErr);
                }
              };

              const dummyDest = audioCtx.createMediaStreamDestination();
              scriptNode.connect(dummyDest);
            } catch (err) {
              console.warn("AudioWorklet/ScriptProcessor fallback failed:", err);
            }
          }
        }

        isRecordingRef.current = true;
        setIsRecording(true);

        // Frame rendering and encoding loop at 60 FPS
        let frameCount = 0;
        const startTime = performance.now();
        let lastTime = startTime;
        const FRAME_INTERVAL = 1000 / 60; // 16.666 ms

        const drawLoop = (now: number) => {
          if (!isRecordingRef.current) return;
          renderFrameToCanvas();

          if (now - lastTime >= FRAME_INTERVAL - 2) {
            lastTime = now;
            const timestampMicroseconds = Math.round((now - startTime) * 1000);
            try {
              const frame = new VideoFrame(canvas, {
                timestamp: timestampMicroseconds,
                duration: Math.round(1_000_000 / 60),
              });
              if (videoEncoder.state === "configured") {
                videoEncoder.encode(frame, { keyFrame: frameCount % 120 === 0 });
              }
              frame.close();
              frameCount++;
            } catch (e) {
              console.warn("Encoding frame error:", e);
            }
          }

          requestRef.current = requestAnimationFrame(drawLoop);
        };

        requestRef.current = requestAnimationFrame(drawLoop);

        displayStream.getVideoTracks()[0].onended = () => {
          stopRecording();
        };

        return;
      }

      // 6. Fallback: MediaRecorder if WebCodecs is not supported
      console.warn("WebCodecs AVC not supported, falling back to MediaRecorder");
      const croppedStream = canvas.captureStream(60);
      if (mixedAudioTrack) {
        croppedStream.addTrack(mixedAudioTrack);
      }

      const drawLoopFallback = () => {
        if (!isRecordingRef.current) return;
        renderFrameToCanvas();
        requestRef.current = requestAnimationFrame(drawLoopFallback);
      };

      const mediaRecorder = new MediaRecorder(croppedStream, {
        videoBitsPerSecond: 10_000_000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        mp4BlobRef.current = new Blob(chunksRef.current, { type: "video/mp4" });
        setIsRecording(false);
        setHasRecorded(true);
        activeStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };

      mediaRecorderRef.current = mediaRecorder;
      isRecordingRef.current = true;
      setIsRecording(true);
      requestRef.current = requestAnimationFrame(drawLoopFallback);
      mediaRecorder.start(1000);

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
      };
    } catch (err) {
      console.error("Recording initialization failed:", err);
      alert("Recording could not be started. Please ensure screen sharing and microphone permissions are enabled.");
    }
  };

  const downloadRecording = () => {
    const blob = mp4BlobRef.current;
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SolveMath_1080p60_${Date.now()}.mp4`;
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 2000);
  };

  return (
    <>
      {/* Microphone Permission Instruction Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Microphone Access Required</h3>
                  <p className="text-xs text-slate-400">Record your speech during the presentation</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p className="font-semibold text-slate-200">
                Microphone permission is currently blocked in your browser settings.
              </p>
              <p>To grant audio recording permission:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                <li>
                  Click the <strong className="text-white">padlock or site settings icon</strong> next to the URL in your browser address bar.
                </li>
                <li>
                  Find <strong className="text-white">Microphone</strong> and set it to <strong className="text-emerald-400">Allow</strong>.
                </li>
                <li>Click the <strong className="text-blue-400">Verify & Grant Access</strong> button below.</li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setWithAudio(false);
                  setShowPermissionModal(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Record Without Mic
              </button>

              <button
                onClick={requestMicPermission}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
              >
                <Check className="h-3.5 w-3.5" />
                Verify & Grant Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Screen Recorder Control Strip */}
      <div className="flex items-center gap-2">
        {/* Audio Toggle / Permission Status Button */}
        {!isRecording && !hasRecorded && (
          <button
            onClick={handleMicToggle}
            title={
              micPermission === "denied"
                ? "Microphone blocked in browser"
                : withAudio
                ? "Microphone on"
                : "Microphone muted"
            }
            className={`p-1.5 rounded-lg transition-colors ${
              micPermission === "denied"
                ? "text-rose-400 hover:bg-rose-500/10"
                : withAudio
                ? "text-zinc-200 hover:bg-zinc-800"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {micPermission === "denied" || !withAudio ? (
              <MicOff className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Recording State Controls */}
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-mono font-medium">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>{formatTime(recordedSeconds)}</span>
            </div>

            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        ) : hasRecorded ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={downloadRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors"
            >
              <Download className="h-3 w-3" />
              <span>Download MP4</span>
            </button>

            <button
              onClick={() => setHasRecorded(false)}
              title="Reset recording"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>Record</span>
          </button>
        )}
      </div>
    </>
  );
}
