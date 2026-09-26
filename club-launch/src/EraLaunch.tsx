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
// COLORS — era brand: deep teal, cream type, bright teal accent
// ---------------------------------------------------------------------------
const BG_DARK = "#081a1d";
const BG_DARK_2 = "#0e2a2e";
const WHITE = "#f5f0e8";
const MUTED = "rgba(245,240,232,0.55)";
const ACCENT = "#7fe7dc";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------------------------------------------------------------------------
// TIMELINE (30fps). Beats overlap by OVERLAP frames so each one blurs out
// while the next blurs in. Edit copy + timing here.
// ---------------------------------------------------------------------------
const HOOK_DURATION = 0; // 0 until the whip-pan clip exists — set to its length in frames
const OVERLAP = 4; // frames the next beat starts before this one is fully gone
const EXIT = 10; // how long a beat takes to blur out

type Word = { text: string; at: number; accent?: boolean };
type Exit = "blur" | "collapse" | "none";
type Beat = { dur: number; exit?: Exit } & (
  | { kind: "hook" }
  | { kind: "logos" }
  | { kind: "phrase"; words: Word[]; size?: number }
  | { kind: "reveal" }
  | { kind: "toggles"; rows: string[] }
  | { kind: "typewriter"; text: string }
  | { kind: "outro" }
);

const BEATS: Beat[] = [
  { kind: "hook", dur: HOOK_DURATION },
  { kind: "logos", dur: 64 },
  {
    kind: "phrase",
    dur: 48,
    exit: "collapse", // shrinks into a dot that the era reveal grows out of
    words: [
      { text: "something", at: 0 },
      { text: "new", at: 12, accent: true },
    ],
  },
  { kind: "reveal", dur: 70 },
  {
    kind: "phrase",
    dur: 64,
    words: [
      { text: "built", at: 0 },
      { text: "for", at: 6 },
      { text: "tech", at: 16, accent: true },
      { text: "+", at: 24 },
      { text: "business", at: 30, accent: true },
    ],
  },
  { kind: "phrase", dur: 24, size: 120, words: [{ text: "from", at: 0 }] },
  {
    kind: "phrase",
    dur: 32,
    size: 120,
    words: [{ text: "AI analytics", at: 0, accent: true }],
  },
  { kind: "phrase", dur: 22, size: 120, words: [{ text: "to", at: 0 }] },
  {
    kind: "phrase",
    dur: 36,
    size: 160,
    words: [{ text: "GTM", at: 0, accent: true }],
  },
  {
    kind: "toggles",
    dur: 84,
    rows: ["Fireside Chats", "Build Nights", "Internships"],
  },
  { kind: "typewriter", dur: 70, text: "internships every semester" },
  { kind: "outro", dur: 96, exit: "none" },
];

const activeBeats = BEATS.filter((b) => b.dur > 0);

