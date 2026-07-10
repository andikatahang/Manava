# Payroll Enhancement Implementation Plan

**Goal:** Make payroll production-ready with tax calculation, BPJS deductions, and bank payment tracking.

**Requirements:**
- Simplified PPh21 tax (no PTKP complexity)
- Presensi penalty: -Rp100,000 per absent day
- BPJS contributions: configurable rates (not manual per slip)
- Bank payment: simulated status tracking (not real API)

---

## 1. DATABASE SCHEMA CHANGES

### 1.1 Add Bank Account Info to Editor

```prisma
model Editor {
  // ... existing fields ...
  bank_name         String?
  bank_account_no   String?
  bank_account_name String?
  npwp              String?  // Tax ID for PPh21
}
```

### 1.2 Expand Payslip Model

```prisma
model Payslip {
  // ... existing fields ...
  
  // Tax & statutory deductions
  pph21_tax         Int    @default(0)
  bpjs_kesehatan    Int    @default(0)  // health insurance
  bpjs_tk_jkk       Int    @default(0)  // work accident insurance
  bpjs_tk_jkm       Int    @default(0)  // death insurance
  bpjs_tk_jht       Int    @default(0)  // old age savings
  bpjs_tk_jp        Int    @default(0)  // pension
  
  // New: presensi penalty
  presensi_penalty  Int    @default(0)  // -100k per absent day
  
  // Recalculated totals
  gross_salary      Int    @default(0)  // base + overtime + bonus + reimbursement
  total_deductions  Int    @default(0)  // attendance + presensi_penalty + tax + bpjs
  
  // Bank payment tracking
  payment_status    PaymentStatus  @default(pending)
  payment_batch_id  String?
  paid_at           DateTime?
  payment_reference String?
}

enum PaymentStatus {
  pending
  processing
  completed
  failed
}
```

### 1.3 New Table: PayrollSettings (Configurable Rates)

```prisma
model PayrollSettings {
  id                String   @id @default("default")
  
  // BPJS rates (percentage of base salary)
  bpjs_kesehatan_rate      Float  @default(0.01)  // 1% employee
  bpjs_tk_jkk_rate         Float  @default(0.0024) // 0.24% employee
  bpjs_tk_jkm_rate         Float  @default(0.003)  // 0.3% employee
  bpjs_tk_jht_rate         Float  @default(0.02)   // 2% employee
  bpjs_tk_jp_rate          Float  @default(0.01)   // 1% employee
  
  // PPh21 tax brackets (monthly)
  pph21_bracket_1_limit    Int    @default(5000000)   // up to 5M
  pph21_bracket_1_rate     Float  @default(0.05)      // 5%
  pph21_bracket_2_limit    Int    @default(50000000)  // 5M - 50M
  pph21_bracket_2_rate     Float  @default(0.15)      // 15%
  pph21_bracket_3_rate     Float  @default(0.25)      // 25% above 50M
  
  // Presensi penalty
  presensi_penalty_per_day Int    @default(100000)   // Rp100k per absent day
  
  updated_at               DateTime @updatedAt
}
```

### 1.4 New Table: PaymentBatch (Bank Transfer Batches)

```prisma
model PaymentBatch {
  batch_id          String        @id @default(cuid())
  period            String        // "YYYY-MM"
  total_amount      Int
  payslip_count     Int
  status            BatchStatus   @default(pending)
  created_by        String
  created_at        DateTime      @default(now())
  processed_at      DateTime?
  
  payslips          Payslip[]
  
  @@index([period])
  @@index([status])
}

enum BatchStatus {
  pending
  processing
  completed
  failed
}
```

---

## 2. BACKEND IMPLEMENTATION

### 2.1 New Service: Tax Calculator

**File:** `manava-api/src/modules/payroll/taxCalculator.ts`

```typescript
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
  
  // Total BPJS deductions
  const totalBpjs = bpjs_kesehatan + bpjs_tk_jkk + bpjs_tk_jkm + bpjs_tk_jht + bpjs_tk_jp
  
  // Taxable income = gross - BPJS
  const taxableIncome = grossSalary - totalBpjs
  
  // Progressive PPh21 (simplified, no PTKP)
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
```

