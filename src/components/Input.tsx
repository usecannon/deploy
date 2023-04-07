import { Input as InputElement } from '@nextui-org/react'

interface Props {
  name: string
  value: string
  label?: string
  labelLeft?: string
  helperText?: string
  onChange?: (val: string) => void
  placeholder?: string
  valid?: boolean
  readOnly?: boolean
  required?: boolean
  password?: boolean
  contentRight?: React.ReactNode
}

export function Input({
  name,
  value,
  placeholder,
  label,
  labelLeft,
  helperText,
  onChange,
  valid = true,
  readOnly,
  required,
  password = false,
  contentRight,
}: Props) {
  const Component = password ? InputElement.Password : InputElement

  return (
    <Component
      name={name}
      initialValue={value}
      label={label}
      labelLeft={labelLeft}
      placeholder={placeholder}
      helperText={helperText}
      onChange={(evt) => onChange && onChange(evt.target.value)}
      color={valid ? 'default' : 'error'}
      status={valid ? 'default' : 'error'}
      required={required}
      readOnly={readOnly}
      contentRight={contentRight}
      animated={false}
      bordered
      fullWidth
    />
  )
}
