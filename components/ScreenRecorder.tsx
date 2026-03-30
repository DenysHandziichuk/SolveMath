"use client";

import { useState, useRef } from "react";
import { Square, Download, Mic, MicOff, BoxSelect } from "lucide-react";

export function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [withAudio, setWithAudio] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>('');
  
  // Virtual Cropper Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const requestRef = useRef<number | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log("Using MIME type:", type);
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    chunksRef.current = [];
    setHasRecorded(false);

    try {
      // 1. Capture the current tab/window with high resolution and frame rate hints
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: "browser",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 }
        },
        audio: false,
      });

      // 2. Setup the "Virtual Cropper" (Canvas-based)
      const presentationElement = document.getElementById("presentation-area");
      if (!presentationElement) throw new Error("Presentation area not found");

      // Create a hidden video element to process the incoming stream
      const hiddenVideo = document.createElement("video");
      hiddenVideo.srcObject = displayStream;
      hiddenVideo.play();
      videoRef.current = hiddenVideo;

      // Create a canvas to draw the cropped area at 1080p
      const canvas = document.createElement("canvas");
      
      // Force 1080p resolution
      const TARGET_WIDTH = 1920;
      const TARGET_HEIGHT = 1080;
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      
      const ctx = canvas.getContext("2d", { alpha: false });
      canvasRef.current = canvas;

      // Use high DPI scaling for source mapping
      const dpr = window.devicePixelRatio || 1;

      // Calculate Browser UI Offsets (Firefox/Zen specific detection)
      const getOffsets = () => {
        const isFirefox = 'mozInnerScreenX' in window;
        if (isFirefox) {
          const win = window as unknown as { mozInnerScreenX: number; mozInnerScreenY: number; screenX: number; screenY: number };
          return {
            x: win.mozInnerScreenX - win.screenX,
            y: win.mozInnerScreenY - win.screenY
          };
        }
        return {
          x: (window.outerWidth - window.innerWidth) / 2,
          y: window.outerHeight - window.innerHeight
        };
      };

      const offsets = getOffsets();

      // The Cropping Loop
      const drawFrame = () => {
        if (ctx && hiddenVideo.readyState >= 2) {
          const sourceRect = presentationElement.getBoundingClientRect();
          
          // Clear background
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

          // Source coordinates account for browser's navbar/chrome
          // Destination fills the 1080p canvas
          ctx.drawImage(
            hiddenVideo,
            (sourceRect.left + offsets.x) * dpr, 
            (sourceRect.top + offsets.y) * dpr, 
            sourceRect.width * dpr, 
            sourceRect.height * dpr, // Source
            0, 0, TARGET_WIDTH, TARGET_HEIGHT // Destination
          );
        }
        requestRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      // 3. Get the stream from our "Virtual Canvas" at 60 FPS
      const croppedStream = canvas.captureStream(60); 

      // 4. Capture Audio and add to the cropped stream
      if (withAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          audioStream.getAudioTracks().forEach(track => croppedStream.addTrack(track));
        } catch (err) {
          console.warn("Mic denied:", err);
        }
      }

      streamRef.current = croppedStream;

      // 5. Setup MediaRecorder on the cropped canvas stream
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(croppedStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 8000000 // 8 Mbps for 1080p@60fps
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        setHasRecorded(true);
        // Stop all hardware access
        displayStream.getTracks().forEach(t => t.stop());
        if (withAudio) {
          croppedStream.getAudioTracks().forEach(t => t.stop());
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);

    } catch (err) {
      console.error("Recording failed:", err);
      alert("Recording failed. Note: To record just the presentation, select 'This Tab' or 'Entire Screen' when prompted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  };

  const downloadRecording = () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    // Check for mp4 or h264 to use mp4 extension
    const mt = (mimeTypeRef.current || '').toLowerCase();
    const ext = mt.includes('mp4') || mt.includes('h264') ? 'mp4' : 'webm';
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `SolveMath_Video_${Date.now()}.${ext}`;
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex items-center gap-3">
      {!isRecording && !hasRecorded && (
        <button
          onClick={() => setWithAudio(!withAudio)}
          className="p-2.5 rounded-full hover:bg-secondary text-muted-foreground transition-all border border-transparent hover:border-border"
        >
          {withAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-500" />}
        </button>
      )}

      {isRecording ? (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 text-white font-bold text-sm shadow-lg animate-pulse"
        >
          <Square className="h-4 w-4 fill-current" />
          Stop Recording
        </button>
      ) : hasRecorded ? (
        <div className="flex items-center gap-2">
          <button
            onClick={downloadRecording}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 text-white font-bold text-sm shadow-lg transition-all hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Save Video
          </button>
          <button onClick={() => setHasRecorded(false)} className="p-2.5 text-xs font-bold text-muted-foreground hover:text-foreground">
            Reset
          </button>
        </div>
      ) : (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:brightness-110 transition-all"
        >
          <BoxSelect className="h-4 w-4" />
          Record Slide Only
        </button>
      )}
    </div>
  );
}
