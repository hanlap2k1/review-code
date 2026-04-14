import OpenAI from "openai";
import {
  GetCodeFromCommitGit,
  GetMetaDataFromLinkCommit,
  OPENAI,
  ReviewCode,
} from "../src/index";
import { PROMPT } from "../src/prompt";

import type {
  AIInput,
  GetCodeFromCommitGitInput,
  IAI,
  IGetCodeFromCommitGit,
  IGetMetaDataFromLinkCommit,
} from "../src/index";

/** Kiểu định dạng output được hỗ trợ trong unit test. */
type OutputFormat = "MARKDOWN" | "HTML" | "TEXT";

/** Kiểu payload gửi tới OpenAI chat completions trong unit test. */
type ChatCompletionPayload = {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
};

/** Kiểu hộp tham chiếu dùng để lưu payload đã gửi lên OpenAI mock. */
type ChatCompletionPayloadBox = {
  current?: ChatCompletionPayload;
};

/** Bảng ánh xạ định dạng output sang đoạn text prompt tương ứng. */
const OUTPUT_FORMAT_PROMPTS: Record<OutputFormat, string> = {
  MARKDOWN: "Output kết quả trả về dạng markdown",
  HTML: "Output kết quả trả về dạng html",
  TEXT: "Output kết quả trả về dạng text",
};

/**
 * Tạo mock OpenAI tối thiểu để kiểm thử lớp OPENAI.
 * @param payload_box Hộp tham chiếu dùng để lưu payload mà lớp OPENAI gửi đi.
 * @param response_content Nội dung giả lập mà mock OpenAI sẽ trả về.
 * @returns Mock OpenAI dùng cho unit test.
 */
function createOpenAIMock(
  payload_box: ChatCompletionPayloadBox,
  response_content: string
): OpenAI {
  // Trả về object giả lập theo cấu trúc SDK của OpenAI.
  return {
    chat: {
      completions: {
        /**
         * Ghi nhận payload mà lớp OPENAI truyền vào và trả về response giả.
         * @param input Payload được gửi vào OpenAI SDK.
         * @returns Response giả theo cấu trúc choices của SDK.
         */
        create: jest.fn(async (input: ChatCompletionPayload) => {
          // Lưu payload hiện tại để phục vụ assertion.
          payload_box.current = input;

          // Trả về nội dung giả lập ở choice đầu tiên.
          return {
            choices: [{ message: { content: response_content } }],
          };
        }),
      },
    },
  } as unknown as OpenAI;
}

/**
 * Tạo mock AI tối thiểu để kiểm thử lớp ReviewCode.
 * @param ai_calls Danh sách dùng để ghi nhận các lần gọi tới AI.
 * @param review_content Nội dung review giả lập mà AI sẽ trả về.
 * @returns Mock AI dùng cho unit test.
 */
function createReviewAiMock(
  ai_calls: AIInput[],
  review_content: string
): IAI {
  // Trả về object AI giả lập với hàm exec.
  return {
    /**
     * Ghi nhận prompt mà ReviewCode gửi sang AI và trả về nội dung giả.
     * @param messages Dữ liệu prompt được gửi tới AI.
     * @returns Nội dung review giả lập.
     */
    exec: jest.fn(async (messages: AIInput) => {
      // Ghi nhận lần gọi AI hiện tại.
      ai_calls.push(messages);

      // Trả về object output giả lập theo contract hiện tại.
      return {
        output: review_content,
      };
    }),
  };
}

