export type PageName = "home" | "strategy" | "execution";

export function initialiseHeader(currentPage: PageName): void {
  const links = document.querySelectorAll<HTMLAnchorElement>(".top-nav a");

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (currentPage !== "home" && href.includes(currentPage)) {
      link.setAttribute("aria-current", "page");
      return;
    }

    if (currentPage === "home") {
      link.removeAttribute("aria-current");
    }
  });
}
