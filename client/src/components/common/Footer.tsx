import React from "react";
import { Link } from "wouter";

const Footer: React.FC = () => {
  return (
    <footer className="mt-8 py-4 border-t text-center text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-wrap justify-center space-x-4">
        <Link href="/privacy">
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
        </Link>
        <Link href="/terms">
          <span className="hover:underline cursor-pointer">Terms & Conditions</span>
        </Link>
        <Link href="/about">
          <span className="hover:underline cursor-pointer">About</span>
        </Link>
      </div>
      <div className="mt-2">
        &copy; {new Date().getFullYear()} QzonMe. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;