/** Nhóm test cho lớp OPENAI. */
describe("OPENAI", () => {
  /** Kiểm thử việc gửi đầy đủ system prompt và user prompt. */
  it(
    "gửi đúng payload và trả về nội dung từ choice đầu tiên",
    async () => {
      /** Hộp tham chiếu dùng để giữ payload gửi vào mock OpenAI. */
      const PAYLOAD_BOX: ChatCompletionPayloadBox = {};

      /** Mock OpenAI dùng để chặn lời gọi thật. */
      const OPENAI_MOCK = createOpenAIMock(PAYLOAD_BOX, "AI response");

      /** Instance OPENAI đang được kiểm thử. */
      const OPENAI_INSTANCE = new OPENAI("demo-model", OPENAI_MOCK);

      /** Kết quả trả về từ phương thức exec. */
      const RESULT = await OPENAI_INSTANCE.exec({
        system_prompt: "system prompt",
        user_prompt: "user prompt",
      });

      // Kiểm tra nội dung response nhận được theo contract hiện tại.
      expect(RESULT).toEqual({
        output: "AI response",
      });

      // Kiểm tra payload đã gửi đúng model và messages.
      expect(PAYLOAD_BOX.current).toEqual({
        model: "demo-model",
        messages: [
          {
            role: "system",
            content: "system prompt",
          },
          {
            role: "user",
            content: "user prompt",
          },
        ],
      });
    }
  );

  /** Kiểm thử việc bỏ qua system message khi không có system_prompt. */
  it("bỏ qua system message khi không có system_prompt", async () => {
    /** Hộp tham chiếu dùng để giữ payload gửi vào mock OpenAI. */
    const PAYLOAD_BOX: ChatCompletionPayloadBox = {};

    /** Mock OpenAI dùng để chặn lời gọi thật. */
    const OPENAI_MOCK = createOpenAIMock(PAYLOAD_BOX, "Only user");

    /** Instance OPENAI đang được kiểm thử. */
    const OPENAI_INSTANCE = new OPENAI("demo-model", OPENAI_MOCK);

    // Thực thi hàm exec chỉ với user_prompt.
    await OPENAI_INSTANCE.exec({
      user_prompt: "user prompt",
    });

    // Kiểm tra payload chỉ còn user message.
    expect(PAYLOAD_BOX.current).toEqual({
      model: "demo-model",
      messages: [
        {
          role: "user",
          content: "user prompt",
        },
      ],
    });
  });
});

/** Nhóm test cho lớp GetMetaDataFromLinkCommit. */
describe("GetMetaDataFromLinkCommit", () => {
  /** Kiểm thử việc tách metadata từ URL commit GitHub. */
  it("tách owner, repo và commit sha từ URL", () => {
    /** Instance parser metadata đang được kiểm thử. */
    const GET_METADATA_FROM_LINK_COMMIT_INSTANCE = new GetMetaDataFromLinkCommit();

    /** Metadata được tách từ URL commit. */
    const METADATA = GET_METADATA_FROM_LINK_COMMIT_INSTANCE.exec(
      "https://github.com/openai/openai-node/commit/abc123"
    );

    // Kiểm tra metadata được tách đúng như mong đợi.
    expect(METADATA).toEqual({
      OWNER: "openai",
      REPO: "openai-node",
      COMMIT_SHA: "abc123",
    });
  });
});

/** Nhóm test cho lớp GetCodeFromCommitGit. */
describe("GetCodeFromCommitGit", () => {
  /** Kiểm thử việc gọi GitHub API với URL và headers chính xác. */
  it("gọi GitHub API với URL và headers đúng", async () => {
    /** Hàm fetch gốc để khôi phục sau khi test kết thúc. */
    const ORIGINAL_FETCH = globalThis.fetch;

    /** Danh sách ghi nhận các lần gọi fetch. */
    const FETCH_CALLS: Array<{
      input: string | URL | Request;
      init?: RequestInit;
    }> = [];

    // Ghi đè fetch để chặn lời gọi mạng thật.
    globalThis.fetch = jest.fn(
      /**
       * Mô phỏng lời gọi fetch tới GitHub API.
       * @param input URL hoặc Request được truyền vào fetch.
       * @param init Cấu hình request đi kèm.
       * @returns Response giả chứa nội dung diff.
       */
      async (input: string | URL | Request, init?: RequestInit) => {
        // Ghi nhận lời gọi fetch hiện tại.
        FETCH_CALLS.push({ input, init });

        // Trả về response giả có phần text.
        return {
          /**
           * Trả về nội dung diff giả lập.
           * @returns Chuỗi diff giả lập.
           */
          text: async () => "diff content",
        } as Response;
      }
    ) as typeof fetch;

    try {
      /** Mock lớp tách metadata để không phụ thuộc vào URL thật. */
      const GET_METADATA_FROM_LINK_COMMIT_MOCK: IGetMetaDataFromLinkCommit = {
        /**
         * Trả về metadata cố định cho unit test.
         * @param _link_commit Link commit đầu vào.
         * @returns Metadata giả lập.
         */
        exec: (_link_commit: string) => ({
          OWNER: "octocat",
          REPO: "hello-world",
          COMMIT_SHA: "sha123",
        }),
      };

      /** Instance lớp GetCodeFromCommitGit đang được kiểm thử. */
      const GET_CODE_FROM_COMMIT_GIT_INSTANCE = new GetCodeFromCommitGit(
        GET_METADATA_FROM_LINK_COMMIT_MOCK
      );

      /** Nội dung diff trả về từ phương thức exec. */
      const RESULT = await GET_CODE_FROM_COMMIT_GIT_INSTANCE.exec({
        link_commit: "ignored-link",
        token: "github-token",
      });

      // Kiểm tra nội dung diff trả về theo contract hiện tại.
      expect(RESULT).toEqual({
        code: "diff content",
      });

      // Kiểm tra chỉ có một lần gọi fetch.
      expect(FETCH_CALLS).toHaveLength(1);

      // Kiểm tra URL GitHub API được xây dựng chính xác.
      expect(FETCH_CALLS[0]?.input).toBe(
        "https://api.github.com/repos/octocat/hello-world/commits/sha123"
      );

      // Kiểm tra headers gửi đi đúng yêu cầu.
      expect(FETCH_CALLS[0]?.init).toEqual({
        headers: {
          Authorization: "Bearer github-token",
          Accept: "application/vnd.github.diff",
        },
      });
    } finally {
      // Khôi phục fetch gốc sau khi test hoàn tất.
      globalThis.fetch = ORIGINAL_FETCH;
    }
  });
});

