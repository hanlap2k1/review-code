import {
  GetCodeFromFiles,
  GetMetaDataFromLinkCommit,
  GetMetaDataFromLinkPullRequest,
  GithubCommitFile,
  IGetCodeFromFiles,
  IGetMetaDataFromLinkCommit,
  IGetMetaDataFromLinkPullRequest,
} from "./GitService"

//#region get code from commit git
/** dữ liệu git trả về sau khi parse */
interface GithubCommitResponse {
  files?: GithubCommitFile[]
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
    /** service lấy metadata từ link commit */
    private GET_META_DATA_FROM_LINK_COMMIT: IGetMetaDataFromLinkCommit = new GetMetaDataFromLinkCommit(),
    /** service lấy các code thay để để review từ các files git trả về */
    private GET_CODE_FROM_FILES: IGetCodeFromFiles = new GetCodeFromFiles(),
  ) {}

  async exec(
    input: GetCodeFromCommitGitInput,
  ): Promise<GetCodeFromCommitGitOutput> {
    const { OWNER, REPO, COMMIT_SHA } =
      this.GET_META_DATA_FROM_LINK_COMMIT.exec(input.link_commit)

    /** dữ liệu code thay đổi trong commit */
    const RES = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits/${COMMIT_SHA}`,
      {
        headers: {
          Authorization: `Bearer ${input.token}`,
          Accept: "application/vnd.github+json",
        },
      },
    )

    // nếu lỗi thì trả về lỗi
    if (!RES.ok) {
      throw new Error(`GitHub API error: ${RES.status} ${RES.statusText}`)
    }

    /** dữ liệu sau khi parse */
    const PARSED_DATA = (await RES.json()) as GithubCommitResponse
    /** danh sách các file thay đổi */
    const FILES = PARSED_DATA.files ?? []
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
    /** service lấy metadata từ link pull request */
    private GET_META_DATA_FROM_LINK_PULL_REQUEST: IGetMetaDataFromLinkPullRequest = new GetMetaDataFromLinkPullRequest(),
    /** service lấy các code thay để để review từ các files git trả về */
    private GET_CODE_FROM_FILES: IGetCodeFromFiles = new GetCodeFromFiles(),
  ) {}

  async exec(
    input: GetCodeFromPullRequestInput,
  ): Promise<GetCodeFromPullRequestOutput> {
    const { OWNER, REPO, PULL_REQUEST_NUMBER } =
      this.GET_META_DATA_FROM_LINK_PULL_REQUEST.exec(input.link_pull_request)

    /** dữ liệu code thay đổi trong commit */
    const RES = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/pulls/${PULL_REQUEST_NUMBER}/files`,
      {
        headers: {
          Authorization: `Bearer ${input.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
        },
      },
    )

    // nếu lỗi thì trả về lỗi
    if (!RES.ok) {
      throw new Error(`GitHub API error: ${RES.status} ${RES.statusText}`)
    }

    /** dữ liệu sau khi parse */
    const PARSED_DATA = (await RES.json())

    /** danh sách các file thay đổi */
    const FILES = PARSED_DATA ?? []

    /** code review */
    const CODE = this.GET_CODE_FROM_FILES.exec(FILES)

    return {
      code: CODE,
    }
  }
}
//#endregion
