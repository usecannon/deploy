import { Container, Spacer, Text } from '@nextui-org/react'

import { Alert } from '../components/Alert'
import { Input } from '../components/Input'

export type SettingsValues = { [k: string]: string }
export type SettingsLabels = {
  [k: string]: {
    title: string
    description: string
    defaultValue: string
    password?: boolean
    optional?: boolean
    // Validate function should return an error message if the value is invalid
    validate: (value: string) => string | undefined
  }
}

interface Props<T extends SettingsValues> {
  value: T
  labels: SettingsLabels
  onValueChange: (key: string, val: string) => void
}

export function Settings<T extends SettingsValues>({
  value,
  onValueChange,
  labels,
}: Props<T>) {
  return (
    <Container xs>
      {Object.keys(value).map((key) => {
        const validationError = labels[key]?.validate?.(value[key])

        return (
          <div key={key}>
            <Input
              key={key}
              name={key}
              label={labels[key].title}
              helperText={labels[key].description}
              value={value[key]}
              onChange={(val) => onValueChange(key, val)}
              password={labels[key].password}
              required={!labels[key].optional}
              valid={!validationError}
            />
            {validationError && (
              <>
                <Spacer y={1.2} />
                <Alert variant="error">
                  <Text>{validationError}</Text>
                </Alert>
              </>
            )}
            <Spacer y={2} />
          </div>
        )
      })}
    </Container>
  )
}
