// 1. Cek Login
const token = localStorage.getItem('token');
if (!token) { window.location.href = 'login.html'; }

const API_ANALISA = 'http://localhost:5000/api/realisasi/analisa';
const API_JENIS = 'http://localhost:5000/api/realisasi/jenis-belanja';

let bsModal;
let idEditAktif = null;

// Variabel Global Data 2026 (Untuk Tabel 2 default)
window.realisasi2026Global = Array(12).fill(0);
window.pagu2026Global = 0;
window.grandTotal2026Global = 0;

function formatUang(angka) { 
    return (!angka || angka === 0 || angka === "0.00" || isNaN(angka)) ? "-" : new Intl.NumberFormat('id-ID').format(angka); 
}
function formatPersen(angka) { 
    let hasil = (!angka || angka === 0 || isNaN(angka) || !isFinite(angka)) ? "0,00%" : angka.toFixed(2).replace('.', ',') + '%'; 
    if(angka < 0) return `(${Math.abs(angka).toFixed(2).replace('.', ',')}%)`;
    return hasil;
}

// Helper untuk menarik angka realisasi dari memori
function getRealisasi(year) {
    if(year === 2026) return window.realisasi2026Global || Array(12).fill(0);
    let mem = JSON.parse(localStorage.getItem('memori_manual_' + year));
    return mem ? mem.realisasi : Array(12).fill(0);
}

// Helper untuk menarik angka pagu dari memori
function getPagu(year) {
    if(year === 2026) return window.pagu2026Global || 0;
    let mem = JSON.parse(localStorage.getItem('memori_manual_' + year));
    return mem ? (parseFloat(mem.pagu) || 0) : 0;
}

const inputKodeEl = document.getElementById('inputKode');
if (inputKodeEl) {
    inputKodeEl.addEventListener('change', function() {
        const namaInput = document.getElementById('inputNama');
        if(this.value === '51') namaInput.value = 'Belanja Pegawai';
        else if(this.value === '52') namaInput.value = 'Belanja Barang';
        else if(this.value === '53') namaInput.value = 'Belanja Modal';
    });
}

