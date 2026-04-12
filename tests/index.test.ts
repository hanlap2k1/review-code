import assert from "node:assert/strict";
import test from "node:test";
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

/** Kiểu hộp tham chiếu dùng để lưu lại payload đã gửi lên OpenAI mock. */
type ChatCompletionPayloadBox = {
  current?: ChatCompletionPayload;
};

/**
 * Tạo mock OpenAI tối thiểu để kiểm thử lớp OPENAI.
 * @param payload_box Hộp tham chiếu dùng để lưu payload mà lớp OPENAI gửi đi.
 * @param response_content Nội dung giả lập mà mock OpenAI sẽ trả về.
 */
function createOpenAIMock(
  payload_box: ChatCompletionPayloadBox,
  response_content: string
): OpenAI {
  /** Mock OpenAI SDK tối thiểu cho unit test. */
  const OPENAI_MOCK = {
    chat: {
      completions: {
        /**
         * Nhận payload từ lớp OPENAI và trả về kết quả giả lập.
         * @param input Payload mà lớp OPENAI truyền tới SDK.
         */
        create: async (input: ChatCompletionPayload) => {
          // Lưu lại payload vừa nhận để assertion có thể kiểm tra.
          payload_box.current = input;

          // Trả về nội dung giả lập theo cấu trúc response của SDK.
          return {
            choices: [{ message: { content: response_content } }],
          };
        },
      },
    },
  } as unknown as OpenAI;

  // Trả về mock OpenAI để inject vào constructor.
  return OPENAI_MOCK;
}

/**
 * Tạo mock AI tối thiểu để kiểm thử lớp ReviewCode.
 * @param ai_calls Danh sách dùng để ghi nhận các lời gọi tới AI.
 * @param review_content Nội dung review giả lập mà AI sẽ trả về.
 */
function createReviewAiMock(ai_calls: AIInput[], review_content: string): IAI {
  /** Mock AI dùng để thay thế lời gọi thật trong unit test. */
  const AI_MOCK: IAI = {
    /**
     * Nhận prompt từ ReviewCode và trả về nội dung giả lập.
     * @param messages Dữ liệu prompt mà ReviewCode gửi sang AI.
     */
    exec: async (messages: AIInput) => {
      // Ghi nhận lời gọi AI để assertions kiểm tra lại sau.
      ai_calls.push(messages);

      // Trả về nội dung review giả lập.
      return review_content;
    },
  };

  // Trả về mock AI để inject vào ReviewCode.
  return AI_MOCK;
}

/**
 * Kiểm thử việc lớp OPENAI gửi đúng payload và trả về nội dung phản hồi.
 */
