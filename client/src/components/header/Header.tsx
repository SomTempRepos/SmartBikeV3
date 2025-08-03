import { useState } from "react";
import { ThemeToggleButton } from "../common/ThemeToggleButton";
import UserDropdown from "./UserDropdown";
import NotificationDropdown from "./NotificationDropdown";
import { Link } from "react-router-dom";

// Define the interface for the props
interface HeaderProps {
  onClick?: () => void; // Optional function that takes no arguments and returns void
  onToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onClick, onToggle }) => {

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-4 xl:px-6">
        {/* Top row - Mobile & Desktop */}
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          
          {/* Desktop sidebar toggle button - hidden on mobile */}
          <button
            onClick={onClick}
            className="items-center justify-center hidden w-9 h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 text-gray-500 border border-gray-200 rounded-lg z-99999 dark:border-gray-800 lg:flex dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg
              className="fill-current w-4 h-4 lg:w-5 lg:h-5"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 lg:hidden">
            <img
              className="h-6 sm:h-7 md:h-8 dark:hidden"
              src="./images/logo/logo_1.svg"
              alt="Logo"
            />
            <img
              className="h-6 sm:h-7 md:h-8 hidden dark:block"
              src="./images/logo/logo-dark_1.svg"
              alt="Logo"
            />
          </Link>

          {/* Mobile actions - Theme, Notification, User */}
          <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
            <ThemeToggleButton />
            <NotificationDropdown />
            <UserDropdown />
          </div>

          {/* Desktop actions - Theme, Notification, User (shown only on desktop) */}
          <div className="hidden lg:flex lg:items-center lg:gap-3 lg:ml-auto">
            <ThemeToggleButton />
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;