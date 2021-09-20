import * as core from '@actions/core'
import * as commitMessageGetter from './commit-message-getter'

/**
 * Main function
 */
async function run(): Promise<void> {
  try {
    const inputs = await commitMessageGetter.getInputs()
    let commitMessages = ''
    if (inputs.messages && inputs.messages.length === 0) {
      core.info('No commits found in the payload, skipping check.')
    } else {
      commitMessages = inputs.messages.join('\n').replace(/\"/gi, '\\"')
      core.info(`Commit messages found:\n ${commitMessages}`)
    }
    core.setOutput('commit_message', commitMessages)
  } catch (error) {
    core.setFailed(error)
  }
}

/**
 * Main entry point
 */
run()
