//#region lấy metadata từ link commit
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

/** lấy metadata từ link commit */
export class GetMetaDataFromLinkCommit implements IGetMetaDataFromLinkCommit {
  /** service parse link github dùng chung */
  private PARSE_GITHUB_CODE_LINK: IParseGithubCodeLink = new ParseGithubCodeLink();

  constructor() {}

  /**
   * lấy metadata từ link commit
   * @param link_commit link commit github
   */
  exec(link_commit: string) {
    /** metadata chuẩn hoá của link github */
    const PARSED_LINK = this.PARSE_GITHUB_CODE_LINK.exec(link_commit);

    // nếu link không phải commit thì báo lỗi
    if (PARSED_LINK.TYPE !== "COMMIT") {
      throw new Error("Link commit không hợp lệ");
    }

    /** chủ sở hữu repo */
    const OWNER = PARSED_LINK.OWNER;
    /** tên repo */
    const REPO = PARSED_LINK.REPO;
    /** commit sha */
    const COMMIT_SHA = PARSED_LINK.COMMIT_SHA;

    return {
      OWNER,
      REPO,
      COMMIT_SHA,
    }
  }
}

//#endregion

//#region kiểm tra xem file có nên bỏ khi view hay không
/** interface kiểm tra xem file có nên bỏ hay không */
export interface IShouldExcludeFile {
  exec(filename: string): boolean;
}

/** class kiểm tra xem file có nên bỏ hay không */
export class ShouldExcludeFile implements IShouldExcludeFile {
  constructor() {}

  exec(filename: string) {
    /** danh sách file và folder nên bỏ khi review */
    const EXCLUDED_PATTERNS = [
      /^pnpm-lock\.yaml$/i,
      /^package-lock\.json$/i,
      /^yarn\.lock$/i,

      /^dist\//i,
      /^build\//i,
      /^coverage\//i,
      /^\.next\//i,
      /^\.nuxt\//i,
      /^\.output\//i,
      /^\.cache\//i,

      /\/__snapshots__\//i,
      /\.snap$/i,

      /\.map$/i,
      /\.min\.js$/i,
      /\.bundle\.js$/i,

      /(^|\/)generated\//i,
      /\.generated\./i,
      /(^|\/)vendor\//i,

      /\.(png|jpg|jpeg|gif|webp|mp4|mov|pdf|zip|ico)$/i,
    ];

    /** kiểm tra xem file có nên bỏ hay không */
    return EXCLUDED_PATTERNS.some((pattern) => {
      pattern.test(filename)
    });
  }
}
//#endregion

//#region kiểm tra xem đoạn thay đổi có giá trị để review hay không
/** interface kiểm tra xem đoạn thay đổi có giá trị để review hay không */
export interface IHasUsefulPatch {
  exec(patch: string): boolean;
}

/** class kiểm tra xem đoạn thay đổi có giá trị để review hay không */
export class HasUsefulPatch implements IHasUsefulPatch {
  constructor() {}

  exec(patch: string) {
    /** nếu không có patch thì return false */
    if (!patch) {
      return false;
    }

    /** những dòng có giá trị (được tính là code) */
    const MEANING_FULL_LINES = patch
      // split bằng \n
      .split("\n")
      // chỉ giữ các dòng thay đổi code
      .filter((line) => line.startsWith("+") || line.startsWith("-"))
      // bỏ các dòng tiêu đề
      .filter((line) => !line.startsWith("+++") && !line.startsWith("---"));

    return MEANING_FULL_LINES.length > 0;
  }
}
//#endregion

//#region parse link github dùng chung
/** Output của parse link commit github */
export interface ParseGithubCommitLinkOutput {
  /** loại link github */
  TYPE: "COMMIT";
  /** chủ sở hữu repo */
  OWNER: string;
  /** tên repo */
  REPO: string;
  /** commit sha */
  COMMIT_SHA: string;
}

