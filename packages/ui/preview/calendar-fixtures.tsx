import { useState } from "react";
import {
  Calendar,
  CalendarHeader,
  CalendarViewDropdown,
  CalendarDateIcon,
  CalendarCellDate,
  CalendarMonthEvent,
  CalendarMonthCell,
  CalendarDayEvent,
  CalendarTimeCell,
  CalendarColumnHeader,
  CalendarRowLabel,
  CalendarTimeMarker,
  DatePickerCalendar,
  type CalendarColor,
  type CalendarView,
} from "../src";
import { dateSources } from "./date-source-data";
import { calendarSourceEvents } from "./calendar-event-data";
import { calendarTimelineEvents } from "./calendar-timeline-data";
import { CalendarEventDetails, CalendarDateAsset, calendarDateAssetUrl } from "../src";
function CalendarSourceDetails({
  onAction,
}: {
  onAction: (action: string) => void;
}): React.ReactElement {
  return (
    <CalendarEventDetails
      title="Product demo"
      date="Friday, Jan 10, 2025"
      time="1:30 PM – 3:30 PM"
      reminder="10 min before"
      onCopy={() => onAction("Copy event")}
      onDelete={() => onAction("Delete event")}
      onEdit={() => onAction("Edit event")}
      guests={
        <>
          {[
            "source28_imgAvatar",
            "source28_imgAvatar1",
            "source28_imgAvatar2",
            "source28_imgAvatar3",
            "source28_imgAvatar4",
          ].map((name) => (
            <img key={name} src={calendarDateAssetUrl(name as "source28_imgAvatar")} alt="" />
          ))}
          <span>OR</span>
          <button
            className="calendar-source-add-guest"
            type="button"
            onClick={() => onAction("Add guest")}
            aria-label="Add guest"
          >
            <CalendarDateAsset name="source28_imgPlus" />
          </button>
        </>
      }
      guestSummary={
        <>
          <strong>6 guests</strong>
          <CalendarDateAsset name="source28_imgDivider" />
          <span>5 yes</span>
          <CalendarDateAsset name="source28_imgDivider" />
          <span>1 awaiting</span>
        </>
      }
      description={
        <>
          <p>Sienna is inviting you to a scheduled Zoom meeting.</p>
          <p>Topic: Product demo for the new dashboard and Q&amp;A session.</p>
          <a href="https://us02web.zoom.us/j/86341069512" target="_blank" rel="noreferrer">
            Join Zoom Meeting: https://us02web.zoom.us/j/86341069512
          </a>
        </>
      }
      style={{
        maskImage: `url(${calendarDateAssetUrl("source28_imgHeadingAndDetails")})`,
        maskSize: "328px 428px",
        maskPosition: "-24px 0",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
const familyIds = [
  "7991:21267",
  "7991:53152",
  "8044:126959",
  "7991:56363",
  "7991:78181",
  "7991:104484",
  "7996:12700",
  "7996:12741",
  "7997:11141",
  "7999:12176",
  "8003:31690",
  "8022:24550",
];
const noop = (): void => {};
export function CalendarFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [date, setDate] = useState("2025-01-10");
  const [view, setView] = useState<CalendarView>("week");
  return (
    <section className="preview-section">
      <h2>Calendar library</h2>
      {dateSources
        .filter((f) => familyIds.includes(f.id))
        .map((family) => (
          <section key={family.id}>
            <h3>{family.name}</h3>
            <div className="calendar-source-scroll">
              <div className="calendar-source-grid">
                {family.variants.map((source) => {
                  const mobile = source.name.includes("Mobile");
                  const breakpoint = mobile ? "mobile" : "desktop";
                  const hover = source.name.includes("Hover");
                  const color = (source.name.match(/Color=(\w+)/)?.[1].toLowerCase() ??
                    "gray") as CalendarColor;
                  const appearance = source.name.includes("Selected")
                    ? "selected"
                    : source.name.includes("Today's date")
                      ? "today"
                      : "default";
                  const click = (): void => setAction(source.id);
                  const mode: CalendarView = source.name.includes("Week view")
                    ? "week"
                    : source.name.includes("Day view")
                      ? "day"
                      : "month";
                  return (
                    <div
                      key={source.id}
                      data-calendar-source-id={source.id}
                      style={{ width: source.width }}
                    >
                      {family.id === "7991:21267" ? (
                        <CalendarViewDropdown
                          reference
                          open={source.name.includes("True")}
                          onValueChange={(next) => setAction(next)}
                        />
                      ) : family.id === "7991:53152" ? (
                        <CalendarHeader
                          title="January 2025"
                          supportingText="Jan 1, 2025 – Jan 31, 2025"
                          badge="Week 1"
                          breakpoint={breakpoint}
                          onPrevious={click}
                          onNext={click}
                          onToday={click}
                          onAdd={click}
                          onSearch={click}
                        />
                      ) : family.id === "8044:126959" ? (
                        <CalendarDateIcon month="JAN" day={10} />
                      ) : family.id === "7991:56363" ? (
                        <CalendarCellDate appearance={appearance}>1</CalendarCellDate>
                      ) : family.id === "7991:78181" ? (
                        <CalendarMonthEvent
                          color={color}
                          breakpoint={breakpoint}
                          referenceState={hover ? "hover" : "default"}
                          time="9:00 AM"
                          aria-label="Event name"
                          onClick={click}
                        >
                          Event name
                        </CalendarMonthEvent>
                      ) : family.id === "7991:104484" ? (
                        <CalendarMonthCell
                          day={1}
                          breakpoint={breakpoint}
                          referenceState={
                            source.name.includes("Disabled")
                              ? "disabled"
                              : hover
                                ? "hover"
                                : "default"
                          }
                          more={2}
                          onMore={click}
                          onAdd={hover ? click : undefined}
                        >
                          {["Monday standup", "Coffee with Alina", "Marketing site design"].map(
                            (title, index) => (
                              <CalendarMonthEvent
                                key={title}
                                color="gray"
                                breakpoint={breakpoint}
                                time={["9:00 AM", "11:30 AM", "2:30 PM"][index]}
                                aria-label={title}
                                onClick={click}
                              >
                                {title}
                              </CalendarMonthEvent>
                            )
                          )}
                        </CalendarMonthCell>
                      ) : family.id === "7996:12700" ? (
                        <CalendarDayEvent
                          color={color}
                          time="9:00 AM"
                          referenceState={hover ? "hover" : "default"}
                          onClick={click}
                        >
                          Event name
                        </CalendarDayEvent>
                      ) : family.id === "7996:12741" ? (
                        <CalendarTimeCell
                          minutes={((source.height / 96) * 60) as 30 | 60 | 90 | 120}
                          referenceState={hover ? "hover" : "default"}
                          onAdd={hover ? click : undefined}
                        >
                          {source.name.includes("Empty") ? null : (
                            <CalendarDayEvent
                              color="gray"
                              compact={source.height === 48}
                              time="9:00 AM"
                              onClick={click}
                            >
                              Monday standup
                            </CalendarDayEvent>
                          )}
                        </CalendarTimeCell>
                      ) : family.id === "7997:11141" ? (
                        <CalendarColumnHeader
                          weekday="Mon"
                          day={1}
                          appearance={appearance}
                          breakpoint={breakpoint}
                        />
                      ) : family.id === "7999:12176" ? (
                        <CalendarRowLabel>8 AM</CalendarRowLabel>
                      ) : family.id === "8003:31690" ? (
                        <CalendarTimeMarker breakpoint={breakpoint}>2:20 PM</CalendarTimeMarker>
                      ) : (
                        <Calendar
                          defaultDate="2025-01-10"
                          defaultView={mode}
                          breakpoint={breakpoint}
                          today="2025-01-10"
                          headerBadge="Week 1"
                          headerSupportingText={
                            mode !== "day" ? "Jan 1, 2025 – Jan 31, 2025" : undefined
                          }
                          highlightedDates={["2025-01-16", "2025-01-22"]}
                          eventTotalsByDate={{
                            "2024-12-30": 5,
                            "2025-01-08": 6,
                            "2025-01-10": mobile ? 5 : 3,
                            "2025-01-17": 4,
                            "2025-01-24": 6,
                          }}
                          eventSort={() => 0}
                          renderWeekday={(day) => {
                            const index = new Date(day + "T00:00:00Z").getUTCDay();
                            return mobile && mode === "month"
                              ? ["S", "Mon", "T", "W", "T", "F", "S"][index]
                              : [
                                  "Sun",
                                  "Mon",
                                  mode === "month" ? "Tues" : "Tue",
                                  "Wed",
                                  mode === "month" ? "Thu" : "Thur",
                                  "Fri",
                                  "Sat",
                                ][index];
                          }}
                          renderDay={(day) =>
                            day === "2025-01-04"
                              ? 5
                              : day === "2025-01-05"
                                ? 4
                                : Number(day.slice(-2))
                          }
                          events={
                            mode === "month"
                              ? calendarSourceEvents.map((event) =>
                                  mobile &&
                                  event.date === "2025-01-10" &&
                                  event.title.includes("Olivia")
                                    ? { ...event, displayTime: "12:00 PM" }
                                    : event
                                )
                              : calendarTimelineEvents[source.id]
                          }
                          startHour={source.id === "8017:532978" ? 11 : 8}
                          endHour={source.id === "8017:532978" ? 21 : 18}
                          currentTime={{ date: "2025-01-10", minutes: 860 }}
                          onEventClick={(clicked) => setAction(clicked.title)}
                          onAddEvent={click}
                          onSearch={click}
                          sidebar={
                            <>
                              <DatePickerCalendar
                                month="2025-01-01"
                                selection={{ start: "2025-01-10", end: null }}
                                today="2025-01-30"
                                activeDates={["2025-01-01", "2025-01-30", "2025-02-04"]}
                                onMonthChange={noop}
                                onSelect={noop}
                              />
                              <CalendarSourceDetails onAction={setAction} />
                            </>
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      <h2>Supported date boundaries</h2>
      <div data-testid="first-year-calendar">
        <Calendar defaultDate="0001-01-01" weekStartsOn={0} />
      </div>
      <div data-testid="last-year-calendar">
        <Calendar defaultDate="9999-12-31" />
      </div>
      <h2>Live calendar</h2>
      <div data-testid="live-calendar">
        <Calendar
          date={date}
          onDateChange={setDate}
          view={view}
          onViewChange={setView}
          today="2025-01-10"
          events={calendarTimelineEvents["8017:532935"]}
          onEventClick={(event) => setAction(event.id)}
          onAddEvent={(day, minutes) => setAction(`Add ${day} ${minutes ?? ""}`)}
          onSearch={() => setAction("Search")}
        />
      </div>
      <output data-testid="calendar-state">
        {date} {view}
      </output>
      <output data-testid="calendar-action">{action}</output>
    </section>
  );
}
