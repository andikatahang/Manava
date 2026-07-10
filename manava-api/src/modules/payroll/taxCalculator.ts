import type { PayrollSettings } from '@prisma/client'

export interface TaxCalculation {
  pph21_tax: number
  bpjs_kesehatan: number
  bpjs_tk_jkk: number
  bpjs_tk_jkm: number
  bpjs_tk_jht: number
  bpjs_tk_jp: number
}

export function calculateTax(
  grossSalary: number,
  settings: PayrollSettings
): TaxCalculation {
  // BPJS calculations (percentage of gross)
  const bpjs_kesehatan = Math.round(grossSalary * settings.bpjs_kesehatan_rate)
  const bpjs_tk_jkk = Math.round(grossSalary * settings.bpjs_tk_jkk_rate)
  const bpjs_tk_jkm = Math.round(grossSalary * settings.bpjs_tk_jkm_rate)
  const bpjs_tk_jht = Math.round(grossSalary * settings.bpjs_tk_jht_rate)
  const bpjs_tk_jp = Math.round(grossSalary * settings.bpjs_tk_jp_rate)

  // Total BPJS deductions (reduce taxable income)
  const totalBpjs = bpjs_kesehatan + bpjs_tk_jkk + bpjs_tk_jkm + bpjs_tk_jht + bpjs_tk_jp

  // Taxable income = gross - BPJS (simplified, no PTKP)
  const taxableIncome = grossSalary - totalBpjs

  // Progressive PPh21
  let pph21_tax = 0

  if (taxableIncome <= settings.pph21_bracket_1_limit) {
    pph21_tax = Math.round(taxableIncome * settings.pph21_bracket_1_rate)
  } else if (taxableIncome <= settings.pph21_bracket_2_limit) {
    const bracket1 = Math.round(settings.pph21_bracket_1_limit * settings.pph21_bracket_1_rate)
    const bracket2 = Math.round((taxableIncome - settings.pph21_bracket_1_limit) * settings.pph21_bracket_2_rate)
    pph21_tax = bracket1 + bracket2
  } else {
    const bracket1 = Math.round(settings.pph21_bracket_1_limit * settings.pph21_bracket_1_rate)
    const bracket2 = Math.round((settings.pph21_bracket_2_limit - settings.pph21_bracket_1_limit) * settings.pph21_bracket_2_rate)
    const bracket3 = Math.round((taxableIncome - settings.pph21_bracket_2_limit) * settings.pph21_bracket_3_rate)
    pph21_tax = bracket1 + bracket2 + bracket3
  }

  return {
    pph21_tax,
    bpjs_kesehatan,
    bpjs_tk_jkk,
    bpjs_tk_jkm,
    bpjs_tk_jht,
    bpjs_tk_jp,
  }
}