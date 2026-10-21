import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "../src/components/primitives/Text";
import { Button } from "../src/components/primitives/Button";

describe("T1 Smoke Test: Mounted Primitives", () => {
  it("mounts Text primitive and asserts rendered content", () => {
    render(<Text>Something Else</Text>);
    expect(screen.getByText("Something Else")).toBeTruthy();
  });

  it("mounts Button primitive and triggers onPress", () => {
    let pressed = false;
    render(
      <Button
        title="Start Practice"
        onPress={() => {
          pressed = true;
        }}
      />
    );
    const button = screen.getByText("Start Practice");
    expect(button).toBeTruthy();
    // removed
    expect(pressed).toBe(true);
  });
});
