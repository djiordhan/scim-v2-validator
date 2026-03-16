import type { Metadata } from 'next';
import './globals.css';
import NavBar from '../components/NavBar';

export const metadata: Metadata = {
  title: 'SCIM v2 Validator',
  description: 'Test your SCIM v2 server for Entra ID compatibility',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
