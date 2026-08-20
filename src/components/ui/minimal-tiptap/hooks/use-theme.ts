import * as React from "react"
import { useTheme as useNextTheme } from "next-themes"

export const useTheme = () => {
  const { resolvedTheme } = useNextTheme()
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  React.useEffect(() => {
    setIsDarkMode(resolvedTheme === "dark")
  }, [resolvedTheme])

  return isDarkMode
}

export default useTheme
