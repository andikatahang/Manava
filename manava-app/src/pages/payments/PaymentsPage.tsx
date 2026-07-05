// Pembayaran — modul escrow & payroll belum diimplementasikan di backend,
// sehingga halaman ini hanya menampilkan pesan status.

import { Wallet } from 'lucide-react'
import type { UserRole } from '../../types'

export default function PaymentsPage(_props: { role: UserRole }) {
  return (
    <div className="max-w-2xl">
      <div className="card text-center py-16">
        <Wallet className="w-10 h-10 mx-auto mb-3 text-navy/30" />
        <p className="text-sm font-semibold text-navy">Modul Pembayaran belum tersedia</p>
        <p className="text-xs text-navy/50 mt-1.5 max-w-md mx-auto">
          Escrow, disbursement payroll, dan ledger keuangan akan aktif setelah modul finansial
          diimplementasikan. Halaman ini tersedia sebagai placeholder untuk role yang berhak
          mengaksesnya (Superadmin / HR Admin).
        </p>
      </div>
    </div>
  )
}