/** Nhóm test cho lớp ReviewCode. */
describe("ReviewCode", () => {
  /** Danh sách các case output format cần được kiểm thử. */
  const OUTPUT_FORMAT_ENTRIES = Object.entries(
    OUTPUT_FORMAT_PROMPTS
  ) as Array<[OutputFormat, string]>;

  /** Kiểm thử việc ghép prompt đúng với từng định dạng output khi có nhiều commit. */
  it.each(OUTPUT_FORMAT_ENTRIES)(
    "ghép prompt đúng cho output format %s",
    async (FORMAT: OutputFormat, EXPECTED_OUTPUT_TEXT: string) => {
      /** Mock lớp lấy code từ commit git. */
      const GET_CODE_FROM_COMMIT_GIT_MOCK: IGetCodeFromCommitGit = {
        /**
         * Trả về diff giả lập cho lớp ReviewCode.
         * @param input Input lấy code từ commit git.
         * @returns Object chứa nội dung diff giả lập.
         */
        exec: jest.fn(async (input: GetCodeFromCommitGitInput) => {
          // Kiểm tra token được truyền xuống đúng như mong đợi.
          expect(input.token).toBe("token-123");

          // Trả về object chứa nội dung diff giả lập cho bước gọi AI.
          return {
            code: `diff for ${input.link_commit}`,
          };
        }),
      };

      /** Danh sách ghi nhận các lần gọi tới AI. */
      const AI_CALLS: AIInput[] = [];

      /** Mock AI dùng để chặn lời gọi thật. */
      const AI_MOCK = createReviewAiMock(AI_CALLS, `${FORMAT} review`);

      /** Instance lớp ReviewCode đang được kiểm thử. */
      const REVIEW_CODE_INSTANCE = new ReviewCode(
        AI_MOCK,
        GET_CODE_FROM_COMMIT_GIT_MOCK
      );

      /** Kết quả trả về từ phương thức ReviewCode.exec. */
      const RESULT = await REVIEW_CODE_INSTANCE.exec({
        link_commit: [
          "https://github.com/org/repo/commit/sha-1",
          "https://github.com/org/repo/commit/sha-2",
        ],
        token: "token-123",
        output_format: FORMAT,
      });

      // Kiểm tra nội dung review trả về đúng theo contract hiện tại.
      expect(RESULT).toEqual({
        output: `${FORMAT} review`,
      });

      // Kiểm tra hàm lấy code được gọi đủ cho từng commit.
      expect(GET_CODE_FROM_COMMIT_GIT_MOCK.exec).toHaveBeenCalledTimes(2);

      // Kiểm tra lần gọi đầu tiên chứa commit thứ nhất.
      expect(GET_CODE_FROM_COMMIT_GIT_MOCK.exec).toHaveBeenNthCalledWith(1, {
        link_commit: "https://github.com/org/repo/commit/sha-1",
        token: "token-123",
      });

      // Kiểm tra lần gọi thứ hai chứa commit thứ hai.
      expect(GET_CODE_FROM_COMMIT_GIT_MOCK.exec).toHaveBeenNthCalledWith(2, {
        link_commit: "https://github.com/org/repo/commit/sha-2",
        token: "token-123",
      });

      // Kiểm tra prompt gửi tới AI được ghép đúng.
      expect(AI_CALLS).toEqual([
        {
          system_prompt: PROMPT + EXPECTED_OUTPUT_TEXT,
          user_prompt:
            "Dưới đây là các commit cần review:\n\n" +
            "Commit 1: https://github.com/org/repo/commit/sha-1\n\n" +
            "diff for https://github.com/org/repo/commit/sha-1\n\n" +
            "====================\n\n" +
            "Commit 2: https://github.com/org/repo/commit/sha-2\n\n" +
            "diff for https://github.com/org/repo/commit/sha-2",
        },
      ]);
    }
  );
});