### 2.2 Update Payroll Service

**File:** `manava-api/src/modules/payroll/service.ts`

Add imports and update `generatePayslipForEditor`:

```typescript
import { calculateTax } from './taxCalculator.js'

export async function generatePayslipForEditor(editor: Editor, period: string) {
  const { start, end } = parsePeriod(period)
  const existing = await prisma.payslip.findUnique({
    where: { editor_id_period_start: { editor_id: editor.editor_id, period_start: start } },
  })
  if (existing && existing.status !== 'draft') {
    return { payslip: existing, regenerated: false }
  }

  // Get attendance inputs
  const inputs = await computePayrollInputs(editor, start, end)
  
  // Get payroll settings
  const settings = await prisma.payrollSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })
  
  // Calculate presensi penalty
  const presensi_penalty = inputs.absentDays * settings.presensi_penalty_per_day
  
  // Calculate gross (before deductions)
  const project_bonus = existing?.project_bonus ?? 0
  const reimbursement_total = existing?.reimbursement_total ?? 0
  const gross_salary = editor.base_salary + inputs.overtimePay + project_bonus + reimbursement_total
  
  // Calculate tax & BPJS
  const taxCalc = calculateTax(gross_salary, settings)
  
  // Calculate total deductions
  const total_deductions = 
    inputs.attendanceDeduction + 
    presensi_penalty +
    taxCalc.pph21_tax +
    taxCalc.bpjs_kesehatan +
    taxCalc.bpjs_tk_jkk +
    taxCalc.bpjs_tk_jkm +
    taxCalc.bpjs_tk_jht +
    taxCalc.bpjs_tk_jp
  
  // Calculate net salary
  const net_salary = gross_salary - total_deductions
  
  const data = {
    editor_id: editor.editor_id,
    editor_name: editor.full_name,
    period_start: start,
    period_end: end,
    working_days: inputs.workingDays,
    absent_days: inputs.absentDays,
    base_salary: editor.base_salary,
    attendance_deduction: inputs.attendanceDeduction,
    overtime_minutes: inputs.overtimeMinutes,
    overtime_pay: inputs.overtimePay,
    project_bonus,
    reimbursement_total,
    presensi_penalty,
    pph21_tax: taxCalc.pph21_tax,
    bpjs_kesehatan: taxCalc.bpjs_kesehatan,
    bpjs_tk_jkk: taxCalc.bpjs_tk_jkk,
    bpjs_tk_jkm: taxCalc.bpjs_tk_jkm,
    bpjs_tk_jht: taxCalc.bpjs_tk_jht,
    bpjs_tk_jp: taxCalc.bpjs_tk_jp,
    gross_salary,
    total_deductions,
    net_salary,
  }

  const payslip = await prisma.payslip.upsert({
    where: { editor_id_period_start: { editor_id: editor.editor_id, period_start: start } },
    create: data,
    update: data,
  })
  return { payslip, regenerated: true }
}
```

### 2.3 New API Routes for Bank Payment

**File:** `manava-api/src/modules/payroll/routes.ts`

Add these new endpoints:

