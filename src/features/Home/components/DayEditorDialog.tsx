"use client";

import { Moon, Sun, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type FerryLegDraft, useSaveFerryDay } from "@/hooks/mutation/useSaveFerryDay";
import { useFerryTripsMonth } from "@/hooks/query/useFerryTripsMonth";
import type { ApiError } from "@/lib/axios";
import { dateToTime, fromISODate, timeToDate, toISODate } from "@/lib/dates";
import type { DayRow, Leg } from "@/types/ferry-trip";

const LEGS: { leg: Leg; label: string; Icon: typeof Sun }[] = [
  { leg: "morning", label: "Morning", Icon: Sun },
  { leg: "evening", label: "Evening", Icon: Moon },
];

/** Minutes between the time picker's slots; fine enough for ferry timetables. */
const TIME_STEP = 5;

const STATUS_OPTIONS: { value: FerryLegDraft["status"]; label: string }[] = [
  { value: "none", label: "Not recorded" },
  { value: "taken", label: "Taken" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
];

type DayDraft = Record<Leg, FerryLegDraft>;

function draftFrom(record: DayRow | undefined): DayDraft {
  const leg = (name: Leg): FerryLegDraft => {
    const trip = record?.[name];
    return trip
      ? { leg: name, id: trip.id, status: trip.status, trip_time: trip.trip_time ?? "", note: trip.note ?? "" }
      : { leg: name, status: "none", trip_time: "", note: "" };
  };
  return { morning: leg("morning"), evening: leg("evening") };
}

/** The validation messages behind a 422, flattened; else the error's own message. */
function errorText(error: ApiError): string {
  const details = error.details as Record<string, string[]> | undefined;
  const lines = details ? Object.values(details).flat() : [];
  return lines.length > 0 ? lines.join(" ") : error.message;
}

/**
 * Renders the dialog for recording one day's ferry legs: a compacto
 * `DatePicker` for the date, then for morning and evening a status select, a
 * `DatePicker` in time mode ({@link TIME_STEP}-minute slots) and a note, plus a live
 * "0.5 Day" preview. Opened by {@link MonthCalendar} when a day is clicked or
 * its add button is pressed. Not for bulk entry — one date per save.
 *
 * @remarks
 * Status: stable — Type: feature dialog
 *
 * State & behavior: open while `date` is non-null. The form keeps one draft
 * per date the user has touched, so switching the date field and back keeps
 * unsaved edits; an untouched date shows what is recorded, read from
 * `useFerryTripsMonth` for that date's month. Save is disabled until that
 * month has loaded, so a leg set to "Not recorded" always knows the row it
 * deletes. Saving calls `useSaveFerryDay`: recorded legs are created or
 * replaced, legs switched to "Not recorded" are deleted, then the month is
 * refetched and the dialog closes. A failure keeps the dialog open with the
 * server's validation messages.
 *
 * Variants: none; a leg's time and note inputs are disabled while its status
 * is "Not recorded". A set time shows a small clear button beside it, since
 * the picker itself has no way to unset a slot.
 *
 * Composition: compacto `Dialog`, `DatePicker`, `Select`, `Input` and
 * `Button`. Needs
 * `QueryProvider` above it.
 *
 * Accessibility: Radix dialog — focus is trapped, Esc and the header X
 * close it, focus returns to the opener. Each leg is a `<fieldset>` with a
 * `<legend>`; every control has a `<label htmlFor>`, and the picker
 * triggers are `aria-labelledby` label + themselves so the chosen value is
 * read with the field name. The error is
 * `role="alert"`.
 *
 * Test ids: header `day-editor-dialog-header` (its X derives
 * `day-editor-dialog-header-close-button`), date `day-editor-dialog-date-input`,
 * per leg `day-editor-dialog-<morning|evening>-status-trigger`,
 * `day-editor-dialog-<morning|evening>-time-input` (the picker trigger; its
 * panel derives `-calendar`), `day-editor-dialog-<morning|evening>-time-clear-button`,
 * `day-editor-dialog-<morning|evening>-note-input`, preview
 * `day-editor-dialog-count-message`, error `day-editor-dialog-error-message`,
 * cancel `day-editor-dialog-cancel-button`, save
 * `day-editor-dialog-save-button`.
 *
 * CSS classes: `day-editor` (form block), `day-editor__field`,
 * `day-editor__label`, `day-editor__input`, `day-editor__picker`, `day-editor__time`,
 * `day-editor__time-picker`, `day-editor__leg`, `day-editor__legend`,
 * `day-editor__legend-icon`, `day-editor__row`, `day-editor__count`,
 * `day-editor__error`.
 *
 * Edge cases:
 * - Both legs "Not recorded" on a date with no rows → Save just closes.
 * - Deselecting the day in the date picker disables Save.
 * - A stored time off the 5-minute grid still shows in the trigger, but no
 *   slot is highlighted until another is picked.
 *
 * Dependencies: `useSaveFerryDay`, `useFerryTripsMonth`, `lucide-react`.
 *
 * @example
 * ```tsx
 * <DayEditorDialog date={editing} onClose={() => setEditing(null)} />
 * ```
 *
 * @see {@link MonthCalendar}
 */
export default function DayEditorDialog({ date, onClose }: DayEditorDialogProps) {
  return (
    <Dialog open={date !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{date && <DayEditorForm key={date} initialDate={date} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

export type DayEditorDialogProps = {
  /** `YYYY-MM-DD` to edit; `null` keeps the dialog closed. */
  date: string | null;
  /** Fires when the dialog should close: X, Esc, overlay click, Cancel, or a successful save. */
  onClose: () => void;
};

/**
 * The dialog's contents, remounted per opening so drafts never leak between
 * two openings. Internal to {@link DayEditorDialog}.
 */
function DayEditorForm({ initialDate, onDone }: { initialDate: string; onDone: () => void }) {
  const ids = useId();
  const [date, setDate] = useState(initialDate);
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const month = useFerryTripsMonth(date.slice(0, 7) || initialDate.slice(0, 7));
  const save = useSaveFerryDay();

  const loaded = Boolean(date) && month.isSuccess && !month.isPlaceholderData;
  const record = month.data?.days.find((d) => d.date === date);
  const draft = drafts[date] ?? draftFrom(loaded ? record : undefined);
  const dayCount = LEGS.filter(({ leg }) => draft[leg].status === "taken").length * 0.5;

  function update(leg: Leg, patch: Partial<FerryLegDraft>) {
    setDrafts((all) => ({ ...all, [date]: { ...draft, [leg]: { ...draft[leg], ...patch } } }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const legs = LEGS.map(({ leg }) => draft[leg]);
    if (legs.every((l) => l.status === "none" && !l.id)) {
      onDone();
      return;
    }
    save.mutate({ date, legs }, { onSuccess: onDone });
  }

  return (
    <>
      <DialogHeader data-testid="day-editor-dialog-header">
        <DialogTitle>Record ferry day</DialogTitle>
        <DialogDescription>Each leg taken is half a day.</DialogDescription>
      </DialogHeader>

      <form id={`${ids}-form`} className="day-editor" onSubmit={handleSubmit}>
        <DialogBody>
          <div className="day-editor__field">
            <label id={`${ids}-date-label`} htmlFor={`${ids}-date`} className="day-editor__label">
              Date
            </label>
            <DatePicker
              id={`${ids}-date`}
              aria-labelledby={`${ids}-date-label ${ids}-date`}
              variant="outline"
              size="sm"
              className="day-editor__picker"
              value={date ? fromISODate(date) : undefined}
              onValueChange={(picked) => setDate(picked ? toISODate(picked) : "")}
              placeholder="Pick a date"
              calendarProps={{ weekStartsOn: 1 }}
              disabled={save.isPending}
              data-testid="day-editor-dialog-date-input"
            />
          </div>

          {LEGS.map(({ leg, label, Icon }) => {
            const value = draft[leg];
            const off = value.status === "none" || save.isPending;
            return (
              <fieldset key={leg} className="day-editor__leg" disabled={!loaded || save.isPending}>
                <legend className="day-editor__legend">
                  <Icon className="day-editor__legend-icon" aria-hidden="true" />
                  {label}
                </legend>
                <div className="day-editor__row">
                  <div className="day-editor__field">
                    <label htmlFor={`${ids}-${leg}-status`} className="day-editor__label">
                      Status
                    </label>
                    <Select
                      value={value.status}
                      onValueChange={(status) => update(leg, { status: status as FerryLegDraft["status"] })}
                    >
                      <SelectTrigger
                        id={`${ids}-${leg}-status`}
                        size="sm"
                        data-testid={`day-editor-dialog-${leg}-status-trigger`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="day-editor__field">
                    <label id={`${ids}-${leg}-time-label`} htmlFor={`${ids}-${leg}-time`} className="day-editor__label">
                      Time
                    </label>
                    <div className="day-editor__time">
                      <DatePicker
                        id={`${ids}-${leg}-time`}
                        aria-labelledby={`${ids}-${leg}-time-label ${ids}-${leg}-time`}
                        granularity="time"
                        variant="outline"
                        size="sm"
                        className="day-editor__time-picker"
                        value={value.trip_time ? timeToDate(value.trip_time) : undefined}
                        onValueChange={(picked) => update(leg, { trip_time: picked ? dateToTime(picked) : "" })}
                        placeholder="No time"
                        calendarProps={{ timeStep: TIME_STEP, timeLabel: `${label} time` }}
                        disabled={off}
                        data-testid={`day-editor-dialog-${leg}-time-input`}
                      />
                      {value.trip_time && !off && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Clear ${label.toLowerCase()} time`}
                          onClick={() => update(leg, { trip_time: "" })}
                          data-testid={`day-editor-dialog-${leg}-time-clear-button`}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="day-editor__field">
                  <label htmlFor={`${ids}-${leg}-note`} className="day-editor__label">
                    Note
                  </label>
                  <Input
                    id={`${ids}-${leg}-note`}
                    className="day-editor__input"
                    value={value.note}
                    maxLength={255}
                    placeholder="Optional"
                    onChange={(e) => update(leg, { note: e.target.value })}
                    disabled={off}
                    data-testid={`day-editor-dialog-${leg}-note-input`}
                  />
                </div>
              </fieldset>
            );
          })}

          <p className="day-editor__count" data-testid="day-editor-dialog-count-message">
            {loaded ? `${dayCount} Day` : month.isError ? "Couldn't load this month." : "Loading…"}
          </p>

          {save.error && (
            <p className="day-editor__error" role="alert" data-testid="day-editor-dialog-error-message">
              {errorText(save.error as ApiError)}
            </p>
          )}
        </DialogBody>
      </form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={save.isPending} data-testid="day-editor-dialog-cancel-button">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          form={`${ids}-form`}
          disabled={!loaded || save.isPending}
          data-testid="day-editor-dialog-save-button"
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