/** Output của parse link pull request github */
export interface ParseGithubPullRequestLinkOutput {
  /** loại link github */
  TYPE: "PULL_REQUEST";
  /** chủ sở hữu repo */
  OWNER: string;
  /** tên repo */
  REPO: string;
  /** số pull request */
  PULL_REQUEST_NUMBER: string;
}

/** Output của parse link commit trong pull request github */
export interface ParseGithubPullRequestCommitLinkOutput {
  /** loại link github */
  TYPE: "PULL_REQUEST_COMMIT";
  /** chủ sở hữu repo */
  OWNER: string;
  /** tên repo */
  REPO: string;
  /** số pull request */
  PULL_REQUEST_NUMBER: string;
  /** commit sha */
  COMMIT_SHA: string;
}

/** union output của parse link github */
export type ParseGithubCodeLinkOutput =
  | ParseGithubCommitLinkOutput
  | ParseGithubPullRequestLinkOutput
  | ParseGithubPullRequestCommitLinkOutput;

/** interface parse link github dùng chung */
export interface IParseGithubCodeLink {
  exec(link: string): ParseGithubCodeLinkOutput;
}

/** class parse link github dùng chung */
export class ParseGithubCodeLink implements IParseGithubCodeLink {
  constructor() {}

  /**
   * parse link github thành metadata chuẩn hoá
   * @param link link github cần parse
   */
  exec(link: string): ParseGithubCodeLinkOutput {
    /** đối tượng URL được parse từ link github */
    const URL_INSTANCE = new URL(link);
    /** hostname của link github */
    const HOSTNAME = URL_INSTANCE.hostname.toLowerCase();
    /** danh sách segment trong pathname github */
    const PATH_SEGMENTS = URL_INSTANCE.pathname.split("/").filter(Boolean);
    /** owner của repo */
    const OWNER = PATH_SEGMENTS[0];
    /** tên repo */
    const REPO = PATH_SEGMENTS[1];
    /** loại resource github */
    const RESOURCE = PATH_SEGMENTS[2];
    /** id chính của resource github */
    const RESOURCE_ID = PATH_SEGMENTS[3];
    /** resource con của github */
    const SUB_RESOURCE = PATH_SEGMENTS[4];
    /** id của resource con */
    const SUB_RESOURCE_ID = PATH_SEGMENTS[5];

    // nếu hostname không phải github thì báo lỗi
    if (HOSTNAME !== "github.com") {
      throw new Error("Link GitHub không hợp lệ");
    }

    // nếu link là commit trực tiếp thì trả về metadata commit
    if (RESOURCE === "commit" && RESOURCE_ID) {
      return {
        TYPE: "COMMIT",
        OWNER,
        REPO,
        COMMIT_SHA: RESOURCE_ID,
      };
    }

    // nếu link là pull request thường thì trả về metadata pull request
    if (RESOURCE === "pull" && RESOURCE_ID && !SUB_RESOURCE) {
      return {
        TYPE: "PULL_REQUEST",
        OWNER,
        REPO,
        PULL_REQUEST_NUMBER: RESOURCE_ID,
      };
    }

    // nếu link là commit nằm trong pull request thì trả về metadata pull request commit
    if (
      RESOURCE === "pull"
      && RESOURCE_ID
      && (SUB_RESOURCE === "changes" || SUB_RESOURCE === "commits")
      && SUB_RESOURCE_ID
    ) {
      return {
        TYPE: "PULL_REQUEST_COMMIT",
        OWNER,
        REPO,
        PULL_REQUEST_NUMBER: RESOURCE_ID,
        COMMIT_SHA: SUB_RESOURCE_ID,
      };
    }

    throw new Error("Link GitHub chưa được hỗ trợ");
  }
}
//#endregion

//#region lấy metadata từ link pull request
/** Output của get metadata from link pull request */
export interface GetMetaDataFromLinkPullRequestOutput {
  /** chủ sở hữu repo */
  OWNER: string;
  /** tên repo */
  REPO: string;
  /** pull request number */
  PULL_REQUEST_NUMBER: string;
  CHANGE_COMMIT_SHA?: string;
}

