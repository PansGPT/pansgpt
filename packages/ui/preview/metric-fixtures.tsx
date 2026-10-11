import { useState } from "react";
import {
  Button,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  FigmaAsset,
  MetricChange,
  MetricChartReference,
  MetricItem,
  MiniChart,
  Sparkline,
  type MetricItemType,
  type MiniChartType,
} from "../src";
import {
  MetricAsset,
  miniChartReferences,
  type MetricAssetName,
} from "../src/components/metric-assets";
import { metricCardSources } from "./metric-source-data";

const types: MetricItemType[] = [
  "simple",
  "icon01",
  "icon02",
  "icon03",
  "icon04",
  "chart01",
  "chart02",
  "chart03",
  "chart04",
];
const featuredIcons: Partial<Record<MetricItemType, MetricAssetName>> = {
  icon01: "card1_imgTrendUp01",
  icon02: "card2_imgZap",
  icon03: "card3_imgTrendUp01",
  icon04: "card4_imgTrendUp01",
  chart02: "card6_imgEye",
};
const miniTypes: MiniChartType[] = [
  "wavy01",
  "wavy02",
  "wavy03",
  "wavy04",
  "wavy05",
  "wavy06",
  "wavy07",
  "realistic01",
  "realistic02",
  "realistic03",
  "straight",
  "layers",
];
export function MetricFixtures(): React.ReactElement {
  const [selection, setSelection] = useState("");
  const [amount, setAmount] = useState(40);
  const [background, setBackground] = useState(true);
  const [markers, setMarkers] = useState(true);
  const menu = (
    <Dropdown>
      <DropdownTrigger asChild>
        <button type="button" className="p-dropdown-trigger" aria-label="Metric options">
          <MetricAsset name="card0_imgDotsVertical" />
        </button>
      </DropdownTrigger>
      <DropdownContent aria-label="Metric options">
        <DropdownItem onSelect={() => setSelection("Export metric")}>Export metric</DropdownItem>
        <DropdownItem disabled>Delete metric</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
  const sources = [...metricCardSources].sort((a, b) => {
    const typeA = a.name
      .match(/Type=([^,]+)/)?.[1]
      .toLowerCase()
      .replaceAll(" ", "") as MetricItemType;
    const typeB = b.name
      .match(/Type=([^,]+)/)?.[1]
      .toLowerCase()
      .replaceAll(" ", "") as MetricItemType;
    return (
      types.indexOf(typeA) - types.indexOf(typeB) ||
      Number(a.name.startsWith("Actions=True")) - Number(b.name.startsWith("Actions=True")) ||
      Number(a.name.endsWith("Mobile")) - Number(b.name.endsWith("Mobile"))
    );
  });
  return (
    <section className="preview-section">
      <h2>All thirty-six metric card layouts</h2>
      <div className="metric-source-scroll">
        <div className="metric-source-grid">
          {sources.map((source) => {
            const type = source.name
              .match(/Type=([^,]+)/)?.[1]
              .toLowerCase()
              .replaceAll(" ", "") as MetricItemType;
            const breakpoint = source.name.endsWith("Mobile") ? "mobile" : "desktop";
            const actions = source.name.startsWith("Actions=True");
            const badge = ["simple", "icon01", "icon04"].includes(type);
            const compare = ["icon02", "icon03", "chart01", "chart03", "chart04"].includes(type);
            const link = ["simple", "icon01", "icon02", "chart01"].includes(type);
            const chart =
              type === "chart01" ? (
                <MiniChart type="realistic01" />
              ) : type === "chart02" ? (
                <MiniChart type="layers" />
              ) : type === "chart03" || type === "chart04" ? (
                <MetricChartReference type={type} breakpoint={breakpoint} />
              ) : undefined;
            return (
              <MetricItem
                key={source.id}
                data-metric-source-id={source.id}
                type={type}
                breakpoint={breakpoint}
                title="Views 24 hours"
                value="2,000"
                change={
                  <MetricChange
                    variant={
                      badge ? "badge" : type === "icon02" || type === "chart01" ? "arrow" : "trend"
                    }
                    value="100%"
                  />
                }
                comparison={compare ? "vs last month" : undefined}
                icon={featuredIcons[type] ? <MetricAsset name={featuredIcons[type]} /> : undefined}
                chart={chart}
                menu={menu}
                action={
                  actions ? (
                    <Button
                      variant={link ? "link-color" : "secondary"}
                      size="sm"
                      leadingIcon={link ? null : <FigmaAsset name="placeholder" />}
                      trailingIcon={null}
                      onClick={() => setSelection(`${source.id}: View report`)}
                    >
                      View report
                    </Button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>
      <h2>All twenty-four original mini charts</h2>
      <div className="preview-row">
        <label>
          <input
            type="checkbox"
            checked={background}
            onChange={(event) => setBackground(event.target.checked)}
          />{" "}
          Chart background
        </label>
        <label>
          <input
            type="checkbox"
            checked={markers}
            onChange={(event) => setMarkers(event.target.checked)}
          />{" "}
          Chart markers
        </label>
      </div>
      <div className="metric-source-scroll">
        <div className="mini-chart-source-grid">
          {miniTypes.flatMap((type) =>
            (["positive", "negative"] as const).map((trend) => (
              <MiniChart
                key={`${type}_${trend}`}
                data-mini-source-id={miniChartReferences[`${type}_${trend}`].id}
                type={type}
                trend={trend}
                background={background}
                markers={markers}
                label={`${type} ${trend} source chart`}
              />
            ))
          )}
        </div>
      </div>
      <h2>Change indicators</h2>
      <div className="metric-change-source-grid">
        {(["arrow", "trend", "badge"] as const).flatMap((variant) =>
          (["positive", "negative"] as const).map((trend) => (
            <MetricChange
              key={`${variant}_${trend}`}
              data-change-variant={`${variant}_${trend}`}
              value="100%"
              variant={variant}
              trend={trend}
            />
          ))
        )}
      </div>
      <h2>Live metric with changing data</h2>
      <label>
        Latest value{" "}
        <input
          aria-label="Latest value"
          type="range"
          min="0"
          max="100"
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
        />
      </label>
      <MetricItem
        data-testid="live-metric"
        type="chart01"
        title="Study activity"
        value={amount}
        change={
          <MetricChange value={`${amount}%`} trend={amount >= 40 ? "positive" : "negative"} />
        }
        comparison="vs previous period"
        chart={
          <Sparkline
            values={[10, 20, 15, 30, amount]}
            label={`Study activity ending at ${amount}`}
          />
        }
        menu={menu}
      />
      <output className="metric-selection" data-testid="metric-selection">
        {selection}
      </output>
    </section>
  );
}
