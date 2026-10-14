// @zen-page {"format":1,"title":"Studio page"}
// A page Zen Studio made: `overrides` is how it writes a nested layer's props, so api/overrides-studio-only stays quiet.
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Card, Text } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Studio page" device="desktop">
        <Card subAction={{ label: "More", onClick: proto.toast("More") }} overrides={{ "Sub-Action": { level: "danger" } }}>
          <Text textStyle="Heading/3">Team</Text>
        </Card>
      </Screen>
    </Board>
  );
}