/** interface lấy metadata từ link pull request */
export interface IGetMetaDataFromLinkPullRequest {
  exec(link_pull_request: string): GetMetaDataFromLinkPullRequestOutput;
}

/** lấy metadata từ link pull request */
export class GetMetaDataFromLinkPullRequest implements IGetMetaDataFromLinkPullRequest {
  /** service parse link github dùng chung */
  private PARSE_GITHUB_CODE_LINK: IParseGithubCodeLink = new ParseGithubCodeLink();

  constructor() {}

  /**
   * lấy metadata từ link pull request
   * @param link_pull_request link pull request github
   */
  exec(link_pull_request: string) {
    /** metadata chuẩn hoá của link pull request */
    const PARSED_LINK = this.PARSE_GITHUB_CODE_LINK.exec(link_pull_request);

    // nếu link là pull request thường thì trả về metadata pull request
    if (PARSED_LINK.TYPE === "PULL_REQUEST") {
      return {
        OWNER: PARSED_LINK.OWNER,
        REPO: PARSED_LINK.REPO,
        PULL_REQUEST_NUMBER: PARSED_LINK.PULL_REQUEST_NUMBER,
        CHANGE_COMMIT_SHA: undefined,
      }
    }

    // nếu link là commit nằm trong pull request thì trả về metadata pull request commit
    if (PARSED_LINK.TYPE === "PULL_REQUEST_COMMIT") {
      return {
        OWNER: PARSED_LINK.OWNER,
        REPO: PARSED_LINK.REPO,
        PULL_REQUEST_NUMBER: PARSED_LINK.PULL_REQUEST_NUMBER,
        CHANGE_COMMIT_SHA: PARSED_LINK.COMMIT_SHA,
      }
    }

    throw new Error("Link pull request không hợp lệ")
  }
}
//#endregion

//#region lấy các code thay để để review từ các files git trả về
/** dữ liệu của file thay đổi */
export interface GithubCommitFile {
  /** tên file */
  filename: string;
  /** trạng thái */
  status: string;
  /** patch thay đổi */
  patch?: string;
}

/** interface lấy các code thay để để review từ các files git trả về */
export interface IGetCodeFromFiles {
  exec(files: GithubCommitFile[]): string;
}

/** class lấy các code thay để để review từ các files git trả về */
export class GetCodeFromFiles implements IGetCodeFromFiles {
  constructor(
    /** service kiểm tra xem file có nên bỏ khi view hay không */
    private SHOULD_EXCLUDE_FILE: IShouldExcludeFile = new ShouldExcludeFile(),
    /** service kiểm tra xem đoạn thay đổi có giá trị để review hay không */
    private HAS_USEFUL_PATCH: IHasUsefulPatch = new HasUsefulPatch(),
  ) {}

  exec(files: GithubCommitFile[]) {
    /** các file bỏ qua */
    const IGNORED_FILES: string[] = [];
    /** các file có thể dùng để review */
    const REVIEWABLE_FILES: GithubCommitFile[] = [];

    // lặp qua tất cả các file
    for (const file of files) {

      // nếu nên bỏ thì thêm vào danh sách bỏ qua
      if (this.SHOULD_EXCLUDE_FILE.exec(file.filename)) {
        IGNORED_FILES.push(file.filename);
        continue;
      }

      // nếu không có giá trị cũng thêm vào danh sách bỏ qua
      if (!this.HAS_USEFUL_PATCH.exec(file.patch!)) {
        IGNORED_FILES.push(file.filename);
        continue;
      }

      // thêm vào danh sách sẽ review
      REVIEWABLE_FILES.push({
        filename: file.filename,
        status: file.status,
        patch: file.patch!,
      });
    }
    
    /** code review */
    const CODE = REVIEWABLE_FILES.map((file) =>
      [
        `File: ${file.filename}`,
        `Status: ${file.status}`,
        "```diff",
        file.patch,
        "```",
      ].join("\n"),
    ).join("\n\n");

    return CODE;
  }
}

//#endregion
