import express from "express";
import OpenAI from "openai";
import { CODE_SAMPLE } from "./code_sample.js"
import { PROMPT } from "./prompt.js"
import dotenv from "dotenv";

const app = express();
const PORT = 3000;

// load file .env
dotenv.config();

/** instance OpenAI */
const OPEN_AI = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

/** hàm gọi tới AI để review code */
async function reviewCode() {
  return await OPEN_AI.chat.completions.create({
    model: "openai/gpt-oss-120b:free",
    messages: [
      {
        role: "system",
        content: PROMPT
      },
      {
        role: "user",
        content: `Dưới đây là commit cần review:\n\n${CODE_SAMPLE}`
      }
    ]
  });
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/review-code", async (req, res) => {
  try {
    /** kết quả AI trả về */
    const RES = await reviewCode();

    // nếu không có kết quả của AI trả về thì báo lỗi
    if (!RES?.choices[0]?.message?.content) {
      throw new Error("AI review code thất bại");
    }

    // trả về kết quả cho client
    res.json(RES?.choices[0]?.message?.content);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Lỗi không xác định"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});