"use client";

import { QRCodeSVG } from "qrcode.react";

export function FieldQrCode({ title = "GameDay OS public link QR code", value, size = 128 }: { title?: string; value: string; size?: number }) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#0b120e"
      title={title}
    />
  );
}
