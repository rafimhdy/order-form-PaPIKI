import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer" aria-labelledby="footer-quote">
      <div className="site-footer__inner">
        <blockquote id="footer-quote" className="site-footer__quote">
          Gak ada yang salah atau benar dalam menikmati secangkir kopi, yang
          terpenting nikmati saja yang ada
        </blockquote>
        <div className="site-footer__author">
          Peter Adrianto, Pengurus PaPIKI
        </div>
      </div>
    </footer>
  );
}
