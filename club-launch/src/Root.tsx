import "./index.css";
import { Composition } from "remotion";
import { EraLaunch, eraLaunchDuration } from "./EraLaunch";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EraLaunch"
        component={EraLaunch}
        durationInFrames={eraLaunchDuration}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
