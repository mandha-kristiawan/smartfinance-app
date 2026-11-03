# Panduan Desain & Branding (Design System)
Berdasarkan referensi desain UI/UX "Novera" (merujuk pada `image_99fdbe.jpg`, `image_99fd9c.jpg`, dan `image_99fd7c.jpg`).

## 1. Tipografi (Typography)
*   **Primary/Heading Font:** **Playfair Display** (Serif). Digunakan untuk memberikan kesan elegan dan premium pada angka saldo utama atau judul bagian tertentu.
*   **Secondary/UI Font:** **Sans-serif (Modern & Bersih)** (seperti Inter, Roboto, atau SF Pro). Digunakan untuk teks UI, label, menu navigasi, dan rincian transaksi agar mudah dibaca dalam ukuran kecil.

## 2. Palet Warna (Color Palette)
Desain ini menggunakan gaya yang cerah, modern, dan sedikit *playful* dengan warna-warna pastel cerah sebagai aksen di atas latar belakang yang bersih.

*   **Primary Accent Colors:**
    *   **Lilac/Purple:** `#BABDFF` (Digunakan untuk kartu debit utama, elemen bar chart)
    *   **Soft Pink:** `#FBC6F2` (Digunakan untuk banner langganan, elemen bar chart)
    *   **Bright Cyan:** `#24D0FE` (Digunakan untuk garis grafik tren saldo, elemen bar chart)
    *   **Neon Yellow:** `#EAFF00` (Digunakan sebagai aksen tumpukan kartu latar belakang)
*   **Neutral Colors:**
    *   **Background:** White (`#FFFFFF`) atau sangat terang off-white untuk kanvas utama.
    *   **Card/Surface:** White (`#FFFFFF`) untuk memisahkan komponen dari latar belakang.
    *   **Text (Primary):** Dark Grey / Black (`#1A1A1A` atau `#000000`) untuk kontras maksimal.
    *   **Text (Secondary/Muted):** Light Grey untuk tanggal atau teks bantuan.

## 3. Komponen UI (UI Components)
*   **Cards (Kartu Konten):**
    *   Menggunakan sudut yang sangat membulat (large border-radius, sekitar `20px` - `24px`).
    *   Tampilan *flat* dengan bayangan (drop-shadow) yang sangat minim atau tanpa bayangan, mengandalkan *whitespace* (ruang kosong) untuk pemisah antar elemen.
*   **Buttons & Navigation (Tombol & Navigasi):**
    *   **Active State:** Berbentuk kapsul/pil (pill-shaped) berwarna hitam pekat dengan teks putih (contoh: tab "Dashboard", tombol "Get now", "Add new card").
    *   **Inactive State:** Teks tanpa latar belakang hitam atau dengan latar belakang abu-abu sangat terang.
*   **Charts & Visualisasi Data:**
    *   **Line Chart:** Menggunakan garis berwarna Cyan (`#24D0FE`) dengan efek gradasi transparan ke putih di bagian bawah garis.
    *   **Bar Chart:** Menggunakan ujung membulat (rounded caps) pada batang grafik, dengan kombinasi warna ungu, cyan, dan pink yang ditumpuk (stacked) atau disejajarkan.
*   **Avatars:**
    *   Foto profil melingkar yang saling bertumpuk (overlapping) untuk fitur seperti "Quick transfer", ditambah tombol "+" berbentuk lingkaran hitam.
*   **Pill Tags:**
    *   Digunakan untuk indikator persentase (contoh: `+12%`, `77% completed`) dengan border tipis (outline) dan teks di dalamnya.