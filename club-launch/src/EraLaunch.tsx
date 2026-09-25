import {
  AbsoluteFill,
  Sequence,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  Easing,
} from "remotion";

// ---------------------------------------------------------------------------
// COLORS — pulled from the era poster (dark teal bg, off-white/cream type)
// ---------------------------------------------------------------------------
const BG_DARK = "#0a1f22";
const BG_DARK_2 = "#0f2e32";
const WHITE = "#f5f0e8";

// ---------------------------------------------------------------------------
// FRAME MAP (30fps) — adjust HOOK_DURATION once the whip-pan clip is real
// ---------------------------------------------------------------------------
const HOOK_DURATION = 0; // 0 until the whip-pan clip exists — set to its length in frames
const KHIDMAH_DUR = 20;
const ILM_DUR = 20;
const REVEAL_DUR = 55;
const FEATURE_DUR = 18;
const SCOPE_DUR = 26;
const OUTRO_DUR = 60;

export const eraLaunchDuration =
  HOOK_DURATION +
  KHIDMAH_DUR +
  ILM_DUR +
  REVEAL_DUR +
  FEATURE_DUR * 3 +
  SCOPE_DUR +
  OUTRO_DUR;

// ---------------------------------------------------------------------------
// Dark teal background w/ subtle radial glow, matches the poster's vibe
// ---------------------------------------------------------------------------
const TealBG: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 35%, ${BG_DARK_2} 0%, ${BG_DARK} 70%)`,
    }}
  />
);

// ---------------------------------------------------------------------------
// GlitchIn — wraps a child and does a quick RGB-split / jitter settle,
// matching the "glitchy" era wordmark style. Runs for the first ~10 frames
// of whatever Sequence it's placed in.
// ---------------------------------------------------------------------------
const GlitchIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const glitchWindow = 10;
  const active = frame < glitchWindow;

  const jitterX = active
    ? Math.sin(frame * 9) * (glitchWindow - frame) * 1.4
    : 0;
  const splitAmount = active
    ? interpolate(frame, [0, glitchWindow], [6, 0], {
        extrapolateRight: "clamp",
      })
    : 0;

  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", opacity }}>
      {active && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${jitterX + splitAmount}px, 0)`,
              mixBlendMode: "screen",
              filter: "url(#cyanTint)",
              opacity: 0.7,
            }}
          >
            {children}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${jitterX - splitAmount}px, 0)`,
              mixBlendMode: "screen",
              filter: "url(#redTint)",
              opacity: 0.7,
            }}
          >
            {children}
          </div>
        </>
      )}
      <div style={{ transform: `translate(${jitterX * 0.3}px, 0)` }}>
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
// Reusable punchy text card for the feature beats
// ---------------------------------------------------------------------------
const FeatureCard: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const scale = spring({
    frame,
    fps: 30,
    config: { damping: 14, stiffness: 180 },
  });
  const opacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <TealBG />
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              color: WHITE,
              fontFamily: "Arial, sans-serif",
              fontWeight: 800,
              fontSize: i === 0 ? 76 : 44,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// MAIN COMPOSITION
// ---------------------------------------------------------------------------
export const EraLaunch: React.FC = () => {
  let cursor = 0;
  const hookStart = cursor;
  cursor += HOOK_DURATION;
  const khidmahStart = cursor;
  cursor += KHIDMAH_DUR;
  const ilmStart = cursor;
  cursor += ILM_DUR;
  const revealStart = cursor;
  cursor += REVEAL_DUR;
  const feature1Start = cursor;
  cursor += FEATURE_DUR;
  const feature2Start = cursor;
  cursor += FEATURE_DUR;
  const feature3Start = cursor;
  cursor += FEATURE_DUR;
  const scopeStart = cursor;
  cursor += SCOPE_DUR;
  const outroStart = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <GlitchFilters />

      {/* 1. HOOK + WHIP-PAN — swap staticFile('hook-whip.mp4') for the real clip.
          Trim HOOK_DURATION above to match its actual length once filmed.
          Skipped while HOOK_DURATION is 0 (Remotion rejects 0-frame Sequences). */}
      {HOOK_DURATION > 0 && (
        <Sequence from={hookStart} durationInFrames={HOOK_DURATION}>
          <OffthreadVideo src={staticFile("hook-whip.mp4")} />
        </Sequence>
      )}

      {/* 2. KHIDMAH beat — logo settles in with the zoom carrying over from the whip */}
      <Sequence from={khidmahStart} durationInFrames={KHIDMAH_DUR}>
        <ZoomSettleLogo src="khidmah-logo-transparent.png" />
      </Sequence>

      {/* 3. ILM beat — using their existing "INTRODUCING: ilm" card as-is */}
      <Sequence from={ilmStart} durationInFrames={ILM_DUR}>
        <AbsoluteFill>
          <Img
            src={staticFile("ilm-intro.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* 4. THE REVEAL — the actual era poster, glitch pop-in, held longest */}
      <Sequence from={revealStart} durationInFrames={REVEAL_DUR}>
        <AbsoluteFill
          style={{ justifyContent: "center", alignItems: "center" }}
        >
          <TealBG />
          <GlitchIn>
            <Img
              src={staticFile("era-poster.png")}
              style={{ width: "90%" }}
            />
          </GlitchIn>
        </AbsoluteFill>
      </Sequence>

      {/* 5. FEATURE BEATS — fast, punchy, one idea each */}
      <Sequence from={feature1Start} durationInFrames={FEATURE_DUR}>
        <FeatureCard lines={["Fireside Chats"]} />
      </Sequence>
      <Sequence from={feature2Start} durationInFrames={FEATURE_DUR}>
        <FeatureCard lines={["Build Nights"]} />
      </Sequence>
      <Sequence from={feature3Start} durationInFrames={FEATURE_DUR}>
        <FeatureCard lines={["Internship Program", "Every Semester"]} />
      </Sequence>

      {/* 6. SCOPE beat — tech + business range */}
      <Sequence from={scopeStart} durationInFrames={SCOPE_DUR}>
        <FeatureCard lines={["AI Analytics → GTM", "Tech + Business"]} />
      </Sequence>

      {/* 7. OUTRO — calm close: era mark + QR + linktree, no hard CTA */}
      <Sequence from={outroStart} durationInFrames={OUTRO_DUR}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Logo settle used for the Khidmah beat — starts slightly zoomed (matches
// the whip-pan's momentum) and eases down to rest.
// ---------------------------------------------------------------------------
const ZoomSettleLogo: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 10], [1.35, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <TealBG />
      <Img
        src={staticFile(src)}
        style={{ width: "55%", transform: `scale(${scale})`, opacity }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Outro — small era mark, QR code, linktree handle
// ---------------------------------------------------------------------------
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <TealBG />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40, width: "100%", position: "relative" }}>
        <Img src={staticFile("era-poster.png")} style={{ width: "40%" }} />
        <Img
          src={staticFile("era-qr.png")}
          style={{ width: "35%", borderRadius: 16 }}
        />
        <div
          style={{
            color: WHITE,
            fontFamily: "Arial, sans-serif",
            fontSize: 28,
            opacity: 0.8,
          }}
        >
          linktr.ee/era.utdallas
        </div>
      </div>
    </AbsoluteFill>
  );
};
