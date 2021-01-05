import * as core from '@actions/core'
import * as commitMessageGetter from './commit-message-getter'

/**
 * Main function
 */
async function run(): Promise<void> {
  try {
    const inputs = await commitMessageGetter.getInputs()
    let commitMessage = ''
    if (inputs.messages && inputs.messages.length === 0) {
      core.info('No commits found in the payload, skipping check.')
    } else {
      commitMessage = inputs.messages.join('\n')
    }
    core.setOutput('commit_message', commitMessage)
  } catch (error) {
    core.setFailed(error)
  }
}

/**
 * Main entry point
 */
run()