test(
  "OPENAI.exec gửi đúng payload và trả về nội dung từ choice đầu tiên",
  /**
   * Thực thi kịch bản có đầy đủ system prompt và user prompt.
   */
  async () => {
    /** Hộp tham chiếu chứa payload mà OpenAI mock nhận được. */
    const PAYLOAD_BOX: ChatCompletionPayloadBox = {};

    /** Mock OpenAI SDK dùng để chặn gọi mạng thật. */
    const OPENAI_MOCK = createOpenAIMock(PAYLOAD_BOX, "AI response");

    /** Instance lớp OPENAI đang được kiểm thử. */
    const OPENAI_INSTANCE = new OPENAI("demo-model", OPENAI_MOCK);

    /** Kết quả trả về từ phương thức exec. */
    // Thực thi phương thức exec với đầy đủ system prompt và user prompt.
    const RESULT = await OPENAI_INSTANCE.exec({
      system_prompt: "system prompt",
      user_prompt: "user prompt",
    });

    // Kiểm tra nội dung phản hồi trả về đúng với dữ liệu giả lập.
    assert.equal(RESULT, "AI response");

    // Kiểm tra payload gửi lên OpenAI SDK đúng model và messages.
    assert.deepEqual(PAYLOAD_BOX.current, {
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

/**
 * Kiểm thử việc lớp OPENAI bỏ qua system message khi không có system prompt.
 */
test(
  "OPENAI.exec bỏ qua system message khi không có system_prompt",
  /**
   * Thực thi kịch bản chỉ có user prompt.
   */
  async () => {
    /** Hộp tham chiếu chứa payload mà OpenAI mock nhận được. */
    const PAYLOAD_BOX: ChatCompletionPayloadBox = {};

    /** Mock OpenAI SDK dùng để chặn gọi mạng thật. */
    const OPENAI_MOCK = createOpenAIMock(PAYLOAD_BOX, "Only user");

    /** Instance lớp OPENAI đang được kiểm thử. */
    const OPENAI_INSTANCE = new OPENAI("demo-model", OPENAI_MOCK);

    // Thực thi phương thức exec chỉ với user prompt.
    await OPENAI_INSTANCE.exec({
      user_prompt: "user prompt",
    });

    // Kiểm tra payload chỉ còn lại user message như mong đợi.
    assert.deepEqual(PAYLOAD_BOX.current, {
      model: "demo-model",
      messages: [
        {
          role: "user",
          content: "user prompt",
        },
      ],
    });
  }
);

/**
 * Kiểm thử việc tách metadata từ link commit GitHub.
 */
test(
  "GetMetaDataFromLinkCommit.exec tách owner, repo và commit sha từ URL",
  /**
   * Thực thi kịch bản parse URL commit hợp lệ.
   */
  () => {
    /** Instance lớp parser metadata đang được kiểm thử. */
    const GET_METADATA_FROM_LINK_COMMIT_INSTANCE = new GetMetaDataFromLinkCommit();

    /** Metadata được tách ra từ URL commit. */
    // Thực thi parse URL commit để lấy metadata.
    const METADATA = GET_METADATA_FROM_LINK_COMMIT_INSTANCE.exec(
      "https://github.com/openai/openai-node/commit/abc123"
    );

    // Kiểm tra metadata được tách đúng owner, repo và commit sha.
    assert.deepEqual(METADATA, {
      OWNER: "openai",
      REPO: "openai-node",
      COMMIT_SHA: "abc123",
    });
  }
);

/**
 * Kiểm thử việc gọi GitHub API đúng URL và headers khi lấy diff từ commit.
 */
test(
  "GetCodeFromCommitGit.exec gọi GitHub API với URL và headers đúng",
  /**
   * Thực thi kịch bản gọi GitHub API bằng fetch mock.
   */
  async () => {
    /** Hàm fetch gốc trước khi bị mock. */
    const ORIGINAL_FETCH = globalThis.fetch;

    /** Danh sách lời gọi fetch được ghi nhận trong unit test. */
    const FETCH_CALLS: Array<{
      input: string | URL | Request;
      init?: RequestInit;
    }> = [];

    // Ghi đè fetch toàn cục để chặn gọi mạng thật.
    globalThis.fetch =
      /**
       * Mô phỏng lời gọi fetch tới GitHub API.
       * @param input URL hoặc Request được truyền vào fetch.
       * @param init Cấu hình request đi kèm khi gọi fetch.
       */
      (async (input: string | URL | Request, init?: RequestInit) => {
        // Ghi nhận URL và options của lời gọi fetch hiện tại.
        FETCH_CALLS.push({ input, init });

        // Trả về response giả lập có phần thân diff.
        return {
          /**
           * Trả về nội dung diff giả lập từ GitHub API.
           */
          text: async () => {
            // Trả về chuỗi diff giả lập cho unit test.
            return "diff content";
          },
        } as Response;
      }) as typeof fetch;

    try {
      /** Mock lớp tách metadata từ link commit để tránh phụ thuộc URL thật. */
      const GET_METADATA_FROM_LINK_COMMIT_MOCK: IGetMetaDataFromLinkCommit = {
        /**
         * Trả về metadata cố định để phục vụ unit test.
         * @param _link_commit Link commit được truyền vào phương thức exec.
         */
        exec: (_link_commit: string) => {
          // Trả về metadata giả lập cho repo và commit cần test.
          return {
            OWNER: "octocat",
            REPO: "hello-world",
            COMMIT_SHA: "sha123",
          };
        },
      };

      /** Instance lớp GetCodeFromCommitGit đang được kiểm thử. */
      const GET_CODE_FROM_COMMIT_GIT_INSTANCE = new GetCodeFromCommitGit(
        GET_METADATA_FROM_LINK_COMMIT_MOCK
      );

      /** Kết quả diff trả về từ phương thức exec. */
      // Thực thi phương thức exec để lấy diff của commit.
      const RESULT = await GET_CODE_FROM_COMMIT_GIT_INSTANCE.exec(
        "ignored-link",
        "github-token"
      );

      // Kiểm tra nội dung diff trả về đúng như dữ liệu giả lập.
      assert.equal(RESULT, "diff content");

      // Kiểm tra fetch chỉ được gọi đúng một lần.
      assert.equal(FETCH_CALLS.length, 1);

      // Kiểm tra URL GitHub API được xây dựng đúng từ metadata.
      assert.equal(
        FETCH_CALLS[0]?.input,
        "https://api.github.com/repos/octocat/hello-world/commits/sha123"
      );

      // Kiểm tra headers gửi lên GitHub API đúng định dạng yêu cầu.
      assert.deepEqual(FETCH_CALLS[0]?.init, {
        headers: {
          Authorization: "Bearer github-token",
          Accept: "application/vnd.github.diff",
        },
      });
    } finally {
      // Khôi phục lại hàm fetch gốc sau khi kết thúc test.
      globalThis.fetch = ORIGINAL_FETCH;
    }
  }
);

/**
 * Kiểm thử việc lớp ReviewCode ghép prompt đúng với từng định dạng output.
 */
test(
  "ReviewCode.exec ghép prompt đúng cho từng output format",
  /**
   * Thực thi kịch bản lặp qua toàn bộ các định dạng output được hỗ trợ.
   */
  async () => {
    /** Bảng ánh xạ định dạng output sang phần mô tả prompt tương ứng. */
    const OUTPUT_FORMAT: Record<OutputFormat, string> = {
      MARKDOWN: "Output kết quả trả về dạng markdown",
      HTML: "Output kết quả trả về dạng html",
      TEXT: "Output kết quả trả về dạng text",
    };

    /** Danh sách cặp định dạng và mô tả để duyệt kiểm thử tuần tự. */
    const OUTPUT_FORMAT_ENTRIES = Object.entries(OUTPUT_FORMAT) as Array<
      [OutputFormat, string]
    >;

    // Duyệt qua từng định dạng output để kiểm tra logic ghép prompt.
    for (const [FORMAT, EXPECTED_OUTPUT_TEXT] of OUTPUT_FORMAT_ENTRIES) {
      /** Mock lớp lấy code từ commit để tránh gọi GitHub thật. */
      const GET_CODE_FROM_COMMIT_GIT_MOCK: IGetCodeFromCommitGit = {
        /**
         * Trả về diff giả lập cho lớp ReviewCode.
         * @param link_commit Link commit được truyền vào phương thức exec.
         * @param token Token GitHub được truyền vào phương thức exec.
         */
        exec: async (link_commit: string, token: string) => {
          // Kiểm tra link commit được truyền xuống đúng như mong đợi.
          assert.equal(link_commit, "https://github.com/org/repo/commit/sha");

          // Kiểm tra token được truyền xuống đúng như mong đợi.
          assert.equal(token, "token-123");

          // Trả về nội dung diff giả lập cho bước gọi AI.
          return "diff body";
        },
      };

      /** Danh sách lời gọi AI được ghi nhận để kiểm tra assertions. */
      const AI_CALLS: AIInput[] = [];

      /** Mock AI dùng để chặn lời gọi thật từ ReviewCode. */
      const AI_MOCK = createReviewAiMock(AI_CALLS, `${FORMAT} review`);

      /** Instance lớp ReviewCode đang được kiểm thử. */
      const REVIEW_CODE_INSTANCE = new ReviewCode(
        AI_MOCK,
        GET_CODE_FROM_COMMIT_GIT_MOCK
      );

      /** Kết quả trả về từ ReviewCode.exec. */
      // Thực thi ReviewCode.exec với định dạng output hiện tại.
      const RESULT = await REVIEW_CODE_INSTANCE.exec(
        "https://github.com/org/repo/commit/sha",
        "token-123",
        FORMAT
      );

      // Kiểm tra nội dung review trả về đúng với định dạng hiện tại.
      assert.equal(RESULT, `${FORMAT} review`);

      // Kiểm tra prompt gửi cho AI được ghép đúng system prompt và user prompt.
      assert.deepEqual(AI_CALLS, [
        {
          system_prompt: PROMPT + EXPECTED_OUTPUT_TEXT,
          user_prompt: "Dưới đây là commit cần review:\n\ndiff body",
        },
      ]);
    }
  }
);
