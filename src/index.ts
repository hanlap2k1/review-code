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


/** Output của get metadata from link commit */
export interface GetMetaDataFromLinkCommitOutput {
  /** chủ sở hữu repo */
  OWNER: string;
  /** tên repo */
  REPO: string;
  /** commit sha */
  COMMIT_SHA: string;
}

/** interface lấy metadata từ link commit */
export interface IGetMetaDataFromLinkCommit {
  exec(link_commit: string): GetMetaDataFromLinkCommitOutput;
}

/** Input của get code from commit git */
export interface GetCodeFromCommitGitInput {
  /** link commit */
  link_commit: string;
  /** token */
  token: string;
}

/** Output của get code from commit git */
export interface GetCodeFromCommitGitOutput {
  /** code từ commit git */
  code: string;
}

/** interface lấy code từ commit git */
export interface IGetCodeFromCommitGit {
  exec(input: GetCodeFromCommitGitInput): Promise<GetCodeFromCommitGitOutput>;
}

/** Input của review code */
export interface ReviewCodeInput {
  /** link commit */
  link_commit: string[];
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

/** lấy metadata từ link commit */
export class GetMetaDataFromLinkCommit implements IGetMetaDataFromLinkCommit {
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
export class GetCodeFromCommitGit implements IGetCodeFromCommitGit {
  constructor(
    private GET_META_DATA_FROM_LINK_COMMIT: IGetMetaDataFromLinkCommit = new GetMetaDataFromLinkCommit()) {}

  async exec(input: GetCodeFromCommitGitInput): Promise<GetCodeFromCommitGitOutput> {
    try {
      // lấy các thông tin từ link commit
      const { OWNER, REPO, COMMIT_SHA } = this.GET_META_DATA_FROM_LINK_COMMIT.exec(input.link_commit)

      /** kết quả trả về */
      const RES = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/commits/${COMMIT_SHA}`,
        {
          headers: {
            Authorization: `Bearer ${input.token}`,
            Accept: "application/vnd.github.diff",
          },
        },
      );

      return {
        code: await RES.text(),
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
  ) {}

  async exec(
    input: ReviewCodeInput
  ): Promise<ReviewCodeOutput> {
    try {
      /** danh sách code từ các commit git */
      const CODES = await Promise.all(
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

      /** các dạng output */
      const OUTPUT_FORMAT = {
        MARKDOWN: "Output kết quả trả về dạng markdown",
        HTML: "Output kết quả trả về dạng html",
        TEXT: "Output kết quả trả về dạng text",
      };

      /** nội dung commit được ghép lại để review */
      const USER_PROMPT = CODES.map((item, index) => {
        return `Commit ${index + 1}: ${item.link_commit}\n\n${item.code}`;
      }).join("\n\n====================\n\n");

      return (await this.AI.exec({
        system_prompt: PROMPT + OUTPUT_FORMAT[input.output_format],
        user_prompt: `Dưới đây là các commit cần review:\n\n${USER_PROMPT}`,
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
app.get("/review-code", async (req: Request, res: Response) => {
  try {
    const { link_commit, token, output_format = "TEXT" } = req.query as {
      link_commit?: string | string[];
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
    const RES = await new ReviewCode().exec({
      link_commit: Array.isArray(link_commit) ? link_commit : [link_commit],
      token,
      output_format,
    });

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

// nếu file này là file chính thì chạy server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
