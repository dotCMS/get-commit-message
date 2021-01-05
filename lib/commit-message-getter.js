"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputs = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const graphql_1 = require("@octokit/graphql");
/**
 * Gets the inputs set by the user and the messages of the event.
 *
 * @returns ICheckerArguments
 */
function getInputs() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        core.debug("Get inputs...");
        // Get excludeTitle
        const excludeTitleStr = core.getInput("excludeTitle");
        core.debug(`excludeTitle: ${excludeTitleStr}`);
        // Get excludeDescription
        const excludeDescriptionStr = core.getInput("excludeDescription");
        core.debug(`excludeDescription: ${excludeDescriptionStr}`);
        // Get checkAllCommitMessages
        const checkAllCommitMessagesStr = core.getInput("checkAllCommitMessages");
        core.debug(`checkAllCommitMessages: ${checkAllCommitMessagesStr}`);
        // Set pullRequestOptions
        const pullRequestOptions = {
            ignoreTitle: excludeTitleStr ? excludeTitleStr === "true" : false,
            ignoreDescription: excludeDescriptionStr
                ? excludeDescriptionStr === "true"
                : false,
            checkAllCommitMessages: checkAllCommitMessagesStr
                ? checkAllCommitMessagesStr === "true"
                : false,
            accessToken: core.getInput("accessToken")
        };
        core.debug(`accessToken: ${pullRequestOptions.accessToken}`);
        // Get commit messages
        result.messages = yield getMessages(pullRequestOptions);
        return result;
    });
}
exports.getInputs = getInputs;
/**
 * Gets all commit messages of a push or title and body of a pull request
 * concatenated to one message.
 *
 * @returns string[]
 */
function getMessages(pullRequestOptions) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        core.debug("Get messages...");
        core.debug(` - pullRequestOptions: ${JSON.stringify(pullRequestOptions, null, 2)}`);
        const messages = [];
        core.debug(` - eventName: ${github.context.eventName}`);
        switch (github.context.eventName) {
            case "pull_request": {
                if (!github.context.payload) {
                    throw new Error("No payload found in the context.");
                }
                if (!github.context.payload.pull_request) {
                    throw new Error("No pull_request found in the payload.");
                }
                let message = "";
                // Handle pull request title and body
                if (!pullRequestOptions.ignoreTitle) {
                    if (!github.context.payload.pull_request.title) {
                        throw new Error("No title found in the pull_request.");
                    }
                    message += github.context.payload.pull_request.title;
                }
                else {
                    core.debug(" - skipping title");
                }
                if (!pullRequestOptions.ignoreDescription) {
                    if (github.context.payload.pull_request.body) {
                        message = message.concat(message !== "" ? "\n\n" : "", github.context.payload.pull_request.body);
                    }
                }
                else {
                    core.debug(" - skipping description");
                }
                if (message) {
                    messages.push(message);
                }
                // Handle pull request commits
                if (pullRequestOptions.checkAllCommitMessages) {
                    if (!pullRequestOptions.accessToken) {
                        throw new Error("The `checkAllCommitMessages` option requires a github access token.");
                    }
                    if (!github.context.payload.pull_request.number) {
                        throw new Error("No number found in the pull_request.");
                    }
                    if (!github.context.payload.repository) {
                        throw new Error("No repository found in the payload.");
                    }
                    if (!github.context.payload.repository.name) {
                        throw new Error("No name found in the repository.");
                    }
                    if (!github.context.payload.repository.owner ||
                        (!github.context.payload.repository.owner.login &&
                            !github.context.payload.repository.owner.name)) {
                        throw new Error("No owner found in the repository.");
                    }
                    const commitMessages = yield getCommitMessagesFromPullRequest(pullRequestOptions.accessToken, (_a = github.context.payload.repository.owner.name) !== null && _a !== void 0 ? _a : github.context.payload.repository.owner.login, github.context.payload.repository.name, github.context.payload.pull_request.number);
                    for (const message of commitMessages) {
                        if (message) {
                            messages.push(message);
                        }
                    }
                }
                break;
            }
            case "push": {
                if (!github.context.payload) {
                    throw new Error("No payload found in the context.");
                }
                if (!github.context.payload.commits ||
                    !github.context.payload.commits.length) {
                    core.debug(" - skipping commits");
                    break;
                }
                for (const i in github.context.payload.commits) {
                    if (github.context.payload.commits[i].message) {
                        messages.push(github.context.payload.commits[i].message);
                    }
                }
                break;
            }
            default: {
                throw new Error(`Event "${github.context.eventName}" is not supported.`);
            }
        }
        return messages;
    });
}
function getCommitMessagesFromPullRequest(accessToken, repositoryOwner, repositoryName, pullRequestNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug("Get messages from pull request...");
        core.debug(` - accessToken: ${accessToken}`);
        core.debug(` - repositoryOwner: ${repositoryOwner}`);
        core.debug(` - repositoryName: ${repositoryName}`);
        core.debug(` - pullRequestNumber: ${pullRequestNumber}`);
        const query = `
  query commitMessages(
    $repositoryOwner: String!
    $repositoryName: String!
    $pullRequestNumber: Int!
    $numberOfCommits: Int = 100
  ) {
    repository(owner: $repositoryOwner, name: $repositoryName) {
      pullRequest(number: $pullRequestNumber) {
        commits(last: $numberOfCommits) {
          edges {
            node {
              commit {
                message
              }
            }
          }
        }
      }
    }
  }
`;
        const variables = {
            repositoryOwner: repositoryOwner,
            repositoryName: repositoryName,
            pullRequestNumber: pullRequestNumber,
            headers: {
                authorization: `token ${accessToken}`
            }
        };
        core.debug(` - query: ${query}`);
        core.debug(` - variables: ${JSON.stringify(variables, null, 2)}`);
        const { repository } = yield graphql_1.graphql(query, variables);
        core.debug(` - response: ${JSON.stringify(repository, null, 2)}`);
        let messages = [];
        if (repository.pullRequest) {
            messages = repository.pullRequest.commits.edges.map(function (edge) {
                return edge.node.commit.message;
            });
        }
        return messages;
    });
}
