import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("GEMINI_API_KEY is not defined in environment variables.");
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client:", error);
}

// System Instruction that captures the user persona and exact rules of the Baan Suan project
const SYSTEM_INSTRUCTION = `คุณคือ "ผู้ช่วยผู้จัดการบ้านพัก (Property Management Assistant)" ของโครงการ "บ้านสวน" ซึ่งเป็นโครงการบ้านเช่ารายเดือนจำนวน 10 หลัง (บ้านสวน 1 ถึง บ้านสวน 10)
หน้าที่ของคุณคือช่วยบริหารจัดการบ้านพัก ตอบคำถามของเจ้าของโครงการและผู้เช่า ให้คำปรึกษา คำนวณค่าน้ำค่าไฟ ออกสรุปยอดบิล ร่างข้อความแจ้งเตือนค่าเช่าอย่างสุภาพ ร่างประกาศโครงการ และช่วยแนะนำกฎระเบียบต่างๆ อย่างแม่นยำและถูกต้อง

ข้อมูลพื้นฐานและกฎโครงการบ้านสวน (Master Data & Business Rules):
1. ข้อมูลการเช่าพื้นฐาน:
   - ค่าเช่ารายเดือน: 4,500 บาท/เดือน
   - ระยะเวลาสัญญาขั้นต่ำ: 12 เดือน
   - ค่าใช้จ่ายแรกเข้าอยู่: 9,000 บาท (แบ่งเป็น เงินประกัน 4,500 บาท และ ค่าเช่าล่วงหน้า 1 เดือน 4,500 บาท)
2. สิ่งอำนวยความสะดวกในห้องพัก: แอร์, เครื่องทำน้ำอุ่น, ตู้เย็น, เตียงพร้อมที่นอน 5 ฟุต, โต๊ะเครื่องแป้ง, ตู้เสื้อผ้า
3. กฎระเบียบสำคัญ: ไม่อนุญาตให้เลี้ยงสัตว์เลี้ยงโดยเด็ดขาด! (สัตว์เลี้ยงทุกชนิดห้ามเลี้ยง หากพบจะแจ้งเตือนและปรับตามสัญญา)

อัตราค่าบริการและค่าปรับตั้งต้น (Utility & Fee Rates):
- ค่าไฟฟ้า: 7 บาท / หน่วย (ค่ารักษามิเตอร์ขั้นต่ำ 100 บาท/เดือน)
- ค่าน้ำประปา: 18 บาท / หน่วย (ค่ารักษามิเตอร์ขั้นต่ำ 50 บาท/เดือน)
- ค่าปรับชำระล่าช้า: 50 บาท / วัน (เริ่มนับตั้งแต่วันถัดจากวันครบกำหนดชำระ)

ตรรกะการคำนวณบิล (Calculation Logic):
1. จำนวนหน่วยที่ใช้ = (เลขมิเตอร์ปัจจุบัน - เลขมิเตอร์เดือนก่อนหน้า)
2. กฎค่าน้ำ-ค่าไฟขั้นต่ำ (Minimum Fee Rule):
   - ค่าไฟที่ใช้จริง = จำนวนหน่วยไฟที่ใช้ * อัตราค่าไฟ (7 บาท)
   - ถ้ายอดค่าไฟที่ใช้จริงน้อยกว่า 'ค่ารักษามิเตอร์ไฟขั้นต่ำ (100 บาท)' ให้คิดยอดเงินเท่ากับ 100 บาท
   - ค่าน้ำที่ใช้จริง = จำนวนหน่วยน้ำที่ใช้ * อัตราค่าน้ำ (18 บาท)
   - ถ้ายอดค่าน้ำที่ใช้จริงน้อยกว่า 'ค่ารักษามิเตอร์น้ำขั้นต่ำ (50 บาท)' ให้คิดยอดเงินเท่ากับ 50 บาท
3. การคำนวณค่าปรับชำระล่าช้า:
   - ค่าปรับ = จำนวนวันล่าช้า * 50 บาท
4. ยอดรวมสุทธิ (Grand Total):
   - ยอดรวม = ค่าเช่า (4,500 บาท) + ค่าน้ำสุทธิ (ขั้นต่ำ 50) + ค่าไฟสุทธิ (ขั้นต่ำ 100) + ค่าปรับ (ถ้ามี)

คำแนะนำสำหรับการบริการและการตอบลูกค้า:
- ใช้ภาษาไทยในการตอบคำถาม มีหางเสียง สุภาพ นอบน้อม แต่ชัดเจนเป็นทางการและเป็นระเบียบ
- จัดฟอร์แมตบิลและสรุปข้อมูลให้เป็นระเบียบ สวยงาม สแกนง่าย โดยการใช้หัวข้อ, ตัวหนา, และการแยกบรรทัดแต่ละรายการชัดเจน
- หากมีการสอบถามเรื่อง "คำนวณบิล" ให้ระบุรายละเอียดเลขมิเตอร์ปัจจุบัน, มิเตอร์ก่อนหน้า, หน่วยที่ใช้, อัตราต่อหน่วย, และระบุให้ชัดเจนหากเป็นกรณีคิดค่าบริการเหมาขั้นต่ำ (Minimum Fee) เสมอ
- หากได้รับข้อมูลสถานะปัจจุบันของโครงการ (Context) ให้ตอบอิงตามข้อมูลนั้นๆ และวิเคราะห์ข้อมูลในภาพรวมได้อย่างเฉลียวฉลาด`;

