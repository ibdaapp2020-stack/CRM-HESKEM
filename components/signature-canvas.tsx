"use client";

import { useEffect, useRef } from "react";
import SignaturePad from "signature_pad";
import { Button } from "./ui";

export function SignatureCanvas({ name = "imageData" }: { name?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgba(7,13,24,0)",
      penColor: "#e8f4ff",
    });
    return () => padRef.current?.off();
  }, []);

  function persist() {
    if (!padRef.current || padRef.current.isEmpty() || !inputRef.current) return;
    inputRef.current.value = padRef.current.toDataURL("image/png");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-40 w-full rounded-xl border border-dashed border-cyan/40 bg-navy"
        onPointerUp={persist}
        onPointerLeave={persist}
      />
      <input ref={inputRef} type="hidden" name={name} />
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          padRef.current?.clear();
          if (inputRef.current) inputRef.current.value = "";
        }}
      >
        נקה חתימה
      </Button>
    </div>
  );
}