// =========================================================================
// 2. FUNGSI UTAMA LOAD DATA API
// =========================================================================
async function loadDataAnalisa() {
    try {
        const response = await fetch(API_ANALISA, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const result = await response.json();
        
        const tb1 = document.getElementById('tableBodyAnalisa');
        if (tb1) tb1.innerHTML = ''; 

        if (result.status === "success" && result.data && result.data.bulanan.length > 0) {
            const d = result.data;

            // A. CETAK TABEL 1
            if (tb1) {
                d.bulanan.forEach(item => {
                    let rowHtml = `<tr class="row-detail"><td class="fw-bold">${item.kode} - ${item.nama}</td>`;
                    item.bulanan.forEach(val => { rowHtml += `<td class="text-end">${formatUang(val)}</td>`; });
                    rowHtml += `<td class="text-end fw-bold">${formatUang(item.total)}</td>
                        <td class="text-center aksi-kolom" style="border-left: 1px solid #000;">
                            <button class="btn btn-warning btn-aksi me-1" onclick="siapkanEdit(${item.id}, '${item.kode}', '${item.nama}')">Edit</button>
                            <button class="btn btn-danger btn-aksi" onclick="hapusJenis(${item.id})">Hapus</button>
                        </td></tr>`;
                    tb1.innerHTML += rowHtml;
                });

                let totalRowHtml = `<tr class="bg-total-kuning"><td class="text-center">Total</td>`;
                d.total_per_bulan.forEach(val => { totalRowHtml += `<td class="text-end">${formatUang(val)}</td>`; });
                totalRowHtml += `<td class="text-end">${formatUang(d.grand_total)}</td><td class="aksi-kolom"></td></tr>`;
                tb1.innerHTML += totalRowHtml;
                tb1.innerHTML += `<tr><td colspan="15" style="height: 15px; border-left: none; border-right: none;"></td></tr>`;

                d.akumulasi.forEach(item => {
                    let rowHtml = `<tr class="row-detail"><td class="fst-italic">${item.nama}</td>`;
                    item.akumulasi.forEach(val => { rowHtml += `<td class="text-end">${formatUang(val)}</td>`; });
                    rowHtml += `<td class="text-end fw-bold">${formatUang(item.total)}</td><td class="aksi-kolom"></td></tr>`;
                    tb1.innerHTML += rowHtml;
                });
            }

            // B. SIMPAN DATA GLOBAL 2026
            window.realisasi2026Global = d.total_per_bulan || Array(12).fill(0);
            window.pagu2026Global = d.total_pagu || 0; 
            window.grandTotal2026Global = d.grand_total || 0;
        } else {
            if (tb1) tb1.innerHTML = `<tr><td colspan="15" class="text-center">Belum ada Jenis Belanja.</td></tr>`;
        }
    } catch (error) { 
        console.error("Error API:", error); 
        const tb1 = document.getElementById('tableBodyAnalisa');
        if (tb1) tb1.innerHTML = `<tr><td colspan="15" class="text-center text-danger">Gagal memuat data dari server.</td></tr>`;
    } finally {
        renderDuaTabelPagu();
    }
}

// =========================================================================
// 3. SISTEM OTOMATIS: RENDER 2 TABEL TAHUN TERBARU
// =========================================================================
window.tambahTabelTahun = function() {
    let tahun = prompt("Masukkan Tahun Anggaran baru (contoh: 2027):");
    if (!tahun || isNaN(tahun) || tahun.length !== 4) {
        if(tahun !== null) alert("Mohon masukkan angka tahun yang valid (contoh: 2027).");
        return;
    }
    
    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    if (addedYears.includes(tahun) || tahun === "2026" || tahun === "2025") {
        alert(`Tabel tahun ${tahun} sudah ada.`);
        return;
    }
    
    addedYears.push(tahun);
    addedYears.sort((a, b) => b - a);
    localStorage.setItem('added_years', JSON.stringify(addedYears));
    
    renderDuaTabelPagu();
};

window.hapusTabelTahun = function(tahun) {
    if(!confirm(`Yakin ingin menghapus tabel tahun ${tahun}?`)) return;
    
    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    addedYears = addedYears.filter(y => y !== tahun.toString());
    localStorage.setItem('added_years', JSON.stringify(addedYears));
    localStorage.removeItem('memori_manual_' + tahun);
    
    renderDuaTabelPagu();
};

window.renderDuaTabelPagu = function() {
    let container = document.getElementById('container-tabel-pagu');
    if (!container) return;
    container.innerHTML = '';

    // Ambil 2 tahun terbesar saat ini (2026 & 2025 defaultnya)
    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    let allYears = [...new Set([2026, 2025, ...addedYears.map(Number)])].sort((a, b) => b - a);
    
    let maxYear = allYears[0];
    let secondYear = allYears[1];

    let displayYears = [
        { year: maxYear, indexLabel: 2, color: 'bg-header-biru', hasGreenRow: false },
        { year: secondYear, indexLabel: 3, color: 'bg-header-merah', hasGreenRow: true }
    ];

    displayYears.forEach(item => {
        let y = item.year;
        let is2026 = (y === 2026);
        let memori = JSON.parse(localStorage.getItem('memori_manual_' + y)) || { realisasi: Array(12).fill(0), pagu: 0 };
        let paguVal = is2026 ? (window.pagu2026Global || 0) : (memori.pagu || '');

        let html = `
            <div class="table-title mt-4 d-flex justify-content-between align-items-center">
                <span>${item.indexLabel}. Realisasi vs Pagu Anggaran ${y}</span>
                ${y !== 2026 && y !== 2025 ? `<button class="btn btn-danger btn-sm px-2 py-1" style="font-size: 11px;" onclick="hapusTabelTahun('${y}')">✖ Hapus ${y}</button>` : ''}
            </div>
            <div class="table-container p-0 border-0 shadow-none">
                <table class="table custom-table" id="tabel_${y}">
                    <thead>
                        <tr>
                            <th class="${item.color}" style="min-width: 250px;">Realisasi/Pagu</th>
                            <th class="${item.color}">Januari</th><th class="${item.color}">Februari</th><th class="${item.color}">Maret</th>
                            <th class="${item.color}">April</th><th class="${item.color}">Mei</th><th class="${item.color}">Juni</th>
                            <th class="${item.color}">Juli</th><th class="${item.color}">Agustus</th><th class="${item.color}">September</th>
                            <th class="${item.color}">Oktober</th><th class="${item.color}">November</th><th class="${item.color}">Desember</th>
                            <th class="${item.color}">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="row-detail">
                            <td class="text-center align-middle">Realisasi</td>
                            ${Array(12).fill(0).map((_, i) => {
                                if (is2026) {
                                    return `<td class="text-end" id="real_${y}_${i}">0</td>`;
                                } else {
                                    return `<td class="p-1"><input type="number" class="form-control input-tabel text-end" id="real_${y}_${i}" value="${memori.realisasi[i] || ''}" placeholder="0" oninput="hitungTabelTahun(${y})"></td>`;
                                }
                            }).join('')}
                            <td class="text-end fw-bold align-middle" id="totReal_${y}">0</td>
                        </tr>
                        <tr class="row-detail">
                            <td class="text-center align-middle">Pagu</td>
                            ${Array(12).fill(0).map((_, i) => `<td class="text-end align-middle" id="pagu_display_${y}_${i}">0</td>`).join('')}
                            ${is2026 
                                ? `<td class="text-end fw-bold" id="pagu_${y}">0</td>` 
                                : `<td class="p-1"><input type="number" class="form-control input-tabel text-end fw-bold" id="pagu_${y}" value="${paguVal}" placeholder="Pagu ${y}" oninput="hitungTabelTahun(${y})"></td>`
                            }
                        </tr>
                        <tr class="row-detail">
                            <td class="text-center">Akumulasi</td>
                            ${Array(12).fill(0).map((_, i) => `<td class="text-end fw-bold" id="akum_${y}_${i}">0</td>`).join('')}
                            <td class="text-end fw-bold" id="totAkum_${y}">0</td>
                        </tr>
                        <tr class="bg-total-kuning">
                            <td class="text-center">Persentase</td>
                            ${Array(12).fill(0).map((_, i) => `<td class="text-end" id="persen_${y}_${i}">0,00%</td>`).join('')}
                            <td class="text-end fw-bold" id="totPersen_${y}">0,00%</td>
                        </tr>
                        ${item.hasGreenRow ? `
                        <tr class="bg-row-hijau">
                            <td>Perbedaan Realisasi</td>
                            ${Array(12).fill(0).map((_, i) => `<td class="text-end" id="beda_${y}_${i}">0,00%</td>`).join('')}
                            <td class="text-end fw-bold" id="totBeda_${y}">0,00%</td>
                        </tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML += html;
    });

    hitungTabelTahun(maxYear);
    hitungTabelTahun(secondYear);
    renderTabel4();
};

window.hitungTabelTahun = function(y) {
    let is2026 = (y === 2026);
    let memori = JSON.parse(localStorage.getItem('memori_manual_' + y)) || { realisasi: Array(12).fill(0), pagu: 0 };
    
    let elPagu = document.getElementById(`pagu_${y}`);
    let paguVal = is2026 ? (window.pagu2026Global || 0) : (elPagu ? parseFloat(elPagu.value) || 0 : 0);
    let sum = 0;

    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    let allYears = [...new Set([2026, 2025, ...addedYears.map(Number)])].sort((a, b) => b - a);
    let topYear = allYears[0];
    let topRealisasi = getRealisasi(topYear);
    let topPagu = getPagu(topYear);

    for(let i=0; i<12; i++){
        let real = 0;
        if (is2026) {
            real = window.realisasi2026Global[i] || 0;
            let elR = document.getElementById(`real_${y}_${i}`);
            if(elR) elR.innerText = formatUang(real);
        } else {
            let elR = document.getElementById(`real_${y}_${i}`);
            real = elR ? parseFloat(elR.value) || 0 : 0;
            memori.realisasi[i] = real;
        }

        sum += real;
        let elAkum = document.getElementById(`akum_${y}_${i}`);
        if(elAkum) elAkum.innerText = formatUang(sum);

        let elPaguDisp = document.getElementById(`pagu_display_${y}_${i}`);
        if(elPaguDisp) elPaguDisp.innerText = formatUang(paguVal);

        let pVal = paguVal > 0 ? (sum / paguVal) * 100 : 0;
        let elPersen = document.getElementById(`persen_${y}_${i}`);
        if(elPersen) elPersen.innerText = formatPersen(pVal);

        let elBeda = document.getElementById(`beda_${y}_${i}`);
        if(elBeda) {
            let topSum = 0;
            for(let k=0; k<=i; k++) topSum += (topRealisasi[k] || 0);
            let topPersen = topPagu > 0 ? (topSum / topPagu) * 100 : 0;
            elBeda.innerText = formatPersen(topPersen - pVal);
        }
    }

    if (!is2026) {
        memori.pagu = paguVal;
        localStorage.setItem('memori_manual_' + y, JSON.stringify(memori));
    }

    if(document.getElementById(`totReal_${y}`)) document.getElementById(`totReal_${y}`).innerText = formatUang(sum);
    if(document.getElementById(`totAkum_${y}`)) document.getElementById(`totAkum_${y}`).innerText = formatUang(sum);
    if(is2026 && elPagu) elPagu.innerText = formatUang(paguVal);

    let totPersen = paguVal > 0 ? (sum / paguVal) * 100 : 0;
    if(document.getElementById(`totPersen_${y}`)) document.getElementById(`totPersen_${y}`).innerText = formatPersen(totPersen);

    let elTotBeda = document.getElementById(`totBeda_${y}`);
    if(elTotBeda) {
        let topSumAll = topRealisasi.reduce((a, b) => a + b, 0);
        let topPersenAll = topPagu > 0 ? (topSumAll / topPagu) * 100 : 0;
        elTotBeda.innerText = formatPersen(topPersenAll - totPersen);
    }

    if(typeof hitungTabelYoY === 'function') hitungTabelYoY();
};

// =========================================================================
// 4. TABEL 4: YoY AKURAT (2025 vs 2024 Default -> 2027 vs 2026 Jika Ditambah)
// =========================================================================
window.renderTabel4 = function() {
    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    
    // PENTING: Menambahkan urutan lengkap 2026, 2025, 2024 agar tidak lompat
    let allYears = [...new Set([2026, 2025, 2024, ...addedYears.map(Number)])].sort((a, b) => b - a);
    
    let year1, year2;
    if (addedYears.length === 0) {
        // Jika belum ada penambahan tabel, default ke 2025 vs 2024
        year1 = 2025;
        year2 = 2024;
    } else {
        // Jika ada penambahan (misal 2027), otomatis ambil 2 tahun terkini (2027 vs 2026)
        year1 = allYears[0];
        year2 = allYears[1];
    }

    let judul4 = document.getElementById('judul4');
    if(judul4) judul4.innerText = `4. Realisasi Anggaran ${year1} vs ${year2}`;

    let isYear2Statis = (year2 === 2026 || year2 === 2025 || addedYears.includes(year2.toString()));
    let memoriYear2 = JSON.parse(localStorage.getItem('memori_manual_' + year2)) || { realisasi: Array(12).fill(0) };

    let html = `
        <tr class="row-detail">
            <td class="text-center align-middle">${year1}</td>
            ${Array(12).fill(0).map((_, i) => `<td class="text-end align-middle" id="real_mirror_${year1}_${i}">0</td>`).join('')}
            <td class="text-end fw-bold align-middle" id="totReal_${year1}_mirror">0</td>
        </tr>
        <tr class="row-detail">
            <td class="text-center align-middle">${year2}</td>
    `;

    if (isYear2Statis) {
        html += Array(12).fill(0).map((_, i) => `<td class="text-end align-middle" id="real_mirror_${year2}_${i}">0</td>`).join('');
    } else {
        html += Array(12).fill(0).map((_, i) => `<td class="p-1"><input type="number" class="form-control input-tabel text-end" id="real_input_${year2}_${i}" value="${memoriYear2.realisasi[i] || ''}" placeholder="0" oninput="hitungTabelYoY()"></td>`).join('');
    }

    html += `
            <td class="text-end fw-bold align-middle" id="totReal_${year2}_mirror">0</td>
        </tr>
        <tr><td colspan="14" style="height: 10px; border-left: none; border-right: none;"></td></tr>
        <tr class="row-detail">
            <td class="text-center">${year1} (Akumulasi)</td>
            ${Array(12).fill(0).map((_, i) => `<td class="text-end fw-bold" id="akum_mirror_${year1}_${i}">0</td>`).join('')}
            <td class="text-end fw-bold" id="totAkum_${year1}_mirror">0</td>
        </tr>
        <tr class="row-detail">
            <td class="text-center">${year2} (Akumulasi)</td>
            ${Array(12).fill(0).map((_, i) => `<td class="text-end fw-bold" id="akum_yoy_${year2}_${i}">0</td>`).join('')}
            <td class="text-end fw-bold" id="totAkum_${year2}_yoy">0</td>
        </tr>
        <tr class="bg-total-kuning">
            <td class="text-center">Kenaikan/(Penurunan)</td>
            ${Array(12).fill(0).map((_, i) => `<td class="text-end text-danger fw-bold" id="naik_yoy_${i}">0</td>`).join('')}
            <td class="text-end fw-bold text-danger" id="totNaik_yoy">0</td>
        </tr>
        <tr class="bg-total-kuning">
            <td class="text-center">Persentase</td>
            ${Array(12).fill(0).map((_, i) => `<td class="text-end text-danger fw-bold" id="persenNaik_yoy_${i}">0,00%</td>`).join('')}
            <td class="text-end fw-bold text-danger" id="totPersenNaik_yoy">0,00%</td>
        </tr>
    `;
    
    let tbYoY = document.getElementById('tableBodyYoY');
    if(tbYoY) {
        tbYoY.innerHTML = html;
        hitungTabelYoY();
    }
};

window.hitungTabelYoY = function() {
    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    let allYears = [...new Set([2026, 2025, 2024, ...addedYears.map(Number)])].sort((a, b) => b - a);
    
    let year1, year2;
    if (addedYears.length === 0) {
        year1 = 2025;
        year2 = 2024;
    } else {
        year1 = allYears[0];
        year2 = allYears[1];
    }

    let dataYear1 = getRealisasi(year1);
    let isYear2Statis = (year2 === 2026 || year2 === 2025 || addedYears.includes(year2.toString()));
    let dataYear2 = isYear2Statis ? getRealisasi(year2) : [];
    let memoriYear2 = JSON.parse(localStorage.getItem('memori_manual_' + year2)) || { realisasi: Array(12).fill(0) };

    let sumY1 = 0;
    let sumY2 = 0;

    for(let i=0; i<12; i++){
        let r1 = parseFloat(dataYear1[i]) || 0;
        sumY1 += r1;
        let elR1 = document.getElementById(`real_mirror_${year1}_${i}`);
        if(elR1) elR1.innerText = formatUang(r1);
        let elAk1 = document.getElementById(`akum_mirror_${year1}_${i}`);
        if(elAk1) elAk1.innerText = formatUang(sumY1);

        let r2 = 0;
        if (isYear2Statis) {
            r2 = parseFloat(dataYear2[i]) || 0;
            let elR2 = document.getElementById(`real_mirror_${year2}_${i}`);
            if(elR2) elR2.innerText = formatUang(r2);
        } else {
            let elInput = document.getElementById(`real_input_${year2}_${i}`);
            r2 = elInput ? (parseFloat(elInput.value) || 0) : 0;
            memoriYear2.realisasi[i] = r2;
        }

        sumY2 += r2;
        let elAk2 = document.getElementById(`akum_yoy_${year2}_${i}`);
        if(elAk2) elAk2.innerText = formatUang(sumY2);

        let kenaikan = sumY1 - sumY2;
        let elNaik = document.getElementById(`naik_yoy_${i}`);
        if (elNaik) elNaik.innerText = formatUang(kenaikan);

        let persen = sumY2 > 0 ? (kenaikan / sumY2) * 100 : 0;
        let elPersenNaik = document.getElementById(`persenNaik_yoy_${i}`);
        if (elPersenNaik) elPersenNaik.innerText = formatPersen(persen);
    }

    if (!isYear2Statis) {
        localStorage.setItem('memori_manual_' + year2, JSON.stringify(memoriYear2));
    }

    if (document.getElementById(`totReal_${year1}_mirror`)) document.getElementById(`totReal_${year1}_mirror`).innerText = formatUang(sumY1);
    if (document.getElementById(`totAkum_${year1}_mirror`)) document.getElementById(`totAkum_${year1}_mirror`).innerText = formatUang(sumY1);
    if (document.getElementById(`totReal_${year2}_mirror`)) document.getElementById(`totReal_${year2}_mirror`).innerText = formatUang(sumY2);
    if (document.getElementById(`totAkum_${year2}_yoy`)) document.getElementById(`totAkum_${year2}_yoy`).innerText = formatUang(sumY2);
    
    let totKenaikan = sumY1 - sumY2;
    if (document.getElementById('totNaik_yoy')) document.getElementById('totNaik_yoy').innerText = formatUang(totKenaikan);
    let totPersen = sumY2 > 0 ? (totKenaikan / sumY2) * 100 : 0;
    if (document.getElementById('totPersenNaik_yoy')) document.getElementById('totPersenNaik_yoy').innerText = formatPersen(totPersen);
};

// --- FUNGSI EXPORT KE EXCEL ---
window.exportKeExcel = function() {
    let wb = XLSX.utils.book_new();

    function prosesTabelUntukExcel(tabelId, namaSheet, hapusKolomAksi = false) {
        let tabelAsli = document.getElementById(tabelId);
        if (!tabelAsli) return;
        
        let tabelClone = tabelAsli.cloneNode(true);
        let inputsAsli = tabelAsli.querySelectorAll('input');
        let inputsClone = tabelClone.querySelectorAll('input');
        
        for(let i = 0; i < inputsAsli.length; i++) {
            let textSpan = document.createElement('span');
            textSpan.innerText = formatUang(inputsAsli[i].value);
            inputsClone[i].parentNode.replaceChild(textSpan, inputsClone[i]);
        }

        if(hapusKolomAksi) {
            let baris = tabelClone.rows;
            for (let j = 0; j < baris.length; j++) {
                if(baris[j].cells.length > 1) {
                    baris[j].deleteCell(-1); 
                }
            }
        }

        let ws = XLSX.utils.table_to_sheet(tabelClone);
        XLSX.utils.book_append_sheet(wb, ws, namaSheet);
    }

    let addedYears = JSON.parse(localStorage.getItem('added_years')) || [];
    let allYears = [...new Set([2026, 2025, ...addedYears.map(Number)])].sort((a, b) => b - a);

    prosesTabelUntukExcel('tabel1', 'Jenis Belanja', true);
    prosesTabelUntukExcel('tabel_' + allYears[0], `Pagu ${allYears[0]}`, false);    
    prosesTabelUntukExcel('tabel_' + allYears[1], `Pagu ${allYears[1]}`, false);    
    prosesTabelUntukExcel('tabel4', 'Perbandingan YoY', false); 

    XLSX.writeFile(wb, 'Laporan_Realisasi_Anggaran.xlsx');
};

// --- CRUD MODAL ---
window.siapkanEdit = function(id, kode, nama) {
    idEditAktif = id; 
    document.getElementById('inputKode').value = kode;
    document.getElementById('inputNama').value = nama;
    if (bsModal) bsModal.show();
};

const formJenisEl = document.getElementById('formJenis');
if (formJenisEl) {
    formJenisEl.addEventListener('submit', async function(e) {
        e.preventDefault();
        const payload = { kode: document.getElementById('inputKode').value, nama: document.getElementById('inputNama').value };
        const targetUrl = idEditAktif ? `${API_JENIS}/${idEditAktif}` : API_JENIS;
        const method = idEditAktif ? 'PUT' : 'POST';

        try {
            const response = await fetch(targetUrl, { 
                method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) 
            });
            if(response.ok) { 
                if (bsModal) bsModal.hide(); 
                loadDataAnalisa(); 
            } else { 
                alert("Gagal menyimpan data."); 
            }
        } catch (error) { alert("Terjadi kesalahan sistem."); }
    });
}

window.hapusJenis = async function(id) {
    if(!confirm("Apakah Anda yakin ingin menghapus jenis belanja ini?")) return;
    try {
        await fetch(`${API_JENIS}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadDataAnalisa();
    } catch (error) { alert("Terjadi kesalahan saat menghapus."); }
};

// =========================================================================
// 5. INISIALISASI HALAMAN SAAT PERTAMA KALI DIBUKA
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.getElementById('modalJenis');
    if (modalElement && typeof bootstrap !== 'undefined') { 
        bsModal = new bootstrap.Modal(modalElement); 
    }
    
    renderDuaTabelPagu();
    loadDataAnalisa();
});