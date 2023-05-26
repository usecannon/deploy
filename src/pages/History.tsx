import { Badge, Container, Spacer, Table, Text } from '@nextui-org/react'

import { DeleteIcon } from '../components/DeleteIcon'
import { IconButton } from '../components/IconButton'
import { useHistoryList } from '../hooks/history'

const addressStyles = {
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export function History() {
  const { del, items } = useHistoryList()

  return (
    <Container lg>
      <Text css={{ textAlign: 'center' }}>
        List of all the partial builds that have been generated and uploaded to
        IPFS. This data is only saved locally on the current browser's storage.
      </Text>
      <Spacer />
      <Table
        bordered
        shadow={false}
        compact
        aria-label="List of all the partial builds that have been generated and uploaded to IPFS"
        css={{ height: 'auto', minWidth: '100%', maxWidth: '100%' }}
        selectionMode="none"
        striped
      >
        <Table.Header>
          <Table.Column>Created</Table.Column>
          <Table.Column>CID</Table.Column>
          <Table.Column>Safe</Table.Column>
          <Table.Column>Chain ID</Table.Column>
          <Table.Column>&nbsp;</Table.Column>
        </Table.Header>
        <Table.Body
          css={{ height: 'auto', minWidth: '100%', maxWidth: '100%' }}
        >
          {items.map((item) => (
            <Table.Row key={item.id} css={{ maxWidth: '1024px' }}>
              <Table.Cell>
                <Text size={14}>{new Date(item.createdAt).toISOString()}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size={14} css={addressStyles}>
                  @ipfs:{item.id}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size={14} css={addressStyles}>
                  {item.safeAddress}
                </Text>
              </Table.Cell>
              <Table.Cell css={{ textAlign: 'center' }}>
                <Badge>{item.chainId}</Badge>
              </Table.Cell>
              <Table.Cell css={{ textAlign: 'right' }}>
                <IconButton onClick={() => del(item.id)}>
                  <DeleteIcon size={20} fill="#FF0080" />
                </IconButton>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}
