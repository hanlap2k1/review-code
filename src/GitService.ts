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

//#region lấy metadata từ link pull request
/** Output của get metadata from link pull request */
export interface GetMetaDataFromLinkPullRequestOutput {
  /** chủ sở hữu repo */
  OWNER: string;
  /** tên repo */
  REPO: string;
  /** pull request number */
  PULL_REQUEST_NUMBER: string;
}

/** interface lấy metadata từ link pull request */
export interface IGetMetaDataFromLinkPullRequest {
  exec(link_pull_request: string): GetMetaDataFromLinkPullRequestOutput;
}

/** lấy metadata từ link pull request */
export class GetMetaDataFromLinkPullRequest implements IGetMetaDataFromLinkPullRequest {
  constructor() {}

  exec(link_pull_request: string) {
    /** các thành phần trong link */
    const LINK_PULL_REQUEST_SPLIT = link_pull_request.split("/");
    /** chủ sở hữu repo */
    const OWNER = LINK_PULL_REQUEST_SPLIT[3];
    /** tên repo */
    const REPO = LINK_PULL_REQUEST_SPLIT[4];
    /** pull request number */
    const PULL_REQUEST_NUMBER = LINK_PULL_REQUEST_SPLIT[6];

    return {
      OWNER,
      REPO,
      PULL_REQUEST_NUMBER,
    }
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
