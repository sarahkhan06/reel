import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { EraLaunch, eraLaunchDuration } from "./EraLaunch";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="EraLaunch"
        component={EraLaunch}
        durationInFrames={eraLaunchDuration}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
