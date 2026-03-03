export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  private: boolean;
  updated_at: string;
}

export type TreeItemType = "blob" | "tree" | "commit";

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: TreeItemType;
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding: "base64";
  content: string;
  html_url: string;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface RepoData {
  repo: GitHubRepo;
  files: RepoFile[];
  tree: GitHubTreeItem[];
}
