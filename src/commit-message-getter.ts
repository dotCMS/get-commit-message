import * as core from '@actions/core'
import * as github from '@actions/github'
import {graphql} from '@octokit/graphql'

export interface PullRequestOptions {
  ignoreTitle: boolean
  ignoreDescription: boolean
  checkAllCommitMessages: boolean // requires github token
  accessToken: string
}

export interface IGetterArguments {
  messages: string[]
}

/**
 * Gets the inputs set by the user and the messages of the event.
 *
 * @returns ICheckerArguments
 */
export async function getInputs(): Promise<IGetterArguments> {
  const result = ({} as unknown) as IGetterArguments

  core.debug('Get inputs...')

  // Get excludeTitle
  const excludeTitleStr = core.getInput('excludeTitle')
  core.debug(`excludeTitle: ${excludeTitleStr}`)

  // Get excludeDescription
  const excludeDescriptionStr = core.getInput('excludeDescription')
  core.debug(`excludeDescription: ${excludeDescriptionStr}`)

  // Get checkAllCommitMessages
  const checkAllCommitMessagesStr = core.getInput('checkAllCommitMessages')
  core.debug(`checkAllCommitMessages: ${checkAllCommitMessagesStr}`)

  // Set pullRequestOptions
  const pullRequestOptions: PullRequestOptions = {
    ignoreTitle: excludeTitleStr ? excludeTitleStr === 'true' : false,
    ignoreDescription: excludeDescriptionStr
      ? excludeDescriptionStr === 'true'
      : false,
    checkAllCommitMessages: checkAllCommitMessagesStr
      ? checkAllCommitMessagesStr === 'true'
      : false,
    accessToken: core.getInput('accessToken')
  }

  core.debug(`accessToken: ${pullRequestOptions.accessToken}`)

  // Get commit messages
  result.messages = await getMessages(pullRequestOptions)

  return result
}

/**
 * Gets all commit messages of a push or title and body of a pull request
 * concatenated to one message.
 *
 * @returns string[]
 */
async function getMessages(
  pullRequestOptions: PullRequestOptions
): Promise<string[]> {
  core.debug('Get messages...')
  core.debug(
    ` - pullRequestOptions: ${JSON.stringify(pullRequestOptions, null, 2)}`
  )

  const messages: string[] = []

  core.debug(` - eventName: ${github.context.eventName}`)

  switch (github.context.eventName) {
    case 'pull_request': {
      if (!github.context.payload) {
        throw new Error('No payload found in the context.')
      }

      if (!github.context.payload.pull_request) {
        throw new Error('No pull_request found in the payload.')
      }

      let message = ''

      // Handle pull request title and body
      if (!pullRequestOptions.ignoreTitle) {
        if (!github.context.payload.pull_request.title) {
          throw new Error('No title found in the pull_request.')
        }

        message += github.context.payload.pull_request.title
      } else {
        core.debug(' - skipping title')
      }

      if (!pullRequestOptions.ignoreDescription) {
        if (github.context.payload.pull_request.body) {
          message = message.concat(
            message !== '' ? '\n\n' : '',
            github.context.payload.pull_request.body
          )
        }
      } else {
        core.debug(' - skipping description')
      }

      if (message) {
        messages.push(message)
      }

      // Handle pull request commits
      if (pullRequestOptions.checkAllCommitMessages) {
        if (!pullRequestOptions.accessToken) {
          throw new Error(
            'The `checkAllCommitMessages` option requires a github access token.'
          )
        }

        if (!github.context.payload.pull_request.number) {
          throw new Error('No number found in the pull_request.')
        }

        if (!github.context.payload.repository) {
          throw new Error('No repository found in the payload.')
        }

        if (!github.context.payload.repository.name) {
          throw new Error('No name found in the repository.')
        }

        if (
          !github.context.payload.repository.owner ||
          (!github.context.payload.repository.owner.login &&
            !github.context.payload.repository.owner.name)
        ) {
          throw new Error('No owner found in the repository.')
        }

        const commitMessages = await getCommitMessagesFromPullRequest(
          pullRequestOptions.accessToken,
          github.context.payload.repository.owner.name ??
            github.context.payload.repository.owner.login,
          github.context.payload.repository.name,
          github.context.payload.pull_request.number
        )

        for (const message of commitMessages) {
          if (message) {
            messages.push(message)
          }
        }
      }

      break
    }
    case 'push': {
      if (!github.context.payload) {
        throw new Error('No payload found in the context.')
      }

      if (
        !github.context.payload.commits ||
        !github.context.payload.commits.length
      ) {
        core.debug(' - skipping commits')
        break
      }

      for (const i in github.context.payload.commits) {
        if (github.context.payload.commits[i].message) {
          messages.push(github.context.payload.commits[i].message)
        }
      }

      break
    }
    default: {
      throw new Error(`Event "${github.context.eventName}" is not supported.`)
    }
  }

  return messages
}

async function getCommitMessagesFromPullRequest(
  accessToken: string,
  repositoryOwner: string,
  repositoryName: string,
  pullRequestNumber: number
): Promise<string[]> {
  core.debug('Get messages from pull request...')
  core.debug(` - accessToken: ${accessToken}`)
  core.debug(` - repositoryOwner: ${repositoryOwner}`)
  core.debug(` - repositoryName: ${repositoryName}`)
  core.debug(` - pullRequestNumber: ${pullRequestNumber}`)

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
`
  const variables = {
    repositoryOwner: repositoryOwner,
    repositoryName: repositoryName,
    pullRequestNumber: pullRequestNumber,
    headers: {
      authorization: `token ${accessToken}`
    }
  }

  core.debug(` - query: ${query}`)
  core.debug(` - variables: ${JSON.stringify(variables, null, 2)}`)

  const {repository} = await graphql(query, variables)

  core.debug(` - response: ${JSON.stringify(repository, null, 2)}`)

  let messages: string[] = []

  interface EdgeItem {
    node: {
      commit: {
        message: string
      }
    }
  }

  if (repository.pullRequest) {
    messages = repository.pullRequest.commits.edges.map(function(
      edge: EdgeItem
    ): string {
      return edge.node.commit.message
    })
  }

  return messages
}
