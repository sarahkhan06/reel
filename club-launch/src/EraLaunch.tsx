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
// COLORS
// ---------------------------------------------------------------------------
const BG_TEAL = "#0a1f22"; // flat, solid — no gradient
const WHITE = "#f5f0e8";
const ACCENT = "#7eebd4"; // mint accent for highlighted words

// ---------------------------------------------------------------------------
// FRAME MAP (30fps, 1920x1080 landscape)
// ---------------------------------------------------------------------------
const HOOK_DURATION = 0; // whip-pan clip — off for now, add back later if you shoot it
const INTRO_MERGE_DUR = 90; // 3s — the logo-merge hook
const PROBLEM_DUR = 45;
const SOLUTION_DUR = 45;
const PROOF_DUR = 20; // x4 beats
const OUTRO_DUR = 70;

export const eraLaunchDuration =
  HOOK_DURATION +
  INTRO_MERGE_DUR +
  PROBLEM_DUR +
  SOLUTION_DUR +
  PROOF_DUR * 4 +
  OUTRO_DUR;

const TealBG: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BG_TEAL }} />
);

// ---------------------------------------------------------------------------
// Flexible text card — pass JSX so words can be individually colored
// ---------------------------------------------------------------------------
const TextCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: 30, config: { damping: 14, stiffness: 180 } });
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <TealBG />
      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center", padding: "0 120px" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

const bigText: React.CSSProperties = {
  color: WHITE,
  fontFamily: "Arial, sans-serif",
  fontWeight: 800,
  fontSize: 72,
  lineHeight: 1.2,
  letterSpacing: -1,
};

