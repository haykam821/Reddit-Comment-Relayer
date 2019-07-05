const snoowrap = require("snoowrap");
const { NoCredentialsError } = require("snoowrap/dist/errors.js");
const { CommentStream } = require("snoostorm");

const { version } = require("../package.json");

const debug = require("debug");
const log = debug("reddit-comment-relayer:main");
const clog = debug("reddit-comment-relayer:config");

const cosmiconfig = require("cosmiconfig");
const explorer = cosmiconfig("reddit-comment-relayer");

const merge = require("merge-deep");

/**
 * Starts the bot.
 * @param {Object} config The configuration for the bot.
 */
function start(config) {
	log("starting the bot");

	let client = {};
	try {
		client = new snoowrap({
			...config.credentials,
			userAgent: "Reddit Comment Relayer v" + version,
		});
	} catch (error) {
		if (error instanceof NoCredentialsError) {
			clog("missing credentials in config; see https://not-an-aardvark.github.io/snoowrap/snoowrap.html#snoowrap__anchor for possible values");
		} else {
			log("could not start snoowrap client: %o", error);
		}
		return;
	}

	const outputSub = client.getSubreddit(config.outputSubreddit);

	const stream = new CommentStream(client);
	stream.on("item", comment => {
		if (!config.includeCommentAuthors.includes(comment.author.name)) return;
		if (!config.includeSubreddits.includes(comment.subreddit.display_name)) return;

		outputSub.submitSelfPost({
			text: config.outputPostTemplate || comment.body,
			title: config.outputPostTitle,
		});
	});
}

/**
 * Gets the parsed config using cosmiconfig, and starts the bot.
 * @returns {Promise} A promise resolving to the resolved config.
 */
function getConfigAndStart() {
	return explorer.search().then(result => {
		clog("using the config at %s", result.filepath);

		const config = merge({
			credentials: {},
			includeCommentAuthors: [],
			includeSubreddits: [],
			outputPostTemplate: "",
			outputPostTitle: "New post",
			outputSubreddit: "test",
		}, result.config);
		clog("final config is %O", config);

		try {
			start(config);
			return config;
		} catch (error) {
			log("bot error: %s", error.message);
		}
	}).catch(error => {
		clog("could not get the config: %s", error.message);
	});
}
getConfigAndStart();