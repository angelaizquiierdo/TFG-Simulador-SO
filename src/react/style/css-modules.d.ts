/** Declaración global de tipos para CSS Modules */
declare module '*.module.css' {
  const styles: Readonly<Record<string, string>>;
  export default styles;
}