export const eraLaunchDuration =
  activeBeats.reduce((sum, b) => sum + b.dur, 0) -
  OVERLAP * (activeBeats.length - 1);

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------
const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 40%, ${BG_DARK_2} 0%, ${BG_DARK} 65%)`,
    }}
  />
);

// Wraps every beat: gentle push-in, then blurs out (or collapses to a dot)
const Scene: React.FC<{
  dur: number;
  exit: Exit;
  children: React.ReactNode;
}> = ({ dur, exit, children }) => {
  const frame = useCurrentFrame();
  const out =
    exit === "none"
      ? 0
      : interpolate(frame, [dur - EXIT, dur], [0, 1], {
          ...CLAMP,
          easing: Easing.in(Easing.cubic),
        });
  const push = interpolate(frame, [0, dur], [1, 1.03], CLAMP);
  const exitScale =
    exit === "collapse"
      ? interpolate(out, [0, 1], [1, 0.02])
      : interpolate(out, [0, 1], [1, 0.97]);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        scale: push * exitScale,
        opacity:
          exit === "collapse"
            ? interpolate(out, [0.7, 1], [1, 0], CLAMP)
            : 1 - out,
        filter: `blur(${out * (exit === "collapse" ? 6 : 16)}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Letters blur in one after another, starting at `at`
const BlurWord: React.FC<{
  text: string;
  at: number;
  accent?: boolean;
  size: number;
}> = ({ text, at, accent, size }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", whiteSpace: "pre" }}>
      {text.split("").map((ch, i) => {
        const f = frame - at - i * 1.2;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: accent ? ACCENT : WHITE,
              fontSize: size,
              fontWeight: accent ? 800 : 700,
              letterSpacing: -size * 0.03,
              opacity: interpolate(f, [0, 6], [0, 1], CLAMP),
              translate: interpolate(f, [0, 10], ["0px 22px", "0px 0px"], {
                ...CLAMP,
                easing: EASE_OUT,
              }),
              filter: `blur(${interpolate(f, [0, 8], [12, 0], CLAMP)}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

// Whole sentence is laid out up front so words build in place, no jumping
const Phrase: React.FC<{ words: Word[]; size?: number }> = ({
  words,
  size = 104,
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "baseline",
      columnGap: size * 0.28,
      maxWidth: 1600,
      lineHeight: 1.1,
      fontFamily,
    }}
  >
    {words.map((w, i) => (
      <BlurWord key={i} {...w} size={size} />
    ))}
  </div>
);

// Pop in: spring scale + blur clear, starting at `at`
const usePop = (at: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 13, stiffness: 180 },
  });
  return {
    opacity: interpolate(frame - at, [0, 6], [0, 1], CLAMP),
    scale: interpolate(s, [0, 1], [0.6, 1]),
    filter: `blur(${interpolate(frame - at, [0, 8], [14, 0], CLAMP)}px)`,
  };
};

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------

// Khidmah & ilm pop in one at a time around the "&"
const Logos: React.FC = () => {
  const khidmah = usePop(0);
  const amp = usePop(10);
  const ilm = usePop(18);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 90,
        fontFamily,
      }}
    >
      <Img
        src={staticFile("khidmah-logo-transparent.png")}
        style={{ width: 380, ...khidmah }}
      />
      <span
        style={{
          color: MUTED,
          fontSize: 96,
          fontWeight: 500,
          ...amp,
        }}
      >
        &amp;
      </span>
      <Img
        src={staticFile("ilm-intro.png")}
        style={{
          width: 620,
          borderRadius: 28,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          ...ilm,
        }}
      />
    </div>
  );
};

// A dot grows into the era wordmark, with a subtle one-time RGB split
const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const dot = interpolate(frame, [0, 6, 12], [0, 1, 0], CLAMP);
  const split = interpolate(frame, [8, 20], [10, 0], CLAMP);
  const mark = {
    opacity: interpolate(frame, [8, 16], [0, 1], CLAMP),
    scale: interpolate(frame, [8, 24], [0.82, 1], {
      ...CLAMP,
      easing: EASE_OUT,
    }),
    filter: `blur(${interpolate(frame, [8, 18], [18, 0], CLAMP)}px)`,
  };
  const layer = (dx: number, tint: string) => (
    <Img
      src={staticFile("era-poster.png")}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        translate: `${dx}px 0px`,
        mixBlendMode: "screen",
        filter: `url(#${tint})`,
        opacity: split > 0.5 ? 0.8 : 0,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: WHITE,
          scale: dot * 1.4,
        }}
      />
      <div style={{ position: "relative", width: 900, ...mark }}>
        {layer(split, "cyanTint")}
        {layer(-split, "redTint")}
        <Img
          src={staticFile("era-poster.png")}
          style={{ position: "relative", width: "100%", display: "block" }}
        />
      </div>
    </AbsoluteFill>
  );
};

// iOS-style settings card slides up with a blur; toggles flip on in turn
const Toggle: React.FC<{ onAt: number }> = ({ onAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = spring({
    frame: frame - onAt,
    fps,
    config: { damping: 16, stiffness: 220 },
  });
  return (
    <div
      style={{
        width: 128,
        height: 76,
        borderRadius: 38,
        padding: 6,
        backgroundColor: interpolateColors(
          on,
          [0, 1],
          ["rgba(245,240,232,0.18)", ACCENT],
        ),
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: WHITE,
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          translate: `${on * 52}px 0px`,
        }}
      />
    </div>
  );
};

const ToggleCard: React.FC<{ rows: string[] }> = ({ rows }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 920,
        borderRadius: 56,
        padding: "14px 56px",
        backgroundColor: "#05120f",
        border: "2px solid rgba(245,240,232,0.08)",
        boxShadow: "0 50px 120px rgba(0,0,0,0.55)",
        fontFamily,
        opacity: interpolate(frame, [0, 8], [0, 1], CLAMP),
        translate: interpolate(frame, [0, 18], ["0px 260px", "0px 0px"], {
          ...CLAMP,
          easing: EASE_OUT,
        }),
        filter: `blur(${interpolate(frame, [0, 12], [16, 0], CLAMP)}px)`,
      }}
    >
      {rows.map((row, i) => (
        <div
          key={row}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "36px 0",
            borderTop: i === 0 ? "none" : "2px solid rgba(245,240,232,0.08)",
          }}
        >
          <span style={{ color: WHITE, fontSize: 60, fontWeight: 700 }}>
            {row}
          </span>
          <Toggle onAt={22 + i * 12} />
        </div>
      ))}
    </div>
  );
};

