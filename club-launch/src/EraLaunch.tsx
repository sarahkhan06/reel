import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  spring,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/fonts";

// Inter, bundled locally in public/fonts (OFL, see Inter-LICENSE.txt)
const fontFamily = "Inter";
for (const weight of ["500", "700", "800"]) {
  loadFont({
    family: fontFamily,
    url: staticFile(`fonts/Inter-${weight}.woff2`),
    weight,
  });
}

// ---------------------------------------------------------------------------
// COLORS — pulled from the era poster (dark teal bg, off-white/cream type)
// ---------------------------------------------------------------------------
const BG_DARK = "#0a1f22";
const BG_DARK_2 = "#0f2e32";
const WHITE = "#f5f0e8";
const ACCENT = "#7fe7dc"; // bright teal for keyword highlights + toggles

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// ---------------------------------------------------------------------------
// TIMELINE (30fps) — fast cuts, one idea per beat. Edit copy + timing here.
// A Phrase beat builds its words in one by one at each word's `at` frame.
// ---------------------------------------------------------------------------
const HOOK_DURATION = 0; // 0 until the whip-pan clip exists — set to its length in frames

type Word = { text: string; at: number; accent?: boolean };
type Beat =
  | { kind: "hook"; dur: number }
  | { kind: "logo"; dur: number }
  | { kind: "ilm"; dur: number }
  | { kind: "phrase"; dur: number; words: Word[]; size?: number }
  | { kind: "reveal"; dur: number }
  | { kind: "toggles"; dur: number; rows: string[] }
  | { kind: "outro"; dur: number };

const BEATS: Beat[] = [
  { kind: "hook", dur: HOOK_DURATION },
  { kind: "logo", dur: 14 },
  { kind: "ilm", dur: 16 },
  {
    kind: "phrase",
    dur: 22,
    words: [
      { text: "something", at: 0 },
      { text: "new", at: 8, accent: true },
    ],
  },
  { kind: "reveal", dur: 45 },
  {
    kind: "phrase",
    dur: 12,
    words: [
      { text: "built", at: 0 },
      { text: "for", at: 4 },
    ],
  },
  {
    kind: "phrase",
    dur: 26,
    size: 150,
    words: [
      { text: "tech", at: 0, accent: true },
      { text: "+", at: 6 },
      { text: "business", at: 10, accent: true },
    ],
  },
  { kind: "phrase", dur: 7, words: [{ text: "from", at: 0 }] },
  {
    kind: "phrase",
    dur: 12,
    words: [{ text: "AI analytics", at: 0, accent: true }],
  },
  { kind: "phrase", dur: 6, words: [{ text: "to", at: 0 }] },
  {
    kind: "phrase",
    dur: 14,
    size: 220,
    words: [{ text: "GTM", at: 0, accent: true }],
  },
  {
    kind: "toggles",
    dur: 44,
    rows: ["Fireside Chats", "Build Nights", "Internships"],
  },
  {
    kind: "phrase",
    dur: 20,
    words: [
      { text: "every", at: 0 },
      { text: "semester.", at: 6, accent: true },
    ],
  },
  { kind: "outro", dur: 60 },
];

const activeBeats = BEATS.filter((b) => b.dur > 0);

