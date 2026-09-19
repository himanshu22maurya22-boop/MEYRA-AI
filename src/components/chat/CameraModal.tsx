import React, { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, Check, AlertCircle } from "lucide-react";
import { MessageAttachment } from "../../types";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (attachment: MessageAttachment) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedDataUrl(null);
      setError(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: "user" | "environment") => {
    stopCamera();
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or device.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "Could not access device camera. Please check camera permissions.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission was denied. Please grant camera access in browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera found on this device.";
      }
      setError(msg);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedDataUrl(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedDataUrl) return;

    const attachment: MessageAttachment = {
      id: `att_cam_${Date.now()}`,
      type: "image",
      name: `Photo_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.jpg`,
      mimeType: "image/jpeg",
      size: Math.round((capturedDataUrl.length * 3) / 4),
      dataUrl: capturedDataUrl,
    };

    onCapture(attachment);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#141418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Camera Capture</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-rose-300 max-w-xs flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs leading-relaxed">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
          )}

          {/* Hidden canvas for snapshot capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Switch camera button (if not captured yet and stream is active) */}
          {!capturedDataUrl && !error && stream && (
            <button
              onClick={toggleFacingMode}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm border border-white/20 transition-all cursor-pointer"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4 bg-neutral-900/50">
          {capturedDataUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                Attach Photo
              </button>
            </>
          ) : (
            <button
              onClick={takeSnapshot}
              disabled={!!error || !stream}
              className="w-14 h-14 rounded-full border-4 border-white/30 bg-white hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
              title="Take Photo"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