// Helper function to call generateContent with automatic retry on transient errors and fallback to alternate models
async function generateContentWithRetry(params: {
  contents: any[];
  systemInstruction: string;
  temperature?: number;
}) {
  if (!ai) {
    throw new Error("Gemini API Client is not initialized.");
  }

  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const modelName of models) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Calling Gemini API using model ${modelName} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.7,
          }
        });
        
        if (response && response.text) {
          console.log(`Successfully generated content using model ${modelName}`);
          return response;
        }
        throw new Error("No response text returned from the model.");
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || String(error);
        const errStatus = error.status || error.statusCode || error.code || 500;
        
        console.error(`Attempt ${attempt} with model ${modelName} failed (status: ${errStatus}):`, errMsg);

        // Determine if error is transient / retryable (e.g., 503, 429, or unavailable message)
        const isTransient = 
          errStatus === 503 || 
          errStatus === 429 ||
          errMsg.includes("503") || 
          errMsg.includes("429") || 
          errMsg.toLowerCase().includes("unavailable") || 
          errMsg.toLowerCase().includes("high demand") || 
          errMsg.toLowerCase().includes("busy") || 
          errMsg.toLowerCase().includes("limit") ||
          errMsg.toLowerCase().includes("spike");

        if (isTransient) {
          // If we get a 503 (high demand / unavailable) error, instead of retrying the same high-demand model 
          // 3 times with exponential backoff (which causes long delays for the user), we immediately fall back
          // to the next model (e.g., gemini-3.1-flash-lite) which is highly available.
          if (modelName === "gemini-3.5-flash") {
            console.log(`Immediate fallback from gemini-3.5-flash to the next available model due to 503 high demand...`);
            break; // Break current model's retry loop to immediately try the next model
          }
        } else {
          // If the error is not transient (e.g., authentication failure, bad request), 
          // don't waste time retrying this model, but we can try the next model.
          break;
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.log(`Transient error encountered. Retrying in ${delay.toFixed(0)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after retries and fallback.");
}

// API endpoint to handle Gemini assistant chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: "Gemini API Client is not initialized. Please ensure GEMINI_API_KEY is configured in Secrets."
      });
    }

    // Construct detailed instruction appending the current live state context from the app
    let contextStr = "";
    if (context) {
      contextStr = `\n\n[ live state context ณ ปัจจุบันของโครงการบ้านสวน ]\n` +
        `- จำนวนบ้านทั้งหมด: 10 หลัง\n` +
        `- บ้านที่มีผู้เช่าอยู่จริง: ${context.occupiedCount} หลัง (ว่าง ${10 - context.occupiedCount} หลัง)\n` +
        `- ยอดค้างชำระค่าเช่า/ค่าน้ำไฟเดือนนี้: ${context.pendingBillsCount} บิล\n` +
        `- รายการบ้านและผู้เช่า ณ ตอนนี้: \n${JSON.stringify(context.housesSummary, null, 2)}`;
    }

    const contents = [];
    
    // Convert previous chat history format to standard Gemini contents format
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
    
    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await generateContentWithRetry({
      contents: contents,
      systemInstruction: SYSTEM_INSTRUCTION + contextStr,
      temperature: 0.7,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error.message || "An error occurred while talking to the assistant." });
  }
});

// Serve Vite in development, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
