import express, { Request, Response } from "express";
import OpenAI from "openai";
import { PROMPT } from "./prompt";
import dotenv from "dotenv";
import { GetCodeFromCommitGit, GetCodeFromPullRequest, IGetCodeFromCommitGit, IGetCodeFromPullRequest } from "./GetCodeFromGit";

/** khởi tạo search */
const app = express();

/** port server chạy */
const PORT = 3000;

/** middlewares */
app.use(express.json());

// load file .env
dotenv.config();

/** input cho AI */
export interface AIInput {
  /** prompt của user */
  user_prompt: string;
  /** prompt của system */
  system_prompt?: string;
}

/** output của AI */
interface AIOutput {
  /** output của AI */
  output: string | undefined | null;
}

/** interface cho AI */
export interface IAI {
  exec(messages: AIInput): Promise<AIOutput>;
}

/** Input của review code */
export interface ReviewCodeInput {
  /** link commit */
  link_commit: string[];
  /** link pull request */
  link_pull_request: string[];
  /** token */
  token: string;
  /** output format */
  output_format: "MARKDOWN" | "HTML" | "TEXT";
}

/** Output của review code */
export interface ReviewCodeOutput {
  /** output của review code */
  output: string | undefined | null;
}

/** interface review code */
export interface IReviewCode {
  exec(input: ReviewCodeInput): Promise<ReviewCodeOutput>;
}

/** normalize links */
function normalizeLinks(value?: string | string[]): string[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

/** class OpenAI */
export class OPENAI implements IAI {
  constructor(
    private model: string,
    private AI: OpenAI = new OpenAI({
      baseURL: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    })
  ) {}

  async exec(messages: AIInput): Promise<AIOutput> {
    try {
      /** kết quả trả về */
      const RES =  await this.AI.chat.completions.create({
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
      return {
        output: RES?.choices[0]?.message?.content,
      };
    } catch (e) {
      throw e;
    }
  }
}

/** review code */
export class ReviewCode implements IReviewCode {
  constructor(
    /** openai */
    private AI: IAI = new OPENAI("openai/gpt-oss-120b:free"),
    /** lấy code từ commit git */
    private GET_CODE_FROM_COMMIT_GIT: IGetCodeFromCommitGit = new GetCodeFromCommitGit(),
    /** lấy code từ pull request */
    private GET_CODE_FROM_PULL_REQUEST: IGetCodeFromPullRequest = new GetCodeFromPullRequest(),
  ) {}

  async exec(
    input: ReviewCodeInput
  ): Promise<ReviewCodeOutput> {
    try {
      /** danh sách code từ các commit git */
      const CODES_FROM_COMMIT = await Promise.all(
        input.link_commit.map(async (link_commit) => {
          /** code từ từng commit git */
          const CODE = await this.GET_CODE_FROM_COMMIT_GIT.exec({
            link_commit,
            token: input.token,
          });

          return {
            link_commit,
            code: CODE.code,
          };
        })
      );

      /** danh sách code từ các pull request */
      const CODES_FROM_PULL_REQUEST = await Promise.all(
        input.link_pull_request.map(async (link_pull_request) => {
          /** code từ pull request */
          const CODE = await this.GET_CODE_FROM_PULL_REQUEST.exec({
            link_pull_request,
            token: input.token,
          });

          return {
            link_pull_request,
            code: CODE.code,
          };
        })
      );
      

      /** các dạng output */
      const OUTPUT_FORMAT = {
        MARKDOWN: "Output kết quả trả về dạng markdown",
        HTML: "Output kết quả trả về dạng html",
        TEXT: "Output kết quả trả về dạng text",
      };

      /** nội dung commit được ghép lại để review */
      const USER_PROMPT_COMMIT = CODES_FROM_COMMIT.map((item, index) => {
        return `Commit ${index + 1}: ${item.link_commit}\n\n${item.code}`;
      }).join("\n\n====================\n\n");

      /** nội dung pull request được ghép lại để review */
      const USER_PROMPT_PULL_REQUEST = CODES_FROM_PULL_REQUEST.map((item, index) => {
        return `Pull Request ${index + 1}: ${item.link_pull_request}\n\n${item.code}`;
      }).join("\n\n====================\n\n");

      return (await this.AI.exec({
        system_prompt: PROMPT + OUTPUT_FORMAT[input.output_format],
        user_prompt: `Dưới đây là các commit cần review:\n\n${USER_PROMPT_COMMIT}\n\n${USER_PROMPT_PULL_REQUEST}`,
      })) ?? null
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
app.post("/review-code", async (req: Request, res: Response) => {
  try {
    const { link_commit, link_pull_request , token, output_format = "TEXT" } = req.body as {
      link_commit?: string | string[];
      link_pull_request?: string | string[];
      token?: string;
      output_format?: "MARKDOWN" | "HTML" | "TEXT";
    };

    // nếu không có link commit thì báo lỗi
    if (!link_commit && !link_pull_request) {
      throw new Error("Thiếu link commit hoặc link pull request");
    }

    // nếu không có token thì báo lỗi
    if (!token) {
      throw new Error("Thiếu token");
    }

    /** kết quả AI trả về */
    const RES = await new ReviewCode().exec({
      link_commit: normalizeLinks(link_commit),
      link_pull_request: normalizeLinks(link_pull_request),
      token,
      output_format,
    });

    // nếu không có kết quả của AI trả về thì báo lỗi
    if (!RES?.output) {
      throw new Error("AI review code thất bại");
    }

    // trả về kết quả cho client
    res.send(RES?.output);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e || "Lỗi không xác định",
    });
  }
});

// nếu file này là file chính thì chạy server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
