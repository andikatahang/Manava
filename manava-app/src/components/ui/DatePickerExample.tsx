import { useState } from 'react'
import { today, getLocalTimeZone } from '@internationalized/date'
import type { DateValue, RangeValue } from 'react-aria-components'
import { DatePicker } from './DatePicker'
import { DateRangePicker } from './DateRangePicker'

/**
 * DatePickerExample - Usage demonstration
 *
 * This component showcases how to use DatePicker and DateRangePicker
 * in the Manava application. It demonstrates:
 *
 * 1. Single date selection with DatePicker
 * 2. Date range selection with DateRangePicker
 * 3. Controlled components with state management
 * 4. Validation and error handling
 * 5. Integration with @internationalized/date
 *
 * Usage patterns:
 *
 * ```tsx
 * // Basic single date picker
 * <DatePicker
 *   label="Select Date"
 *   value={date}
 *   onChange={setDate}
 * />
 *
 * // Date range picker
 * <DateRangePicker
 *   label="Select Date Range"
 *   value={dateRange}
 *   onChange={setDateRange}
 * />
 *
 * // With validation
 * <DatePicker
 *   label="Project Start Date"
 *   value={startDate}
 *   onChange={setStartDate}
 *   minValue={today(getLocalTimeZone())}
 *   errorMessage={error}
 * />
 * ```
 */
