const snoowrap = require("snoowrap");
const { CommentStream } = require("snoostorm");

const { version } = require("../package.json");

const debug = require("debug");
const log = debug("reddit-comment-relayer:main");

/**
 * Starts the bot.
 * @param {Object} config The configuration for the bot.
 */
function start(config) {
	log("starting the bot");

	const client = new snoowrap({
		clientId: process.env.RCR_CLIENT_ID,
		clientSecret: process.env.RCR_CLIENT_SECRET,
		username: process.env.RCR_USERNAME,
		password: process.env.RCR_PASSWORD,
		...config.credentials,
		userAgent: "Reddit Comment Relayer v" + version,
	});

	const outputSub = client.getSubreddit(config.outputSubreddit || "test");

	const stream = new CommentStream(client);
	stream.on("item", comment => {
		if (!config.includeCommentAuthors.includes(comment.author.name)) return;
		if (!config.includeSubreddits.includes(comment.subreddit.display_name)) return;

		outputSub.submitSelfPost({
			text: config.outputPostTemplate || comment.body,
			title: config.outputPostTitle || "New post",
		});
	});
}
start({});