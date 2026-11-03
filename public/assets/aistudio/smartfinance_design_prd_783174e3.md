# Product Requirements Document (PRD)
**Nama Produk:** SmartFinance Web App (Nama Sementara)
**Platform:** Aplikasi Web (Desktop-Optimized, Mobile-Responsive)
**Status:** Draf Awal
**Tujuan:** Penggunaan Pribadi (Portofolio/Alat Internal)

---

## 1. Ringkasan Produk (Executive Summary)
Aplikasi pencatatan keuangan personal cerdas berbasis web yang dirancang untuk mempermudah pelacakan arus kas, utang-piutang, dan manajemen anggaran. Aplikasi ini mengintegrasikan **Google AI Studio** untuk memungkinkan pencatatan otomatis menggunakan bahasa natural (NLP) dan pengenalan teks dari struk belanja (OCR), serta memberikan *insight* keuangan. Backend dan database didukung oleh **Firebase**, dengan sistem autentikasi menggunakan **Sign in with Google**.

## 2. Arsitektur & Teknologi (Tech Stack)
| Komponen | Teknologi yang Digunakan | Fungsi Utama |
| :--- | :--- | :--- |
| **Autentikasi** | Firebase Authentication | Login SSO (Single Sign-On) via akun Google. |
| **Database** | Firebase Firestore / Realtime DB | Penyimpanan data transaksi, akun, kategori, dan profil secara *real-time*. |
| **AI Engine** | Google AI Studio (Gemini API) | Pemrosesan bahasa natural (NLP) untuk input teks, OCR gambar struk, dan generator saran keuangan. |
| **Frontend** | HTML/CSS/JS Framework (e.g., React/Vue) | Antarmuka pengguna berbasis web yang responsif (desktop-first). |

## 3. Kebutuhan Fungsional (Functional Requirements)

### 3.1. Autentikasi Pengguna
*   **Sign in with Google:** Pengguna hanya dapat masuk menggunakan akun Google untuk keamanan dan kemudahan akses.
*   **Sesi Pengguna:** Sesi login dikelola dengan aman oleh Firebase, memastikan privasi data keuangan.

### 3.2. Fitur Kecerdasan Buatan (Google AI Studio Integration)
*   **Natural Language Input (NLP):** Pengguna dapat mengetik kalimat seperti *"Makan siang di McD 50 ribu pakai GoPay"* dan AI akan otomatis mengekstrak: Nominal (Rp50.000), Kategori (Makanan/Minuman), Tipe (Pengeluaran), dan Sumber Dana (GoPay).
*   **Receipt Scanner (OCR):** Pengguna dapat mengunggah atau memotret struk belanja. AI akan membaca detail item, memisahkan pengeluaran per item jika diperlukan, dan menjumlahkan totalnya untuk dimasukkan ke database.
*   **AI Financial Advisor:** Modul analisis yang membaca pola pengeluaran bulanan dan memberikan wawasan atau peringatan (contoh: *"Pengeluaran untuk kopi bulan ini naik 20% dari bulan lalu, pertimbangkan untuk menguranginya"*).

### 3.3. Manajemen Transaksi (Core Finance)
*   **Pemasukan (Income) & Pengeluaran (Expense):** Pencatatan standar dengan field tanggal, nominal, kategori, sumber dana, dan catatan.
*   **Transfer Antar-Akun:** Mencatat pemindahan dana tanpa mempengaruhi total kekayaan (contoh: Pindah saldo dari Tabungan Payroll ke e-Wallet).
*   **Utang (Debt) & Piutang (Receivable):** Modul khusus untuk mencatat uang yang dipinjam atau dipinjamkan, lengkap dengan status pelunasan.
*   **Mata Uang:** Sistem dikunci pada mata uang **Rupiah (IDR)**.

### 3.4. Manajemen Akun (Sumber Dana) & Kategori
*   **Multi-Sumber Dana:** Pengguna dapat membuat dan mengelola saldo dari berbagai dompet, termasuk:
    *   Cash / Uang Tunai
    *   Tabungan Payroll
    *   Tabungan Pribadi
    *   e-Wallet (GoPay, OVO, Dana, dll.)
*   **Kustomisasi Kategori Dinamis:** Sistem menyediakan kategori *default*, namun pengguna memiliki akses penuh (CRUD) untuk menambah, mengedit, atau menghapus kategori pemasukan/pengeluaran kapan saja.

### 3.5. Anggaran (Budgeting) & Target Tabungan
*   **Anggaran Bulanan:** Pengguna dapat mengatur batas pengeluaran per kategori setiap bulannya.
*   **Sistem Peringatan (Warning):** Aplikasi akan memberikan notifikasi visual (warna merah/kuning) jika pengeluaran pada suatu kategori hampir atau sudah melewati batas anggaran.
*   **Target Finansial Sederhana (Savings Goal):** Fitur pelacakan progres tabungan. Pengguna dapat mengalokasikan sejumlah dana dari dompet tertentu (misal: "Alokasi 2 Juta di bulan Maret untuk Dana Darurat") dan melihat visualisasi *progress bar* menuju target total yang ingin dicapai.

### 3.6. Dashboard & Pelaporan
*   **Tampilan Utama (Post-Login):**
    *   **Kartu Ringkasan:** Total Saldo Saat Ini, Total Pengeluaran Minggu Ini, Total Pengeluaran Bulan Ini.
    *   **Visualisasi Data:**
        *   *Pie Chart:* Menampilkan porsi pengeluaran berdasarkan kategori (untuk melihat distribusi pengeluaran).
        *   *Line Chart:* Menampilkan tren pergerakan saldo atau pengeluaran dari waktu ke waktu (harian/bulanan).
*   **Ekspor Data:** Tombol *download* untuk mengekspor laporan transaksi ke format **CSV** (untuk olah data di Excel/Spreadsheet) dan **PDF** (untuk laporan siap cetak).

## 4. Kebutuhan Non-Fungsional (UI/UX & Platform)
*   **Optimasi Desktop-First:** Layout dirancang dengan memaksimalkan ruang layar lebar untuk menampilkan tabel data, grafik, dan form input secara berdampingan.
*   **Responsivitas (Mobile-Friendly):** Menggunakan *CSS Grid/Flexbox* agar ketika diakses melalui browser *smartphone*, elemen-elemen seperti tabel, navigasi, dan grafik dapat menyesuaikan ukuran layar tanpa merusak antarmuka.
*   **Performa:** Penggunaan Firebase Realtime Database / Firestore memastikan saldo dan grafik ter-update secara instan sesaat setelah transaksi baru diinput.
*   **Desain Minimalis:** Fokus pada kemudahan pembacaan data keuangan dengan desain dan pewarnaan modern sesuai *Design System*.