```typescript
// POST /api/v1/payroll/batch/create — Create payment batch
payrollRouter.post(
  '/batch/create',
  authenticate,
  requireRole(...HR_ROLES),
  validateBody(z.object({ period: z.string().regex(PERIOD_RE) })),
  asyncHandler(async (req, res) => {
    const { period } = req.body
    
    // Get all finalized payslips for the period
    const payslips = await prisma.payslip.findMany({
      where: { 
        period_start: new Date(period + '-01'),
        status: 'finalized',
        payment_status: 'pending'
      },
      include: { editor: { select: { bank_account_no: true, bank_name: true } } }
    })
    
    if (payslips.length === 0) {
      return res.status(400).json(fail('Tidak ada slip gaji yang siap dibayar'))
    }
    
    // Check bank accounts
    const missingBank = payslips.filter(p => !p.editor.bank_account_no)
    if (missingBank.length > 0) {
      return res.status(400).json(fail(
        `${missingBank.length} editor belum melengkapi data rekening bank`
      ))
    }
    
    const total_amount = payslips.reduce((sum, p) => sum + p.net_salary, 0)
    
    const batch = await prisma.paymentBatch.create({
      data: {
        period,
        total_amount,
        payslip_count: payslips.length,
        created_by: req.user!.sub,
      }
    })
    
    // Link payslips to batch
    await prisma.payslip.updateMany({
      where: { payslip_id: { in: payslips.map(p => p.payslip_id) } },
      data: { payment_batch_id: batch.batch_id, payment_status: 'processing' }
    })
    
    res.status(201).json(ok(batch))
  })
)

// POST /api/v1/payroll/batch/:id/process — Simulate bank payment processing
payrollRouter.post(
  '/batch/:id/process',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const batch = await prisma.paymentBatch.findUnique({
      where: { batch_id: req.params.id },
      include: { payslips: true }
    })
    if (!batch) return res.status(404).json(fail('Batch tidak ditemukan'))
    if (batch.status !== 'pending') {
      return res.status(409).json(fail('Batch sudah diproses'))
    }
    
    // Simulate payment processing (in real system, this would call bank API)
    await new Promise(resolve => setTimeout(resolve, 2000)) // simulate delay
    
    const now = new Date()
    await prisma.$transaction([
      prisma.paymentBatch.update({
        where: { batch_id: batch.batch_id },
        data: { status: 'completed', processed_at: now }
      }),
      prisma.payslip.updateMany({
        where: { payment_batch_id: batch.batch_id },
        data: {
          payment_status: 'completed',
          paid_at: now,
          status: 'paid',
          payment_reference: `BATCH-${batch.batch_id.slice(0, 8).toUpperCase()}`
        }
      })
    ])
    
    res.json(ok({ batch_id: batch.batch_id, status: 'completed' }))
  })
)

// GET /api/v1/payroll/batch — List payment batches
payrollRouter.get(
  '/batch',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const batches = await prisma.paymentBatch.findMany({
      orderBy: { created_at: 'desc' },
      take: 50
    })
    res.json(ok(batches, { total: batches.length }))
  })
)

// GET /api/v1/payroll/batch/:id/export — Export batch as CSV for bank upload
payrollRouter.get(
  '/batch/:id/export',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const batch = await prisma.paymentBatch.findUnique({
      where: { batch_id: req.params.id },
      include: {
        payslips: {
          include: {
            editor: {
              select: {
                bank_name: true,
                bank_account_no: true,
                bank_account_name: true
              }
            }
          }
        }
      }
    })
    if (!batch) return res.status(404).json(fail('Batch tidak ditemukan'))
    
    // Generate CSV
    const header = 'No,Nama,Rekening,Bank,Jumlah,Referensi\n'
    const rows = batch.payslips.map((p, i) => 
      `${i + 1},"${p.editor_name}","${p.editor.bank_account_no}","${p.editor.bank_name}",${p.net_salary},"${p.payment_reference || '-'}"`
    ).join('\n')
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${batch.period}.csv"`)
    res.send(header + rows)
  })
)
```

### 2.4 New Settings Route

**File:** `manava-api/src/modules/payroll/routes.ts`

```typescript
// GET /api/v1/payroll/settings
payrollRouter.get(
  '/settings',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const settings = await prisma.payrollSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' }
    })
    res.json(ok(settings))
  })
)

