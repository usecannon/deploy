import { Code, Container, ListItem, UnorderedList } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import * as git from '../utils/git'

interface Props {
  repo: string
  branch: string
  filepath: string
}

export default function GitReadFileInput({ repo, branch, filepath }: Props) {
  const [content, setContent] = useState<string>('')

  useEffect(() => {
    if (!repo || !branch || !filepath) return

    async function loadRepo() {
      await git.init(repo, branch)
      const fileContent = await git.readFile(repo, branch, filepath)
      setContent(fileContent)
    }

    loadRepo()
  }, [repo, branch, filepath])

  return (
    <Container maxW="100%" w="container.lg">
      <UnorderedList>
        <ListItem>repo: {repo}</ListItem>
        <ListItem>brach: {branch}</ListItem>
        <ListItem>file: {filepath}</ListItem>
      </UnorderedList>
      {content && (
        <Code
          paddingY="3"
          paddingX="4"
          display="block"
          whiteSpace="pre-wrap"
          children={content}
        />
      )}
    </Container>
  )
}