// Typed out a character at a time with a blinking underscore cursor
const Typewriter: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.floor((frame - 4) / 1.4));
  const done = typed >= text.length;
  const cursorOn = !done || Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        fontFamily,
        fontSize: 96,
        fontWeight: 700,
        letterSpacing: -3,
        color: WHITE,
        whiteSpace: "pre",
      }}
    >
      {text.slice(0, typed)}
      <span style={{ color: ACCENT, opacity: cursorOn ? 1 : 0 }}>_</span>
    </div>
  );
};

// Outro — era mark + link on the left, QR on the right, staggered blur-in
const Outro: React.FC = () => {
  const mark = usePop(0);
  const link = usePop(10);
  const qr = usePop(18);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 120,
        fontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        <Img
          src={staticFile("era-poster.png")}
          style={{ width: 620, ...mark }}
        />
        <div
          style={{
            color: MUTED,
            fontSize: 44,
            fontWeight: 500,
            ...link,
          }}
        >
          linktr.ee/era.utdallas
        </div>
      </div>
      <div
        style={{
          width: 2,
          height: 360,
          backgroundColor: "rgba(245,240,232,0.12)",
          ...link,
        }}
      />
      <Img
        src={staticFile("era-qr.png")}
        style={{ width: 340, borderRadius: 24, ...qr }}
      />
    </div>
  );
};

const renderBeat = (beat: Beat) => {
  switch (beat.kind) {
    case "hook":
      // Whip-pan clip — drop hook-whip.mp4 in public/ and set HOOK_DURATION
      return <OffthreadVideo src={staticFile("hook-whip.mp4")} />;
    case "logos":
      return <Logos />;
    case "phrase":
      return <Phrase words={beat.words} size={beat.size} />;
    case "reveal":
      return <Reveal />;
    case "toggles":
      return <ToggleCard rows={beat.rows} />;
    case "typewriter":
      return <Typewriter text={beat.text} />;
    case "outro":
      return <Outro />;
  }
};

// Tiny SVG filter defs used by the reveal's color-split layers
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
// MAIN COMPOSITION — beats overlap so each blurs into the next
// ---------------------------------------------------------------------------
export const EraLaunch: React.FC = () => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: BG_DARK }}>
      <Background />
      <GlitchFilters />
      {activeBeats.map((beat, i) => {
        const from = cursor;
        cursor += beat.dur - OVERLAP;
        return (
          <Sequence key={i} from={from} durationInFrames={beat.dur}>
            <Scene dur={beat.dur} exit={beat.exit ?? "blur"}>
              {renderBeat(beat)}
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