// ---------------------------------------------------------------------------
// INTRO MERGE — the hook. Black -> dual logos spiral together (2D orbit,
// NOT 3D rotateY — flat images rotated in 3D just mirror/squish without a
// perspective-mapped renderer, so this fakes the helix with orbital motion
// instead) -> flash -> iris wipe to solid teal -> era poster lands centered.
// ---------------------------------------------------------------------------
const IntroMerge: React.FC = () => {
  const frame = useCurrentFrame();

  // travel: 0 -> 1 across the spiral-in phase
  const travel = interpolate(frame, [8, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const fadeIn = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: "clamp" });

  // Orbital spiral: both logos travel around a shared center point, 180°
  // apart, radius shrinking to 0 as they converge — this is what reads as
  // "interlinking" without any 3D flip artifacts.
  const ROTATIONS = 2.25;
  const angle = travel * ROTATIONS * Math.PI * 2;
  const radius = interpolate(travel, [0, 1], [480, 0], {
    easing: Easing.in(Easing.cubic),
  });

  const khidmahX = Math.cos(angle) * radius;
  const khidmahY = Math.sin(angle) * radius * 0.55; // flatten vertically, feels less circular/more helix-like
  const khidmahRotate = angle * (180 / Math.PI) * 0.3; // gentle in-plane tumble, safe (2D rotate, no mirroring)

  const ilmX = Math.cos(angle + Math.PI) * radius;
  const ilmY = Math.sin(angle + Math.PI) * radius * 0.55;
  const ilmRotate = -angle * (180 / Math.PI) * 0.3;

  // White flash masks the moment they overlap at center
  const flash = interpolate(frame, [50, 58, 66], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Iris wipe — solid teal circle expands from center
  const irisRadius = interpolate(frame, [58, 80], [0, 150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // era poster lands, held
  const posterOpacity = interpolate(frame, [74, 86], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const posterScale = interpolate(frame, [74, 90], [1.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const logosOpacity = interpolate(frame, [8, 20, 48, 58], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* dual logos spiraling together */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: logosOpacity }}>
        <div
          style={{
            position: "absolute",
            transform: `translate(${khidmahX}px, ${khidmahY}px) rotate(${khidmahRotate}deg)`,
            opacity: fadeIn,
          }}
        >
          <Img src={staticFile("khidmah-logo-transparent.png")} style={{ width: 220 }} />
        </div>
        <div
          style={{
            position: "absolute",
            transform: `translate(${ilmX}px, ${ilmY}px) rotate(${ilmRotate}deg)`,
            opacity: fadeIn,
          }}
        >
          <Img src={staticFile("ilm-logo-transparent.png")} style={{ width: 220 }} />
        </div>
      </AbsoluteFill>

      {/* white flash at the moment of overlap */}
      <AbsoluteFill style={{ backgroundColor: "white", opacity: flash }} />

      {/* iris wipe to solid teal */}
      <AbsoluteFill
        style={{
          backgroundColor: BG_TEAL,
          clipPath: `circle(${irisRadius}% at 50% 50%)`,
        }}
      />

      {/* era poster lands centered, held */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img
          src={staticFile("era-poster.png")}
          style={{ width: "45%", opacity: posterOpacity, transform: `scale(${posterScale})` }}
        />
      </AbsoluteFill>
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
  const introStart = cursor;
  cursor += INTRO_MERGE_DUR;
  const problemStart = cursor;
  cursor += PROBLEM_DUR;
  const solutionStart = cursor;
  cursor += SOLUTION_DUR;
  const proof1Start = cursor;
  cursor += PROOF_DUR;
  const proof2Start = cursor;
  cursor += PROOF_DUR;
  const proof3Start = cursor;
  cursor += PROOF_DUR;
  const proof4Start = cursor;
  cursor += PROOF_DUR;
  const outroStart = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* HOOK — whip-pan clip, currently off (HOOK_DURATION = 0) */}
      {HOOK_DURATION > 0 && (
        <Sequence from={hookStart} durationInFrames={HOOK_DURATION}>
          <OffthreadVideo src={staticFile("hook-whip.mp4")} />
        </Sequence>
      )}

      {/* HOOK — logo merge */}
      <Sequence from={introStart} durationInFrames={INTRO_MERGE_DUR}>
        <IntroMerge />
      </Sequence>

      {/* PROBLEM */}
      <Sequence from={problemStart} durationInFrames={PROBLEM_DUR}>
        <TextCard>
          <div style={bigText}>Most clubs meet.</div>
          <div style={{ ...bigText, color: ACCENT }}>Nothing ships.</div>
        </TextCard>
      </Sequence>

      {/* SOLUTION */}
      <Sequence from={solutionStart} durationInFrames={SOLUTION_DUR}>
        <TextCard>
          <div style={bigText}>
            era. built for <span style={{ color: ACCENT }}>tech</span> +{" "}
            <span style={{ color: ACCENT }}>business</span>.
          </div>
        </TextCard>
      </Sequence>

      {/* PROOF — quick beats */}
      <Sequence from={proof1Start} durationInFrames={PROOF_DUR}>
        <TextCard><div style={bigText}>Fireside Chats</div></TextCard>
      </Sequence>
      <Sequence from={proof2Start} durationInFrames={PROOF_DUR}>
        <TextCard><div style={bigText}>Build Nights</div></TextCard>
      </Sequence>
      <Sequence from={proof3Start} durationInFrames={PROOF_DUR}>
        <TextCard>
          <div style={bigText}>Internship Program</div>
          <div style={{ ...bigText, fontSize: 44, color: ACCENT }}>Every Semester</div>
        </TextCard>
      </Sequence>
      <Sequence from={proof4Start} durationInFrames={PROOF_DUR}>
        <TextCard>
          <div style={bigText}>
            AI Analytics <span style={{ color: ACCENT }}>→</span> GTM
          </div>
        </TextCard>
      </Sequence>

      {/* CTA / OUTRO */}
      <Sequence from={outroStart} durationInFrames={OUTRO_DUR}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Outro — era mark, QR, linktree. Calm close, no hard CTA push.
// ---------------------------------------------------------------------------
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <TealBG />
      <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
          <Img src={staticFile("era-poster.png")} style={{ width: 380 }} />
          <div style={{ color: WHITE, fontFamily: "Arial, sans-serif", fontSize: 28, opacity: 0.8 }}>
            linktr.ee/era.utdallas
          </div>
        </div>
        <Img src={staticFile("era-qr.png")} style={{ width: 220, borderRadius: 16 }} />
      </div>
    </AbsoluteFill>
  );
};
