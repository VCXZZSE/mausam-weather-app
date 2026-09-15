import "@testing-library/jest-dom/vitest"

// jsdom does not implement the native modal API. Browser QA covers its
// focus containment and inert backdrop; component tests exercise actions.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "")
  this.querySelector<HTMLElement>("[autofocus], button")?.focus()
}
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open") }