export function DatePickerExample() {
  // Single date picker state
  const [singleDate, setSingleDate] = useState<DateValue | null>(
    today(getLocalTimeZone())
  )

  // Date range picker state
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()).add({ days: 7 }),
  })

  // Date picker with validation
  const [validatedDate, setValidatedDate] = useState<DateValue | null>(null)
  const minDate = today(getLocalTimeZone())
  const dateError =
    validatedDate && validatedDate.compare(minDate) < 0
      ? 'Date must be today or later'
      : undefined

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <header>
        <h1 className="mb-2 text-2xl font-bold text-[#021526]">
          DatePicker Components - Usage Examples
        </h1>
        <p className="text-[#596074]">
          Demonstration of DatePicker and DateRangePicker components from the
          Manava design system.
        </p>
      </header>

      {/* Single Date Picker */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-[#021526]">
            Single Date Picker
          </h2>
          <p className="text-sm text-[#596074]">
            Select a single date with keyboard navigation and accessible
            calendar UI.
          </p>
        </div>

        <div className="max-w-md">
          <DatePicker
            label="Select Date"
            description="Choose any date from the calendar"
            value={singleDate}
            onChange={setSingleDate}
          />
        </div>

        <div className="rounded-lg border border-black/[0.05] bg-[#fbfbfb] p-4">
          <p className="text-sm text-[#596074]">
            <span className="font-medium text-[#021526]">Selected date:</span>{' '}
            {singleDate ? singleDate.toString() : 'No date selected'}
          </p>
        </div>
      </section>

      {/* Date Range Picker */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-[#021526]">
            Date Range Picker
          </h2>
          <p className="text-sm text-[#596074]">
            Select a date range (start and end date) with visual range
            highlighting.
          </p>
        </div>

        <div className="max-w-md">
          <DateRangePicker
            label="Select Date Range"
            description="Choose start and end dates"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        <div className="rounded-lg border border-black/[0.05] bg-[#fbfbfb] p-4">
          <p className="text-sm text-[#596074]">
            <span className="font-medium text-[#021526]">Start date:</span>{' '}
            {dateRange?.start.toString() ?? 'No date selected'}
          </p>
          <p className="text-sm text-[#596074]">
            <span className="font-medium text-[#021526]">End date:</span>{' '}
            {dateRange?.end.toString() ?? 'No date selected'}
          </p>
          {dateRange && (
            <p className="mt-2 text-sm text-[#596074]">
              <span className="font-medium text-[#021526]">Duration:</span>{' '}
              {dateRange.end.toDate(getLocalTimeZone()).getTime() -
                dateRange.start.toDate(getLocalTimeZone()).getTime() >
              0
                ? Math.ceil(
                    (dateRange.end.toDate(getLocalTimeZone()).getTime() -
                      dateRange.start.toDate(getLocalTimeZone()).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + ' days'
                : 'Same day'}
            </p>
          )}
        </div>
      </section>

      {/* Date Picker with Validation */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-[#021526]">
            Date Picker with Validation
          </h2>
          <p className="text-sm text-[#596074]">
            Date picker with minimum date validation (must be today or later).
          </p>
        </div>

        <div className="max-w-md">
          <DatePicker
            label="Future Date Only"
            description="Must select today or a future date"
            value={validatedDate}
            onChange={setValidatedDate}
            minValue={minDate}
            errorMessage={dateError}
          />
        </div>

        {validatedDate && !dateError && (
          <div className="rounded-lg border border-black/[0.05] bg-[#fbfbfb] p-4">
            <p className="text-sm text-[#596074]">
              <span className="font-medium text-[#021526]">Valid date:</span>{' '}
              {validatedDate.toString()}
            </p>
          </div>
        )}
      </section>

      {/* Integration Examples */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-[#021526]">
            Integration Use Cases
          </h2>
          <p className="text-sm text-[#596074]">
            Common scenarios where these components would be used in Manava:
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(2,21,38,0.04)]">
            <h3 className="mb-2 text-sm font-semibold text-[#021526]">
              Reports Filtering
            </h3>
            <p className="text-xs text-[#596074]">
              Use DateRangePicker to filter reports by date range (attendance
              reports, payroll reports, KPI trends).
            </p>
          </div>

          <div className="rounded-lg border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(2,21,38,0.04)]">
            <h3 className="mb-2 text-sm font-semibold text-[#021526]">
              Leave Request
            </h3>
            <p className="text-xs text-[#596074]">
              Use DateRangePicker for selecting leave period start and end
              dates with validation.
            </p>
          </div>

          <div className="rounded-lg border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(2,21,38,0.04)]">
            <h3 className="mb-2 text-sm font-semibold text-[#021526]">
              Attendance Session
            </h3>
            <p className="text-xs text-[#596074]">
              Use DatePicker for HR to select session date when opening
              attendance (Buka Presensi).
            </p>
          </div>

          <div className="rounded-lg border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(2,21,38,0.04)]">
            <h3 className="mb-2 text-sm font-semibold text-[#021526]">
              Payroll Period
            </h3>
            <p className="text-xs text-[#596074]">
              Use DateRangePicker to filter payslips by pay period or generate
              payroll for specific date range.
            </p>
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-[#021526]">
            API Reference
          </h2>
        </div>

        <div className="overflow-x-auto rounded-lg border border-black/[0.05]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fbfbfb]">
              <tr>
                <th className="border-b border-black/[0.05] px-4 py-3 font-semibold text-[#021526]">
                  Prop
                </th>
                <th className="border-b border-black/[0.05] px-4 py-3 font-semibold text-[#021526]">
                  Type
                </th>
                <th className="border-b border-black/[0.05] px-4 py-3 font-semibold text-[#021526]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  label
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  string
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 text-xs text-[#596074]">
                  Label text displayed above the input
                </td>
              </tr>
              <tr>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  description
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  string
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 text-xs text-[#596074]">
                  Helper text displayed below the input
                </td>
              </tr>
              <tr>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  errorMessage
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  string
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 text-xs text-[#596074]">
                  Error message (replaces description when shown)
                </td>
              </tr>
              <tr>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  value
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 font-mono text-xs text-[#596074]">
                  DateValue
                </td>
                <td className="border-b border-black/[0.05] px-4 py-3 text-xs text-[#596074]">
                  Controlled value (from @internationalized/date)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs text-[#596074]">
                  minValue / maxValue
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#596074]">
                  DateValue
                </td>
                <td className="px-4 py-3 text-xs text-[#596074]">
                  Min/max date constraints for validation
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
