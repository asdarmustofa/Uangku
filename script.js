// 1. Konfigurasi Database Supabase
// GANTI teks di bawah ini dengan URL dan API Key dari akun Supabase milikmu
const supabaseUrl = 'https://hwwtaexlgfmcejuzkwav.supabase.co';
const supabaseKey = 'sb_publishable_BJ2AQ1g9LW-rbc5k61EzqQ_VeLlQ9DS';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// 2. VARIABEL & DATA AWAL
const rencanaBudget = {
    "Belanja": 1500000, "Rumah": 200000, "Listrik": 300000, "Internet & Pulsa": 400000,
    "Furniture": 0, "Makan Luar": 200000, "Jajan": 150000, "Berbagi": 800000,
    "Transportasi": 200000, "Bensin": 200000, "Kontrol Gigi": 250000, "Aplikasi": 100000,
    "Investasi": 0, "Self Reward": 150000, "Toko Online": 250000, "Paylater": 250000,
    "Bumil": 250000, "Jum'at": 200000, "Infaq Shubuh": 150000, "Kantor": 150000,
    "Lauk": 100000, "Darurat": 200000, "Maxim": 0, "Utang": 0
};

const targetPemasukan = {
    "Gaji Mas": 40000000, "Gaji Adek": 40000000, "Sisa Sebelumnya": 0,
    "Maxim": 0, "Lainnya": 0
};

// Variabel Global
let jenisAktif = 'keluar';
let grafikKeuangan = null;
let filterTahunAktif = 'Semua';
let currentPage = 1;
let itemsPerPage = 10;
let pengeluaranBulanIni = {}; // Variabel baru untuk melacak over-budget secara real-time

// FUNGSI PEMBANTU
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    currentPage = 1;
    updateUI();
}

function changePage(page) {
    currentPage = page;
    updateUI();
}

function ubahFilterTahun() {
    const elChart = document.getElementById('filterTahunChart');
    if (elChart) {
        filterTahunAktif = elChart.value;
    }
    updateUI(); 
}

// 3. PENGATURAN TOMBOL 
function setJenis(jenis) {
    jenisAktif = jenis;
    const btnMasuk = document.getElementById('btnMasuk');
    const btnKeluar = document.getElementById('btnKeluar');
    const selectKategori = document.getElementById('kategori');

    if(jenis === 'masuk') {
        btnMasuk.className = "w-1/2 py-2 text-sm font-bold rounded-lg bg-emerald-600 text-white shadow-md transition cursor-pointer";
        btnKeluar.className = "w-1/2 py-2 text-sm font-bold rounded-lg text-gray-500 hover:bg-gray-200 transition cursor-pointer";
        selectKategori.innerHTML = Object.keys(targetPemasukan).map(k => `<option value="${k}">${k}</option>`).join('');
    } else {
        btnKeluar.className = "w-1/2 py-2 text-sm font-bold rounded-lg bg-rose-600 text-white shadow-md transition cursor-pointer";
        btnMasuk.className = "w-1/2 py-2 text-sm font-bold rounded-lg text-gray-500 hover:bg-gray-200 transition cursor-pointer";
        selectKategori.innerHTML = Object.keys(rencanaBudget).map(k => `<option value="${k}">${k}</option>`).join('');
    }
}

