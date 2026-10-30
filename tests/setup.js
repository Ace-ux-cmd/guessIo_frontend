// jsdom has no matchMedia or scrollIntoView, and the app never talks to a real server in tests.
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || (() => {});
