# Commit Message Getter

A GitHub action that gets that commit messages. The
action is able to act on pull request and push events and check the pull
request title and body or the commit message of the commits of a push.

On pull requests the title and body are concatenated delimited by two line
breaks.

## Configuration

See also [action definition](action.yml) and the following example workflow.

`excludeDescription`, `excludeTitle` and `checkAllCommitMessages` are optional.
Default behavior is to include the description and title and not check pull
request commit messages.

### Example Workflow

```yml
name: 'Commit Message Check'
on:
  pull_request:
    types:
      - opened
      - edited
      - reopened
      - synchronize
  push:
    branches:
      - main
      - 'releases/*'

jobs:
  check-commit-message:
    name: Check Commit Message
    runs-on: ubuntu-latest
    steps:ßß
      - name: Get commit message
        uses: dotCMS/commit-message-getter@v1
        with:
          excludeDescription: 'true' # optional: this excludes the description body of a pull request
          excludeTitle: 'true' # optional: this excludes the title of a pull request
          checkAllCommitMessages: 'true' # optional: this checks all commits associated with a pull request
          accessToken: ${{ secrets.GITHUB_TOKEN }} # github access token is only required if checkAllCommitMessages is true
```

## Development

### Quick Start

```sh
git clone https://github.com/dotCMS/commit-message-getter.git
npm install
npm run build
```

That's it, just start editing the sources...

### Commands

Below is a list of commands you will probably find useful during the development
cycle.

#### `npm run build`

Builds the package to the `lib` folder.

#### `npm run format`

Runs Prettier on .ts and .tsx files and fixes errors.

#### `npm run format-check`

Runs Prettier on .ts and .tsx files without fixing errors.

#### `npm run lint`

Runs Eslint on .ts and .tsx files.

#### `npm run pack`

Bundles the package to the `dist` folder.

#### `npm run test`

Runs Jest test suites.

#### `npm run all`

Runs all of the above commands.

### Debugging

More information about debugging Github Actions can be found at <https://github.com/actions/toolkit/blob/main/docs/action-debugging.md>.

The secrets `ACTIONS_STEP_DEBUG` and `ACTIONS_RUNNER_DEBUG` are both set to
`true` in the main repository.

## License

This project is released under the terms of the [MIT License](LICENSE)
