import { Input as InputElement } from '@nextui-org/react'

interface Props {
  name: string
  value: string
  label?: string
  labelLeft?: string
  onChange?: (val: string) => void
  placeholder?: string
  valid?: boolean
  readOnly?: boolean
  required?: boolean
  contentRight?: React.ReactNode
}

export function Input({
  name,
  value,
  placeholder,
  label,
  labelLeft,
  onChange,
  valid = true,
  readOnly,
  required,
  contentRight,
}: Props) {
  return (
    <InputElement
      name={name}
      initialValue={value}
      label={label}
      labelLeft={labelLeft}
      placeholder={placeholder}
      onChange={(evt) => onChange && onChange(evt.target.value)}
      color={valid ? 'default' : 'error'}
      status={valid ? 'default' : 'error'}
      required={required}
      readOnly={readOnly}
      contentRight={contentRight}
      bordered
      fullWidth
    />
  )
}
