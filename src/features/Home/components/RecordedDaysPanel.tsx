"use client";

import { X } from "lucide-react";

import { useFerryRecordedDays } from "@/hooks/query/useFerryRecordedDays";
import { cn } from "@/lib/cn";
import { fromISODate, monthParts } from "@/lib/dates";
import type { DayRow, Leg } from "@/types/ferry-trip";

const LEGS: Leg[] = ["morning", "evening"];

/** Recorded days bucketed by `YYYY-MM`, keeping the newest-first order. */
function byMonth(days: DayRow[]) {
  const groups = new Map<string, DayRow[]>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), day]);
  }
  return [...groups.entries()];
}

/**
 * Renders the side panel docked on the right of {@link MonthCalendar} that
 * lists every recorded day, newest first and grouped by month, each row
 * showing the date, its day count and the morning/evening status dots.
 * Picking a row hands the date to `onPick`, which scrolls the grid there; the
 * panel stays open so several days can be visited in turn. For editing a day
 * use {@link DayEditorDialog} instead.
 *
 * @remarks
 * Status: stable — Type: feature panel
 *
 * State & behavior: stateless; mounted only while open, so the list is
 * fetched by `useFerryRecordedDays` on first open, then cached and refetched
 * whenever a save invalidates the `ferry-trips` queries. Shows "Loading…",
 * an error line, or an empty message in place of rows. The row for
 * `activeDate` is marked as current.
 *
 * Variants: active row — `recorded-days__item--active` on the last picked day.
 *
 * Composition: plain `<aside>`; the toggle button lives in
 * {@link MonthCalendar}'s header and points at `id` via `aria-controls`.
 *
 * Accessibility: an `<aside>` labelled by its heading. The close button is
 * named "Close recorded days". Rows are buttons whose `aria-label` carries
 * date, count and both statuses (the dots are `aria-hidden`); the active row
 * has `aria-current="date"`.
 *
 * Test ids: root `recorded-days-panel-root`, close
 * `recorded-days-panel-close-button`, row
 * `recorded-days-panel-item-<YYYY-MM-DD>`, empty/loading/error line
 * `recorded-days-panel-status-message`.
 *
 * CSS classes: `recorded-days` (root block), `recorded-days__header`,
 * `recorded-days__title`, `recorded-days__close`, `recorded-days__body`,
 * `recorded-days__status`, `recorded-days__group`, `recorded-days__month`,
 * `recorded-days__list`, `recorded-days__item`,
 * `recorded-days__item--active`, `recorded-days__date`,
 * `recorded-days__count`, `recorded-days__dots`, `recorded-days__dot` with
 * `--taken` / `--missed` / `--cancelled`.
 *
 * Edge cases:
 * - The API caps the list at 400 dates; older ones are not shown.
 *
 * Dependencies: `useFerryRecordedDays`, `lucide-react`.
 *
 * @example
 * ```tsx
 * {listOpen && (
 *   <RecordedDaysPanel id="recorded-days" activeDate={picked} onPick={goToDate} onClose={() => setListOpen(false)} />
 * )}
 * ```
 *
 * @see {@link MonthCalendar}
 */
export default function RecordedDaysPanel({ id, activeDate, onPick, onClose }: RecordedDaysPanelProps) {
  const { data, isPending, isError } = useFerryRecordedDays(true);

  const days = data?.days ?? [];
  const status = isError
    ? "Couldn't load your days."
    : isPending
      ? "Loading…"
      : days.length === 0
        ? "No days recorded yet."
        : null;

  return (
    <aside id={id} className="recorded-days" aria-labelledby={`${id}-title`} data-testid="recorded-days-panel-root">
      <header className="recorded-days__header">
        <h2 id={`${id}-title`} className="recorded-days__title">
          Recorded days
        </h2>
        <button
          type="button"
          className="recorded-days__close"
          aria-label="Close recorded days"
          onClick={onClose}
          data-testid="recorded-days-panel-close-button"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="recorded-days__body">
        {status ? (
          <p className="recorded-days__status" data-testid="recorded-days-panel-status-message">
            {status}
          </p>
        ) : (
          byMonth(days).map(([month, rows]) => {
            const { year, name } = monthParts(month);
            return (
              <section key={month} className="recorded-days__group" aria-label={`${name} ${year}`}>
                <h3 className="recorded-days__month">
                  {name} {year}
                </h3>
                <ul className="recorded-days__list">
                  {rows.map((day) => {
                    const label = fromISODate(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const statuses = LEGS.map((leg) => `${leg} ${day[leg]?.status ?? "not recorded"}`).join(", ");
                    const active = day.date === activeDate;
                    return (
                      <li key={day.date}>
                        <button
                          type="button"
                          className={cn("recorded-days__item", active && "recorded-days__item--active")}
                          aria-label={`${label}, ${day.day_count} day, ${statuses}`}
                          aria-current={active ? "date" : undefined}
                          onClick={() => onPick(day.date)}
                          data-testid={`recorded-days-panel-item-${day.date}`}
                        >
                          <span className="recorded-days__date">{label}</span>
                          <span className="recorded-days__count">{day.day_count} Day</span>
                          <span className="recorded-days__dots" aria-hidden="true">
                            {LEGS.map((leg) => {
                              const trip = day[leg];
                              return (
                                <span
                                  key={leg}
                                  className={cn("recorded-days__dot", trip && `recorded-days__dot--${trip.status}`)}
                                />
                              );
                            })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}

export type RecordedDaysPanelProps = {
  /** DOM id of the panel; the toggle's `aria-controls` points here. */
  id: string;
  /** The day last picked from this list, marked as current. */
  activeDate: string | null;
  /**
   * Fires when a row is picked. The panel stays open.
   * @param date - The picked day, `YYYY-MM-DD`.
   */
  onPick: (date: string) => void;
  /** Fires when the panel's close button is pressed. */
  onClose: () => void;
};
