"use client";

import "@fullcalendar/react/skeleton.css";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import { ChevronLeft, ChevronRight, Info, List, Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFerryTripsMonths } from "@/hooks/query/useFerryTripsMonth";
import { cn } from "@/lib/cn";
import { monthDiff, monthParts, shiftMonth, toISODate, toMonth, weekAlignedRange } from "@/lib/dates";
import type { DayRow, Leg, MonthSummary } from "@/types/ferry-trip";

import DayEditorDialog from "./DayEditorDialog";
import RecordedDaysPanel from "./RecordedDaysPanel";

const LEG_LABEL = { morning: "Morning", evening: "Evening" } as const;

const LEGS: Leg[] = ["morning", "evening"];

const HALF_DAY_HINT = "Each leg taken is half a day.";

const STATUS_LABEL = { taken: "Taken", missed: "Missed", cancelled: "Cancelled" } as const;

/** Months rendered either side of today when the span first renders, and per growth step. */
const WINDOW_MONTHS = 12;

/** Grow the span once the focused month is this close to either edge. */
const EDGE_MONTHS = 2;

/** Where in the scroller, as a fraction of its height, decides the focused month. */
const FOCUS_PROBE = 0.35;

/** Height of the sticky weekday row; must match `.month-calendar__grid-header` and `.recorded-days__header`. */
const WEEKDAY_ROW_PX = 37;

/** Six weeks fill the scroller, so the row height follows its size. */
const VISIBLE_WEEKS = 6;

/** DOM id of the recorded-days side panel, for the toggle's `aria-controls`. */
const RECORDED_PANEL_ID = "recorded-days-panel";

/** Below Tailwind's `md`, where the recorded-days panel is a bottom sheet over the grid. */
const NARROW_QUERY = "(max-width: 767px)";

/** How long a day picked from the list stays highlighted. */
const FLASH_MS = 1600;

/** Where to scroll: the week of `date`, at the top or on the focus probe. */
type ScrollTarget = { date: string; behavior: ScrollBehavior; align: "top" | "probe" };

const subscribeNothing = () => () => {};

/**
 * Month totals from its recorded days, by the same rule as
 * `GET /api/ferry-trips/summary`: a day counting 1 is full, above 0 is half.
 */
function summarize(days: DayRow[]): MonthSummary {
  return {
    total_days: days.reduce((sum, d) => sum + d.day_count, 0),
    full_days: days.filter((d) => d.day_count >= 1).length,
    half_days: days.filter((d) => d.day_count > 0 && d.day_count < 1).length,
  };
}

