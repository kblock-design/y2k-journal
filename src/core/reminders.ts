/**
 * True on an iPhone/iPad when running in a Safari tab rather than from the Home Screen icon.
 * The two have separate storage, so logging in Safari would look like lost data.
 */
export function openedOutsideHomeScreen(): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return isIOS && !standalone
}
