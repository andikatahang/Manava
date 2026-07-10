// Pengakhiran Kerja — modul offboarding belum diimplementasikan di backend
// (belum ada tabel/endpoint kasus pengakhiran), sehingga halaman ini
// menampilkan alur kerja yang direncanakan tanpa form yang tidak berfungsi.

import { UserX, AlertTriangle, Briefcase, FileText, Archive } from 'lucide-react'

const PHASES = [
  { label: 'Pemicu & Notifikasi', icon: AlertTriangle, desc: 'HR diberi tahu, staf menerima surat pengakhiran' },
  { label: 'Serah Terima Proyek', icon: Briefcase, desc: 'Proyek aktif dialihkan ke staf yang tersedia' },
  { label: 'Penggajian Akhir', icon: FileText, desc: 'Gaji prorata, bonus, dan potongan diselesaikan' },
  { label: 'Anonimisasi Data', icon: Archive, desc: 'Data pribadi dianonimkan 90 hari pasca-pengakhiran sesuai kebijakan' },
]

export default function OffboardingPage() {
  return (
    <div className="grid lg:grid-cols-5 gap-6 max-w-5xl">
      <div className="lg:col-span-3">
        <div className="card text-center py-16">
          <UserX className="w-10 h-10 mx-auto mb-3 text-navy/30" />
          <p className="text-sm font-semibold text-navy">Modul Pengakhiran Kerja belum tersedia</p>
          <p className="text-xs text-navy/50 mt-1.5 max-w-md mx-auto">
            Pencatatan kasus pengakhiran (pengunduran diri, pemutusan, kontrak berakhir) beserta
            alur 4 tahapnya akan aktif setelah modul offboarding diimplementasikan di backend.
            Tidak ada kasus yang dapat dimulai dari halaman ini untuk saat ini.
          </p>
        </div>
      </div>

      {/* 4-phase legend — planned workflow, per PRD */}
      <div className="lg:col-span-2">
        <div className="card">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Tahap Alur Kerja</p>
          <div className="space-y-3">
            {PHASES.map((p, i) => (
              <div key={p.label} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-navy/10 text-navy/60 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                <div>
                  <p className="text-sm font-medium text-navy">{p.label}</p>
                  <p className="text-xs text-navy/50">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-navy/40 mt-3 border-t border-border pt-3">Anonimisasi data berjalan 90 hari pasca-pengakhiran sesuai pedoman PDPA.</p>
        </div>
      </div>
    </div>
  )
}