/**
 * Renders the user's ferry days as one continuously scrolling grid of weeks,
 * modelled on Apple Calendar's month view: the "2027 June" heading follows
 * the month in view, Total / Full / Half day counts for that month sit beside
 * it (each with an info tooltip explaining the rule), previous / next scroll smoothly to the neighbouring month, and Today
 * scrolls back to the current one. A recorded day shows its count ("0.5 Day")
 * and two status dots, morning then evening. The grid is FullCalendar's
 * `dayGrid` view over a custom week-aligned range, rendered unthemed and
 * dressed through its class/content hooks; it uses no FullCalendar events.
 *
 * @remarks
 * Status: stable — Type: feature section
 *
 * State & behavior: owns `focused` (the month the heading names) and the
 * rendered span `[first, last]` of months. A scroll listener reads which
 * week sits {@link FOCUS_PROBE} of the way down the scroller and takes the
 * month of that week's Thursday as `focused`. Arrow buttons and Today set
 * `focused` straight away and smooth-scroll the 1st of the target month to
 * the top; while that scroll runs, the target (not the half-scrolled
 * position) drives the heading and further arrow presses, until
 * `scrollend` or the user's own wheel/touch takes over. When `focused` comes
 * within {@link EDGE_MONTHS} of an edge the span grows by
 * {@link WINDOW_MONTHS}; growing upwards restores the scroll offset so
 * nothing jumps. Trips are fetched for the focused month and both
 * neighbours, one cached query per month. The header counts come from the
 * focused month's rows via `summarize`, the same rule as the summary API.
 * Clicking a day (FullCalendar `dateClick`) or the "+" button opens
 * {@link DayEditorDialog} for that date or today; `editing` holds the date.
 * The list button toggles {@link RecordedDaysPanel}, docked on the right of
 * the grid from `md` up (the grid narrows, rows re-fit, the focused month
 * stays put) and a bottom sheet below it, where picking a day also closes
 * the sheet so the scrolled-to week is visible.
 * Picking a day there widens the span if needed,
 * smooth-scrolls that week onto the focus probe and flashes the cell for
 * {@link FLASH_MS}.
 *
 * Variants:
 * - narrow screens (below `md`) — the header stacks: title with `actions`
 *   on the first row, the three counts spread across the second, add/list
 *   and the month arrows on the third. Day cells drop the "0.5 Day" text and
 *   keep smaller dots; weekday names shorten to one letter (FullCalendar's
 *   own narrow mode).
 * - outside day — days not in `focused` are dimmed, as Apple does while
 *   scrolling.
 * - today — the day number sits in a filled accent circle.
 * - flash — `month-calendar__day--flash` briefly tints a day picked from
 *   the recorded-days list.
 * - leg dot — hollow when the leg is not recorded; filled green / amber /
 *   red via `month-calendar__leg--taken` / `--missed` / `--cancelled`.
 *
 * Composition: no children; `actions` renders after the next-month arrow
 * (Home puts the profile menu there). Needs `QueryProvider` above it.
 *
 * Accessibility: the "+" button is the keyboard route to the editor, since
 * day clicks are pointer-only. Heading is the page `h1`; the counts are a `<dl>` with
 * `aria-live="polite"`, and a load failure is `role="alert"`. Each count's
 * info icon is a focusable button whose `aria-label` carries the rule; the
 * compacto `Tooltip` shows it on hover or focus. Prev/next are
 * icon buttons with `aria-label`s. The count info tooltips also toggle on
 * tap/click (`openHint`), since hover never happens on touch screens. Grid semantics come from FullCalendar.
 * Unverified: FullCalendar wraps the day-top content in `aria-hidden`, so
 * the day count and leg dots reach sighted users only (dots carry a `title`
 * tooltip); screen readers hear the date alone.
 *
 * Test ids: title `month-calendar-title`, error
 * `month-calendar-error-message`, counts `month-calendar-total-days-message`
 * / `month-calendar-full-days-message` / `month-calendar-half-days-message`,
 * their info buttons `month-calendar-total-days-info-button` /
 * `month-calendar-full-days-info-button` /
 * `month-calendar-half-days-info-button`,
 * add `month-calendar-add-button`, list toggle `month-calendar-list-button`, prev `month-calendar-prev-button`, today `month-calendar-today-button`,
 * next `month-calendar-next-button`, per recorded day
 * `month-calendar-day-count-message-<YYYY-MM-DD>`,
 * `month-calendar-morning-item-<YYYY-MM-DD>` and
 * `month-calendar-evening-item-<YYYY-MM-DD>`.
 *
 * CSS classes: `month-calendar` (root block), `month-calendar__header`,
 * `month-calendar__heading`, `month-calendar__title`,
 * `month-calendar__year`, `month-calendar__month`, `month-calendar__error`,
 * `month-calendar__stats`, `month-calendar__stat`,
 * `month-calendar__stat-label`, `month-calendar__info-button`,
 * `month-calendar__stat-value`,
 * `month-calendar__controls`, `month-calendar__nav`, `month-calendar__tools`,
 * `month-calendar__arrows`,
 * `month-calendar__nav-button--active` (list toggle while open),
 * `month-calendar__main`,
 * `month-calendar__nav-button`,
 * `month-calendar__today-button`, `month-calendar__actions`,
 * `month-calendar__body`, `month-calendar__grid`,
 * `month-calendar__grid-header`, `month-calendar__weekday`,
 * `month-calendar__weekday-label`, `month-calendar__week`,
 * `month-calendar__day`, `month-calendar__day--outside`,
 * `month-calendar__day--flash`,
 * `month-calendar__day-top`, `month-calendar__day-top-inner`,
 * `month-calendar__day-number`, `month-calendar__day-number--today`,
 * `month-calendar__day-footer`, `month-calendar__day-count`,
 * `month-calendar__legs`, `month-calendar__leg` with `--taken` /
 * `--missed` / `--cancelled`.
 *
 * Edge cases:
 * - Months more than one away from `focused` show no counts or dots until
 *   scrolled near, because only three months are fetched at a time.
 * - Counts read "…" while the focused month loads and "—" if it failed.
 * - The stats row is hidden below the `md` breakpoint to keep the header on
 *   one line.
 * - The 1st of a month reads "Jun 1" so month boundaries are visible.
 * - The scroller is FullCalendar's own element, found as the first
 *   scrollable descendant of `month-calendar__body`.
 *
 * Dependencies: `@fullcalendar/react` (daygrid + interaction plugins, skeleton CSS),
 * `temporal-polyfill` (its peer), `lucide-react`, compacto `Tooltip`,
 * `useFerryTripsMonths`, {@link DayEditorDialog}, {@link RecordedDaysPanel}.
 *
 * @example
 * ```tsx
 * <MonthCalendar actions={<ProfileMenu userName="Esther" userEmail="esther@example.com" />} />
 * ```
 */
