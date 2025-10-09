// i mean this is nice but did i have to do all this?
export type Gist = {
	url: string;
	forks_url: string;
	commits_url: string;
	id: string;
	node_id: string;
	git_pull_url: string;
	git_push_url: string;
	html_url: string;
	files: Record<string, Gist_File>;
	public: boolean;
	created_at: string;
	updated_at: string;
	description: string | null;
	comments: number;
	comments_enabled: boolean;
	user: string | null;
	comments_url: string;
	owner: User;
	/** @deprecated */
	forks: Gist_Fork[] | null;
	/** @deprecated */
	history: Gist_HistoryItem[] | null;
	truncated: boolean;
};
export type Gist_File = {
	filename: string;
	type: string;
	language: string | null;
	raw_url: string;
	size: number;
	truncated?: boolean;
	content?: string;
	encoding?: string;
};
export type Gist_Fork = {
	id: string;
	url: string;
	user: User;
	created_at: string;
	updated_at: string;
};
export type Gist_HistoryItem = {
	user: User | null;
	version: string;
	committed_at: string;
	change_status: {
		total: number;
		additions: number;
		deletions: number;
	};
	url: string;
};
export type User = {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string | null;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: boolean;
	name?: string | null;
	email?: string | null;
	hireable?: boolean | null;
	bio?: string | null;
	twitter_username?: string | null;
	public_repos?: number;
	public_gists?: number;
	followers?: number;
	following?: number;
	created_at?: string;
	updated_at?: string;
	plan?: User_Plan;
	private_gists?: number;
	total_private_repos?: number;
	owned_private_repos?: number;
	disk_usage?: number;
	collaborators?: number;
	starred_at?: string;
	user_view_type?: string;
};
export type User_Plan = {
	collaborators: number;
	name: string;
	space: number;
	private_repos: number;
};
