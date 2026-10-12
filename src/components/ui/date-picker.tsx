"use client";

import { Calendar as CalendarIcon, ChevronDown, Clock } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Calendar,
  type CalendarGranularity,
  type CalendarProps,
  getCalendarTime,
  setCalendarTime,
} from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

const PLACEHOLDERS: Record<CalendarGranularity, string> = {
  date: "Pick a date",
  time: "Pick a time",
  datetime: "Pick a date and time",
};

/**
 * A field-shaped button that opens {@link Calendar} in a popover and shows
 * what was picked. The one-line answer to "put a date on this form": the
 * trigger is a borderless, filled {@link Button} (`secondary`) — a flat block
 * that reads as a control to press rather than a field to type into, with no
 * hairline competing with the popover's own edge — the popover carries the
 * calendar's chrome,
 * and the value is a single `Date` in and out — the `"HH:mm"` plumbing that
 * `Calendar` needs for its time column stays inside here.
 *
 * `granularity` is the calendar's: `"date"` (default), `"time"` or
 * `"datetime"`. It also decides the glyph — a calendar for anything with a
 * day in it, a clock for time alone — the default placeholder, and how the
 * value reads: `Sep 20, 2026`, `9:30 AM`, or both, in the calendar's `locale`.
 *
 * The popover closes on the pick that completes the value for its
 * granularity: the day for `"date"`, the slot for `"time"`, and the slot for
 * `"datetime"` too — picking a day there leaves it open, since the time is
 * still to come. Under `"time"` the slot lands on today when there is no
 * value yet; a time needs a day to be a moment. And under `"datetime"`, a day
 * picked before any slot reads as `12:00 AM` in the trigger until the slot is
 * picked — the value really is midnight on that day, and the trigger does not
 * pretend otherwise.
 *
 * Single value only. A range picker is a different control with two
 * calendars and a different trigger, not a mode of this one.
 *
 * @param props.value - The picked moment, or `undefined` for none.
 * @param props.onValueChange - Called with the next `Date` — or `undefined`
 *   when the day is deselected.
 * @param props.granularity - `"date"` (default), `"time"` or `"datetime"`.
 * @param props.placeholder - Trigger copy when there is no value. Supply a
 *   translated string; the default depends on `granularity`.
 * @param props.formatValue - Trigger copy from a value. Defaults to the
 *   locale's medium date and/or short time.
 * @param props.locale - `react-day-picker` locale, passed to the calendar and
 *   used to format the trigger, so the two never disagree.
 * @param props.calendarProps - Anything else for the {@link Calendar} inside —
 *   `timeStart`, `timeEnd`, `timeStep`, `timeDisabled`, `disabled`, and so on.
 * @param props.align - Popover alignment against the trigger. `"start"` by
 *   default, so the calendar hangs from the field's left edge like a menu.
 * @param props.variant - Trigger variant. `"secondary"` by default; pass
 *   `"outline"` for a hairline box when it must line up with text inputs.
 * @param props.className - Extra classes merged onto the trigger. It sizes to
 *   its content by default — the placeholder, or the formatted value — so a
 *   row of pickers reads as a row of labels, not a row of equal boxes; pass a
 *   width (`w-full` in a form column) when it must fill something.
 * @param props.data-testid - Base id. Lands on the trigger; the calendar
 *   derives `${data-testid}-calendar`, and its days and slots derive from
 *   that in turn.
 *
 * @example
 * ```tsx
 * const [when, setWhen] = React.useState<Date>();
 *
 * <DatePicker
 *   granularity="datetime"
 *   value={when}
 *   onValueChange={setWhen}
 *   placeholder={t("schedule.pick")}
 *   calendarProps={{ timeStart: "08:00", timeEnd: "18:00" }}
 * />
 * ```
 */
function DatePicker({
  className,
  value,
  onValueChange,
  granularity = "date",
  placeholder = PLACEHOLDERS[granularity],
  locale,
  formatValue = (date) => {
    const day = date.toLocaleDateString(locale?.code, { dateStyle: "medium" });
    const time = date.toLocaleTimeString(locale?.code, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (granularity === "date") {
      return day;
    }
    if (granularity === "time") {
      return time;
    }
    return `${day}, ${time}`;
  },
  calendarProps,
  align = "start",
  variant = "secondary",
  "data-testid": testId,
  ...props
}: Omit<
  React.ComponentProps<typeof Button>,
  "value" | "onChange" | "children" | "asChild"
> & {
  value?: Date;
  onValueChange?: (value: Date | undefined) => void;
  granularity?: CalendarGranularity;
  placeholder?: string;
  formatValue?: (value: Date) => string;
  locale?: CalendarProps["locale"];
  calendarProps?: Omit<
    React.ComponentProps<typeof Calendar>,
    | "mode"
    | "selected"
    | "onSelect"
    | "granularity"
    | "time"
    | "defaultTime"
    | "onTimeChange"
    | "locale"
    | "data-testid"
  >;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  /** Base id. The calendar inside derives `${data-testid}-calendar`. */
  "data-testid"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon = granularity === "time" ? Clock : CalendarIcon;

  function handleSelect(day: Date | undefined) {
    onValueChange?.(setCalendarTime(day, getCalendarTime(value)));
    if (granularity === "date") {
      setOpen(false);
    }
  }

  function handleTimeChange(time: string) {
    // A time needs a day to be a moment. With nothing picked yet, today is
    // the only honest default.
    const base = value ?? new Date(new Date().setHours(0, 0, 0, 0));
    onValueChange?.(setCalendarTime(base, time));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          data-slot="date-picker-trigger"
          data-testid={testId}
          data-empty={value === undefined || undefined}
          className={cn(
            "justify-start font-normal data-empty:text-app-dim",
            className,
          )}
          {...props}
        >
          <Icon data-icon="inline-start" aria-hidden />
          <span
            data-slot="date-picker-value"
            className="min-w-0 flex-1 truncate text-left"
          >
            {value === undefined ? placeholder : formatValue(value)}
          </span>
          <ChevronDown
            data-icon="inline-end"
            aria-hidden
            className="text-app-dim"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-slot="date-picker-content"
        align={align}
        className="w-auto p-0"
      >
        <Calendar
          {...calendarProps}
          data-testid={testId ? `${testId}-calendar` : undefined}
          granularity={granularity}
          locale={locale}
          mode="single"
          selected={value}
          onSelect={handleSelect}
          time={getCalendarTime(value)}
          onTimeChange={handleTimeChange}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
