import { useState, type ReactNode } from "react";
import {
  ActivityGauge,
  ActivityGaugeReference,
  ChartAxisLabel,
  ChartDataReference,
  ChartLegend,
  ChartMarker,
  ChartXAxis,
  ChartYAxis,
  ChartYAxisLine,
  LineBarChart,
  LineBarChartReference,
  PieChart,
  PieChartReference,
  RadarChart,
  RadarChartReference,
  type ChartSeries,
  type ChartSize,
} from "../src";
import { chartSources } from "./chart-source-data";

const items = Array.from({ length: 6 }, (_, index) => ({
  id: String(index),
  label: `Series ${index + 1}`,
}));
export function ChartFixtures(): React.ReactElement {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [inspection, setInspection] = useState(0);
  const [extreme, setExtreme] = useState(false);
  const toggle = (id: string): void =>
    setHidden((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const series: ChartSeries[] = [
    {
      id: "first",
      label: "Series 1",
      values: extreme
        ? [
            Number.MAX_VALUE,
            -Number.MAX_VALUE,
            Number.NaN,
            0,
            Number.POSITIVE_INFINITY,
            1,
            Number.MAX_VALUE,
          ]
        : [300, 360, 320, 430, 510, 440, 600],
    },
    { id: "second", label: "Series 2", values: [200, 300, 260, 320, 440, 340, 420] },
  ].map((item) => ({ ...item, hidden: hidden.has(item.id) }));
  function fixture(familyId: string, id: string, name: string): ReactNode {
    const size = (name.match(/Size=(\w+)/)?.[1] ?? "xs") as ChartSize;
    if (familyId === "1061:47348" || familyId === "1061:47350")
      return (
        <ChartAxisLabel axis={familyId === "1061:47348" ? "x" : "y"}>
          {familyId === "1061:47348" ? "Month" : "Active users"}
        </ChartAxisLabel>
      );
    if (familyId === "1061:47441")
      return (
        <ChartXAxis
          period={
            name.includes("12 months")
              ? "12 months"
              : name.includes("30 days")
                ? "30 days"
                : "7 days"
          }
          breakpoint={name.includes("Mobile") ? "mobile" : "desktop"}
        />
      );
    if (familyId === "1061:47609")
      return (
        <ChartDataReference
          variantId={id as React.ComponentProps<typeof ChartDataReference>["variantId"]}
          label={name}
        />
      );
    if (familyId === "1062:46989")
      return (
        <LineBarChartReference
          variantId={id as React.ComponentProps<typeof LineBarChartReference>["variantId"]}
          label={name}
        />
      );
    if (familyId === "1062:47445")
      return <ChartYAxisLine label={name.includes("True") ? "1,000" : undefined} />;
    if (familyId === "1062:47961")
      return (
        <ChartLegend
          style={{ width: name.includes("Horizontal") ? 470 : 69 }}
          items={items}
          orientation={name.includes("Horizontal") ? "horizontal" : "vertical"}
        />
      );
    if (familyId === "1067:824")
      return (
        <ChartYAxis
          labels={name.includes("True") ? ["1,000", "800", "600", "400", "200", "0"] : undefined}
        />
      );
    if (familyId === "1076:4088" || familyId === "1078:155")
      return (
        <ActivityGaugeReference
          size={size}
          label="Active users"
          value="1,000"
          items={items.slice(0, 3)}
          legend={name.includes("Bottom") ? "bottom" : name.includes("Right") ? "right" : "none"}
        />
      );
    if (familyId === "1079:51184")
      return (
        <PieChartReference
          label={name}
          hole={name.includes("25") ? 25 : name.includes("50") ? 50 : name.includes("75") ? 75 : 0}
        />
      );
    if (familyId === "1084:114")
      return (
        <PieChartReference
          label={name}
          size={size as ChartSize | "xxs"}
          legend={name.includes("True")}
          items={items}
        />
      );
    if (familyId === "1084:7152" || familyId === "1084:7362")
      return (
        <RadarChartReference
          label={name}
          legend={name.includes("Bottom") ? "bottom" : name.includes("Right") ? "right" : "none"}
          items={items.slice(0, 3)}
        />
      );
    return (
      <ChartMarker
        type={name.includes("Dash") ? "dash" : name.includes("Minimal") ? "minimal" : "line"}
        value="1,218"
        date="Jan 10, 2025"
        cursor
      />
    );
  }
  return (
    <section className="preview-section">
      <h2>Chart source families</h2>
      {chartSources.map((family) => (
        <section key={family.id}>
          <h3>{family.name}</h3>
          <div className="chart-source-scroll">
            <div className="chart-source-grid">
              {family.variants.map((source) => (
                <div key={source.id} data-chart-source-id={source.id}>
                  {fixture(family.id, source.id, source.name)}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      <h2>Live charts</h2>
      <label>
        <input
          type="checkbox"
          checked={extreme}
          onChange={(event) => setExtreme(event.currentTarget.checked)}
        />
        Use extreme and missing values
      </label>
      <LineBarChart
        label="Study activity"
        labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
        series={series}
        onToggleSeries={toggle}
        axisLabels={{ x: "Day", y: "Study minutes" }}
        onInspect={setInspection}
      />
      <LineBarChart
        type="bar"
        label="Study results"
        labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
        series={series}
        onToggleSeries={toggle}
      />
      <div className="chart-live-radial">
        <ActivityGauge size="md" label="Weekly goal" value="40%" percentages={[40, 60, 80]} />
        <PieChart
          label="Study topics"
          series={series.map((item) => ({ ...item, value: item.values[0] ?? 0 }))}
          onToggle={toggle}
        />
        <RadarChart
          label="Topic confidence"
          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          series={series}
          onToggleSeries={toggle}
        />
      </div>
      <output data-testid="chart-inspection">{inspection}</output>
    </section>
  );
}
