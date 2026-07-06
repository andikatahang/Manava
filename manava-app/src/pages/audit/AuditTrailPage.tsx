// Jejak Audit — modul audit trail belum diimplementasikan di backend
// (belum ada tabel/endpoint audit_events), sehingga halaman ini hanya
// menampilkan pesan status. Tidak ada data tiruan yang ditampilkan.

import { Shield } from 'lucide-react'

export default function AuditTrailPage() {
  return (
    <div className="max-w-2xl">
      <div className="card text-center py-16">
        <Shield className="w-10 h-10 mx-auto mb-3 text-navy/30" />
        <p className="text-sm font-semibold text-navy">Modul Jejak Audit belum tersedia</p>
        <p className="text-xs text-navy/50 mt-1.5 max-w-md mx-auto">
          Pencatatan peristiwa audit (login, perubahan data, pergerakan pembayaran) akan aktif
          setelah modul audit trail diimplementasikan di backend. Semua peristiwa nantinya bersifat
          permanen (append-only) dan disimpan selama 7 tahun sesuai persyaratan kepatuhan IFRS 15.
        </p>
      </div>
    </div>
  )
}
