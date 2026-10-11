import { useState } from "react";
import {
  Button,
  ProgressBar,
  ProgressCircle,
  ProgressCircleReference,
  progressCircleSizes,
  progressCircleShapes,
  Spinner,
  progressLabelPositions,
  spinnerSizes,
  spinnerVariants,
} from "../src";
import { progressSourceData } from "./progress-source-data";

export function IndicatorFixtures(): React.ReactElement {
  const [value, setValue] = useState(40);
  const [showLabel, setShowLabel] = useState(true);
  const [animated, setAnimated] = useState(true);
  return (
    <section className="preview-section" aria-labelledby="indicator-fixtures-title">
      <h2 id="indicator-fixtures-title">Progress and loading indicators</h2>
      <p>
        Source prototypes preserve their measured fills and label offsets. Live progress follows the
        supplied value.
      </p>
      <div className="progress-source-grid">
        {progressSourceData.map((source) => {
          const labelWidth =
            source.position === "right"
              ? 320 - source.trackWidth - 12
              : source.tooltip
                ? source.tooltip.w - 24
                : undefined;
          return (
            <div className="indicator-source-scroll" key={source.id}>
              <div
                className="progress-source-fixture"
                data-source-id={source.id}
                data-position={source.position}
                style={{ width: 320 }}
              >
                <p>
                  {source.nominal}% / {source.position}
                </p>
                <ProgressBar
                  value={(source.fillWidth / source.trackWidth) * 100}
                  labelPosition={source.position}
                  valueLabel={
                    <span style={{ display: "inline-block", width: labelWidth }}>
                      {source.nominal}%
                    </span>
                  }
                  labelOffset={
                    source.tooltip
                      ? source.tooltip.x + source.tooltip.w / 2 - source.fillWidth
                      : undefined
                  }
                  aria-label={`${source.nominal}% source progress, ${source.position}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="spinner-source-grid">
        {spinnerVariants.flatMap((variant) =>
          spinnerSizes.map((size) => (
            <div className="indicator-source-scroll" key={`${variant}-${size}`}>
              <div
                className="spinner-source-fixture"
                data-variant={variant}
                data-size={size}
                style={{ width: 512 }}
              >
                <p>
                  {variant} / {size}
                </p>
                <Spinner variant={variant} size={size} animated={false} />
              </div>
            </div>
          ))
        )}
      </div>
      <div className="circle-source-grid">
        {progressCircleShapes.flatMap((shape) =>
          progressCircleSizes.map((size) => (
            <div
              className="circle-source-fixture"
              key={`${shape}-${size}`}
              data-shape={shape}
              data-size={size}
            >
              <p>
                {size} / {shape}
              </p>
              <ProgressCircleReference shape={shape} size={size} />
            </div>
          ))
        )}
      </div>
      <div className="indicator-demo" role="group" aria-label="Interactive progress example">
        <div className="circle-source-grid">
          {progressCircleShapes.flatMap((shape) =>
            progressCircleSizes.map((size) => (
              <ProgressCircle
                key={`${shape}-${size}`}
                shape={shape}
                size={size}
                value={value}
                aria-label={`Live ${size} ${shape}`}
              />
            ))
          )}
        </div>
        {progressLabelPositions.map((position) => (
          <div className="indicator-demo-progress" key={position}>
            <ProgressBar
              value={value}
              labelPosition={position}
              aria-label={`Live progress ${position}`}
            />
          </div>
        ))}
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setValue(75)}>
          Set progress to 75
        </Button>
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setValue(0)}>
          Reset progress
        </Button>
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setValue(150)}>
          Complete progress
        </Button>
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setValue(Number.NaN)}>
          Invalid progress value
        </Button>
      </div>
      <div className="indicator-demo" role="group" aria-label="Interactive loading example">
        <Spinner
          size="xl"
          variant="dot-circle"
          label="Fetching documents"
          showLabel={showLabel}
          animated={animated}
        />
        <Button
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setShowLabel((current) => !current)}
        >
          Toggle loading label
        </Button>
        <Button
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setAnimated((current) => !current)}
        >
          Toggle loading animation
        </Button>
      </div>
    </section>
  );
}
