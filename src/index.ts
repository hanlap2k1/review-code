import express, { Request, Response } from "express";
import OpenAI from "openai";
import { PROMPT } from "./prompt";
import dotenv from "dotenv";

/** khởi tạo search */
const app = express();

/** port server chạy */
const PORT = 3000;

/** middlewares */
app.use(express.json());

// load file .env
dotenv.config();

/** instance OpenAI */
const OPEN_AI = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

/** hàm lấy metadata từ link commit */
function getMetaDataFromLinkCommit(link_commit: string) {
  /** các thành phần trong link */
  const LINK_COMMIT_SPLIT = link_commit.split("/");
  /** chủ sở hữu repo */
  const OWNER = LINK_COMMIT_SPLIT[3];
  /** tên repo */
  const REPO = LINK_COMMIT_SPLIT[4];
  /** commit sha */
  const COMMIT_SHA = LINK_COMMIT_SPLIT[6];

  return {
    OWNER,
    REPO,
    COMMIT_SHA,
  };
}

/** hàm lấy code từ commit git*/
async function getCodeFromCommitGit(params: {
  link_commit: string;
  token: string;
}) {
  try {
    // lấy các thông tin từ link commit
    const { OWNER, REPO, COMMIT_SHA } = getMetaDataFromLinkCommit(
      params.link_commit,
    );

    /** kết quả trả về */
    const RES = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits/${COMMIT_SHA}`,
      {
        headers: {
          Authorization: `Bearer ${params.token}`,
          Accept: "application/vnd.github.diff",
        },
      },
    );

    return await RES.text();
  } catch (e) {
    throw e;
  }
}

/** hàm gọi tới AI để review code */
async function reviewCode(
  link_commit: string,
  token: string,
  output_format: "MARKDOWN" | "HTML" | "TEXT" = "MARKDOWN",
) {
  /** code lấy được từ commit */
  const CODE = await getCodeFromCommitGit({
    link_commit,
    token,
  });

  /** các dạng output */
  const OUTPUT_FORMAT = {
    MARKDOWN: "Output kết quả trả về dạng markdown",
    HTML: "Output kết quả trả về dạng html",
    TEXT: "Output kết quả trả về dạng text",
  };

  return await OPEN_AI.chat.completions.create({
    model: "openai/gpt-oss-120b:free",
    messages: [
      {
        role: "system",
        content: PROMPT,
      },
      {
        role: "system",
        content: OUTPUT_FORMAT[output_format],
      },
      {
        role: "user",
        content: `Dưới đây là commit cần review:\n\n${CODE}`,
      },
    ],
  });
}

// api hello world
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// api review code
app.get("/review-code", async (req: Request, res: Response) => {
  try {
    const { link_commit, token, output_format } = req.query as {
      link_commit: string;
      token: string;
      output_format: "MARKDOWN" | "HTML" | "TEXT";
    };

    // nếu không có link commit thì báo lỗi
    if (!link_commit) {
      throw new Error("Thiếu link commit");
    }

    // nếu không có token thì báo lỗi
    if (!token) {
      throw new Error("Thiếu token");
    }

    /** kết quả AI trả về */
    const RES = await reviewCode(link_commit, token, output_format);

    // nếu không có kết quả của AI trả về thì báo lỗi
    if (!RES?.choices[0]?.message?.content) {
      throw new Error("AI review code thất bại");
    }

    // trả về kết quả cho client
    res.send(RES?.choices[0]?.message?.content);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e || "Lỗi không xác định",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
