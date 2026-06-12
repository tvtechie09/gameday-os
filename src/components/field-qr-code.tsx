"use client";

import { QRCodeSVG } from "qrcode.react";

export function FieldQrCode({ value, size = 128 }: { value: string; size?: number }) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#0b120e"
      title="GameDay OS field link QR code"
    />
  );
}