// PATCH /api/v1/payroll/settings
payrollRouter.patch(
  '/settings',
  authenticate,
  requireRole('superadmin', 'hr_admin'),
  asyncHandler(async (req, res) => {
    const settings = await prisma.payrollSettings.update({
      where: { id: 'default' },
      data: req.body
    })
    res.json(ok(settings))
  })
)
```

### 2.5 Tax Report Endpoint

**File:** `manava-api/src/modules/payroll/routes.ts`

```typescript
// GET /api/v1/payroll/reports/tax — PPh21 tax report
payrollRouter.get(
  '/reports/tax',
  authenticate,
  requireRole(...HR_ROLES),
  asyncHandler(async (req, res) => {
    const { period } = req.query as { period?: string }
    if (!period || !PERIOD_RE.test(period)) {
      return res.status(400).json(fail('Parameter period (YYYY-MM) wajib'))
    }
    
    const [year, month] = period.split('-').map(Number)
    const period_start = new Date(Date.UTC(year!, month! - 1, 1))
    
    const payslips = await prisma.payslip.findMany({
      where: { period_start, status: { not: 'voided' } },
      select: {
        editor_id: true,
        editor_name: true,
        gross_salary: true,
        pph21_tax: true,
        bpjs_kesehatan: true,
        bpjs_tk_jkk: true,
        bpjs_tk_jkm: true,
        bpjs_tk_jht: true,
        bpjs_tk_jp: true,
        net_salary: true
      },
      orderBy: { editor_name: 'asc' }
    })
    
    const totals = {
      total_gross: payslips.reduce((s, p) => s + p.gross_salary, 0),
      total_pph21: payslips.reduce((s, p) => s + p.pph21_tax, 0),
      total_bpjs_kesehatan: payslips.reduce((s, p) => s + p.bpjs_kesehatan, 0),
      total_bpjs_tk: payslips.reduce((s, p) => s + p.bpjs_tk_jkk + p.bpjs_tk_jkm + p.bpjs_tk_jht + p.bpjs_tk_jp, 0),
      total_net: payslips.reduce((s, p) => s + p.net_salary, 0),
      employee_count: payslips.length
    }
    
    res.json(ok({ period, payslips, totals }))
  })
)
```

---

## 3. FRONTEND IMPLEMENTATION

### 3.1 Update TypeScript Types

**File:** `manava-app/src/lib/payroll.ts`

```typescript
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Payslip {
  payslip_id: string
  editor_id: string
  editor_name: string
  period_start: string
  period_end: string
  working_days: number
  absent_days: number
  
  // Earnings
  base_salary: number
  overtime_minutes: number
  overtime_pay: number
  project_bonus: number
  reimbursement_total: number
  gross_salary: number
  
  // Deductions
  attendance_deduction: number
  presensi_penalty: number
  pph21_tax: number
  bpjs_kesehatan: number
  bpjs_tk_jkk: number
  bpjs_tk_jkm: number
  bpjs_tk_jht: number
  bpjs_tk_jp: number
  total_deductions: number
  
  // Net
  net_salary: number
  
  // Status
  status: PayslipStatus
  payment_status: PaymentStatus
  payment_batch_id: string | null
  paid_at: string | null
  payment_reference: string | null
  generated_at: string
}

export interface PaymentBatch {
  batch_id: string
  period: string
  total_amount: number
  payslip_count: number
  status: BatchStatus
  created_by: string
  created_at: string
  processed_at: string | null
}

export interface PayrollSettings {
  id: string
  bpjs_kesehatan_rate: number
  bpjs_tk_jkk_rate: number
  bpjs_tk_jkm_rate: number
  bpjs_tk_jht_rate: number
  bpjs_tk_jp_rate: number
  pph21_bracket_1_limit: number
  pph21_bracket_1_rate: number
  pph21_bracket_2_limit: number
  pph21_bracket_2_rate: number
  pph21_bracket_3_rate: number
  presensi_penalty_per_day: number
  updated_at: string
}
```

### 3.2 Add New API Functions

**File:** `manava-app/src/lib/payroll.ts`

```typescript
export function createPaymentBatch(period: string): Promise<PaymentBatch> {
  return api('/payroll/batch/create', { method: 'POST', body: { period } })
}

export function processPaymentBatch(batch_id: string): Promise<{ batch_id: string; status: string }> {
  return api(`/payroll/batch/${batch_id}/process`, { method: 'POST' })
}

export function fetchPaymentBatches(): Promise<PaymentBatch[]> {
  return api('/payroll/batch')
}

export function exportPaymentBatch(batch_id: string): string {
  return `/api/v1/payroll/batch/${batch_id}/export`
}

export function fetchPayrollSettings(): Promise<PayrollSettings> {
  return api('/payroll/settings')
}

export function updatePayrollSettings(data: Partial<PayrollSettings>): Promise<PayrollSettings> {
  return api('/payroll/settings', { method: 'PATCH', body: data })
}

export function fetchTaxReport(period: string): Promise<any> {
  return api(`/payroll/reports/tax?period=${period}`)
}
```

