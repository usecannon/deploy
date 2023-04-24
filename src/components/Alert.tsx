import { Card, Grid } from '@nextui-org/react'

import { ExclamationIcon } from './ExclamationIcon'

interface Props {
  variant?: 'default' | 'success' | 'error' | 'warning'
  children?: React.ReactNode | React.ReactNode[]
}

export function Alert({ variant = 'default', children }: Props) {
  const bg =
    variant === 'error'
      ? '$error'
      : variant === 'warning'
      ? '$warning'
      : variant === 'success'
      ? '$success'
      : undefined

  return (
    <Card>
      <Card.Body css={{ padding: '.6em', bg }}>
        <Grid.Container>
          <Grid
            css={{
              marginRight: '.4em',
              transform: 'translateY(2.5px)',
            }}
          >
            <ExclamationIcon />
          </Grid>
          <Grid xs={10}>{children}</Grid>
        </Grid.Container>
      </Card.Body>
    </Card>
  )
}
