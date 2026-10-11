import { useState, type CSSProperties } from "react";
import { Button, Slider, SliderHandleReference, type SliderLabelPosition } from "../src";
import { sliderSourceData } from "./slider-source-data";
const positions: Record<string, SliderLabelPosition> = {
  False: "none",
  Bottom: "bottom",
  "Top floating": "top-floating",
  Text: "bottom",
  Tooltip: "top-floating",
};
export function SliderFixtures(): React.ReactElement {
  const [range, setRange] = useState([25, 75]);
  return (
    <section className="preview-section" aria-labelledby="slider-fixtures-title">
      <h2 id="slider-fixtures-title">Sliders and control handles</h2>
      <p>
        Thirty source range layouts and nine handle states. The live controls accept caller-owned
        values and native form names.
      </p>
      <div className="slider-source-grid">
        {sliderSourceData[0].variants.map((source) => {
          const label = /Label=([^,]+)/.exec(source.name)?.[1] ?? "False";
          const values = [
            /Left control=(\d+)/.exec(source.name)?.[1] ?? "0",
            /Right control=(\d+)/.exec(source.name)?.[1] ?? "25",
          ];
          const handles = source.layers.filter((l) => l[0] === "Handle");
          const labels = source.layers.filter((l) => l[0] === "Text");
          const fill = source.layers.find((l) => l[0] === "Progress");
          return (
            <div className="slider-source-scroll" key={source.id}>
              <p>{source.name}</p>
              <div
                className="p-slider-source"
                data-source-id={source.id}
                style={{ height: source.height }}
              >
                <span className="p-slider-source-track" />
                <span
                  className="p-slider-source-range"
                  style={{ left: fill?.[1], width: fill?.[3] }}
                />
                {handles.map((h, i) => (
                  <SliderHandleReference
                    key={i}
                    labelPosition={positions[label]}
                    style={
                      {
                        left: h[1],
                        "--slider-label-x": `${labels[i] ? labels[i][1] - h[1] + labels[i][3] / 2 : 12}px`,
                      } as CSSProperties
                    }
                    value={<span style={{ width: labels[i]?.[3] }}>{values[i]}%</span>}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="slider-handle-grid">
        {sliderSourceData[1].variants.map((source) => {
          const kind = /Type=(\w+)/.exec(source.name)?.[1] ?? "False";
          const state = (/State=(\w+)/.exec(source.name)?.[1] ?? "Default").toLowerCase() as
            "default" | "hover" | "focused";
          const label = source.layers.find((l) => l[0] === "Text");
          return (
            <div key={source.id} className="slider-handle-fixture" data-source-id={source.id}>
              <p>{source.name}</p>
              <SliderHandleReference
                state={state}
                labelPosition={positions[kind]}
                value={<span style={{ display: "inline-block", width: label?.[3] }}>0%</span>}
              />
            </div>
          );
        })}
      </div>
      <form
        aria-label="Interactive range form"
        className="slider-live-demo"
        onSubmit={(e) => e.preventDefault()}
      >
        <Slider
          name="range"
          value={range}
          onValueChange={setRange}
          thumbLabels={["Lower limit", "Upper limit"]}
          minStepsBetweenThumbs={5}
          labelPosition="top-floating"
        />
        <output aria-live="polite">Selected range: {range.join("–")}</output>
        <Button type="button" variant="secondary" onClick={() => setRange([25, 75])}>
          Reset range
        </Button>
        <Slider
          defaultValue={[10, 90]}
          thumbLabels={["Bottom lower", "Bottom upper"]}
          labelPosition="bottom"
        />
        <Slider defaultValue={[20]} thumbLabels={["Disabled value"]} disabled />
        <Slider defaultValue={[50]} thumbLabels={["RTL value"]} dir="rtl" />
        <Slider
          defaultValue={[50]}
          thumbLabels={["Vertical value"]}
          orientation="vertical"
          labelPosition="top-floating"
        />
      </form>
    </section>
  );
}
