import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server must run on port 3000 (nginx proxy is on 8080)
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for Gemini AI content generation with fallback
async function generateGeminiContent(contents: any, schema: any, promptText?: string) {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const config: any = {
        responseMimeType: 'application/json',
      };
      if (schema) {
        config.responseSchema = schema;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} failed, trying fallback if available:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini AI models failed to respond.');
}

// Endpoint: Parse Natural Language Transaction
app.post('/api/ai/parse-transaction', async (req: Request, res: Response) => {
  try {
    const { text, wallets = [], categories = [] } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    const walletNames = wallets.map((w: any) => w.name).join(', ');
    const categoryNames = categories.map((c: any) => `${c.name} (${c.type})`).join(', ');

    const prompt = `
Anda adalah asisten pencatatan keuangan cerdas (NLP Transaction Parser) untuk aplikasi SmartFinance di Indonesia.
Mata uang: Rupiah (IDR).

Daftar dompet pengguna saat ini: [${walletNames}]
Daftar kategori pengguna saat ini: [${categoryNames}]

Kalimat pengguna: "${text}"

Tugas Anda: Ekstrak detail transaksi keuangan secara presisi ke format JSON yang valid.
Aturan nominal Rupiah:
- "50 ribu" / "50k" / "50rb" = 50000
- "1,5 juta" / "1.5jt" / "1jt500" = 1500000
- "sepuluh ribu" = 10000

Tentukan:
- type: salah satu dari "Expense" (pengeluaran), "Income" (pemasukan), "Transfer" (pindah dana antar akun)
- amount: angka integer tanpa titik/koma (misal 50000)
- walletName: nama dompet sumber dana yang paling cocok dari daftar dompet atau null
- destWalletName: jika type adalah "Transfer", nama dompet tujuan dari daftar dompet, jika bukan null
- categoryName: kategori yang paling cocok dari daftar kategori atau buatkan nama kategori baru yang relevan
- notes: ringkasan singkat transaksi (misal: "Makan siang di McD")
- confidence: skor kepercayaan 0.0 - 1.0
- explanation: penjelasan singkat dalam bahasa Indonesia
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'Expense, Income, or Transfer',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Transaction amount in IDR numeric',
        },
        walletName: {
          type: Type.STRING,
          description: 'Matching source wallet name',
        },
        destWalletName: {
          type: Type.STRING,
          description: 'Matching destination wallet name for transfer',
        },
        categoryName: {
          type: Type.STRING,
          description: 'Matching or suggested category name',
        },
        notes: {
          type: Type.STRING,
          description: 'Clean concise description of the transaction',
        },
        confidence: {
          type: Type.NUMBER,
          description: 'Confidence score from 0 to 1',
        },
        explanation: {
          type: Type.STRING,
          description: 'Brief explanation in Indonesian',
        },
      },
      required: ['type', 'amount', 'notes'],
    };

    const responseText = await generateGeminiContent(prompt, schema);
    const parsed = JSON.parse(responseText || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error parsing transaction via Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memproses kalimat transaksi via AI.',
    });
  }
});

// Endpoint: Receipt OCR Scanner
app.post('/api/ai/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', wallets = [], categories = [] } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const walletNames = wallets.map((w: any) => w.name).join(', ');
    const categoryNames = categories.map((c: any) => c.name).join(', ');

    const promptText = `
Anda adalah AI OCR Reader untuk struk belanja / kwitansi pembayaran di Indonesia (SmartFinance Receipt Scanner).
Dompet pengguna: [${walletNames}]
Kategori pengguna: [${categoryNames}]

Ekstrak informasi dari foto struk ini:
1. merchantName: Nama toko / restoran / minimarket / merchant (contoh: "Indomaret", "Starbucks", "Superindo")
2. date: Tanggal transaksi jika terbaca dalam format YYYY-MM-DD (jika tidak terbaca, gunakan tanggal hari ini)
3. items: Array dari setiap item/barang yang dibeli: { itemName: string, qty: number, unitPrice: number, totalPrice: number }
4. subtotal: Angka subtotal sebelum pajak/diskon
5. tax: Pajak/PPN jika ada
6. discount: Diskon jika ada
7. totalAmount: Total akhir pembayaran yang tertera di struk
8. suggestedCategory: Kategori pengeluaran yang paling cocok (misal: "Makanan & Minuman", "Belanja Bulanan", "Kesehatan", dll)
9. suggestedWallet: Sumber dana yang mungkin digunakan berdasarkan teks struk (misal: "GoPay", "BCA", "Cash", atau null)
10. rawNotes: Ringkasan struk belanja (contoh: "Belanja 3 item di Indomaret")
`;

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    };

    const schema = {
      type: Type.OBJECT,
      properties: {
        merchantName: { type: Type.STRING },
        date: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemName: { type: Type.STRING },
              qty: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER },
              totalPrice: { type: Type.NUMBER },
            },
            required: ['itemName', 'totalPrice'],
          },
        },
        subtotal: { type: Type.NUMBER },
        tax: { type: Type.NUMBER },
        discount: { type: Type.NUMBER },
        totalAmount: { type: Type.NUMBER },
        suggestedCategory: { type: Type.STRING },
        suggestedWallet: { type: Type.STRING },
        rawNotes: { type: Type.STRING },
      },
      required: ['merchantName', 'totalAmount'],
    };

    const responseText = await generateGeminiContent(contents, schema);
    const parsed = JSON.parse(responseText || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error scanning receipt via Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memindai struk belanja via AI.',
    });
  }
});

// Endpoint: AI Financial Advisor (Smart Insights & Recommendations)
app.post('/api/ai/financial-advisor', async (req: Request, res: Response) => {
  try {
    const { summaryData } = req.body;

    const prompt = `
Anda adalah Financial Advisor Pribadi kelas dunia untuk aplikasi "SmartFinance" bernuansa Novera modern & elegan.
Berikut adalah data ringkasan keuangan pengguna saat ini:
${JSON.stringify(summaryData, null, 2)}

Buat analisis keuangan yang tajam, empati, actionable, dan mudah dipahami dalam Bahasa Indonesia:
1. healthScore: Angka kesehatan finansial dari 1 sampai 100 berdasarkan cashflow, rasio tabungan, utang, dan kontrol anggaran.
2. healthStatus: Status singkat (contoh: "Sangat Sehat", "Stabil & Terkendali", "Perlu Waspada", "Kritis").
3. executiveSummary: Paragraf ringkasan 2-3 kalimat mengenai performa keuangan pengguna bulan ini.
4. insights: Array berisi 3-4 poin wawasan konkret (misal tren pengeluaran, perbandingan kategori, evaluasi rasio kebutuhan vs keinginan).
5. recommendations: Array berisi 3 saran tindakan spesifik (misal: "Pangkas pengeluaran Makan Luar 15%", "Segera lunasi utang ke Budi sebelum jatuh tempo", "Tingkatkan alokasi Dana Darurat").
6. savingsAdvice: 1 strategi jitu untuk mencapai target tabungan lebih cepat.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        healthScore: { type: Type.NUMBER },
        healthStatus: { type: Type.STRING },
        executiveSummary: { type: Type.STRING },
        insights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        savingsAdvice: { type: Type.STRING },
      },
      required: ['healthScore', 'healthStatus', 'executiveSummary', 'insights', 'recommendations'],
    };

    const responseText = await generateGeminiContent(prompt, schema);
    const parsed = JSON.parse(responseText || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating AI financial advice:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memproses nasihat keuangan via AI.',
    });
  }
});

// Vite middleware in dev or static serving in production
async function startServer() {
  try {
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
      });
    } else {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
          watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartFinance server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start SmartFinance server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'production') {
  startServer();
}

export default app;