export const eraLaunchDuration = activeBeats.reduce((sum, b) => sum + b.dur, 0);

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------
const TealBG: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 35%, ${BG_DARK_2} 0%, ${BG_DARK} 70%)`,
    }}
  />
);

// Slow push-in over the whole beat — keeps every hard cut feeling alive
const PushIn: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        scale: interpolate(frame, [0, dur], [1, 1.07], {
          extrapolateRight: "clamp",
        }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Letters rise in one after another with a blur, like the reference's type
const RiseWord: React.FC<{ text: string; accent?: boolean; size: number }> = ({
  text,
  accent,
  size,
}) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", whiteSpace: "pre" }}>
      {text.split("").map((ch, i) => {
        const f = frame - i * 0.5;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: accent ? ACCENT : WHITE,
              fontSize: size,
              fontWeight: accent ? 800 : 700,
              letterSpacing: -size * 0.03,
              opacity: interpolate(f, [0, 2], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(f, [0, 5], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: EASE_OUT,
              }),
              filter: `blur(${interpolate(f, [0, 3], [10, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

const Phrase: React.FC<{ dur: number; words: Word[]; size?: number }> = ({
  dur,
  words,
  size = 128,
}) => (
  <AbsoluteFill>
    <TealBG />
    <PushIn dur={dur}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: size * 0.28,
          maxWidth: 960,
          lineHeight: 1.05,
          fontFamily,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => (
          <Sequence key={i} from={w.at} layout="none">
            <RiseWord text={w.text} accent={w.accent} size={size} />
          </Sequence>
        ))}
      </div>
    </PushIn>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// GlitchIn — RGB split + jitter settle for the era reveal
// ---------------------------------------------------------------------------
const GlitchIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const glitchWindow = 12;
  const active = frame < glitchWindow;

  const jitterX = active
    ? Math.sin(frame * 9) * (glitchWindow - frame) * 2.2
    : 0;
  const splitAmount = active
    ? interpolate(frame, [0, glitchWindow], [18, 0], {
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div style={{ position: "relative" }}>
      {active && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `${jitterX + splitAmount}px 0px`,
              mixBlendMode: "screen",
              filter: "url(#cyanTint)",
              opacity: 0.8,
            }}
          >
            {children}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `${jitterX - splitAmount}px 0px`,
              mixBlendMode: "screen",
              filter: "url(#redTint)",
              opacity: 0.8,
            }}
          >
            {children}
          </div>
        </>
      )}
      <div style={{ position: "relative", translate: `${jitterX * 0.3}px 0px` }}>
        {children}
      </div>
    </div>
  );
};

// Tiny SVG filter defs used by GlitchIn's color-split layers
const GlitchFilters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="cyanTint">
      <feColorMatrix
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"
      />
    </filter>
    <filter id="redTint">
      <feColorMatrix
        type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
      />
    </filter>
  </svg>
);

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------

// Khidmah logo pops in with a springy overshoot
const LogoPop: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <TealBG />
      <PushIn dur={dur}>
        <Img
          src={staticFile("khidmah-logo-transparent.png")}
          style={{
            width: "62%",
            scale: interpolate(
              spring({ frame, fps, config: { damping: 11, stiffness: 220 } }),
              [0, 1],
              [0.55, 1],
            ),
            rotate: `${interpolate(frame, [0, 8], [-8, 0], {
              extrapolateRight: "clamp",
              easing: EASE_OUT,
            })}deg`,
          }}
        />
      </PushIn>
    </AbsoluteFill>
  );
};

// ilm card over a blurred full-bleed copy of itself, punched in
const IlmCard: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <Img
          src={staticFile("ilm-intro.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(140px) brightness(0.75)",
            scale: 1.4,
          }}
        />
      </AbsoluteFill>
      <PushIn dur={dur}>
        <Img
          src={staticFile("ilm-intro.png")}
          style={{
            width: "100%",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 4%, black 88%, transparent 100%)",
            scale: interpolate(
              spring({ frame, fps, config: { damping: 14, stiffness: 240 } }),
              [0, 1],
              [1.25, 1],
            ),
          }}
        />
      </PushIn>
    </AbsoluteFill>
  );
};

