# data-testid registry

One line per id, grouped by component. Append new ids here whenever a component gains one.

## Home (`src/features/Home/Home.tsx`)

- `home-root` — Home / root container

## MonthCalendar (`src/features/Home/components/MonthCalendar.tsx`)

- `month-calendar-title` — MonthCalendar / year + month heading
- `month-calendar-error-message` — MonthCalendar / load failure message
- `month-calendar-total-days-message` — MonthCalendar / Total Days value
- `month-calendar-full-days-message` — MonthCalendar / Full Days value
- `month-calendar-half-days-message` — MonthCalendar / Half Days value
- `month-calendar-total-days-info-button` — MonthCalendar / Total Days info tooltip trigger
- `month-calendar-full-days-info-button` — MonthCalendar / Full Days info tooltip trigger
- `month-calendar-half-days-info-button` — MonthCalendar / Half Days info tooltip trigger
- `month-calendar-add-button` — MonthCalendar / record-a-day (+) button
- `month-calendar-list-button` — MonthCalendar / recorded-days panel toggle
- `month-calendar-prev-button` — MonthCalendar / previous month button
- `month-calendar-today-button` — MonthCalendar / today button
- `month-calendar-next-button` — MonthCalendar / next month button
- `month-calendar-day-count-message-<YYYY-MM-DD>` — MonthCalendar / day count label (per recorded day)
- `month-calendar-morning-item-<YYYY-MM-DD>` — MonthCalendar / morning leg dot (per recorded day)
- `month-calendar-evening-item-<YYYY-MM-DD>` — MonthCalendar / evening leg dot (per recorded day)

## RecordedDaysPanel (`src/features/Home/components/RecordedDaysPanel.tsx`)

- `recorded-days-panel-root` — RecordedDaysPanel / side panel
- `recorded-days-panel-close-button` — RecordedDaysPanel / close button
- `recorded-days-panel-status-message` — RecordedDaysPanel / loading, empty or error line
- `recorded-days-panel-item-<YYYY-MM-DD>` — RecordedDaysPanel / day row (per recorded day)

## ThemeDialog (`src/components/customs/ThemeDialog.tsx`)

- `theme-dialog-header` — ThemeDialog / title bar (X derives `-close-button`)
- `theme-dialog-grid` — ThemeDialog / palette grid (cards derive `-<palette key>`)

## DayEditorDialog (`src/features/Home/components/DayEditorDialog.tsx`)

- `day-editor-dialog-header` — DayEditorDialog / title bar (X derives `-close-button`)
- `day-editor-dialog-date-input` — DayEditorDialog / date picker trigger (panel derives `-calendar`)
- `day-editor-dialog-morning-status-trigger` — DayEditorDialog / morning status select
- `day-editor-dialog-morning-time-input` — DayEditorDialog / morning time picker trigger (panel derives `-calendar`)
- `day-editor-dialog-morning-time-clear-button` — DayEditorDialog / clear morning time
- `day-editor-dialog-morning-note-input` — DayEditorDialog / morning note
- `day-editor-dialog-evening-status-trigger` — DayEditorDialog / evening status select
- `day-editor-dialog-evening-time-input` — DayEditorDialog / evening time picker trigger (panel derives `-calendar`)
- `day-editor-dialog-evening-time-clear-button` — DayEditorDialog / clear evening time
- `day-editor-dialog-evening-note-input` — DayEditorDialog / evening note
- `day-editor-dialog-count-message` — DayEditorDialog / live day count
- `day-editor-dialog-error-message` — DayEditorDialog / save error
- `day-editor-dialog-cancel-button` — DayEditorDialog / cancel button
- `day-editor-dialog-save-button` — DayEditorDialog / save button

## Login (`src/features/Login/Login.tsx`)

- `login-form` — Login / form
- `login-email-input` — Login / email input
- `login-email-error-message` — Login / email validation message
- `login-password-input` — Login / password input
- `login-password-error-message` — Login / password validation message
- `login-error-message` — Login / auth error message
- `login-submit-button` — Login / submit button

## ProfileMenu (`src/components/customs/ProfileMenu.tsx`)

- `profile-menu-trigger` — ProfileMenu / profile icon button
- `profile-menu-content` — ProfileMenu / menu surface
- `profile-menu-name-message` — ProfileMenu / user name
- `profile-menu-email-message` — ProfileMenu / user email
- `profile-menu-theme-button` — ProfileMenu / theme item
- `profile-menu-logout-button` — ProfileMenu / log out item
