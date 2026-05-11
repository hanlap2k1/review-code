import "reflect-metadata";
import express, { Request, Response } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import { container, inject, injectable } from "tsyringe";
import {
  GetCodeFromCommitGit,
  GetCodeFromPullRequest,
  IGetCodeFromCommitGit,
  IGetCodeFromPullRequest,
} from "./GetCodeFromGit";
import { IPromptBuilder, ReviewPromptBuilder } from "./ReviewPromtBuilder";
import fs from "fs";

// load file .env
dotenv.config();

/** khởi tạo search */
const app = express();

/** port server chạy */
const PORT = 3000;

/** middlewares */
app.use(express.json());

/** model OpenAI mặc định */
const DEFAULT_OPENAI_MODEL = "openai/gpt-oss-120b:free";

/** token dùng để inject model OpenAI */
const KEY_OPENAI_MODEL = Symbol("OpenAIModel");

/** token dùng để inject OpenAI client */
const KEY_OPENAI_CLIENT = Symbol("OpenAIClient");

/** token dùng để inject AI service */
const KEY_AI = Symbol("AI");

/** token dùng để inject service lấy code từ commit */
const KEY_GET_CODE_FROM_COMMIT_GIT = Symbol("GetCodeFromCommitGit");

/** token dùng để inject service lấy code từ pull request */
const KEY_GET_CODE_FROM_PULL_REQUEST = Symbol("GetCodeFromPullRequest");

/** token dùng để inject prompt builder */
const KEY_PROMPT_BUILDER = Symbol("PromptBuilder");

/** token dùng để inject review code service */
const KEY_REVIEW_CODE = Symbol("ReviewCode");

/** tạo OpenAI client từ biến môi trường */
function createOpenAIClient(): OpenAI {
  return new OpenAI({
    baseURL: process.env.OPENAI_API_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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
  link_commit?: string[];
  /** link pull request */
  link_pull_request?: string[];
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
@injectable()
export class OPENAI implements IAI {
  constructor(
    /** model OpenAI */
    @inject(KEY_OPENAI_MODEL) private model: string = DEFAULT_OPENAI_MODEL,
    /** OpenAI client */
    @inject(KEY_OPENAI_CLIENT) private AI: OpenAI = createOpenAIClient()
  ) {}

  async exec(params: AIInput): Promise<AIOutput> {
    try {
      /** kết quả trả về */
      const RES =  await this.AI.chat.completions.create({
        model: this.model,

        messages: [
          ...(params.system_prompt ? [{
            role: "system" as const,
            content: params.system_prompt,
          }] : []),
          {
            role: "user" as const,
            content: params.user_prompt,
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
@injectable()
export class ReviewCode implements IReviewCode {
  constructor(
    /** openai */
    @inject(KEY_AI) private AI: IAI = new OPENAI(),
    /** lấy code từ commit git */
    @inject(KEY_GET_CODE_FROM_COMMIT_GIT)
    private GET_CODE_FROM_COMMIT_GIT: IGetCodeFromCommitGit = new GetCodeFromCommitGit(),
    /** lấy code từ pull request */
    @inject(KEY_GET_CODE_FROM_PULL_REQUEST)
    private GET_CODE_FROM_PULL_REQUEST: IGetCodeFromPullRequest = new GetCodeFromPullRequest(),
    /** dựng prompt review code */
    @inject(KEY_PROMPT_BUILDER)
    private PROMPT_BUILDER: IPromptBuilder = new ReviewPromptBuilder(),
  ) {}

  async exec(
    input: ReviewCodeInput
  ): Promise<ReviewCodeOutput> {
    try {
      /** danh sách link commit đã chuẩn hóa */
      const LINK_COMMIT = input.link_commit ?? [];

      /** danh sách link pull request đã chuẩn hóa */
      const LINK_PULL_REQUEST = input.link_pull_request ?? [];

      // nếu không có link commit và pull request thì báo lỗi
      if (LINK_COMMIT.length === 0 && LINK_PULL_REQUEST.length === 0) {
        throw new Error("Thiếu link commit hoặc link pull request");
      }

      /** danh sách code từ các commit git */
      const CODES_FROM_COMMIT = await Promise.all(
        LINK_COMMIT.map(async (link_commit) => {
          /** code từ từng commit git */
          const CODE = await this.GET_CODE_FROM_COMMIT_GIT.exec({
            link_commit,
            token: input.token,
          });

          return {
            url: link_commit,
            diff_text: CODE.code,
          };
        })
      );

      /** danh sách code từ các pull request */
      const CODES_FROM_PULL_REQUEST = await Promise.all(
        LINK_PULL_REQUEST.map(async (link_pull_request) => {
          /** code từ pull request */
          const CODE = await this.GET_CODE_FROM_PULL_REQUEST.exec({
            link_pull_request,
            token: input.token,
          });

          return {
            url: link_pull_request,
            diff_text: CODE.code,
          };
        })
      );
      
      /** style code */
      const STYLE_CODE = fs.readFileSync('./src/coding-standards.md', 'utf-8');

      /** prompt của review code */
      const PROMPT_REVIEW_CODE = this.PROMPT_BUILDER.build(
        [...CODES_FROM_COMMIT, ...CODES_FROM_PULL_REQUEST],
        STYLE_CODE,
        input.output_format,
      );

      /** kết quả AI */
      const RESULT = await this.AI.exec(PROMPT_REVIEW_CODE);

      return {
        output: RESULT?.output,
      };
    } catch (e) {
      throw e;
    }
  }
}

/** đăng ký model OpenAI mặc định */
container.register<string>(KEY_OPENAI_MODEL, {
  useValue: DEFAULT_OPENAI_MODEL,
});

/** đăng ký OpenAI client */
container.register<OpenAI>(KEY_OPENAI_CLIENT, {
  useFactory: () => createOpenAIClient(),
});

/** đăng ký AI service */
container.register<IAI>(KEY_AI, {
  useClass: OPENAI,
});

/** đăng ký service lấy code từ commit */
container.register<IGetCodeFromCommitGit>(KEY_GET_CODE_FROM_COMMIT_GIT, {
  useClass: GetCodeFromCommitGit,
});

/** đăng ký service lấy code từ pull request */
container.register<IGetCodeFromPullRequest>(KEY_GET_CODE_FROM_PULL_REQUEST, {
  useClass: GetCodeFromPullRequest,
});

/** đăng ký prompt builder */
container.register<IPromptBuilder>(KEY_PROMPT_BUILDER, {
  useClass: ReviewPromptBuilder,
});

/** đăng ký review code service */
container.register<IReviewCode>(KEY_REVIEW_CODE, {
  useClass: ReviewCode,
});

// api hello world
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// api review code
app.post("/review-code", async (req: Request, res: Response) => {
  try {
    const { link_commit, link_pull_request, token, output_format = "TEXT" } = req.body as {
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

    /** service review code được resolve từ DI container */
    const REVIEW_CODE = container.resolve<IReviewCode>(KEY_REVIEW_CODE);

    /** kết quả AI trả về */
    const RES = await REVIEW_CODE.exec({
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
