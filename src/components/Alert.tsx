import {
  Alert as ChakraAlert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@chakra-ui/react'

interface Props {
  status?: 'info' | 'success' | 'error' | 'warning'
  title?: string
  children: React.ReactNode | React.ReactNode[]
}

export function Alert({ status = 'info', title, children }: Props) {
  return (
    <ChakraAlert status={status}>
      <AlertIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </ChakraAlert>
  )
}
