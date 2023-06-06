import GitReadFileInput from '../components/GitReadFileInput'

export function Deploy() {
  return (
    <GitReadFileInput
      repo="https://github.com/Synthetixio/synthetix-deployments.git"
      branch="main"
      filepath="omnibus-mainnet.toml"
    />
  )
}
