/** Data to add little "this guy sponsors someone important" nuggets */
export type SponsorDef = {
	login: string;
	text: string;
	class: string;
};
type _EgoBooster = {
	awesome: string[];
	sponsorings: SponsorDef[];
};

const EgoBooster: _EgoBooster = {
	awesome: [ // yeah :)
		"hotsocket.fyi",
		"did:plc:jlplwn5pi4dqrls7i6dx2me7",
	],
	sponsorings: [
		{
			login: "uniphil",
			text: "Probably Atlas",
			class: "sponsors-microcosm",
		},
	],
};

export default EgoBooster;
