"use client";
import { useEffect, useState } from "react";
import { audio, sfx } from "@/lib/sfx";

/** Hai nút bật/tắt: hiệu ứng âm thanh và nhạc nền. */
export function SoundToggle() {
  const [, force] = useState(0);
  useEffect(() => audio.subscribe(() => force((n) => n + 1)), []);
  const btn = (on: boolean, label: string, icon: string, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`btn btn-ghost !px-3 !py-2 ${on ? "" : "opacity-50"}`}
    >
      <span aria-hidden>{on ? icon : "🔇"}</span>
    </button>
  );
  return (
    <span className="flex gap-1">
      {btn(audio.musicOn, audio.musicOn ? "Tắt nhạc nền" : "Bật nhạc nền", "🎵", () => {
        audio.unlock();
        audio.setMusic(!audio.musicOn);
        if (audio.musicOn) audio.startMusic("calm");
      })}
      {btn(audio.sfxOn, audio.sfxOn ? "Tắt hiệu ứng âm thanh" : "Bật hiệu ứng âm thanh", "🔔", () => {
        audio.unlock();
        audio.setSfx(!audio.sfxOn);
        sfx("click");
      })}
    </span>
  );
}
