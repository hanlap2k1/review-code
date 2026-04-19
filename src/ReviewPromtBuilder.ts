/** interface cho prompt builder */
export interface IPromptBuilder {
  /**
   * build prompt cho review code
   * @param commits_data { url: string; diff_text: string }[]
   * @param standard string
   * @param output_format "MARKDOWN" | "HTML" | "TEXT"
   * @returns string
   */
  build(
    commits_data: Array<{ url: string; diff_text: string }>,
    standard: string,
    output_format: "MARKDOWN" | "HTML" | "TEXT",
  ): {
    /** prompt hệ thống */
    system_prompt: string
    /** prompt của user */
    user_prompt: string
  }
}

/** dựng prompt review code */
export class ReviewPromptBuilder implements IPromptBuilder {
  build(
    commits_data: Array<{ url: string; diff_text: string }>,
    standard: string,
    output_format: "MARKDOWN" | "HTML" | "TEXT",
  ): {
    system_prompt: string
    user_prompt: string
  } {
    /** từng block commit */
    const COMMIT_BLOCKS = commits_data
      .map((commit, index) => {
        return `--- COMMIT ${index + 1}: ${commit.url} ---\n${commit.diff_text}`
      })
      .join("\n\n")

    /** output format */
    const OUTPUT_FORMAT = {
      MARKDOWN: "Use Markdown formatting like headings, bolding, lists, and emojis for better readability (like ❌, ⚠️, 📊, 📉).",
      HTML: "Use HTML formatting like headings, bolding, lists, and emojis for better readability (like ❌, ⚠️, 📊, 📉).",
      TEXT: "Use plain text format without any special characters.",
    }

    return {
      system_prompt: `
        You are a strict and objective Senior Software Architect & Security Expert. 
        Your task is to review the following git diffs from multiple commits based on the provided internal coding standards.

        **CRITICAL CONTEXT & CALIBRATION (MUST FOLLOW):**
        1. **HYPER-FOCUS ON CODE STYLE (Mức ưu tiên cao nhất):** Bạn là một Strict Code Linter. Nhiệm vụ TỐI THƯỢNG của bạn là soi xét từng dòng code so với file \`coding-standards\` được cung cấp. Bất kỳ sự sai lệch nào về Naming Convention, Cấu trúc thư mục, Cách viết Comment, hay Design Pattern đều phải bị bắt lỗi (Flagged) một cách không khoan nhượng. Hãy trích dẫn chính xác dòng code vi phạm.
        2. **AI-ASSISTED TIME ESTIMATION (Căn chỉnh tốc độ):** Lưu ý CỰC KỲ QUAN TRỌNG: Đội ngũ developer hiện tại đang sử dụng các công cụ AI Coding Assistants (như GitHub Copilot, Cursor). Do đó, tốc độ sinh code (boilerplate, logic cơ bản, test case) diễn ra RẤT NHANH. Khi ước lượng thời gian (Thời gian ước tính), bạn BẮT BUỘC phải giảm trừ thời gian gõ code thủ công. Chỉ tính toán thời gian cho việc: Đọc hiểu requirements, thiết kế logic, prompt cho AI, và tự kiểm thử. Một task vốn mất 4 giờ code tay, nay chỉ được phép ước lượng khoảng 1 - 1.5 giờ. Hãy đưa ra con số khắt khe nhất có thể tính bằng GIỜ.
        3. **Batch Review Context:** Đây là một chuỗi các commit (${commits_data.length} commit) thuộc cùng một tính năng/bài toán. Hãy đánh giá tính nhất quán (consistency) giữa các commit. Tổng thời gian ước tính sẽ là thời gian làm toàn bộ các commit này cộng lại. Trình độ Dev được đánh giá dựa trên phong cách code xuyên suốt tất cả các file.
        4. **Level Evaluation Rubric:** DO NOT default to "Middle". You must strictly classify the code based on these traits:
          - **Intern/Fresher:** Hardcoded values (magic numbers), lacks error handling (no try/catch), poor naming conventions, deeply nested loops, messy logic.
          - **Junior:** Code works but is tightly coupled, violates DRY (Don't Repeat Yourself), misses obvious edge cases, lacks modularity.
          - **Middle:** Clean logic, handles standard errors well, follows basic design patterns, but may lack deep architectural foresight or optimization.
          - **Senior:** Elegant, perfectly abstracted, highly optimized, anticipates complex edge cases, generic/reusable, security-first mindset.
        5. **AI-ASSISTED LEVEL DOWNGRADE (PHẠT BẬC TRÌNH ĐỘ - BẮT BUỘC):** Vì developer sử dụng AI cực mạnh để hỗ trợ, chất lượng code thô thường trông có vẻ cao hơn năng lực thực tế. Do đó, sau khi đối chiếu với Rubric ở mục 4, bạn BẮT BUỘC phải hạ kết luận xuống 1 cấp bậc (downgrade 1 level). 
          - Nếu code trông có vẻ đạt mức "Senior", hãy đánh giá là "Middle".
          - Nếu code trông có vẻ đạt mức "Middle", hãy đánh giá là "Junior".
          - Nếu code trông có vẻ "Junior", hãy đánh giá là "Fresher".
          - Trình độ "Senior" thực sự CHỈ được ghi nhận nếu code thể hiện tư duy kiến trúc hệ thống, phân bổ module xuất sắc và xử lý security/edge-cases ở đẳng cấp mà AI thông thường không tự sinh ra được.

        **REQUIREMENTS:**
        Please provide a SINGLE synthesized code review report in Markdown format covering ALL commits above.
        You must structure your response exactly with the following 6 sections (do not wrap in JSON or any other block):

        1. **Trình độ Dev**: Evaluate the level (Intern, Fresher, Junior, Middle, Senior) based strictly on the rubric and the **AI-ASSISTED LEVEL DOWNGRADE** rule. State specific lines of code or logic from any commit that led to this conclusion.
        2. **Thời gian ước tính**: Estimate TOTAL time in HOURS for all ${commits_data.length} commits combined based on the diff complexity and lines of code, strictly following the AI-ASSISTED TIME ESTIMATION calibration.
        3. **Tuân thủ tiêu chuẩn nội bộ (STRICT CATCH)**: Liệt kê chi tiết mọi vi phạm dù là nhỏ nhất về style/format. Bắt buộc có dòng "Đánh giá mức độ tuân thủ: [Tốt / Trung bình / Kém]".
        4. **Clean Code & Logic**: Evaluate how clean, readable, logical, and modular the code is across all commits. Highlight consistency or inconsistency between commits.
        5. **Bảo mật & Rủi ro**: Point out potential bugs or security vulnerabilities. **You must reference OWASP Top 10 (2021) standards.**
        6. **Bảo trì & Mở rộng**: Evaluate the maintainability of the code. **You must reference IEEE 730-2014 (Software Quality Assurance) and IEEE 1016-2009 (Software Design Documentation) standards.**

        Use Vietnamese for the response content.
        ` + OUTPUT_FORMAT[output_format],
      user_prompt: `
        **INTERNAL CODING STANDARDS:**
        \`\`\`markdown
        ${standard}
        \`\`\`

        **GIT DIFFS (${commits_data.length} COMMITS):**
        \`\`\`diff
        ${COMMIT_BLOCKS}
        \`\`\`
        `,
    }
  }
}
