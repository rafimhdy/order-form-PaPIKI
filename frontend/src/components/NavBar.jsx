import React, { useState, useEffect } from "react";
import "./NavBar.css";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // prevent body scroll when mobile menu open
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    // close on Escape
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="header" id="header">
      <nav className="nav container">
        <a href="#" className="nav__logo">
          <img
            src="/assets/logo.png"
            alt="Company logo"
            className="nav__logo-img"
          />
        </a>

        <div className={`nav__menu ${open ? "show-menu" : ""}`} id="nav-menu">
          <ul className="nav__list">
            <li className="nav__item">
              <a
                href="https://papiki.org"
                className="nav__link"
                onClick={() => setOpen(false)}
              >
                <i className="ri-arrow-right-up-line"></i>
                <span>Home</span>
              </a>
            </li>

            <li className="nav__item">
              <a href="#" className="nav__link" onClick={() => setOpen(false)}>
                <i className="ri-arrow-right-up-line"></i>
                <span>Form</span>
              </a>
            </li>

            <li className="nav__item">
              <a
                href="#produk"
                className="nav__link"
                onClick={() => setOpen(false)}
              >
                <i className="ri-arrow-right-up-line"></i>
                <span>Produk</span>
              </a>
            </li>
          </ul>

          <div
            className="nav__close"
            id="nav-close"
            onClick={() => setOpen(false)}
          >
            <i className="ri-close-large-line"></i>
          </div>

          <div className="nav__social">
            <a
              href="https://www.instagram.com/papiki.official"
              target="_blank"
              rel="noreferrer"
              className="nav__social-link"
            >
              <i className="ri-instagram-line"></i>
            </a>

            <a
              href="#admin"
              className="nav__social-link"
              onClick={() => {
                // close mobile menu first, then ensure hash changes
                setOpen(false);
                // small timeout to avoid any interference from menu close handlers
                setTimeout(() => {
                  try {
                    window.location.hash = "#admin";
                  } catch {
                    /* ignore */
                  }
                }, 0);
              }}
            >
              <i className="ri-account-circle-line"></i>
            </a>
          </div>
        </div>

        {!open && (
          <div
            className="nav__toggle"
            id="nav-toggle"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="nav-menu"
          >
            <i className="ri-menu-line"></i>
          </div>
        )}
      </nav>
    </header>
  );
}
