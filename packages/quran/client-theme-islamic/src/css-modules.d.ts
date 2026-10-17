declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.css'

declare module '*.css?inline' {
  const cssText: string
  export default cssText
}