// The era reveal — flash, camera shake, glitch, then a slow push-in
const Reveal: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const shake = interpolate(frame, [0, 10], [22, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <TealBG />
      <PushIn dur={dur}>
        <div
          style={{
            width: "72%",
            translate: `${Math.sin(frame * 7.3) * shake}px ${Math.cos(frame * 5.1) * shake}px`,
            scale: interpolate(frame, [0, 6], [1.3, 1], {
              extrapolateRight: "clamp",
              easing: EASE_OUT,
            }),
          }}
        >
          <GlitchIn>
            <Img
              src={staticFile("era-poster.png")}
              style={{ width: "100%", display: "block" }}
            />
          </GlitchIn>
        </div>
      </PushIn>
      <AbsoluteFill
        style={{
          backgroundColor: WHITE,
          opacity: interpolate(frame, [0, 4], [0.9, 0], {
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};

// iOS-style settings card — each feature's toggle flips on in turn
const Toggle: React.FC<{ onAt: number }> = ({ onAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = spring({
    frame: frame - onAt,
    fps,
    config: { damping: 15, stiffness: 260 },
  });
  return (
    <div
      style={{
        width: 150,
        height: 88,
        borderRadius: 44,
        padding: 7,
        backgroundColor: interpolateColors(
          on,
          [0, 1],
          ["rgba(245,240,232,0.18)", ACCENT],
        ),
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 37,
          backgroundColor: WHITE,
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          translate: `${on * 62}px 0px`,
        }}
      />
    </div>
  );
};

const ToggleCard: React.FC<{ dur: number; rows: string[] }> = ({
  dur,
  rows,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <TealBG />
      <PushIn dur={dur}>
        <div
          style={{
            width: 820,
            borderRadius: 56,
            padding: "20px 52px",
            backgroundColor: "#07171a",
            border: "2px solid rgba(245,240,232,0.1)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
            fontFamily,
            scale: interpolate(enter, [0, 1], [0.8, 1]),
            rotate: `${interpolate(enter, [0, 1], [-6, 0])}deg`,
            opacity: interpolate(frame, [0, 3], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {rows.map((row, i) => (
            <div
              key={row}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "34px 0",
                borderTop:
                  i === 0 ? "none" : "2px solid rgba(245,240,232,0.1)",
              }}
            >
              <span style={{ color: WHITE, fontSize: 58, fontWeight: 700 }}>
                {row}
              </span>
              <Toggle onAt={8 + i * 8} />
            </div>
          ))}
        </div>
      </PushIn>
    </AbsoluteFill>
  );
};

// Outro — black close: era mark, QR, linktree, staggered rise-in
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const rise = (delay: number) => ({
    opacity: interpolate(frame - delay, [0, 8], [0, 1], {
      extrapolateLeft: "clamp" as const,
      extrapolateRight: "clamp" as const,
    }),
    translate: interpolate(frame - delay, [0, 10], ["0px 40px", "0px 0px"], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_OUT,
    }),
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050c0d",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 56,
          width: "100%",
          position: "relative",
          fontFamily,
        }}
      >
        <div style={{ width: "46%", ...rise(0) }}>
          <GlitchIn>
            <Img
              src={staticFile("era-poster.png")}
              style={{ width: "100%", display: "block" }}
            />
          </GlitchIn>
        </div>
        <Img
          src={staticFile("era-qr.png")}
          style={{ width: "36%", borderRadius: 24, ...rise(8) }}
        />
        <div
          style={{
            color: WHITE,
            fontSize: 40,
            fontWeight: 500,
            ...rise(14),
          }}
        >
          linktr.ee/era.utdallas
        </div>
      </div>
    </AbsoluteFill>
  );
};

const renderBeat = (beat: Beat) => {
  switch (beat.kind) {
    case "hook":
      // Whip-pan clip — drop hook-whip.mp4 in public/ and set HOOK_DURATION
      return <OffthreadVideo src={staticFile("hook-whip.mp4")} />;
    case "logo":
      return <LogoPop dur={beat.dur} />;
    case "ilm":
      return <IlmCard dur={beat.dur} />;
    case "phrase":
      return <Phrase dur={beat.dur} words={beat.words} size={beat.size} />;
    case "reveal":
      return <Reveal dur={beat.dur} />;
    case "toggles":
      return <ToggleCard dur={beat.dur} rows={beat.rows} />;
    case "outro":
      return <Outro />;
  }
};

// ---------------------------------------------------------------------------
// MAIN COMPOSITION — hard cuts between beats, back to back
// ---------------------------------------------------------------------------
export const EraLaunch: React.FC = () => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: BG_DARK }}>
      <GlitchFilters />
      {activeBeats.map((beat, i) => {
        const from = cursor;
        cursor += beat.dur;
        return (
          <Sequence key={i} from={from} durationInFrames={beat.dur}>
            {renderBeat(beat)}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
