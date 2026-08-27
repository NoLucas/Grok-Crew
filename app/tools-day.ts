export const TOOLS_DAY_CLASS = "tools-day";

export function setToolsDayTheme(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(TOOLS_DAY_CLASS, on);
  document.body.classList.toggle(TOOLS_DAY_CLASS, on);
}
