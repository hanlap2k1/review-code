import {
  GetCodeFromFiles,
  GithubCommitFile,
  IGetCodeFromFiles,
  IParseGithubCodeLink,
  ParseGithubCodeLink,
  ParseGithubCodeLinkOutput,
} from "./GitService"

//#region get code from commit git
/** dữ liệu git trả về sau khi parse */
interface GithubCommitResponse {
  files?: GithubCommitFile[]
}

/** Input của get github files from link */
interface GetGithubFilesFromLinkInput {
  /** link github */
  link: string
  /** token github */
  token: string
}

/** interface lấy danh sách file thay đổi từ link github */
interface IGetGithubFilesFromLink {
  exec(input: GetGithubFilesFromLinkInput): Promise<GithubCommitFile[]>
}

/** class lấy danh sách file thay đổi từ link github */
class GetGithubFilesFromLink implements IGetGithubFilesFromLink {
  /** service parse link github dùng chung */
  private PARSE_GITHUB_CODE_LINK: IParseGithubCodeLink = new ParseGithubCodeLink()

  constructor() {}

  /**
   * lấy danh sách file thay đổi từ link github
   * @param input input chứa link github và token github
   */
  async exec(input: GetGithubFilesFromLinkInput): Promise<GithubCommitFile[]> {
    /** metadata chuẩn hoá của link github */
    const PARSED_LINK = this.PARSE_GITHUB_CODE_LINK.exec(input.link)

    /** response trả về từ GitHub API */
    const RES = await fetch(
      this.buildApiUrl(PARSED_LINK),
      {
        headers: this.buildHeaders(input.token),
      },
    )

    // nếu lỗi thì trả về lỗi
    if (!RES.ok) {
      throw new Error(`GitHub API error: ${RES.status} ${RES.statusText}`)
    }

    /** dữ liệu sau khi parse */
    const PARSED_DATA = (await RES.json()) as GithubCommitResponse | GithubCommitFile[]

    // nếu link là commit trực tiếp hoặc commit nằm trong pull request thì lấy field files
    if (
      PARSED_LINK.TYPE === "COMMIT"
      || PARSED_LINK.TYPE === "PULL_REQUEST_COMMIT"
    ) {
      return (PARSED_DATA as GithubCommitResponse).files ?? []
    }

    return (PARSED_DATA as GithubCommitFile[]) ?? []
  }

  /**
   * build GitHub API url từ link đã parse
   * @param parsed_link metadata chuẩn hoá của link github
   */
  private buildApiUrl(parsed_link: ParseGithubCodeLinkOutput): string {
    // nếu link là commit trực tiếp thì trả về url commit
    if (parsed_link.TYPE === "COMMIT") {
      return `https://api.github.com/repos/${parsed_link.OWNER}/${parsed_link.REPO}/commits/${parsed_link.COMMIT_SHA}`
    }

    // nếu link là commit nằm trong pull request thì trả về url commit
    if (parsed_link.TYPE === "PULL_REQUEST_COMMIT") {
      return `https://api.github.com/repos/${parsed_link.OWNER}/${parsed_link.REPO}/commits/${parsed_link.COMMIT_SHA}`
    }

    return `https://api.github.com/repos/${parsed_link.OWNER}/${parsed_link.REPO}/pulls/${parsed_link.PULL_REQUEST_NUMBER}/files`
  }

  /**
   * build headers để gọi GitHub API
   * @param token token github
   */
  private buildHeaders(token: string) {
    /** headers dùng chung của GitHub API */
    const HEADERS = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    }

    return HEADERS
  }
}

/** Input của get code from commit git */
export interface GetCodeFromCommitGitInput {
  /** link commit */
  link_commit: string
  /** token */
  token: string
}

/** Output của get code from commit git */
export interface GetCodeFromCommitGitOutput {
  /** code từ commit git */
  code: string
}

/** interface lấy code từ commit git */
export interface IGetCodeFromCommitGit {
  exec(input: GetCodeFromCommitGitInput): Promise<GetCodeFromCommitGitOutput>
}

/** lấy code từ commit git */
export class GetCodeFromCommitGit implements IGetCodeFromCommitGit {
  constructor(
    /** service lấy danh sách file thay đổi từ link github */
    private GET_GITHUB_FILES_FROM_LINK: IGetGithubFilesFromLink = new GetGithubFilesFromLink(),
    /** service lấy các code thay để để review từ các files git trả về */
    private GET_CODE_FROM_FILES: IGetCodeFromFiles = new GetCodeFromFiles(),
  ) {}

  /**
   * lấy code review từ link commit github
   * @param input input chứa link commit và token github
   */
  async exec(
    input: GetCodeFromCommitGitInput,
  ): Promise<GetCodeFromCommitGitOutput> {
    /** danh sách các file thay đổi */
    const FILES = await this.GET_GITHUB_FILES_FROM_LINK.exec({
      link: input.link_commit,
      token: input.token,
    })
    /** code review */
    const CODE = this.GET_CODE_FROM_FILES.exec(FILES)

    return {
      code: CODE,
    }
  }
}
//#endregion

//#region get code from pull request
/** Input của get code from pull request */
interface GetCodeFromPullRequestInput {
  /** link pull request */
  link_pull_request: string
  /** token */
  token: string
}

/** Output của get code from pull request */
interface GetCodeFromPullRequestOutput {
  /** code review */
  code: string
}

/** interface lấy code từ pull request */
export interface IGetCodeFromPullRequest {
  exec(
    input: GetCodeFromPullRequestInput,
  ): Promise<GetCodeFromPullRequestOutput>
}

/** lấy code từ pull reqquet */
export class GetCodeFromPullRequest implements IGetCodeFromPullRequest {
  constructor(
    /** service lấy danh sách file thay đổi từ link github */
    private GET_GITHUB_FILES_FROM_LINK: IGetGithubFilesFromLink = new GetGithubFilesFromLink(),
    /** service lấy các code thay để để review từ các files git trả về */
    private GET_CODE_FROM_FILES: IGetCodeFromFiles = new GetCodeFromFiles(),
  ) {}

  /**
   * lấy code review từ link pull request github
   * @param input input chứa link pull request và token github
   */
  async exec(
    input: GetCodeFromPullRequestInput,
  ): Promise<GetCodeFromPullRequestOutput> {
    /** danh sách các file thay đổi */
    const FILES = await this.GET_GITHUB_FILES_FROM_LINK.exec({
      link: input.link_pull_request,
      token: input.token,
    })

    /** code review */
    const CODE = this.GET_CODE_FROM_FILES.exec(FILES)

    return {
      code: CODE,
    }
  }
}
//#endregion