export default function MonthCalendar({ actions }: MonthCalendarProps) {
  const [current] = useState(() => toMonth());
  const [focused, setFocused] = useState(current);
  const [span, setSpan] = useState(() => ({
    first: shiftMonth(current, -WINDOW_MONTHS),
    last: shiftMonth(current, WINDOW_MONTHS),
  }));

  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [flashDate, setFlashDate] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [openHint, setOpenHint] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const focusedRef = useRef(current);
  const laidOutRatio = useRef<number | null>(null);
  const pendingTarget = useRef<ScrollTarget | null>({ date: `${current}-01`, behavior: "instant", align: "top" });
  const anchorBeforeGrow = useRef<{ date: string; top: number } | null>(null);
  const navTarget = useRef<string | null>(null);

  const range = useMemo(() => weekAlignedRange(span.first, span.last), [span]);
  const months = useMemo(() => [shiftMonth(focused, -1), focused, shiftMonth(focused, 1)], [focused]);
  const { byMonth, days, isPending, isError } = useFerryTripsMonths(months);

  const { year, name } = monthParts(focused);

  const daysByDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const focusedData = byMonth.get(focused);
  const summary = focusedData ? summarize(focusedData.days) : null;
  const stats = [
    { key: "total", label: "Total Days", hint: HALF_DAY_HINT, value: summary?.total_days },
    { key: "full", label: "Full Days", hint: "Both legs taken.", value: summary?.full_days },
    { key: "half", label: "Half Days", hint: "One leg taken.", value: summary?.half_days },
  ];

  const findScroller = useCallback(() => {
    if (scrollerRef.current?.isConnected) return scrollerRef.current;
    const candidates = bodyRef.current?.querySelectorAll<HTMLElement>("*") ?? [];
    scrollerRef.current =
      Array.from(candidates).find((el) => {
        const { overflowY } = getComputedStyle(el);
        return (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight;
      }) ?? null;
    return scrollerRef.current;
  }, []);

  /** Offset of the week row holding `date`, relative to the scroller's content. */
  const rowTop = useCallback(
    (date: string) => {
      const scroller = findScroller();
      const cell = scroller?.querySelector<HTMLElement>(`[data-date="${date}"]`);
      if (!scroller || !cell) return null;
      return cell.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    },
    [findScroller],
  );

  /**
   * Scroll the week holding `date` into place: to the top for month jumps, or
   * onto the focus probe for a picked day, so the heading lands on its month.
   */
  const scrollToDate = useCallback(
    ({ date, behavior, align }: ScrollTarget) => {
      const scroller = findScroller();
      const top = rowTop(date);
      if (!scroller || top === null) {
        pendingTarget.current = { date, behavior, align };
        return;
      }
      const offset = align === "probe" ? scroller.clientHeight * FOCUS_PROBE - 24 : 0;
      scroller.scrollTo({ top: Math.max(0, top - offset), behavior });
    },
    [findScroller, rowTop],
  );

  /**
   * Widen the rendered span so `month` sits at least {@link EDGE_MONTHS} from
   * either edge. Growing upwards records an anchor so the view does not jump.
   */
  const extendSpanTo = useCallback(
    (month: string) => {
      setSpan((w) => {
        const first = monthDiff(w.first, month) < EDGE_MONTHS ? shiftMonth(month, -WINDOW_MONTHS) : w.first;
        const last = monthDiff(month, w.last) < EDGE_MONTHS ? shiftMonth(month, WINDOW_MONTHS) : w.last;
        if (first === w.first && last === w.last) return w;
        if (first !== w.first) {
          const scroller = findScroller();
          const anchor = scroller?.querySelector<HTMLElement>(".month-calendar__week [data-date]");
          if (scroller && anchor) {
            anchorBeforeGrow.current = {
              date: anchor.dataset.date!,
              top: anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
            };
          }
        }
        return { first, last };
      });
    },
    [findScroller],
  );

  const navigate = (target: ScrollTarget) => {
    const month = target.date.slice(0, 7);
    navTarget.current = month;
    setFocused(month);
    if (monthDiff(span.first, month) < EDGE_MONTHS || monthDiff(month, span.last) < EDGE_MONTHS) {
      pendingTarget.current = target;
      extendSpanTo(month);
      return;
    }
    scrollToDate(target);
  };

  const goTo = (month: string) => navigate({ date: `${month}-01`, behavior: "smooth", align: "top" });

  const goToDate = (date: string) => {
    setPicked(date);
    if (window.matchMedia(NARROW_QUERY).matches) setListOpen(false);
    navigate({ date, behavior: "smooth", align: "probe" });
    clearTimeout(flashTimer.current);
    setFlashDate(date);
    flashTimer.current = setTimeout(() => setFlashDate(null), FLASH_MS);
  };

  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setAspectRatio(width / Math.max(1, height - WEEKDAY_ROW_PX));
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isClient || aspectRatio === null) return;
    let frame = 0;
    let tries = 0;

    /** FullCalendar commits a new range a few frames later; wait for its first row before measuring. */
    const settle = () => {
      const firstDate = bodyRef.current?.querySelector<HTMLElement>(".month-calendar__week [data-date]")?.dataset.date;
      if ((firstDate !== range.start || tries < 2) && tries++ < 60) {
        frame = requestAnimationFrame(settle);
        return;
      }

      const scroller = findScroller();
      const anchor = anchorBeforeGrow.current;
      if (scroller && anchor) {
        const cell = scroller.querySelector<HTMLElement>(`[data-date="${anchor.date}"]`);
        if (cell) {
          const nowTop = cell.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
          scroller.scrollTop += nowTop - anchor.top;
        }
        anchorBeforeGrow.current = null;
      }

      const resized = laidOutRatio.current !== aspectRatio;
      laidOutRatio.current = aspectRatio;
      const target = pendingTarget.current;
      if (target) {
        pendingTarget.current = null;
        scrollToDate(target);
      } else if (resized) {
        scrollToDate({ date: `${focusedRef.current}-01`, behavior: "instant", align: "top" });
      }
    };

    frame = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame);
  }, [range, aspectRatio, isClient, findScroller, scrollToDate]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const scroller = findScroller();
      if (!scroller || navTarget.current) return;
      const probe = scroller.getBoundingClientRect().top + scroller.clientHeight * FOCUS_PROBE;
      for (const row of scroller.querySelectorAll<HTMLElement>(".month-calendar__week")) {
        const { top, bottom } = row.getBoundingClientRect();
        if (top <= probe && bottom > probe) {
          const thursday = row.querySelectorAll<HTMLElement>("[data-date]")[3]?.dataset.date;
          if (thursday) {
            const month = thursday.slice(0, 7);
            setFocused(month);
            extendSpanTo(month);
          }
          return;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onScrollEnd = () => {
      navTarget.current = null;
      onScroll();
    };
    const onUserScroll = () => {
      navTarget.current = null;
    };

    body.addEventListener("scroll", onScroll, { capture: true, passive: true });
    body.addEventListener("scrollend", onScrollEnd, { capture: true });
    body.addEventListener("wheel", onUserScroll, { passive: true });
    body.addEventListener("touchstart", onUserScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      body.removeEventListener("scroll", onScroll, { capture: true });
      body.removeEventListener("scrollend", onScrollEnd, { capture: true });
      body.removeEventListener("wheel", onUserScroll);
      body.removeEventListener("touchstart", onUserScroll);
    };
  }, [findScroller, extendSpanTo]);

  return (
    <section className="month-calendar" aria-labelledby="month-calendar-title">
      <header className="month-calendar__header">
        <div className="month-calendar__heading">
          <h1 id="month-calendar-title" className="month-calendar__title" data-testid="month-calendar-title">
            <span className="month-calendar__year">{year}</span>{" "}
            <span className="month-calendar__month">{name}</span>
          </h1>
          {isError && (
            <p className="month-calendar__error" role="alert" data-testid="month-calendar-error-message">
              Couldn&apos;t load your trips.
            </p>
          )}
        </div>

        <dl className="month-calendar__stats" aria-live="polite">
          {stats.map((stat) => (
            <div key={stat.key} className="month-calendar__stat">
              <dt className="month-calendar__stat-label">
                {stat.label}
                <Tooltip
                  open={openHint === stat.key}
                  onOpenChange={(open) => setOpenHint(open ? stat.key : null)}
                >
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="month-calendar__info-button"
                      onClick={() => setOpenHint((hint) => (hint === stat.key ? null : stat.key))}
                      aria-label={`About ${stat.label}: ${stat.hint}`}
                      data-testid={`month-calendar-${stat.key}-days-info-button`}
                    >
                      <Info aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{stat.hint}</TooltipContent>
                </Tooltip>
              </dt>
              <dd className="month-calendar__stat-value" data-testid={`month-calendar-${stat.key}-days-message`}>
                {stat.value ?? (isPending ? "…" : "—")}
              </dd>
            </div>
          ))}
        </dl>

        <div className="month-calendar__controls">
          <div className="month-calendar__nav">
            <div className="month-calendar__tools">
              <button
                type="button"
                className="month-calendar__nav-button"
                aria-label="Record a ferry day"
                onClick={() => setEditing(toISODate(new Date()))}
                data-testid="month-calendar-add-button"
              >
                <Plus aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn("month-calendar__nav-button", listOpen && "month-calendar__nav-button--active")}
                aria-label="Recorded days"
                aria-pressed={listOpen}
                aria-controls={listOpen ? RECORDED_PANEL_ID : undefined}
                onClick={() => setListOpen((open) => !open)}
                data-testid="month-calendar-list-button"
              >
                <List aria-hidden="true" />
              </button>
            </div>
            <div className="month-calendar__arrows">
              <button
                type="button"
                className="month-calendar__nav-button"
                aria-label="Previous month"
                onClick={() => goTo(shiftMonth(navTarget.current ?? focused, -1))}
                data-testid="month-calendar-prev-button"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className="month-calendar__today-button"
                onClick={() => goTo(current)}
                data-testid="month-calendar-today-button"
              >
                Today
              </button>
              <button
                type="button"
                className="month-calendar__nav-button"
                aria-label="Next month"
                onClick={() => goTo(shiftMonth(navTarget.current ?? focused, 1))}
                data-testid="month-calendar-next-button"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
          {actions && <div className="month-calendar__actions">{actions}</div>}
        </div>
      </header>

      <div className="month-calendar__main">
        <div ref={bodyRef} className="month-calendar__body">
          {isClient && aspectRatio !== null && (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              dateClick={(info) => setEditing(info.dateStr.slice(0, 10))}
              initialView="dayGridScroll"
              views={{ dayGridScroll: { type: "dayGrid" } }}
              visibleRange={range}
              headerToolbar={false}
              firstDay={1}
              height="100%"
              aspectRatio={(aspectRatio * VISIBLE_WEEKS) / 6}
              tableHeaderSticky
              class="month-calendar__grid"
              tableHeaderClass="month-calendar__grid-header"
              dayHeaderFormat={{ weekday: "short" }}
              dayHeaderAlign="start"
              dayHeaderClass="month-calendar__weekday"
              dayHeaderInnerClass="month-calendar__weekday-label"
              dayRowClass="month-calendar__week"
              dayCellClass={(info) =>
                cn(
                  "month-calendar__day",
                  toMonth(info.date) !== focused && "month-calendar__day--outside",
                  toISODate(info.date) === flashDate && "month-calendar__day--flash",
                )
              }
              dayCellTopClass="month-calendar__day-top"
              dayCellTopInnerClass="month-calendar__day-top-inner"
              dayCellTopContent={(info) => {
                const date = toISODate(info.date);
                const record = daysByDate.get(date);
                return (
                  <>
                    <span
                      className={cn("month-calendar__day-number", info.isToday && "month-calendar__day-number--today")}
                      aria-current={info.isToday ? "date" : undefined}
                    >
                      {info.date.getDate() === 1
                        ? `${info.date.toLocaleString("en-US", { month: "short" })} 1`
                        : info.dayNumberText}
                    </span>
                    {record && (
                      <span className="month-calendar__day-footer">
                        <span className="month-calendar__day-count" data-testid={`month-calendar-day-count-message-${date}`}>
                          {record.day_count} Day
                        </span>
                        <span className="month-calendar__legs">
                          {LEGS.map((leg) => {
                            const trip = record[leg];
                            const title = trip
                              ? [LEG_LABEL[leg], trip.trip_time, STATUS_LABEL[trip.status], trip.note]
                                  .filter(Boolean)
                                  .join(" · ")
                              : `${LEG_LABEL[leg]} · Not recorded`;
                            return (
                              <span
                                key={leg}
                                title={title}
                                className={cn("month-calendar__leg", trip && `month-calendar__leg--${trip.status}`)}
                                data-testid={`month-calendar-${leg}-item-${date}`}
                              />
                            );
                          })}
                        </span>
                      </span>
                    )}
                  </>
                );
              }}
            />
          )}
        </div>
        {listOpen && (
          <RecordedDaysPanel
            id={RECORDED_PANEL_ID}
            activeDate={picked}
            onPick={goToDate}
            onClose={() => setListOpen(false)}
          />
        )}
      </div>

      <DayEditorDialog date={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

export type MonthCalendarProps = {
  /** Extra controls placed at the end of the header, right after the next-month arrow. */
  actions?: ReactNode;
};
