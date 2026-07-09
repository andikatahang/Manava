import { useRef } from 'react'
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
} from 'react-aria-components'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface DatePickerProps<T extends DateValue> extends AriaDatePickerProps<T> {
  label?: string
  description?: string
  errorMessage?: string
}

/**
 * DatePicker component - Manava design system
 *
 * Single date selection with accessible calendar UI.
 * Uses react-aria-components for ARIA compliance and keyboard navigation.
 *
 * Design tokens (from CARD-STANDARD.md):
 * - Surface: #fbfbfb (near-white)
 * - Border: black/5 → hover black/10
 * - Radius: 8px
 * - Font: Inter, 14px body
 * - Shadow: soft, low elevation
 */
export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  ...props
}: DatePickerProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <AriaDatePicker {...props} className="group flex flex-col gap-2">
      {label && (
        <Label className="text-sm font-medium text-[#021526]">
          {label}
        </Label>
      )}

      <Group className="relative inline-flex h-10 w-full items-center overflow-hidden rounded-lg border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(2,21,38,0.04)] transition-all hover:border-black/[0.1] focus-within:border-[#021526] focus-within:ring-2 focus-within:ring-[#021526]/10">
        <DateInput className="flex flex-1 px-3 py-2">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 py-1 text-sm tabular-nums text-[#021526] outline-none focus:bg-[#021526] focus:text-white data-[placeholder]:text-[#596074]"
            />
          )}
        </DateInput>

        <Button
          ref={triggerRef}
          className="flex h-full items-center justify-center border-l border-black/[0.05] px-3 text-[#596074] transition-colors hover:bg-[#fbfbfb] hover:text-[#021526] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#021526]/10"
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </Group>

      {description && !errorMessage && (
        <p className="text-xs text-[#596074]">{description}</p>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}

      <Popover
        placement="bottom start"
        className="rounded-lg border border-black/[0.05] bg-white p-4 shadow-[0_10px_30px_0_rgba(2,21,38,0.12)] data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in data-[exiting]:fade-out data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95"
      >
        <Dialog className="outline-none">
          <Calendar className="w-fit">
            <header className="mb-4 flex items-center justify-between gap-2">
              <Button
                slot="previous"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#596074] transition-colors hover:bg-[#fbfbfb] hover:text-[#021526] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#021526]/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Heading className="text-sm font-semibold text-[#021526]" />

              <Button
                slot="next"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#596074] transition-colors hover:bg-[#fbfbfb] hover:text-[#021526] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#021526]/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </header>

            <CalendarGrid className="border-collapse border-spacing-1">
              {(date) => (
                <CalendarCell
                  date={date}
                  className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm text-[#021526] outline-none transition-colors hover:bg-[#fbfbfb] focus-visible:ring-2 focus-visible:ring-[#021526]/10 data-[outside-month]:text-[#596074]/40 data-[selected]:bg-[#021526] data-[selected]:text-white data-[selected]:hover:bg-[#021526]/90 data-[disabled]:cursor-not-allowed data-[disabled]:text-[#596074]/30 data-[disabled]:hover:bg-transparent"
                />
              )}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}
