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

/** input cho AI */
interface AIInput {
  /** prompt của user */
  user_prompt: string;
  /** prompt của system */
  system_prompt?: string;
}

/** interface cho AI */
interface IAI {
  exec(messages: AIInput): Promise<string | undefined | null>;
}


/** class OpenAI */
class OPENAI implements IAI {
  /** instance OpenAI */
  private open_ai: OpenAI;

  constructor(
    private model: string,
  ) {
    this.open_ai = new OpenAI({
      baseURL: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async exec(messages: AIInput) {
    try {
      /** kết quả trả về */
      const RES =  await this.open_ai.chat.completions.create({
        model: this.model,
        messages: [
          ...(messages.system_prompt ? [{
            role: "system" as const,
            content: messages.system_prompt,
          }] : []),
          {
            role: "user" as const,
            content: messages.user_prompt,
          },
        ],
      });

      // trả về nội dung của AI
      return RES?.choices[0]?.message?.content;
    } catch (e) {
      throw e;
    }
  }
}

/** lấy metadata từ link commit */
class GetMetaDataFromLinkCommit {
  constructor() {}

  exec(link_commit: string) {
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
    }
  }
}

/** lấy code từ commit git */
class GetCodeFromCommitGit {
  constructor(
    private GET_META_DATA_FROM_LINK_COMMIT = new GetMetaDataFromLinkCommit()) {}

  async exec(link_commit: string, token: string) {
    try {
      // lấy các thông tin từ link commit
      const { OWNER, REPO, COMMIT_SHA } = this.GET_META_DATA_FROM_LINK_COMMIT.exec(link_commit)

      /** kết quả trả về */
      const RES = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/commits/${COMMIT_SHA}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.diff",
          },
        },
      );

      return await RES.text();
    } catch (e) {
      throw e;
    }
  }
}

/** review code */
class ReviewCode {
  constructor(
    /** openai */
    private AI = new OPENAI("openai/gpt-oss-120b:free"),
    /** lấy code từ commit git */
    private GET_CODE_FROM_COMMIT_GIT = new GetCodeFromCommitGit(),
  ) {}

  async exec(
    link_commit: string, 
    token: string, 
    output_format: "MARKDOWN" | "HTML" | "TEXT"
  ) {
    try {
      // lấy code từ commit git
      const CODE = await this.GET_CODE_FROM_COMMIT_GIT.exec(link_commit, token);

      /** các dạng output */
      const OUTPUT_FORMAT = {
        MARKDOWN: "Output kết quả trả về dạng markdown",
        HTML: "Output kết quả trả về dạng html",
        TEXT: "Output kết quả trả về dạng text",
      };

      return await this.AI.exec({
        system_prompt: PROMPT + OUTPUT_FORMAT[output_format],
        user_prompt: `Dưới đây là commit cần review:\n\n${CODE}`,
      })
    } catch (e) {
      throw e;
    }
  }
}

// api hello world
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// api review code
app.get("/review-code", async (req: Request, res: Response) => {
  try {
    const { link_commit, token, output_format = "TEXT" } = req.query as {
      link_commit?: string;
      token?: string;
      output_format?: "MARKDOWN" | "HTML" | "TEXT";
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
    const RES = await new ReviewCode().exec(link_commit, token, output_format);

    // nếu không có kết quả của AI trả về thì báo lỗi
    if (!RES) {
      throw new Error("AI review code thất bại");
    }

    // trả về kết quả cho client
    res.send(RES);
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