// 4. SIMPAN DATA KE SUPABASE
async function addTransaction() {
    const selectKategori = document.getElementById('kategori');
    const amountInput = document.getElementById('amount');
    
    const kategori = selectKategori.value;
    const nominal = parseFloat(amountInput.value);

    if (isNaN(nominal) || nominal <= 0) {
        Swal.fire({
            title: 'Oops!',
            text: 'Masukkan nominal angka yang benar ya!',
            icon: 'warning',
            confirmButtonColor: '#111827',
            confirmButtonText: 'Oke'
        });
        return;
    }

    const { error } = await db.from('transaksi').insert([{ 
        jenis: jenisAktif, 
        kategori: kategori, 
        nominal: nominal,
        created_at: new Date().toISOString()
    }]);

    if (error) {
        Swal.fire({
            title: 'Gagal Simpan!',
            text: error.message,
            icon: 'error',
            confirmButtonColor: '#111827'
        });
    } else {
        amountInput.value = ''; 
        
        // Tunggu UI selesai memperbarui data terbaru dari database
        await updateUI(); 
        
        // LOGIKA CEK OVER-BUDGET
        const limitBudget = rencanaBudget[kategori];
        const totalTerpakaiBulanIni = pengeluaranBulanIni[kategori.trim()] || 0;

        if (jenisAktif === 'keluar' && limitBudget > 0 && totalTerpakaiBulanIni > limitBudget) {
            // Tampilkan Warning jika melebihi budget
            Swal.fire({
                title: 'Over Budget!',
                html: `Waduh, pengeluaran untuk <b>"${kategori}"</b> sudah melewati budget bulananmu!<br><br>` +
                      `Budget: <b class="text-gray-700">${formatRupiah(limitBudget)}</b><br>` +
                      `Total Bulan Ini: <b class="text-rose-600">${formatRupiah(totalTerpakaiBulanIni)}</b>`,
                icon: 'warning',
                confirmButtonColor: '#e11d48',
                confirmButtonText: 'Oke, Saya Menegerti'
            });
        } else {
            // Notifikasi sukses biasa jika aman
            Swal.fire({
                title: 'Berhasil!',
                text: 'Data transaksi tersimpan.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// 5. TAMPILKAN DATA DARI SUPABASE
async function updateUI() {
    const { data, error } = await db.from('transaksi').select('*').order('created_at', { ascending: true });

    if (error) {
        console.error("Gagal ambil data:", error);
        return;
    }

    const filterBulanVal = document.getElementById('filterBulan') ? document.getElementById('filterBulan').value : 'Semua';
    const filterTahunVal = document.getElementById('filterTahunRiwayat') ? document.getElementById('filterTahunRiwayat').value : 'Semua';

    // Filter Data Utama Berdasarkan Dropdown
    let filteredData = data.filter(item => {
        const tgl = new Date(item.created_at);
        const cocokBulan = filterBulanVal === 'Semua' || tgl.getMonth().toString() === filterBulanVal;
        const cocokTahun = filterTahunVal === 'Semua' || tgl.getFullYear().toString() === filterTahunVal;
        return cocokBulan && cocokTahun;
    });

    let pengeluaranTerpakai = {};
    let pemasukanTerkumpul = {}; 
    let dataBulanan = {}; 
    let daftarTahun = new Set(); 

    // Ambil info bulan & tahun berjalan saat ini untuk deteksi over-budget asli
    const sekarang = new Date();
    const bulanSekarang = sekarang.getMonth();
    const tahunSekarang = sekarang.getFullYear();
    pengeluaranBulanIni = {}; // Reset tracker global

    // Kalkulasi Data Terfilter (untuk Progres Bar di Layar)
    filteredData.forEach(item => {
        const kat = item.kategori.trim();
        if (item.jenis === 'masuk') {
            pemasukanTerkumpul[kat] = (pemasukanTerkumpul[kat] || 0) + item.nominal;
        } else if (item.jenis === 'keluar') {
            pengeluaranTerpakai[kat] = (pengeluaranTerpakai[kat] || 0) + item.nominal;
        }
    });

    // Kalkulasi Grafik & Pelacak Over-Budget Bulan Berjalan (dari seluruh data)
    data.forEach(item => {
        const tanggalObj = new Date(item.created_at);
        const namaBulan = tanggalObj.toLocaleDateString('id-ID', { month: 'short' });
        const tahun = tanggalObj.getFullYear().toString();
        daftarTahun.add(tahun);

        if (filterTahunAktif === 'Semua' || filterTahunAktif === tahun) {
            const labelGrafik = filterTahunAktif === 'Semua' ? `${namaBulan} ${tahun}` : namaBulan;
            if (!dataBulanan[labelGrafik]) dataBulanan[labelGrafik] = { masuk: 0, keluar: 0 };
            if (item.jenis === 'masuk') dataBulanan[labelGrafik].masuk += item.nominal;
            else if (item.jenis === 'keluar') dataBulanan[labelGrafik].keluar += item.nominal;
        }

        // Hitung total belanja bulan berjalan saat ini untuk keperluan validasi warning
        if (item.jenis === 'keluar' && tanggalObj.getMonth() === bulanSekarang && tanggalObj.getFullYear() === tahunSekarang) {
            const kat = item.kategori.trim();
            pengeluaranBulanIni[kat] = (pengeluaranBulanIni[kat] || 0) + item.nominal;
        }
    });

    // Render Total Saldo Utama
    let totalSaldo = data.reduce((acc, curr) => curr.jenis === 'masuk' ? acc + curr.nominal : acc - curr.nominal, 0);
    document.getElementById('totalBalance').innerText = formatRupiah(totalSaldo);

    // Update Dropdown Tahun
    const selectTahunChart = document.getElementById('filterTahunChart');
    const selectTahunRiwayat = document.getElementById('filterTahunRiwayat');
    if (selectTahunChart && selectTahunRiwayat) {
        const currentRiwayatVal = selectTahunRiwayat.value || 'Semua';
        let optionsHTML = '<option value="Semua">Semua Tahun</option>';
        Array.from(daftarTahun).sort((a, b) => b - a).forEach(thn => {
            optionsHTML += `<option value="${thn}">${thn}</option>`;
        });
        selectTahunChart.innerHTML = optionsHTML;
        selectTahunRiwayat.innerHTML = optionsHTML;
        selectTahunChart.value = filterTahunAktif;
        selectTahunRiwayat.value = currentRiwayatVal;
    }

    // Render Progress Bar Pengeluaran
    const budgetList = document.getElementById('budgetList');
    if (budgetList) {
        budgetList.innerHTML = '';
        Object.keys(rencanaBudget).forEach(kategori => {
            const target = rencanaBudget[kategori];
            const terpakai = pengeluaranTerpakai[kategori] || 0;
            let persentase = target > 0 ? (terpakai / target) * 100 : (terpakai > 0 ? 100 : 0);
            if (persentase > 100) persentase = 100;
            let colorClass = persentase >= 90 ? 'bg-rose-500' : (persentase >= 70 ? 'bg-amber-400' : 'bg-emerald-500'); 
            budgetList.innerHTML += `
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-semibold text-gray-700">${kategori}</span>
                        <span class="text-gray-500">${formatRupiah(terpakai)} / ${formatRupiah(target)}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="${colorClass} h-2.5 rounded-full" style="width: ${persentase}%"></div>
                    </div>
                </div>`;
        });
    }

    // Render Progress Bar Pemasukan
    const incomeList = document.getElementById('incomeList');
    if (incomeList) {
        incomeList.innerHTML = '';
        Object.keys(targetPemasukan).forEach(kategori => {
            const target = targetPemasukan[kategori];
            const terkumpul = pemasukanTerkumpul[kategori] || 0;
            let persentase = target > 0 ? (terkumpul / target) * 100 : (terkumpul > 0 ? 100 : 0);
            if (persentase > 100) persentase = 100;
            incomeList.innerHTML += `
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-semibold text-gray-700">${kategori}</span>
                        <span class="text-gray-500">${formatRupiah(terkumpul)} / ${formatRupiah(target)}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${persentase}%"></div>
                    </div>
                </div>`;
        });
    }

    // Render Grafik Chart.js
    const ctx = document.getElementById('monthlyChart');
    if (ctx) {
        const labelBulan = Object.keys(dataBulanan);
        const datasetMasuk = labelBulan.map(b => dataBulanan[b].masuk);
        const datasetKeluar = labelBulan.map(b => dataBulanan[b].keluar);

        if (grafikKeuangan) {
            grafikKeuangan.destroy();
        }

        grafikKeuangan = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelBulan,
                datasets: [
                    { label: 'Pemasukan', data: datasetMasuk, backgroundColor: '#059669', borderRadius: 6 },
                    { label: 'Pengeluaran', data: datasetKeluar, backgroundColor: '#e11d48', borderRadius: 6 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Render Tabel Riwayat Transaksi & Pagination
    const historyBody = document.getElementById('historyBody');
    if (historyBody) {
        historyBody.innerHTML = '';
        let totalMasukRiwayat = 0;
        let totalKeluarRiwayat = 0;

        filteredData.forEach(item => {
            if (item.jenis === 'masuk') totalMasukRiwayat += item.nominal;
            else if (item.jenis === 'keluar') totalKeluarRiwayat += item.nominal;
        });

        const elTotalMasuk = document.getElementById('totalPemasukanRiwayat');
        const elTotalKeluar = document.getElementById('totalPengeluaranRiwayat');
        if (elTotalMasuk) elTotalMasuk.innerText = formatRupiah(totalMasukRiwayat);
        if (elTotalKeluar) elTotalKeluar.innerText = formatRupiah(totalKeluarRiwayat);

        filteredData.reverse();

        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages; 

        const pageData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage); 

        pageData.forEach(item => {
            const tgl = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const warnaNominal = item.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600';
            const simbol = item.jenis === 'masuk' ? '+' : '-';

            historyBody.innerHTML += `
                <tr class="group hover:bg-gray-50 transition-colors border-b border-gray-50">
                    <td class="py-3">${tgl}</td>
                    <td class="py-3 font-medium">${item.kategori}</td>
                    <td class="py-3 text-right ${warnaNominal} font-bold">${simbol} ${formatRupiah(item.nominal)}</td>
                    <td class="py-3 text-center align-middle">
                        <button onclick="hapusTransaksi('${item.id}')" class="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition-all opacity-40 hover:opacity-100 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </td>
                </tr>`;
        });

        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
            if (currentPage > 1) {
                paginationContainer.innerHTML += `<button onclick="changePage(${currentPage - 1})" class="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition">&laquo;</button>`;
            }
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

            for (let i = startPage; i <= endPage; i++) {
                if (i === currentPage) {
                    paginationContainer.innerHTML += `<button class="px-2 py-1 rounded-md bg-emerald-600 text-white font-bold shadow-sm">${i}</button>`;
                } else {
                    paginationContainer.innerHTML += `<button onclick="changePage(${i})" class="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition">${i}</button>`;
                }
            }
            if (currentPage < totalPages) {
                paginationContainer.innerHTML += `<button onclick="changePage(${currentPage + 1})" class="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition">&raquo;</button>`;
            }
        }
    }
}

// 6. FUNGSI HAPUS TRANSAKSI
async function hapusTransaksi(id) {
    const result = await Swal.fire({
        title: 'Hapus transaksi ini?',
        text: "Data yang dihapus tidak bisa dikembalikan.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48', 
        cancelButtonColor: '#9ca3af', 
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal',
        shape: 'rounded-xl'
    });

    if (!result.isConfirmed) return;

    const { error } = await db.from('transaksi').delete().eq('id', id);
    if (error) {
        Swal.fire('Gagal!', error.message, 'error');
    } else {
        updateUI(); 
        Swal.fire({ title: 'Terhapus!', text: 'Transaksi berhasil dihapus.', icon: 'success', timer: 1500, showConfirmButton: false });
    }
}

// 7. INISIALISASI SAAT HALAMAN DIBUKA
document.addEventListener('DOMContentLoaded', () => {
    const sekarang = new Date();
    const bulanSekarang = sekarang.getMonth().toString();
    const elBulan = document.getElementById('filterBulan');
    if (elBulan) {
        elBulan.value = bulanSekarang;
    }
    setJenis('keluar'); 
    updateUI(); 
});

// 8. REALTIME UPDATE SINKRONISASI
db.channel('transaksi-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi' }, payload => {
    updateUI();
  })
  .subscribe();
