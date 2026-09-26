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
// COLORS — era brand: flat deep teal, cream type, bright teal accent
// ---------------------------------------------------------------------------
const BG = "#0a1f22";
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
  | { kind: "khidmah" }
  | { kind: "ilm" }
  | { kind: "phrase"; words: Word[]; size?: number }
  | { kind: "reveal" }
  | { kind: "feature"; lines: string[] }
  | { kind: "outro" }
);

const BEATS: Beat[] = [
  { kind: "hook", dur: HOOK_DURATION },
  { kind: "khidmah", dur: 50 },
  { kind: "ilm", dur: 64 },
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
  // Feature beats — full-screen bold text cards, one idea each
  { kind: "feature", dur: 45, lines: ["Fireside Chats"] },
  { kind: "feature", dur: 45, lines: ["Build Nights"] },
  { kind: "feature", dur: 60, lines: ["Internship Program", "Every Semester"] },
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
style={{ backgroundColor: BG }} />
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

// Khidmah logo pops in on its own
const Khidmah: React.FC = () => (
  <Img
    src={staticFile("khidmah-logo-transparent.png")}
    style={{ width: 560, ...usePop(0) }}
  />
);

// ilm's "INTRODUCING: ilm" card, full screen
const IlmCard: React.FC = () => (
  <Img
    src={staticFile("ilm-intro.png")}
    style={{
      width: 1560,
      borderRadius: 36,
      boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
      ...usePop(0),
    }}
  />
);

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

// Full-screen bold text card — headline, optional second line
const FeatureCard: React.FC<{ lines: string[] }> = ({ lines }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      fontFamily,
      lineHeight: 1.05,
    }}
  >
    {lines.map((line, i) => (
      <BlurWord
        key={i}
        text={line}
        at={i * 10}
        accent={i > 0}
        size={i === 0 ? 168 : 84}
      />
    ))}
  </div>
);

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
    case "khidmah":
      return <Khidmah />;
    case "ilm":
      return <IlmCard />;
    case "phrase":
      return <Phrase words={beat.words} size={beat.size} />;
    case "reveal":
      return <Reveal />;
    case "feature":
      return <FeatureCard lines={beat.lines} />;
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
    <AbsoluteFill style={{ backgroundColor: BG }}>
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
